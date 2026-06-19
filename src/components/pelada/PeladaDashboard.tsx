import { useMemo } from "react";
import { Users, CheckCircle, Clock, TrendingUp, Target, Award, Trophy, Wallet } from "lucide-react";
import { useAllPeladaStats, useAllPeladaMatches } from "@/hooks/useMatchManagement";
import { usePeladaOccurrences } from "@/hooks/useOccurrences";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PeladaDashboardProps {
  peladaId: string;
  members: any[];
  pelada: any;
  isAdmin: boolean;
}

/**
 * Mini admin dashboard for the pelada page. Aggregates the key signals the
 * president needs at a glance: roster size, attendance, top scorer/assister,
 * and an optional discreet financial summary.
 */
export function PeladaDashboard({ peladaId, members, pelada, isAdmin }: PeladaDashboardProps) {
  const { data: stats } = useAllPeladaStats(peladaId);
  const { data: occurrences } = usePeladaOccurrences(peladaId);
  const { data: allMatches } = useAllPeladaMatches(peladaId);

  const finishedOccurrences = (occurrences || []).filter((o: any) => o.status === "finished");
  const totalFinishedSessions = finishedOccurrences.length;

  const confirmedToday = (members || []).filter((m: any) => m.status === "confirmado").length;
  const totalRoster = (members || []).length;
  // Considering paid-members; if a future "is_monthly" flag exists we'd use it.
  // For now: members with user_id (registered) inside a paid pelada.
  const monthlyMembers = pelada?.is_paid
    ? (members || []).filter((m: any) => m.user_id).length
    : 0;

  const statsMap = stats?.statsMap || {};
  const matchCountMap = stats?.matchCountMap || {};

  const totals = useMemo(() => {
    let goals = 0;
    let assists = 0;
    Object.values(statsMap).forEach((s: any) => {
      goals += s.goals || 0;
      assists += s.assists || 0;
    });
    return { goals, assists };
  }, [statsMap]);

  const totalMatches = (allMatches || []).filter((m: any) => m.is_finished).length;
  const totalPresences = Object.values(matchCountMap).reduce((s: number, n: any) => s + (n || 0), 0);
  const avgPresence = totalFinishedSessions > 0 && totalRoster > 0
    ? Math.round((totalPresences / totalRoster / Math.max(1, totalMatches)) * 100)
    : 0;

  const memberById = useMemo(() => {
    const map: Record<string, any> = {};
    (members || []).forEach((m: any) => { map[m.id] = m; });
    return map;
  }, [members]);

  const playerEntries = useMemo(() =>
    Object.keys(statsMap).map((id) => ({
      id,
      goals: statsMap[id]?.goals || 0,
      assists: statsMap[id]?.assists || 0,
      name: memberById[id]?.profile?.name || memberById[id]?.guest_name || "Jogador",
      avatar_url: memberById[id]?.profile?.avatar_url || null,
    })),
  [statsMap, memberById]);

  const topScorer = [...playerEntries].sort((a, b) => b.goals - a.goals)[0];
  const topAssister = [...playerEntries].sort((a, b) => b.assists - a.assists)[0];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DashCard icon={Users} label="Jogadores" value={totalRoster} color="primary" />
        {pelada?.is_paid ? (
          <DashCard icon={Wallet} label="Mensalistas" value={monthlyMembers} color="accent" />
        ) : (
          <DashCard icon={Users} label="Cadastrados" value={(members || []).filter((m: any) => m.user_id).length} color="accent" />
        )}
        <DashCard icon={CheckCircle} label="Confirmados hoje" value={confirmedToday} color="primary" />
        <DashCard icon={Clock} label="Pendentes" value={(members || []).filter((m: any) => m.status === "pendente").length} color="warning" />
        <DashCard icon={TrendingUp} label="Presença média" value={`${avgPresence}%`} color="accent" />
        <DashCard icon={Target} label="Total de gols" value={totals.goals} color="primary" />
        <DashCard icon={Award} label="Total assist." value={totals.assists} color="accent" />
        <DashCard icon={Trophy} label="Peladas realizadas" value={totalFinishedSessions} color="primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <HighlightCard
          title="⚽ Artilheiro geral"
          name={topScorer?.name}
          metric={topScorer ? `${topScorer.goals} gols` : "Sem dados"}
          avatar_url={topScorer?.avatar_url}
        />
        <HighlightCard
          title="🤝 Garçom geral"
          name={topAssister?.name}
          metric={topAssister ? `${topAssister.assists} assist.` : "Sem dados"}
          avatar_url={topAssister?.avatar_url}
        />
      </div>
    </div>
  );
}

function DashCard({
  icon: Icon, label, value, color,
}: { icon: any; label: string; value: string | number; color: "primary" | "accent" | "warning" }) {
  const colorClass = color === "primary" ? "text-primary" : color === "accent" ? "text-accent" : "text-warning";
  return (
    <div className="gaming-card p-3 md:p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider truncate">{label}</p>
      </div>
      <p className={`font-display text-xl md:text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

function HighlightCard({
  title, name, metric, avatar_url,
}: { title: string; name?: string; metric: string; avatar_url?: string | null }) {
  return (
    <div className="gaming-card p-4 flex items-center gap-3">
      <Avatar className="w-12 h-12 border-2 border-primary/30">
        {avatar_url ? <AvatarImage src={avatar_url} /> : null}
        <AvatarFallback className="bg-secondary text-sm font-bold">
          {name?.charAt(0).toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="font-display font-bold text-foreground truncate">{name || "—"}</p>
        <p className="text-xs text-primary font-mono">{metric}</p>
      </div>
    </div>
  );
}
