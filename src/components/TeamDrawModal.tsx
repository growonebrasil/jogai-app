import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shuffle, Users, Trophy, AlertTriangle, Info, Sparkles } from "lucide-react";
import { TEAM_COLOR_NAMES, getTeamStyle } from "@/lib/teamColors";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlayerData {
  id: string;
  user_id: string | null;
  name: string;
  position: string;
  overall: number;
  age?: number;
  goals?: number;
  assists?: number;
  avgRating?: number;
}

interface TeamDrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: PlayerData[];
  onTeamsGenerated: (teams: GeneratedTeam[]) => void;
}

export interface GeneratedTeam {
  name: string;
  players: PlayerData[];
  avgOverall: number;
}

// ---------- INTELLIGENT BALANCING ----------

function balanceTeams(players: PlayerData[], numTeams: number, playersPerTeam: number): GeneratedTeam[] {
  const totalSlots = numTeams * playersPerTeam;

  const posGroups: Record<string, PlayerData[]> = {};
  const posOrder = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

  for (const p of players) {
    const pos = p.position || "MEI";
    if (!posGroups[pos]) posGroups[pos] = [];
    posGroups[pos].push(p);
  }

  // Score based purely on card overall (player_cards.overall)
  const scorePlayer = (p: PlayerData) => p.overall;

  for (const pos in posGroups) {
    posGroups[pos].sort((a, b) => scorePlayer(b) - scorePlayer(a));
  }

  const teams: PlayerData[][] = Array.from({ length: numTeams }, () => []);
  const assigned = new Set<string>();

  for (const pos of posOrder) {
    const group = posGroups[pos] || [];
    let direction = 1;
    let teamIdx = 0;

    for (const player of group) {
      if (assigned.size >= totalSlots) break;
      if (assigned.has(player.id)) continue;

      let found = false;
      for (let attempt = 0; attempt < numTeams; attempt++) {
        const idx = (teamIdx + attempt * direction + numTeams * 2) % numTeams;
        const actualIdx = Math.abs(idx) % numTeams;
        if (teams[actualIdx].length < playersPerTeam) {
          teams[actualIdx].push(player);
          assigned.add(player.id);
          teamIdx = actualIdx + direction;
          if (teamIdx >= numTeams) { direction = -1; teamIdx = numTeams - 1; }
          else if (teamIdx < 0) { direction = 1; teamIdx = 0; }
          found = true;
          break;
        }
      }
      if (!found) {
        const idx = teams.findIndex(t => t.length < playersPerTeam);
        if (idx !== -1) {
          teams[idx].push(player);
          assigned.add(player.id);
        }
      }
    }
  }

  const remaining = players.filter(p => !assigned.has(p.id));
  remaining.sort((a, b) => scorePlayer(b) - scorePlayer(a));
  for (const player of remaining) {
    if (assigned.size >= totalSlots) break;
    const idx = teams
      .map((t, i) => ({ i, len: t.length, score: t.reduce((s, p) => s + scorePlayer(p), 0) }))
      .filter(t => t.len < playersPerTeam)
      .sort((a, b) => a.score - b.score)[0];
    if (idx) {
      teams[idx.i].push(player);
      assigned.add(player.id);
    }
  }

  for (let iter = 0; iter < 50; iter++) {
    const teamScores = teams.map(t => t.reduce((s, p) => s + scorePlayer(p), 0) / (t.length || 1));
    const maxIdx = teamScores.indexOf(Math.max(...teamScores));
    const minIdx = teamScores.indexOf(Math.min(...teamScores));
    if (maxIdx === minIdx || teamScores[maxIdx] - teamScores[minIdx] < 1.5) break;

    let bestSwap: { i: number; j: number; improvement: number } | null = null;
    for (let i = 0; i < teams[maxIdx].length; i++) {
      for (let j = 0; j < teams[minIdx].length; j++) {
        const oldDiff = teamScores[maxIdx] - teamScores[minIdx];
        const swapDelta = scorePlayer(teams[maxIdx][i]) - scorePlayer(teams[minIdx][j]);
        const newDiff = Math.abs(oldDiff - 2 * swapDelta / (teams[maxIdx].length || 1));
        if (newDiff < oldDiff && (!bestSwap || (oldDiff - newDiff) > bestSwap.improvement)) {
          bestSwap = { i, j, improvement: oldDiff - newDiff };
        }
      }
    }
    if (bestSwap) {
      const tmp = teams[maxIdx][bestSwap.i];
      teams[maxIdx][bestSwap.i] = teams[minIdx][bestSwap.j];
      teams[minIdx][bestSwap.j] = tmp;
    } else break;
  }

  const outsidePlayers = players.filter(p => !assigned.has(p.id));

  const result: GeneratedTeam[] = teams.map((t, i) => ({
    name: TEAM_COLOR_NAMES[i] || `Time ${i + 1}`,
    players: t,
    avgOverall: t.length > 0 ? Math.round(t.reduce((s, p) => s + p.overall, 0) / t.length) : 0,
  }));

  if (outsidePlayers.length > 0) {
    result.push({
      name: "De Fora",
      players: outsidePlayers,
      avgOverall: outsidePlayers.length > 0 ? Math.round(outsidePlayers.reduce((s, p) => s + p.overall, 0) / outsidePlayers.length) : 0,
    });
  }

  return result;
}

const positionLabels: Record<string, string> = {
  GOL: "GOL", ZAG: "ZAG", LAT: "LAT", VOL: "VOL", MEI: "MEI", ATA: "ATA",
};

export function TeamDrawModal({ open, onOpenChange, players, onTeamsGenerated }: TeamDrawModalProps) {
  const [numTeams, setNumTeams] = useState("2");
  const [playersPerTeam, setPlayersPerTeam] = useState("5");
  const [generatedTeams, setGeneratedTeams] = useState<GeneratedTeam[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isAIDrawing, setIsAIDrawing] = useState(false);
  const [lastSource, setLastSource] = useState<"local" | "ai" | "ai_fallback" | null>(null);

  const nt = parseInt(numTeams);
  const ppt = parseInt(playersPerTeam);
  const totalNeeded = nt * ppt;
  const extraPlayers = players.length - totalNeeded;
  const suggestExtraTeam = extraPlayers >= ppt;

  const handleDraw = () => {
    setIsDrawing(true);
    setTimeout(() => {
      const teams = balanceTeams(players, nt, ppt);
      setGeneratedTeams(teams);
      setLastSource("local");
      setIsDrawing(false);
    }, 600);
  };

  const handleAIDraw = async () => {
    setIsAIDrawing(true);
    try {
      // Use only the first totalNeeded players (highest overall) — same as local
      const pool = [...players].sort((a, b) => b.overall - a.overall);
      const selected = pool.slice(0, totalNeeded);
      const outside = pool.slice(totalNeeded);

      const payload = {
        num_teams: nt,
        team_size: ppt,
        players: selected.map((p) => ({
          member_id: p.id,
          name: p.name,
          overall: p.overall,
          position: p.position,
          recent_avg: p.avgRating,
        })),
      };

      const { data, error } = await supabase.functions.invoke("balance-teams", { body: payload });
      if (error) throw error;
      if (!data?.teams || !Array.isArray(data.teams)) throw new Error("Resposta inválida");

      const result: GeneratedTeam[] = data.teams.map((t: any, i: number) => {
        const teamPlayers = (t.players as string[])
          .map((id) => selected.find((p) => p.id === id))
          .filter(Boolean) as typeof selected;
        return {
          name: TEAM_COLOR_NAMES[i] || t.name || `Time ${i + 1}`,
          players: teamPlayers,
          avgOverall: teamPlayers.length
            ? Math.round(teamPlayers.reduce((s, p) => s + p.overall, 0) / teamPlayers.length)
            : 0,
        };
      });

      if (outside.length > 0) {
        result.push({
          name: "De Fora",
          players: outside,
          avgOverall: Math.round(outside.reduce((s, p) => s + p.overall, 0) / outside.length),
        });
      }

      setGeneratedTeams(result);
      setLastSource(data.source === "ai" ? "ai" : "ai_fallback");
      if (data.source !== "ai") {
        toast.info("IA indisponível — usado balanceamento local");
      } else {
        toast.success("Times balanceados pela IA");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Falha na IA — usando sorteio local");
      const teams = balanceTeams(players, nt, ppt);
      setGeneratedTeams(teams);
      setLastSource("local");
    } finally {
      setIsAIDrawing(false);
    }
  };


  const handleConfirm = () => {
    if (generatedTeams) {
      onTeamsGenerated(generatedTeams);
      setGeneratedTeams(null);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setGeneratedTeams(null);
    onOpenChange(false);
  };

  // Swap team color
  const handleSwapColor = (teamIdx: number, newColor: string) => {
    if (!generatedTeams) return;
    const updatedTeams = generatedTeams.map((t, i) => {
      if (i === teamIdx) return { ...t, name: newColor };
      if (t.name === newColor) return { ...t, name: generatedTeams[teamIdx].name };
      return t;
    });
    setGeneratedTeams(updatedTeams);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-primary" />
            Sortear Times
          </DialogTitle>
        </DialogHeader>

        {!generatedTeams ? (
          <div className="space-y-5 py-2">
            <div className="bg-secondary/50 rounded-lg p-3 text-sm text-muted-foreground">
              <Users className="w-4 h-4 inline mr-1.5 text-primary" />
              <strong className="text-foreground">{players.length}</strong> jogadores disponíveis para o sorteio
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº de times</Label>
                <Select value={numTeams} onValueChange={setNumTeams}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 9 }, (_, i) => i + 2).map(n => (
                      <SelectItem key={n} value={String(n)}>{n} times</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jogadores por time</Label>
                <Select value={playersPerTeam} onValueChange={setPlayersPerTeam}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n} jogador{n > 1 ? "es" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-card rounded-lg border border-border p-3 space-y-1">
              <p className="text-sm text-foreground">
                <strong>{nt}</strong> times × <strong>{ppt}</strong> jogadores = <strong>{totalNeeded}</strong> vagas
              </p>
              {extraPlayers > 0 && (
                <p className="text-sm text-warning flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {extraPlayers} jogador{extraPlayers > 1 ? "es" : ""} ficará(ão) de fora
                </p>
              )}
              {extraPlayers < 0 && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Jogadores insuficientes! Faltam {Math.abs(extraPlayers)}
                </p>
              )}
              {suggestExtraTeam && (
                <p className="text-xs text-accent flex items-center gap-1.5 mt-1">
                  <Info className="w-3.5 h-3.5" />
                  Dica: com {players.length} jogadores, você pode criar {Math.floor(players.length / ppt)} times de {ppt}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <p className="text-xs text-muted-foreground w-full">Cores dos times:</p>
              {TEAM_COLOR_NAMES.slice(0, nt).map((color) => {
                const style = getTeamStyle(color);
                return (
                  <span key={color} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`w-3 h-3 rounded-full ${style.dot} inline-block`} />
                    {color}
                  </span>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              <strong>IA</strong>: balanceia posição, overall e nível dos jogadores via modelo do Lovable AI Gateway. <br/>
              <strong>Clássico</strong>: snake draft determinístico (rápido, sem rede).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                onClick={handleAIDraw}
                className="w-full glow-primary bg-gradient-to-r from-primary to-accent"
                disabled={isAIDrawing || isDrawing || players.length < nt * 2}
              >
                {isAIDrawing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Pensando...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Sortear com IA</>
                )}
              </Button>
              <Button
                onClick={handleDraw}
                variant="outline"
                className="w-full"
                disabled={isDrawing || isAIDrawing || players.length < nt}
              >
                {isDrawing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sorteando...</>
                ) : (
                  <><Shuffle className="w-4 h-4" /> Sortear Clássico</>
                )}
              </Button>
            </div>

          </div>
        ) : (
          <div className="space-y-4 py-2">
            {generatedTeams.map((team, idx) => {
              const isOutside = team.name === "De Fora";
              const style = getTeamStyle(team.name);
              const availableColors = TEAM_COLOR_NAMES.filter(c =>
                c === team.name || !generatedTeams.some(t => t.name === c)
              );

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 ${isOutside ? "border-warning/40 bg-warning/5" : `${style.border} ${style.bg}`}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                      {isOutside ? (
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      ) : (
                        <>
                          <span className={`w-4 h-4 rounded-full ${style.dot} inline-block`} />
                        </>
                      )}
                      {isOutside ? (
                        "De Fora"
                      ) : (
                        <Select
                          value={team.name}
                          onValueChange={(v) => handleSwapColor(idx, v)}
                        >
                          <SelectTrigger className="border-0 bg-transparent h-auto p-0 font-display font-bold text-foreground shadow-none focus:ring-0 w-auto gap-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColors.map(c => {
                              const cs = getTeamStyle(c);
                              return (
                                <SelectItem key={c} value={c}>
                                  <span className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${cs.dot} inline-block`} />
                                    {c}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{team.players.length} jogadores</Badge>
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        Média: {team.avgOverall}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {team.players.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary/30">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary w-7 text-center">{p.overall}</span>
                          <span className="text-sm text-foreground">{p.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">{positionLabels[p.position] || p.position}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-center">
              {lastSource === "ai" && (
                <Badge className="bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30">
                  <Sparkles className="w-3 h-3 mr-1" /> Balanceado por IA
                </Badge>
              )}
              {lastSource === "ai_fallback" && (
                <Badge variant="outline" className="text-warning border-warning/40">
                  IA indisponível — usado snake draft
                </Badge>
              )}
              {lastSource === "local" && (
                <Badge variant="outline" className="text-muted-foreground">
                  Sorteio clássico
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => { setGeneratedTeams(null); handleAIDraw(); }} disabled={isAIDrawing}>
                <Sparkles className="w-4 h-4" /> IA novamente
              </Button>
              <Button variant="outline" onClick={() => { setGeneratedTeams(null); handleDraw(); }} disabled={isDrawing}>
                <Shuffle className="w-4 h-4" /> Clássico
              </Button>
              <Button className="glow-primary" onClick={handleConfirm}>
                Confirmar Times
              </Button>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
