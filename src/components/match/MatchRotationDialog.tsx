import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, ArrowRight, Shuffle, Dice5, Users } from "lucide-react";
import { getTeamStyle } from "@/lib/teamColors";

export type MatchRuleType = "rei_da_mesa" | "sorteio" | "manual";

interface PlayerItem {
  id: string;
  name: string;
  position: string;
  overall: number;
  team: string;
  avatarUrl?: string | null;
}

interface MatchRotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleType: MatchRuleType;
  playingTeams: [string, string];
  teamAScore: number;
  teamBScore: number;
  allTeamNames: string[];
  deForaPlayers: PlayerItem[];
  onConfirmRotation: (nextPlaying: [string, string], teamAssignmentChanges?: { playerId: string; newTeam: string }[]) => void;
}

export function MatchRotationDialog({
  open, onOpenChange, ruleType, playingTeams, teamAScore, teamBScore,
  allTeamNames, deForaPlayers, onConfirmRotation,
}: MatchRotationDialogProps) {
  const waitingTeams = allTeamNames.filter(n => !playingTeams.includes(n) && n !== "De Fora");
  const nextWaiting = waitingTeams[0];

  const isDraw = teamAScore === teamBScore;
  const winnerTeam = teamAScore > teamBScore ? playingTeams[0] : playingTeams[1];
  const loserTeam = teamAScore > teamBScore ? playingTeams[1] : playingTeams[0];

  const suggestedNext = useMemo((): [string, string] => {
    if (allTeamNames.filter(n => n !== "De Fora").length <= 2) {
      return [playingTeams[0], playingTeams[1]];
    }

    if (ruleType === "rei_da_mesa") {
      if (isDraw) {
        const stayer = Math.random() > 0.5 ? playingTeams[0] : playingTeams[1];
        const leaver = stayer === playingTeams[0] ? playingTeams[1] : playingTeams[0];
        return nextWaiting ? [stayer, nextWaiting] : [stayer, leaver];
      }
      return nextWaiting ? [winnerTeam, nextWaiting] : [winnerTeam, loserTeam];
    }

    if (ruleType === "sorteio") {
      if (isDraw) {
        const stayer = Math.random() > 0.5 ? playingTeams[0] : playingTeams[1];
        const leaver = stayer === playingTeams[0] ? playingTeams[1] : playingTeams[0];
        return nextWaiting ? [stayer, nextWaiting] : [stayer, leaver];
      }
      return nextWaiting ? [winnerTeam, nextWaiting] : [winnerTeam, loserTeam];
    }

    return [playingTeams[0], playingTeams[1]];
  }, [ruleType, isDraw, winnerTeam, loserTeam, nextWaiting, playingTeams, allTeamNames]);

  const [nextPlayingA, setNextPlayingA] = useState(suggestedNext[0]);
  const [nextPlayingB, setNextPlayingB] = useState(suggestedNext[1]);

  const availableForSlot = allTeamNames.filter(n => n !== "De Fora");

  const handleConfirm = () => {
    onConfirmRotation([nextPlayingA, nextPlayingB]);
    onOpenChange(false);
  };

  const resultLabel = isDraw ? "Empate!" : `${winnerTeam} venceu!`;
  const resultIcon = isDraw ? "🤝" : "🏆";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            Rotação de Times
          </DialogTitle>
          <DialogDescription>
            Defina quem joga a próxima partida
          </DialogDescription>
        </DialogHeader>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Resultado</p>
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${getTeamStyle(playingTeams[0]).dot} inline-block`} />
                <span className="font-display font-bold">{playingTeams[0]}</span>
                <span className="text-xl font-bold text-primary">{teamAScore}</span>
              </div>
              <span className="text-muted-foreground font-bold">×</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-primary">{teamBScore}</span>
                <span className="font-display font-bold">{playingTeams[1]}</span>
                <span className={`w-3 h-3 rounded-full ${getTeamStyle(playingTeams[1]).dot} inline-block`} />
              </div>
            </div>
            <p className="mt-2 text-sm font-medium">
              {resultIcon} {resultLabel}
            </p>
          </CardContent>
        </Card>

        <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 flex items-center gap-2">
          {ruleType === "rei_da_mesa" && <><Crown className="w-4 h-4 text-primary shrink-0" /> Rei da Mesa: vencedor fica, perdedor sai</>}
          {ruleType === "sorteio" && <><Dice5 className="w-4 h-4 text-primary shrink-0" /> Sorteio: em empate, sistema sorteia quem fica</>}
          {ruleType === "manual" && <><Users className="w-4 h-4 text-primary shrink-0" /> Manual: você decide quem joga</>}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Próxima partida:</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Em campo</label>
              <select
                value={nextPlayingA}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === nextPlayingB) setNextPlayingB(nextPlayingA);
                  setNextPlayingA(val);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-medium"
              >
                {availableForSlot.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <span className="text-muted-foreground font-bold text-lg mt-5">×</span>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Em campo</label>
              <select
                value={nextPlayingB}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === nextPlayingA) setNextPlayingA(nextPlayingB);
                  setNextPlayingB(val);
                }}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-medium"
              >
                {availableForSlot.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          {availableForSlot.filter(n => n !== nextPlayingA && n !== nextPlayingB).length > 0 && (
            <p className="text-xs text-muted-foreground">
              Aguardando: {availableForSlot.filter(n => n !== nextPlayingA && n !== nextPlayingB).join(", ")}
            </p>
          )}
          {deForaPlayers.length > 0 && (
            <p className="text-xs text-muted-foreground">
              De Fora: {deForaPlayers.length} jogador{deForaPlayers.length > 1 ? "es" : ""}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} className="glow-primary">
            <ArrowRight className="w-4 h-4" /> Iniciar Próxima Partida
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
