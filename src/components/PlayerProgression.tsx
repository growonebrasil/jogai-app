import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target, Award, Zap, TrendingUp, Star, Trophy,
} from "lucide-react";
import {
  usePlayerXP, usePlayerMilestones, useLifetimeStats,
  getLevelFromXP, getNextMilestone, MILESTONE_DEFINITIONS,
} from "@/hooks/usePlayerProgression";

interface PlayerProgressionProps {
  userId: string;
}

export function PlayerProgression({ userId }: PlayerProgressionProps) {
  const { data: xpData } = usePlayerXP(userId);
  const { data: milestones } = usePlayerMilestones(userId);
  const { data: lifetimeStats } = useLifetimeStats(userId);

  const totalXP = xpData?.total_xp || 0;
  const levelInfo = useMemo(() => getLevelFromXP(totalXP), [totalXP]);

  const goals = lifetimeStats?.goals || 0;
  const assists = lifetimeStats?.assists || 0;

  const nextGoalMilestone = getNextMilestone("goals", goals);
  const nextAssistMilestone = getNextMilestone("assists", assists);

  const achievedGoals = (milestones || []).filter((m: any) => m.stat_type === "goals");
  const achievedAssists = (milestones || []).filter((m: any) => m.stat_type === "assists");

  return (
    <div className="space-y-4">
      {/* Level & XP Card */}
      <div className="gaming-card p-5 border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="font-display text-2xl font-black text-primary-foreground">{levelInfo.level}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-accent rounded-full px-1.5 py-0.5">
              <Zap className="w-3 h-3 text-accent-foreground" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg font-bold text-foreground">Nível {levelInfo.level}</h3>
              <span className="text-xs text-primary font-bold">{totalXP} XP</span>
            </div>
            <Progress value={levelInfo.progress} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {totalXP} / {levelInfo.nextLevelXP} XP para o Nível {levelInfo.level + 1}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Goals progress */}
        <div className="gaming-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-foreground">Gols</h4>
              <p className="text-xs text-muted-foreground">{goals} gol(s) na carreira</p>
            </div>
          </div>
          {nextGoalMilestone ? (
            <>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Próximo: {nextGoalMilestone.label}</span>
                <span className="text-accent font-bold">+{nextGoalMilestone.xp} XP</span>
              </div>
              <Progress
                value={Math.min(100, Math.round((goals / nextGoalMilestone.threshold) * 100))}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {goals}/{nextGoalMilestone.threshold}
              </p>
            </>
          ) : (
            <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">
              <Trophy className="w-3 h-3 mr-1" /> Todos os marcos atingidos!
            </Badge>
          )}
          {achievedGoals.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {achievedGoals.map((m: any) => (
                <Badge key={m.id} variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/30">
                  ⚽ {m.threshold}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Assists progress */}
        <div className="gaming-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Award className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h4 className="font-display text-sm font-bold text-foreground">Assistências</h4>
              <p className="text-xs text-muted-foreground">{assists} assist(s) na carreira</p>
            </div>
          </div>
          {nextAssistMilestone ? (
            <>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Próximo: {nextAssistMilestone.label}</span>
                <span className="text-primary font-bold">+{nextAssistMilestone.xp} XP</span>
              </div>
              <Progress
                value={Math.min(100, Math.round((assists / nextAssistMilestone.threshold) * 100))}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {assists}/{nextAssistMilestone.threshold}
              </p>
            </>
          ) : (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
              <Trophy className="w-3 h-3 mr-1" /> Todos os marcos atingidos!
            </Badge>
          )}
          {achievedAssists.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {achievedAssists.map((m: any) => (
                <Badge key={m.id} variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  🎯 {m.threshold}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent milestones */}
      {milestones && milestones.length > 0 && (
        <div className="gaming-card p-4">
          <h4 className="font-display text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-warning" /> Marcos Atingidos
          </h4>
          <div className="space-y-2">
            {milestones.slice(0, 6).map((m: any) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {m.stat_type === "goals" ? "⚽" : "🎯"}
                  </span>
                  <span className="text-sm text-foreground font-medium">
                    {m.threshold} {m.stat_type === "goals" ? "Gols" : "Assistências"}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs text-accent border-accent/30">
                  +{m.xp_reward} XP
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for profile header
export function PlayerLevelBadge({ userId }: { userId: string }) {
  const { data: xpData } = usePlayerXP(userId);
  const totalXP = xpData?.total_xp || 0;
  const levelInfo = useMemo(() => getLevelFromXP(totalXP), [totalXP]);

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30">
      <Zap className="w-3 h-3 text-accent" />
      <span className="text-xs font-bold text-foreground">Nível {levelInfo.level}</span>
      <span className="text-[10px] text-muted-foreground">{totalXP} XP</span>
    </div>
  );
}
