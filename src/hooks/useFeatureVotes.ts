import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const VOTED_FEATURES_KEY = "xlama_voted_features";

// Get voted features from localStorage
const getVotedFeatures = (): Set<string> => {
  try {
    const stored = localStorage.getItem(VOTED_FEATURES_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

// Save voted features to localStorage
const saveVotedFeature = (featureId: string) => {
  try {
    const voted = getVotedFeatures();
    voted.add(featureId);
    localStorage.setItem(VOTED_FEATURES_KEY, JSON.stringify([...voted]));
  } catch {
    // Ignore localStorage errors
  }
};

export function useFeatureVotes() {
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [votedFeatures, setVotedFeatures] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load initial vote counts and voted features
  useEffect(() => {
    const loadVotes = async () => {
      try {
        const { data, error } = await supabase
          .from("feature_votes")
          .select("feature_id, vote_count");

        if (error) throw error;

        const voteMap: Record<string, number> = {};
        data?.forEach((item) => {
          voteMap[item.feature_id] = item.vote_count;
        });
        setVotes(voteMap);
      } catch (error) {
        console.error("Failed to load votes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    setVotedFeatures(getVotedFeatures());
    loadVotes();
  }, []);

  // Vote for a feature
  const vote = useCallback(async (featureId: string): Promise<boolean> => {
    // Check if already voted
    if (votedFeatures.has(featureId)) {
      return false;
    }

    try {
      const { data, error } = await supabase.rpc("increment_feature_vote", {
        p_feature_id: featureId,
      });

      if (error) throw error;

      // Update local state
      setVotes((prev) => ({
        ...prev,
        [featureId]: data as number,
      }));

      // Mark as voted
      saveVotedFeature(featureId);
      setVotedFeatures((prev) => new Set([...prev, featureId]));

      return true;
    } catch (error) {
      console.error("Failed to vote:", error);
      return false;
    }
  }, [votedFeatures]);

  const hasVoted = useCallback((featureId: string): boolean => {
    return votedFeatures.has(featureId);
  }, [votedFeatures]);

  const getVoteCount = useCallback((featureId: string): number => {
    return votes[featureId] || 0;
  }, [votes]);

  return {
    votes,
    isLoading,
    vote,
    hasVoted,
    getVoteCount,
  };
}
