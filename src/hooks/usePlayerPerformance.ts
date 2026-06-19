import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface PlayerPerformanceStats {
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  fairPlayVotes: number;
  bolaMurchaVotes: number;
  avgRating: number;
  calculatedScore: number;
}

/**
 * Score calculation:
 * 1. Collect all votes received
 * 2. Remove highest and lowest (trimmed mean)
 * 3. Calculate average of remaining votes (0-10 scale)
 * 4. Convert to 0-100 base
 * 5. Apply performance weight adjustments
 */
function calculateScore(
  votes: number[],
  goals: number,
  assists: number,
  fairPlay: number,
  yellowCards: number,
  redCards: number,
  bolaMurcha: number
): number {
  let baseScore = 50;

  if (votes.length >= 3) {
    const sorted = [...votes].sort((a, b) => a - b);
    const trimmed = sorted.slice(1, -1);
    const avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
    baseScore = avg * 10;
  } else if (votes.length > 0) {
    const avg = votes.reduce((s, v) => s + v, 0) / votes.length;
    baseScore = avg * 10;
  }

  const adjustment =
    goals * 0.15 +
    assists * 0.10 +
    fairPlay * 0.12 -
    yellowCards * 0.05 -
    redCards * 0.12 -
    bolaMurcha * 0.20;

  return Math.max(0, Math.min(100, Math.floor(baseScore + adjustment)));
}

export function usePlayerPerformance(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`perf_votes_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_votes' }, () => {
        queryClient.invalidateQueries({ queryKey: ["player-performance", userId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pelada_award_results' }, () => {
        queryClient.invalidateQueries({ queryKey: ["player-performance", userId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_stats' }, () => {
        queryClient.invalidateQueries({ queryKey: ["player-performance", userId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_teams' }, () => {
        queryClient.invalidateQueries({ queryKey: ["player-performance", userId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: ["player-performance", userId],
    queryFn: async () => {
      if (!userId) return { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, fairPlayVotes: 0, bolaMurchaVotes: 0, avgRating: 0, calculatedScore: 50 } as PlayerPerformanceStats;

      const { data: memberships } = await supabase
        .from("pelada_members")
        .select("id")
        .eq("user_id", userId);

      if (!memberships || memberships.length === 0) {
        return { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, fairPlayVotes: 0, bolaMurchaVotes: 0, avgRating: 0, calculatedScore: 50 } as PlayerPerformanceStats;
      }

      const memberIds = memberships.map((m) => m.id);

      // Count matches from match_teams
      const { data: teamEntries } = await supabase
        .from("match_teams")
        .select("match_id")
        .in("pelada_member_id", memberIds);

      const uniqueMatches = new Set((teamEntries || []).map((t) => t.match_id)).size;

      const { data: stats } = await supabase
        .from("match_stats")
        .select("goals, assists, yellow_cards, red_cards")
        .in("pelada_member_id", memberIds);

      const totalGoals = (stats || []).reduce((sum, s) => sum + s.goals, 0);
      const totalAssists = (stats || []).reduce((sum, s) => sum + s.assists, 0);
      const totalYellowCards = (stats || []).reduce((sum, s) => sum + s.yellow_cards, 0);
      const totalRedCards = (stats || []).reduce((sum, s) => sum + s.red_cards, 0);

      // Only count votes from finalized matches for rating
      const { data: finalizedMatches } = await supabase
        .from("matches")
        .select("id")
        .eq("voting_finalized", true);

      const finalizedMatchIds = (finalizedMatches || []).map(m => m.id);

      let voteValues: number[] = [];
      if (finalizedMatchIds.length > 0) {
        const { data: votes } = await supabase
          .from("match_votes")
          .select("stars, match_id")
          .in("rated_member_id", memberIds)
          .in("match_id", finalizedMatchIds);
        voteValues = (votes || []).map((v) => v.stars);
      }

      const avgRating = voteValues.length > 0
        ? Math.round((voteValues.reduce((sum, v) => sum + v, 0) / voteValues.length) * 10) / 10
        : 0;

      // Only count finalized award results (official winners)
      let fairPlayVotes = 0;
      let bolaMurchaVotes = 0;

      if (memberIds.length > 0) {
        const { data: awardResults } = await supabase
          .from("pelada_award_results")
          .select("award_type")
          .in("winner_member_id", memberIds);

        fairPlayVotes = (awardResults || []).filter((a) => a.award_type === "fair_play").length;
        bolaMurchaVotes = (awardResults || []).filter((a) => a.award_type === "bola_murcha").length;
      }

      const calculatedScore = calculateScore(
        voteValues, totalGoals, totalAssists, fairPlayVotes, totalYellowCards, totalRedCards, bolaMurchaVotes
      );

      return {
        matches: uniqueMatches,
        goals: totalGoals,
        assists: totalAssists,
        yellowCards: totalYellowCards,
        redCards: totalRedCards,
        fairPlayVotes,
        bolaMurchaVotes,
        avgRating,
        calculatedScore,
      } as PlayerPerformanceStats;
    },
    enabled: !!userId,
  });
}
