import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export function useCurrentOccurrence(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["currentOccurrence", peladaId],
    queryFn: async () => {
      if (!peladaId) return null;
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("pelada_occurrences" as any)
        .select("*")
        .eq("pelada_id", peladaId)
        .eq("occurrence_date", today)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!peladaId,
  });
}

export function usePeladaOccurrences(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["peladaOccurrences", peladaId],
    queryFn: async () => {
      if (!peladaId) return [];
      const { data, error } = await supabase
        .from("pelada_occurrences" as any)
        .select("*")
        .eq("pelada_id", peladaId)
        .order("occurrence_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!peladaId,
  });
}

export function useCreateOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ peladaId, date, status }: { peladaId: string; date: string; status: string }) => {
      const { data, error } = await supabase
        .from("pelada_occurrences" as any)
        .upsert({
          pelada_id: peladaId,
          occurrence_date: date,
          status,
        } as any, { onConflict: "pelada_id,occurrence_date" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { peladaId }) => {
      queryClient.invalidateQueries({ queryKey: ["currentOccurrence", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["peladaOccurrences", peladaId] });
    },
  });
}

export function useUpdateOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ peladaId, date, updates }: { peladaId: string; date: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("pelada_occurrences" as any)
        .update(updates)
        .eq("pelada_id", peladaId)
        .eq("occurrence_date", date);
      if (error) throw error;
    },
    onSuccess: (_, { peladaId }) => {
      queryClient.invalidateQueries({ queryKey: ["currentOccurrence", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["peladaOccurrences", peladaId] });
    },
  });
}

export function useCancelOccurrence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ peladaId, date, reason }: { peladaId: string; date: string; reason: string }) => {
      const { error } = await supabase
        .from("pelada_occurrences" as any)
        .upsert({
          pelada_id: peladaId,
          occurrence_date: date,
          status: "canceled",
          cancel_reason: reason,
        } as any, { onConflict: "pelada_id,occurrence_date" })
        .select()
        .single();
      if (error) throw error;
    },
    onSuccess: (_, { peladaId }) => {
      queryClient.invalidateQueries({ queryKey: ["currentOccurrence", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["peladaOccurrences", peladaId] });
      toast.success("Pelada marcada como cancelada");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

export function useVotingProgress(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["votingProgress", peladaId],
    queryFn: async () => {
      if (!peladaId) return null;

      // Get all matches with voting open
      const { data: votingMatches } = await supabase
        .from("matches")
        .select("id, voting_deadline, voting_open")
        .eq("pelada_id", peladaId)
        .eq("voting_open", true);

      if (!votingMatches || votingMatches.length === 0) return null;

      const matchIds = votingMatches.map((m) => m.id);
      const votingDeadline = votingMatches[0].voting_deadline;

      // Get eligible voters (confirmed members with user_id)
      const { data: members } = await supabase
        .from("pelada_members")
        .select("id, user_id")
        .eq("pelada_id", peladaId)
        .not("user_id", "is", null);

      const eligibleVoters = (members || []).filter((m) => m.user_id);
      const totalEligible = eligibleVoters.length;

      // Get unique voter_ids who already voted
      const { data: votes } = await supabase
        .from("match_votes")
        .select("voter_id")
        .in("match_id", matchIds);

      const votedUserIds = new Set((votes || []).map((v) => v.voter_id));
      const totalVoted = eligibleVoters.filter((m) => votedUserIds.has(m.user_id!)).length;

      return {
        totalEligible,
        totalVoted,
        totalPending: totalEligible - totalVoted,
        votingDeadline,
        allVoted: totalVoted >= totalEligible,
      };
    },
    enabled: !!peladaId,
    refetchInterval: 15000, // Refresh every 15s
  });
}

export function useRealtimeOccurrences(peladaId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!peladaId) return;
    const channel = supabase
      .channel(`occurrences_${peladaId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "pelada_occurrences",
        filter: `pelada_id=eq.${peladaId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["currentOccurrence", peladaId] });
        queryClient.invalidateQueries({ queryKey: ["peladaOccurrences", peladaId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [peladaId, queryClient]);
}
