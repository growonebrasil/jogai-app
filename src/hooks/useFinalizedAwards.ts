import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinalizedAward {
  id: string;
  match_id: string;
  award_type: string;
  winner_member_id: string;
  vote_count: number;
}

/**
 * Get finalized award results for a specific match.
 * Returns null if voting is not yet finalized.
 */
export function useFinalizedAwards(matchId: string | undefined, votingFinalized?: boolean) {
  return useQuery({
    queryKey: ["finalizedAwards", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const { data, error } = await supabase
        .from("pelada_award_results")
        .select("*")
        .eq("match_id", matchId);
      if (error) throw error;
      return (data || []) as FinalizedAward[];
    },
    enabled: !!matchId && votingFinalized === true,
  });
}

/**
 * Get all finalized award results across all matches in a pelada.
 * Only counts from matches where voting_finalized = true.
 */
export function useFinalizedAwardsAggregate(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["finalizedAwardsAggregate", peladaId],
    queryFn: async () => {
      if (!peladaId) return { craque: {}, fairPlay: {}, bolaMurcha: {} };

      // Get finalized matches
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .eq("pelada_id", peladaId)
        .eq("voting_finalized", true);

      if (!matches || matches.length === 0) return { craque: {}, fairPlay: {}, bolaMurcha: {} };

      const matchIds = matches.map(m => m.id);
      const { data: results } = await supabase
        .from("pelada_award_results")
        .select("*")
        .in("match_id", matchIds);

      const craque: Record<string, number> = {};
      const fairPlay: Record<string, number> = {};
      const bolaMurcha: Record<string, number> = {};

      (results || []).forEach((r: any) => {
        if (r.award_type === "craque") craque[r.winner_member_id] = (craque[r.winner_member_id] || 0) + 1;
        if (r.award_type === "fair_play") fairPlay[r.winner_member_id] = (fairPlay[r.winner_member_id] || 0) + 1;
        if (r.award_type === "bola_murcha") bolaMurcha[r.winner_member_id] = (bolaMurcha[r.winner_member_id] || 0) + 1;
      });

      return { craque, fairPlay, bolaMurcha };
    },
    enabled: !!peladaId,
  });
}
