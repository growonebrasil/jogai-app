import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowLeft, Clock, Play, ChevronRight, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAllPeladaMatches, useRecordMatchEvent, useDeleteMatch } from "@/hooks/useMatchManagement";
import { MatchManagement } from "@/components/MatchManagement";
import { MatchDetailView } from "./MatchDetailView";
import { GeneratedTeam } from "@/components/TeamDrawModal";
import { getTeamStyle } from "@/lib/teamColors";
import { supabase } from "@/integrations/supabase/client";
import { VotingStatusTracker } from "./VotingStatusTracker";

interface LivePeladaScreenProps {
  peladaId: string;
  matchId?: string | null;
  initialTeams?: GeneratedTeam[];
  isAdmin: boolean;
  members: any[];
  peladaName: string;
  peladaData?: any;
  onExit: () => void;
  onResort?: () => void;
  onClose?: () => void;
}

export function LivePeladaScreen({
  peladaId,
  matchId,
  initialTeams,
  isAdmin,
  members,
  peladaName,
  peladaData,
  onExit,
  onResort,
  onClose,
}: LivePeladaScreenProps) {
  const { data: allMatches } = useAllPeladaMatches(peladaId);
  const recordEvent = useRecordMatchEvent();
  const deleteMatch = useDeleteMatch();
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Note: is_live is controlled explicitly by start/end pelada flow (MatchManagement).
  // Do NOT auto-set/clear here — that would break the persistent Modo Ação session
  // across navigations or page refresh.


  const finishedMatches = useMemo(
    () => (allMatches || []).filter((m) => m.is_finished).sort((a, b) => a.match_number - b.match_number),
    [allMatches]
  );

  const activeMatch = useMemo(
    () => (allMatches || []).find((m) => !m.is_finished),
    [allMatches]
  );

  const selectedMatch = useMemo(
    () => finishedMatches.find((m) => m.id === selectedMatchId),
    [finishedMatches, selectedMatchId]
  );

  const isVotingOpen = finishedMatches.some((m) => m.voting_open);

  const handleDeleteMatch = (matchIdToDelete: string) => {
    deleteMatch.mutate({ matchId: matchIdToDelete, peladaId });
    if (selectedMatchId === matchIdToDelete) {
      setSelectedMatchId(null);
    }
  };

  // If viewing a specific past match detail
  if (selectedMatch) {
    return (
      <div className="space-y-4">
        <MatchDetailView
          match={selectedMatch}
          members={members}
          isAdmin={isAdmin}
          onBack={() => setSelectedMatchId(null)}
          onRecordEvent={
            isAdmin
              ? (memberId, event, delta) =>
                  recordEvent.mutate({ matchId: selectedMatch.id, memberId, event, delta })
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onExit}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl md:text-2xl font-bold text-foreground truncate">
            🏟️ {peladaName}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {activeMatch && (
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs animate-pulse">
                <Clock className="w-3 h-3 mr-1" /> AO VIVO
              </Badge>
            )}
            {isVotingOpen && (
              <Badge className="bg-accent/20 text-accent border-accent/30 text-xs">
                Votação aberta
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {(allMatches || []).length} partida{(allMatches || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Voting Status Tracker */}
      {isVotingOpen && (
        <VotingStatusTracker peladaId={peladaId} isAdmin={isAdmin} />
      )}

      {/* SECTION 1 — Current Match / Match Management */}
      <div>
        <MatchManagement
          peladaId={peladaId}
          matchId={matchId || activeMatch?.id || null}
          initialTeams={initialTeams}
          isAdmin={isAdmin}
          members={members}
          onClose={onClose}
          onResort={onResort}
          peladaData={peladaData}
        />
      </div>

      {/* SECTION 3 — Match History */}
      {finishedMatches.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Histórico de Partidas
          </h3>
          <div className="space-y-2">
            {finishedMatches.map((match) => (
              <Card key={match.id} className="border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-3 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedMatchId(match.id)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    <Badge
                      variant="outline"
                      className="text-xs font-mono min-w-[60px] justify-center"
                    >
                      #{match.match_number}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Partida {match.match_number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {match.team_a_score} × {match.team_b_score}
                        {match.ended_at && (
                          <> · {new Date(match.ended_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</>
                        )}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            disabled={deleteMatch.isPending}
                          >
                            {deleteMatch.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deseja excluir esta partida?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Todos os dados desta partida (gols, assistências, cartões) serão removidos permanentemente. As estatísticas dos jogadores serão recalculadas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteMatch(match.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir Partida
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
