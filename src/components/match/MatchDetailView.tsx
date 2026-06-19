import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useMatchTeams, useMatchStats } from "@/hooks/useMatchManagement";
import { getTeamStyle } from "@/lib/teamColors";
import { PlayerEventRow } from "./PlayerEventRow";

interface MatchDetailViewProps {
  match: {
    id: string;
    match_number: number;
    team_a_score: number;
    team_b_score: number;
    is_finished: boolean;
    started_at?: string | null;
    ended_at?: string | null;
  };
  members: any[];
  isAdmin: boolean;
  onBack: () => void;
  onRecordEvent?: (memberId: string, event: "goal" | "assist" | "yellow" | "red", delta: number) => void;
}

export function MatchDetailView({ match, members, isAdmin, onBack, onRecordEvent }: MatchDetailViewProps) {
  const { data: teams } = useMatchTeams(match.id);
  const { data: stats } = useMatchStats(match.id);

  const memberMap = useMemo(() => {
    const map: Record<string, any> = {};
    members?.forEach((m) => (map[m.id] = m));
    return map;
  }, [members]);

  const statsMap = useMemo(() => {
    const map: Record<string, { goals: number; assists: number; yellow_cards: number; red_cards: number }> = {};
    stats?.forEach((s) => {
      map[s.pelada_member_id] = {
        goals: s.goals,
        assists: s.assists,
        yellow_cards: s.yellow_cards,
        red_cards: s.red_cards,
      };
    });
    return map;
  }, [stats]);

  const teamGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    teams?.forEach((t) => {
      if (!groups[t.team]) groups[t.team] = [];
      groups[t.team].push(t.pelada_member_id);
    });
    return groups;
  }, [teams]);

  const teamNames = Object.keys(teamGroups).filter((n) => n !== "De Fora").sort();

  const getName = (id: string) => {
    const m = memberMap[id];
    return m?.profile?.name || m?.guest_name || "Jogador";
  };

  const getPosition = (id: string) => {
    const m = memberMap[id];
    return m?.profile?.position || m?.guest_position || "MEI";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Partida {match.match_number}
          </h3>
          <p className="text-xs text-muted-foreground">
            {match.team_a_score} × {match.team_b_score}
            {match.is_finished && " — Encerrada"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teamNames.map((teamName) => {
          const memberIds = teamGroups[teamName] || [];
          const style = getTeamStyle(teamName);
          const teamGoals = memberIds.reduce((s, id) => s + (statsMap[id]?.goals || 0), 0);

          return (
            <Card key={teamName} className={`${style.border} ${style.bg}`}>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base font-display flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full ${style.dot} inline-block`} />
                    {teamName}
                  </span>
                  <span className="text-lg font-bold text-primary">{teamGoals}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1">
                {memberIds.map((memberId) => {
                  const s = statsMap[memberId];
                  return (
                    <div key={memberId} className="flex items-center gap-2 py-1.5 px-2 rounded bg-secondary/30">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground truncate block">{getName(memberId)}</span>
                        <span className="text-[10px] text-muted-foreground">{getPosition(memberId)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] flex-shrink-0">
                        {s?.goals ? <Badge variant="outline" className="px-1 py-0 h-4 text-primary border-primary/30">⚽{s.goals}</Badge> : null}
                        {s?.assists ? <Badge variant="outline" className="px-1 py-0 h-4 text-accent border-accent/30">🅰️{s.assists}</Badge> : null}
                        {s?.yellow_cards ? <Badge variant="outline" className="px-1 py-0 h-4 text-warning border-warning/30">🟨{s.yellow_cards}</Badge> : null}
                        {s?.red_cards ? <Badge variant="outline" className="px-1 py-0 h-4 text-destructive border-destructive/30">🟥{s.red_cards}</Badge> : null}
                      </div>
                      {/* Admin inline edit for finished matches */}
                      {isAdmin && match.is_finished && onRecordEvent && (
                        <div className="flex gap-0.5 ml-1">
                          <button onClick={() => onRecordEvent(memberId, "goal", 1)} className="text-[10px] px-1 rounded hover:bg-primary/20" title="Adicionar gol">⚽+</button>
                          <button onClick={() => onRecordEvent(memberId, "goal", -1)} className="text-[10px] px-1 rounded hover:bg-destructive/20" title="Remover gol">⚽−</button>
                          <button onClick={() => onRecordEvent(memberId, "assist", 1)} className="text-[10px] px-1 rounded hover:bg-accent/20" title="Adicionar assistência">🅰️+</button>
                          <button onClick={() => onRecordEvent(memberId, "yellow", 1)} className="text-[10px] px-1 rounded hover:bg-warning/20" title="Cartão amarelo">🟨+</button>
                          <button onClick={() => onRecordEvent(memberId, "red", 1)} className="text-[10px] px-1 rounded hover:bg-destructive/20" title="Cartão vermelho">🟥+</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* De Fora */}
      {teamGroups["De Fora"] && teamGroups["De Fora"].length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <span className="text-warning">De Fora</span>
              <Badge variant="outline" className="text-xs">{teamGroups["De Fora"].length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            {teamGroups["De Fora"].map((memberId) => (
              <div key={memberId} className="flex items-center gap-2 py-1.5 px-2 rounded bg-secondary/30">
                <span className="text-sm text-foreground">{getName(memberId)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
