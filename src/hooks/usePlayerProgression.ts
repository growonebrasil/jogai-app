import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useCallback } from "react";
import { toast } from "sonner";

// ── Milestone definitions ──
export const MILESTONE_DEFINITIONS = {
  goals: [
    { threshold: 10, xp: 50, label: "10 Gols" },
    { threshold: 20, xp: 75, label: "20 Gols" },
    { threshold: 50, xp: 150, label: "50 Gols" },
    { threshold: 100, xp: 300, label: "100 Gols" },
    { threshold: 200, xp: 500, label: "200 Gols" },
    { threshold: 500, xp: 1000, label: "500 Gols" },
  ],
  assists: [
    { threshold: 10, xp: 50, label: "10 Assistências" },
    { threshold: 20, xp: 75, label: "20 Assistências" },
    { threshold: 50, xp: 150, label: "50 Assistências" },
    { threshold: 100, xp: 300, label: "100 Assistências" },
    { threshold: 200, xp: 500, label: "200 Assistências" },
    { threshold: 500, xp: 1000, label: "500 Assistências" },
  ],
} as const;

// ── Level thresholds ──
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2700, 3800, 5200, 7000, 9500, 13000,
];

export function getLevelFromXP(xp: number): { level: number; currentXP: number; nextLevelXP: number; progress: number } {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || currentThreshold + 2000;
  const progress = Math.min(100, Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100));
  return { level, currentXP: xp, nextLevelXP: nextThreshold, progress };
}

export function getNextMilestone(statType: "goals" | "assists", currentValue: number) {
  const milestones = MILESTONE_DEFINITIONS[statType];
  for (const m of milestones) {
    if (currentValue < m.threshold) return m;
  }
  return null;
}

// ── Hooks ──

export function usePlayerXP(userId: string | undefined) {
  return useQuery({
    queryKey: ["playerXP", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("player_xp" as any)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!userId,
  });
}

export function usePlayerMilestones(userId: string | undefined) {
  return useQuery({
    queryKey: ["playerMilestones", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("player_milestones" as any)
        .select("*")
        .eq("user_id", userId)
        .order("achieved_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!userId,
  });
}

// Get aggregated lifetime stats for a user across all peladas
export function useLifetimeStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["lifetimeStats", userId],
    queryFn: async () => {
      if (!userId) return { goals: 0, assists: 0 };
      // Get all pelada_member IDs for this user
      const { data: memberships } = await supabase
        .from("pelada_members")
        .select("id")
        .eq("user_id", userId);
      if (!memberships || memberships.length === 0) return { goals: 0, assists: 0 };

      const memberIds = memberships.map(m => m.id);
      const { data: stats } = await supabase
        .from("match_stats")
        .select("goals, assists")
        .in("pelada_member_id", memberIds);

      let goals = 0, assists = 0;
      (stats || []).forEach(s => {
        goals += s.goals || 0;
        assists += s.assists || 0;
      });
      return { goals, assists };
    },
    enabled: !!userId,
  });
}

export function useCheckAndAwardMilestones() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useCallback(async (lifetimeGoals: number, lifetimeAssists: number) => {
    if (!user) return;

    // Get existing milestones
    const { data: existing } = await supabase
      .from("player_milestones" as any)
      .select("stat_type, threshold")
      .eq("user_id", user.id);

    const achieved = new Set((existing || []).map((m: any) => `${m.stat_type}_${m.threshold}`));
    let newXP = 0;
    const newMilestones: { stat_type: string; threshold: number; xp_reward: number; label: string }[] = [];

    // Check goals milestones
    for (const m of MILESTONE_DEFINITIONS.goals) {
      if (lifetimeGoals >= m.threshold && !achieved.has(`goals_${m.threshold}`)) {
        newMilestones.push({ stat_type: "goals", threshold: m.threshold, xp_reward: m.xp, label: m.label });
        newXP += m.xp;
      }
    }
    // Check assists milestones
    for (const m of MILESTONE_DEFINITIONS.assists) {
      if (lifetimeAssists >= m.threshold && !achieved.has(`assists_${m.threshold}`)) {
        newMilestones.push({ stat_type: "assists", threshold: m.threshold, xp_reward: m.xp, label: m.label });
        newXP += m.xp;
      }
    }

    if (newMilestones.length === 0) return;

    // Insert new milestones
    const rows = newMilestones.map(m => ({
      user_id: user.id,
      stat_type: m.stat_type,
      threshold: m.threshold,
      xp_reward: m.xp_reward,
    }));
    await supabase.from("player_milestones" as any).insert(rows);

    // Upsert XP
    const { data: currentXP } = await supabase
      .from("player_xp" as any)
      .select("total_xp")
      .eq("user_id", user.id)
      .maybeSingle();

    const totalXP = ((currentXP as any)?.total_xp || 0) + newXP;
    const { level } = getLevelFromXP(totalXP);

    await supabase.from("player_xp" as any).upsert({
      user_id: user.id,
      total_xp: totalXP,
      level,
    } as any, { onConflict: "user_id" });

    // Show toast for each milestone
    for (const m of newMilestones) {
      toast.success(`🎉 Novo objetivo concluído! Você atingiu ${m.label}! +${m.xp_reward} XP`, {
        duration: 5000,
      });
    }

    // Invalidate queries
    qc.invalidateQueries({ queryKey: ["playerXP", user.id] });
    qc.invalidateQueries({ queryKey: ["playerMilestones", user.id] });
  }, [user, qc]);
}

// Auto-check milestones when stats change
export function useAutoMilestoneCheck() {
  const { user } = useAuth();
  const { data: lifetimeStats } = useLifetimeStats(user?.id);
  const checkMilestones = useCheckAndAwardMilestones();

  useEffect(() => {
    if (!user || !lifetimeStats) return;
    if (lifetimeStats.goals > 0 || lifetimeStats.assists > 0) {
      checkMilestones(lifetimeStats.goals, lifetimeStats.assists);
    }
  }, [lifetimeStats?.goals, lifetimeStats?.assists, user?.id]);
}
