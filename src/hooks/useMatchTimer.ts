import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MatchTimerInfo {
  id: string;
  started_at?: string | null;
  is_paused?: boolean | null;
  paused_at?: string | null;
  paused_seconds?: number | null;
  added_time_seconds?: number | null;
}

/** Returns the elapsed seconds for a live match, accounting for pauses & added time. */
export function useMatchElapsed(match: MatchTimerInfo | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (!match || !match.started_at) return 0;
  const startMs = new Date(match.started_at).getTime();
  let pausedAccum = (match.paused_seconds || 0) * 1000;
  if (match.is_paused && match.paused_at) {
    pausedAccum += now - new Date(match.paused_at).getTime();
  }
  const elapsedMs = Math.max(0, now - startMs - pausedAccum);
  const addedMs = (match.added_time_seconds || 0) * 1000;
  return Math.floor((elapsedMs + addedMs) / 1000);
}

export function useMatchTimerActions(peladaId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["activeMatch", peladaId] });
    qc.invalidateQueries({ queryKey: ["allPeladaMatches", peladaId] });
  };

  const start = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("matches")
        .update({ started_at: new Date().toISOString(), is_paused: false, paused_at: null })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error("Erro ao iniciar: " + e.message),
  });

  const pause = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("matches")
        .update({ is_paused: true, paused_at: new Date().toISOString() })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const resume = useMutation({
    mutationFn: async (m: { matchId: string; pausedAt: string; pausedSeconds: number }) => {
      const additional = Math.max(0, Math.floor((Date.now() - new Date(m.pausedAt).getTime()) / 1000));
      const { error } = await supabase
        .from("matches")
        .update({
          is_paused: false,
          paused_at: null,
          paused_seconds: (m.pausedSeconds || 0) + additional,
        })
        .eq("id", m.matchId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addTime = useMutation({
    mutationFn: async (m: { matchId: string; currentAdded: number; deltaSeconds: number }) => {
      const { error } = await supabase
        .from("matches")
        .update({ added_time_seconds: (m.currentAdded || 0) + m.deltaSeconds })
        .eq("id", m.matchId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reset = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("matches")
        .update({
          started_at: new Date().toISOString(),
          is_paused: false,
          paused_at: null,
          paused_seconds: 0,
          added_time_seconds: 0,
        })
        .eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { start, pause, resume, addTime, reset };
}
