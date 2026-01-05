import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeedbackItem {
  id: string;
  feedback_type: string;
  message: string;
  page_url: string | null;
  screenshot_url: string | null;
  created_at: string;
}

export function useFeedbackList(filterType?: string) {
  return useQuery({
    queryKey: ["public-feedback", filterType],
    queryFn: async () => {
      let query = supabase
        .from("anonymous_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterType && filterType !== "all") {
        query = query.eq("feedback_type", filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeedbackItem[];
    },
  });
}
