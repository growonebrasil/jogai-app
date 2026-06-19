import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Play, X, Crown, Clock } from "lucide-react";
import { getTeamStyle } from "@/lib/teamColors";

export interface PMSPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
}
export interface PMSStats {
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
}

interface PostMatchSummaryProps {
  open: boolean;
  onClose: () => void;
  matchNumber: number;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  players: PMSPlayer[];
  stats: Record<string, PMSStats>;
  startedAt?: string | null;
  endedAt?: string | null;
  isAdmin: boolean;
  onNextMatch: () => void;
  onEndDay: () => void;
}

function formatDuration(startedAt?: string | null, endedAt?: string | null): string {
  if (!startedAt || !endedAt) return "—";
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (ms <= 0) return "—";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

export function PostMatchSummary({
  open, onClose, matchNumber, teamAName, teamBName, teamAScore, teamBScore,
  players, stats, startedAt, endedAt, isAdmin, onNextMatch, onEndDay,
}: PostMatchSummaryProps) {
  const winner = useMemo(() => {
    if (teamAScore > teamBScore) return teamAName;
    if (teamBScore > teamAScore) return teamBName;
    return null;
  }, [teamAScore, teamBScore, teamAName, teamBName]);

  if (!open) return null;

  const styleA = getTeamStyle(teamAName);
  const styleB = getTeamStyle(teamBName);

  const playersWithStats = players
    .map((p) => ({ ...p, stats: stats[p.id] || { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 } }));

  const goalScorers = playersWithStats.filter((p) => p.stats.goals > 0).sort((a, b) => b.stats.goals - a.stats.goals);
  const assisters = playersWithStats.filter((p) => p.stats.assists > 0).sort((a, b) => b.stats.assists - a.stats.assists);
  const yellows = playersWithStats.filter((p) => p.stats.yellow_cards > 0);
  const reds = playersWithStats.filter((p) => p.stats.red_cards > 0);

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto animate-fade-in">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_60%)]" />

      <div className="relative max-w-2xl mx-auto p-4 pb-32 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Badge className="bg-primary/20 text-primary border-primary/40 font-bold tracking-wider">
            PARTIDA {matchNumber} ENCERRADA
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-11 w-11">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Winner badge */}
        <div className="text-center space-y-1">
          {winner ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/40">
              <Crown className="w-5 h-5 text-accent" />
              <span className="font-display font-bold text-accent uppercase tracking-wider text-sm">
                {winner} venceu
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/30 border border-border">
              <span className="font-display font-bold text-muted-foreground uppercase tracking-wider text-sm">Empate</span>
            </div>
          )}
        </div>

        {/* Giant scoreboard */}
        <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur p-5">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className={`w-3 h-3 rounded-full ${styleA.dot}`} />
                <p className="font-display font-bold text-sm uppercase truncate">{teamAName}</p>
              </div>
              <p className="font-display font-black text-6xl text-foreground leading-none tabular-nums drop-shadow-[0_0_15px_hsl(var(--primary)/0.4)]">
                {teamAScore}
              </p>
            </div>
            <span className="text-muted-foreground font-display font-bold text-3xl">×</span>
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <p className="font-display font-bold text-sm uppercase truncate">{teamBName}</p>
                <span className={`w-3 h-3 rounded-full ${styleB.dot}`} />
              </div>
              <p className="font-display font-black text-6xl text-foreground leading-none tabular-nums drop-shadow-[0_0_15px_hsl(var(--primary)/0.4)]">
                {teamBScore}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Duração: {formatDuration(startedAt, endedAt)}
          </div>
        </div>

        {/* Stats sections */}
        <SummarySection title="⚽ Gols" items={goalScorers.map(p => `${p.name} (${p.stats.goals})`)} />
        <SummarySection title="🅰️ Assistências" items={assisters.map(p => `${p.name} (${p.stats.assists})`)} />
        <SummarySection title="🟨 Cartões amarelos" items={yellows.map(p => `${p.name} (${p.stats.yellow_cards})`)} />
        <SummarySection title="🟥 Cartões vermelhos" items={reds.map(p => `${p.name} (${p.stats.red_cards})`)} accent="destructive" />

        {/* Players */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" /> Participantes ({players.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[teamAName, teamBName].map((t) => {
              const s = getTeamStyle(t);
              const ps = players.filter(p => p.team === t);
              return (
                <div key={t} className={`rounded-lg border ${s.border} ${s.bg} p-2`}>
                  <div className="flex items-center gap-2 px-1 py-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                    <p className="font-display font-bold text-xs uppercase">{t}</p>
                  </div>
                  <div className="space-y-0.5">
                    {ps.map(p => (
                      <div key={p.id} className="text-sm text-foreground/90 px-1 flex justify-between">
                        <span className="truncate">{p.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">{p.position}</span>
                      </div>
                    ))}
                    {ps.length === 0 && <p className="text-xs text-muted-foreground px-1 py-1">Sem jogadores</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky CTA bar */}
      {isAdmin && (
        <div className="fixed bottom-0 inset-x-0 z-[110] border-t border-border/60 bg-background/95 backdrop-blur px-4 py-3">
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={onNextMatch}
              className="h-14 text-base font-display font-bold tracking-wider bg-gradient-to-r from-primary to-accent glow-primary"
            >
              <Play className="w-5 h-5" /> Iniciar Nova Partida
            </Button>
            <Button
              onClick={onEndDay}
              variant="destructive"
              className="h-14 text-base font-display font-bold tracking-wider"
            >
              <X className="w-5 h-5" /> Finalizar Pelada do Dia
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummarySection({ title, items, accent }: { title: string; items: string[]; accent?: "destructive" }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <p className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <Badge
            key={i}
            variant="outline"
            className={accent === "destructive" ? "border-destructive/40 text-destructive" : ""}
          >
            {it}
          </Badge>
        ))}
      </div>
    </div>
  );
}
