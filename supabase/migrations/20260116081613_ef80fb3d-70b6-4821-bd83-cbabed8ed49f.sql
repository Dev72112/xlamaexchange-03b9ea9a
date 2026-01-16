-- Security Fix 1: Remove public read access from anonymous_feedback
DROP POLICY IF EXISTS "Anyone can view anonymous feedback" ON public.anonymous_feedback;

-- Block all SELECT access (admin-only via dashboard/edge functions)
CREATE POLICY "Block public reads on feedback"
ON public.anonymous_feedback FOR SELECT
USING (false);

-- Security Fix 2: Add rate limiting to increment_feature_vote function
-- Create a table to track user votes if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_feature_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id text NOT NULL,
  voter_id text NOT NULL,
  voted_at timestamp with time zone DEFAULT now(),
  UNIQUE(feature_id, voter_id)
);

-- Enable RLS on user_feature_votes
ALTER TABLE public.user_feature_votes ENABLE ROW LEVEL SECURITY;

-- Block direct client access to vote tracking table
CREATE POLICY "Block direct access to vote tracking"
ON public.user_feature_votes FOR ALL
USING (false)
WITH CHECK (false);

-- Update increment_feature_vote to prevent duplicate votes
CREATE OR REPLACE FUNCTION public.increment_feature_vote(p_feature_id TEXT, p_voter_id TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
  v_voter_id TEXT;
  already_voted BOOLEAN;
BEGIN
  -- Use provided voter_id or generate anonymous one from request
  v_voter_id := COALESCE(
    p_voter_id, 
    md5(COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', 'anonymous') || p_feature_id)
  );
  
  -- Check if already voted
  SELECT EXISTS(
    SELECT 1 FROM public.user_feature_votes 
    WHERE feature_id = p_feature_id AND voter_id = v_voter_id
  ) INTO already_voted;
  
  IF already_voted THEN
    -- Return current count without incrementing
    SELECT vote_count INTO new_count FROM public.feature_votes WHERE feature_id = p_feature_id;
    RETURN COALESCE(new_count, 0);
  END IF;
  
  -- Record the vote
  INSERT INTO public.user_feature_votes (feature_id, voter_id)
  VALUES (p_feature_id, v_voter_id);
  
  -- Increment vote count
  INSERT INTO public.feature_votes (feature_id, vote_count)
  VALUES (p_feature_id, 1)
  ON CONFLICT (feature_id)
  DO UPDATE SET vote_count = feature_votes.vote_count + 1, updated_at = now()
  RETURNING vote_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Security Fix 3: Restrict direct table access for feature_votes
DROP POLICY IF EXISTS "Anyone can update vote counts" ON public.feature_votes;
DROP POLICY IF EXISTS "Anyone can vote" ON public.feature_votes;

-- Block direct INSERT/UPDATE (must use function)
CREATE POLICY "Block direct inserts on feature_votes"
ON public.feature_votes FOR INSERT
WITH CHECK (false);

CREATE POLICY "Block direct updates on feature_votes"
ON public.feature_votes FOR UPDATE
USING (false);

-- Security Fix 4: Add screenshot_url column if not exists (for migration consistency)
ALTER TABLE public.anonymous_feedback 
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Create index for screenshot lookups
CREATE INDEX IF NOT EXISTS idx_feedback_screenshots 
ON public.anonymous_feedback(screenshot_url) 
WHERE screenshot_url IS NOT NULL;