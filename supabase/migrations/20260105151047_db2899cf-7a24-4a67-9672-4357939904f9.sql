-- Create anonymous feedback table (no user identification)
CREATE TABLE public.anonymous_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'other')),
  message TEXT NOT NULL,
  page_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feature votes table (tracks votes by feature, no user identification)
CREATE TABLE public.feature_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_id TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(feature_id)
);

-- Enable RLS
ALTER TABLE public.anonymous_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

-- Anonymous feedback: anyone can insert, no one can read/update/delete from client
CREATE POLICY "Anyone can submit anonymous feedback"
ON public.anonymous_feedback
FOR INSERT
WITH CHECK (true);

-- Feature votes: anyone can read vote counts
CREATE POLICY "Anyone can view vote counts"
ON public.feature_votes
FOR SELECT
USING (true);

-- Feature votes: anyone can insert (upsert handled by function)
CREATE POLICY "Anyone can vote"
ON public.feature_votes
FOR INSERT
WITH CHECK (true);

-- Feature votes: anyone can update vote counts
CREATE POLICY "Anyone can update vote counts"
ON public.feature_votes
FOR UPDATE
USING (true);

-- Create function to increment vote (atomic operation)
CREATE OR REPLACE FUNCTION public.increment_feature_vote(p_feature_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.feature_votes (feature_id, vote_count)
  VALUES (p_feature_id, 1)
  ON CONFLICT (feature_id)
  DO UPDATE SET vote_count = feature_votes.vote_count + 1, updated_at = now()
  RETURNING vote_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;