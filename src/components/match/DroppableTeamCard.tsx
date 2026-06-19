import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertTriangle, Clock } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { PlayerEventRow } from "./PlayerEventRow";
import { getTeamStyle } from "@/lib/teamColors";

interface PlayerItem {
  id: string;
  name: string;
  position: string;
  overall: number;
  team: string;
  avatarUrl?: string | null;
}

interface DroppableTeamCardProps {
  teamName: string;
  players: PlayerItem[];
  isAdmin: boolean;
  isLocked: boolean;
  isOutside?: boolean;
  isWaiting?: boolean;
  stats: Record<string, { goals: number; assists: number; yellow_cards: number; red_cards: number }>;
  onEvent: (memberId: string, event: "goal" | "assist" | "yellow" | "red", delta: number) => void;
  matchId?: string;
}

export function DroppableTeamCard({ teamName, players, isAdmin, isLocked, isOutside, isWaiting, stats, onEvent, matchId }: DroppableTeamCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: teamName });
  const avgOverall = players.length > 0 ? Math.round(players.reduce((s, p) => s + p.overall, 0) / players.length) : 0;
  const teamGoals = players.reduce((s, p) => s + (stats[p.id]?.goals || 0), 0);
  const style = getTeamStyle(teamName);

  return (
    <Card
      ref={setNodeRef}
      className={`transition-all duration-200 ${isOver ? "ring-2 ring-primary shadow-lg scale-[1.01]" : ""} ${
        isOutside ? "border-warning/40 bg-warning/5" :
        isWaiting ? "border-muted opacity-60" :
        `${style.border} ${style.bg}`
      }`}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-base font-display flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isOutside ? (
              <AlertTriangle className="w-4 h-4 text-warning" />
            ) : isWaiting ? (
              <Clock className="w-4 h-4 text-muted-foreground" />
            ) : (
              <span className={`w-4 h-4 rounded-full ${style.dot} inline-block`} />
            )}
            {teamName}
            {isWaiting && (
              <span className="text-xs text-muted-foreground font-normal ml-1">Aguardando</span>
            )}
            {!isOutside && !isWaiting && teamGoals > 0 && (
              <span className="text-lg font-bold text-primary ml-1">{teamGoals}</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{players.length}</Badge>
            {!isOutside && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">OVR {avgOverall}</Badge>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1">
        {players.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            {isAdmin && !isLocked ? "Arraste jogadores aqui" : "Nenhum jogador"}
          </p>
        ) : (
          players.map((p) => (
            <PlayerEventRow
              key={p.id}
              player={p}
              isAdmin={isAdmin && !isWaiting}
              isLocked={isLocked || !!isWaiting}
              stats={stats[p.id]}
              matchId={matchId}
              onEvent={(event, delta) => onEvent(p.id, event, delta)}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
