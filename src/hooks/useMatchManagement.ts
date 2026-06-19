import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface TeamAssignment {
  matchId: string;
  memberId: string;
  team: string;
  playerName: string;
  position: string;
  overall: number;
  avatarUrl?: string | null;
}

export function useActiveMatch(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["activeMatch", peladaId],
    queryFn: async () => {
      if (!peladaId) return null;
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("pelada_id", peladaId)
        .eq("is_finished", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!peladaId,
  });
}

export function useAllPeladaMatches(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["allPeladaMatches", peladaId],
    queryFn: async () => {
      if (!peladaId) return [];
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("pelada_id", peladaId)
        .order("match_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!peladaId,
  });
}

export function useMatchTeams(matchId: string | undefined) {
  return useQuery({
    queryKey: ["matchTeams", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("match_teams")
        .select("*")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });
}

export function useMatchStats(matchId: string | undefined) {
  return useQuery({
    queryKey: ["matchStats", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("match_stats")
        .select("*")
        .eq("match_id", matchId);
      if (error) throw error;
      return data;
    },
    enabled: !!matchId,
  });
}

export function useRealtimeMatchStats(matchId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`match_stats_${matchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_stats',
        filter: `match_id=eq.${matchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["matchStats", matchId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId, queryClient]);
}

export function useRealtimeMatchTeams(matchId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`match_teams_${matchId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_teams',
        filter: `match_id=eq.${matchId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["matchTeams", matchId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId, queryClient]);
}

export function useCreateMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ peladaId, teams, matchNumber, occurrenceId }: { peladaId: string; teams: { memberId: string; team: string }[]; matchNumber?: number; occurrenceId?: string }) => {
      const insertData: any = { pelada_id: peladaId, match_number: matchNumber || 1 };
      if (occurrenceId) insertData.occurrence_id = occurrenceId;
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert(insertData)
        .select()
        .single();
      if (matchError) throw matchError;

      const assignments = teams.map((t) => ({
        match_id: match.id,
        pelada_member_id: t.memberId,
        team: t.team,
      }));
      const { error: teamError } = await supabase
        .from("match_teams")
        .insert(assignments);
      if (teamError) throw teamError;

      // Timeline: match_start
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const actor = userRes.user?.id;
        if (actor) {
          await supabase.from("pelada_timeline_events" as any).insert({
            pelada_id: peladaId,
            occurrence_id: occurrenceId ?? null,
            match_id: match.id,
            event_type: "match_start",
            actor_id: actor,
            payload: { match_number: matchNumber || 1 },
          } as any);
        }
      } catch {}

      return match;
    },
    onSuccess: (_, { peladaId }) => {
      queryClient.invalidateQueries({ queryKey: ["activeMatch", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["allPeladaMatches", peladaId] });
      toast.success("Times salvos!");
    },
    onError: (err) => toast.error("Erro ao salvar times: " + err.message),
  });
}

export function useCreateNextMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ peladaId, previousMatchId, matchNumber, occurrenceId }: { peladaId: string; previousMatchId: string; matchNumber: number; occurrenceId?: string }) => {
      const { data: prevTeams, error: prevError } = await supabase
        .from("match_teams")
        .select("pelada_member_id, team")
        .eq("match_id", previousMatchId);
      if (prevError) throw prevError;

      const insertData: any = { pelada_id: peladaId, match_number: matchNumber };
      if (occurrenceId) insertData.occurrence_id = occurrenceId;
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert(insertData)
        .select()
        .single();
      if (matchError) throw matchError;

      const assignments = (prevTeams || []).map(t => ({
        match_id: match.id,
        pelada_member_id: t.pelada_member_id,
        team: t.team,
      }));
      if (assignments.length > 0) {
        const { error: teamError } = await supabase
          .from("match_teams")
          .insert(assignments);
        if (teamError) throw teamError;
      }

      // Timeline: match_start (next match in rotation)
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const actor = userRes.user?.id;
        if (actor) {
          await supabase.from("pelada_timeline_events" as any).insert({
            pelada_id: peladaId,
            occurrence_id: occurrenceId ?? null,
            match_id: match.id,
            event_type: "match_start",
            actor_id: actor,
            payload: { match_number: matchNumber },
          } as any);
        }
      } catch {}

      return match;
    },
    onSuccess: (_, { peladaId }) => {
      queryClient.invalidateQueries({ queryKey: ["activeMatch", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["allPeladaMatches", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["finishedMatches", peladaId] });
      toast.success("Nova partida criada!");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

export function useUpdateTeamAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, memberId, newTeam }: { matchId: string; memberId: string; newTeam: string }) => {
      const { error } = await supabase
        .from("match_teams")
        .update({ team: newTeam })
        .eq("match_id", matchId)
        .eq("pelada_member_id", memberId);
      if (error) throw error;
    },
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: ["matchTeams", matchId] });
    },
  });
}

export function useRecordMatchEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      matchId,
      memberId,
      event,
      delta = 1,
      peladaId,
      occurrenceId,
      team,
      minute,
    }: {
      matchId: string;
      memberId: string;
      event: "goal" | "assist" | "yellow" | "red";
      delta?: number;
      peladaId?: string;
      occurrenceId?: string | null;
      team?: string | null;
      minute?: number | null;
    }) => {
      const { data: existing } = await supabase
        .from("match_stats")
        .select("*")
        .eq("match_id", matchId)
        .eq("pelada_member_id", memberId)
        .maybeSingle();

      if (existing) {
        const updates: any = {};
        const fieldMap = { goal: "goals", assist: "assists", yellow: "yellow_cards", red: "red_cards" };
        const field = fieldMap[event];
        const newVal = Math.max(0, (existing as any)[field] + delta);
        updates[field] = newVal;
        const { error } = await supabase
          .from("match_stats")
          .update(updates)
          .eq("id", existing.id);
        if (error) throw error;
      } else if (delta > 0) {
        const insert: any = {
          match_id: matchId,
          pelada_member_id: memberId,
          goals: event === "goal" ? 1 : 0,
          assists: event === "assist" ? 1 : 0,
          yellow_cards: event === "yellow" ? 1 : 0,
          red_cards: event === "red" ? 1 : 0,
        };
        const { error } = await supabase.from("match_stats").insert(insert);
        if (error) throw error;
      }

      // Granular event log + unified timeline (positive deltas only).
      if (delta > 0 && peladaId) {
        const { data: userRes } = await supabase.auth.getUser();
        const recorded_by = userRes.user?.id ?? null;
        await supabase.from("match_events" as any).insert({
          match_id: matchId,
          pelada_id: peladaId,
          occurrence_id: occurrenceId ?? null,
          event_type: event,
          pelada_member_id: memberId,
          team: team ?? null,
          minute: minute ?? null,
          recorded_by,
        } as any);
        if (recorded_by) {
          await supabase.from("pelada_timeline_events" as any).insert({
            pelada_id: peladaId,
            occurrence_id: occurrenceId ?? null,
            match_id: matchId,
            event_type: event,
            actor_id: recorded_by,
            payload: {
              pelada_member_id: memberId,
              team: team ?? null,
              minute: minute ?? null,
            },
          } as any);
        }
      }

    },
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: ["matchStats", matchId] });
      queryClient.invalidateQueries({ queryKey: ["matchEvents", matchId] });
      queryClient.invalidateQueries({ queryKey: ["player-performance"] });
      queryClient.invalidateQueries({ queryKey: ["allPeladaStats"] });
    },
    onError: (err) => toast.error("Erro ao registrar evento: " + err.message),
  });
}


/** Delete a match and its related data */
export function useDeleteMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, peladaId }: { matchId: string; peladaId: string }) => {
      // Delete stats, teams, votes, award votes first
      await supabase.from("match_stats").delete().eq("match_id", matchId);
      await supabase.from("match_teams").delete().eq("match_id", matchId);
      await supabase.from("match_votes").delete().eq("match_id", matchId);
      await supabase.from("match_award_votes").delete().eq("match_id", matchId);
      const { error } = await supabase.from("matches").delete().eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: (_, { peladaId }) => {
      queryClient.invalidateQueries({ queryKey: ["activeMatch", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["finishedMatches", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["allPeladaMatches", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["allPeladaStats", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["player-performance"] });
      toast.success("Partida excluída!");
    },
    onError: (err) => toast.error("Erro ao excluir partida: " + err.message),
  });
}

/** Ends a single match WITHOUT opening voting */
export function useFinishMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, peladaId, teamAScore, teamBScore }: { matchId: string; peladaId: string; teamAScore: number; teamBScore: number }) => {
      const { error } = await supabase
        .from("matches")
        .update({
          is_finished: true,
          ended_at: new Date().toISOString(),
          team_a_score: teamAScore,
          team_b_score: teamBScore,
        })
        .eq("id", matchId);
      if (error) throw error;

      // Timeline: match_end
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const actor = userRes.user?.id;
        if (actor) {
          await supabase.from("pelada_timeline_events" as any).insert({
            pelada_id: peladaId,
            match_id: matchId,
            event_type: "match_end",
            actor_id: actor,
            payload: { team_a_score: teamAScore, team_b_score: teamBScore },
          } as any);
        }
      } catch {}
    },
    onSuccess: (_, { peladaId }) => {
      queryClient.invalidateQueries({ queryKey: ["activeMatch", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["finishedMatches", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["allPeladaMatches", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["allPeladaStats", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["player-performance"] });
      toast.success("Partida encerrada!");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

/** Ends the pelada session: finishes last match + opens voting on ALL session matches */
export function useEndPelada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, peladaId, teamAScore, teamBScore, occurrenceId }: { matchId: string; peladaId: string; teamAScore: number; teamBScore: number; occurrenceId?: string }) => {
      const votingDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Finish the current match
      const { error } = await supabase
        .from("matches")
        .update({
          is_finished: true,
          ended_at: new Date().toISOString(),
          team_a_score: teamAScore,
          team_b_score: teamBScore,
          voting_open: true,
          voting_deadline: votingDeadline,
        })
        .eq("id", matchId);
      if (error) throw error;

      // Open voting on ALL other finished matches in this session (by occurrence_id)
      if (occurrenceId) {
        await supabase
          .from("matches")
          .update({
            voting_open: true,
            voting_deadline: votingDeadline,
          })
          .eq("occurrence_id", occurrenceId)
          .eq("is_finished", true)
          .neq("id", matchId);
      }

      // Timeline: pelada_end
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const actor = userRes.user?.id;
        if (actor) {
          await supabase.from("pelada_timeline_events" as any).insert({
            pelada_id: peladaId,
            occurrence_id: occurrenceId ?? null,
            match_id: matchId,
            event_type: "pelada_end",
            actor_id: actor,
            payload: {},
          } as any);
        }
      } catch {}
    },
    onSuccess: (_, { peladaId }) => {
      queryClient.invalidateQueries({ queryKey: ["activeMatch", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["finishedMatches", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["allPeladaMatches", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["allPeladaStats", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["player-performance"] });
      queryClient.invalidateQueries({ queryKey: ["occurrenceStats", peladaId] });
      toast.success("Pelada encerrada! Votação aberta por 24h.");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });
}

export function useFinishedMatches(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["finishedMatches", peladaId],
    queryFn: async () => {
      if (!peladaId) return [];
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("pelada_id", peladaId)
        .eq("is_finished", true)
        .order("ended_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!peladaId,
  });
}

export function useSubmitVotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      matchId, voterId, ratings, awards,
    }: {
      matchId: string;
      voterId: string;
      ratings: { memberId: string; stars: number }[];
      awards: { craque?: string; fairPlay?: string; bolaMurcha?: string };
    }) => {
      if (ratings.length > 0) {
        const rows = ratings.map((r) => ({
          match_id: matchId,
          voter_id: voterId,
          rated_member_id: r.memberId,
          stars: r.stars,
        }));
        const { error } = await supabase.from("match_votes").insert(rows);
        if (error) throw error;
      }

      const awardRows: any[] = [];
      if (awards.craque) awardRows.push({ match_id: matchId, voter_id: voterId, voted_member_id: awards.craque, award_type: "craque" });
      if (awards.fairPlay) awardRows.push({ match_id: matchId, voter_id: voterId, voted_member_id: awards.fairPlay, award_type: "fair_play" });
      if (awards.bolaMurcha) awardRows.push({ match_id: matchId, voter_id: voterId, voted_member_id: awards.bolaMurcha, award_type: "bola_murcha" });
      if (awardRows.length > 0) {
        const { error } = await supabase.from("match_award_votes" as any).insert(awardRows);
        if (error) throw error;
      }
    },
    onSuccess: (_, { matchId, voterId }) => {
      queryClient.invalidateQueries({ queryKey: ["matchVotes", matchId] });
      queryClient.invalidateQueries({ queryKey: ["hasVoted", matchId, voterId] });
      queryClient.invalidateQueries({ queryKey: ["player-performance"] });
      queryClient.invalidateQueries({ queryKey: ["awardVotesAggregate"] });
      queryClient.invalidateQueries({ queryKey: ["votingProgress"] });
      toast.success("Votos registrados com sucesso!");
    },
    onError: (err) => toast.error("Erro ao votar: " + err.message),
  });
}

export function useMatchVotes(matchId: string | undefined) {
  return useQuery({
    queryKey: ["matchVotes", matchId],
    queryFn: async () => {
      if (!matchId) return { ratings: [], awards: [] };
      const { data: ratings, error: re } = await supabase
        .from("match_votes")
        .select("*")
        .eq("match_id", matchId);
      if (re) throw re;
      const { data: awards, error: ae } = await supabase
        .from("match_award_votes" as any)
        .select("*")
        .eq("match_id", matchId);
      if (ae) throw ae;
      return { ratings: ratings || [], awards: (awards || []) as any[] };
    },
    enabled: !!matchId,
  });
}

export function useHasVoted(matchId: string | undefined, voterId: string | undefined) {
  return useQuery({
    queryKey: ["hasVoted", matchId, voterId],
    queryFn: async () => {
      if (!matchId || !voterId) return false;
      const { data, error } = await supabase
        .from("match_votes")
        .select("id")
        .eq("match_id", matchId)
        .eq("voter_id", voterId)
        .limit(1);
      if (error) throw error;
      return (data || []).length > 0;
    },
    enabled: !!matchId && !!voterId,
  });
}

/** Aggregate stats across all matches in a pelada */
export function useAllPeladaStats(peladaId: string | undefined, occurrenceId?: string | null) {
  return useQuery({
    queryKey: ["allPeladaStats", peladaId, occurrenceId || "all"],
    queryFn: async () => {
      if (!peladaId) return { statsMap: {}, matchCountMap: {} };
      let query = supabase
        .from("matches")
        .select("id")
        .eq("pelada_id", peladaId)
        .eq("is_finished", true);
      
      if (occurrenceId) {
        query = query.eq("occurrence_id", occurrenceId);
      }

      const { data: matches } = await query;
      if (!matches || matches.length === 0) return { statsMap: {}, matchCountMap: {} };

      const matchIds = matches.map(m => m.id);
      const { data: stats } = await supabase
        .from("match_stats")
        .select("*")
        .in("match_id", matchIds);

      const { data: teams } = await supabase
        .from("match_teams")
        .select("match_id, pelada_member_id")
        .in("match_id", matchIds);

      // Aggregate stats per player
      const statsMap: Record<string, { goals: number; assists: number; yellow_cards: number; red_cards: number }> = {};
      (stats || []).forEach(s => {
        if (!statsMap[s.pelada_member_id]) {
          statsMap[s.pelada_member_id] = { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 };
        }
        statsMap[s.pelada_member_id].goals += s.goals;
        statsMap[s.pelada_member_id].assists += s.assists;
        statsMap[s.pelada_member_id].yellow_cards += s.yellow_cards;
        statsMap[s.pelada_member_id].red_cards += s.red_cards;
      });

      // Count matches per player
      const matchCountMap: Record<string, number> = {};
      const playerMatches: Record<string, Set<string>> = {};
      (teams || []).forEach(t => {
        if (!playerMatches[t.pelada_member_id]) playerMatches[t.pelada_member_id] = new Set();
        playerMatches[t.pelada_member_id].add(t.match_id);
      });
      Object.entries(playerMatches).forEach(([pid, mids]) => {
        matchCountMap[pid] = mids.size;
      });

      return { statsMap, matchCountMap };
    },
    enabled: !!peladaId,
  });
}
