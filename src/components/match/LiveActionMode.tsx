import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Square, X, ChevronLeft, Power, History, Play, Pause, Plus, RotateCcw, UserPlus, Palette, Flag } from "lucide-react";
import { getTeamStyle, TEAM_COLOR_NAMES, teamShortLabel, teamDisplayLabel } from "@/lib/teamColors";
import { useMatchElapsed, useMatchTimerActions } from "@/hooks/useMatchTimer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type EventType = "goal" | "assist" | "yellow" | "red";

interface PlayerItem {
  id: string;
  name: string;
  position: string;
  team: string;
}

interface LiveEvent {
  id: string;
  ts: number;
  minute: number;
  type: EventType;
  team: string;
  playerId: string;
  playerName: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
}

interface LiveActionModeProps {
  open: boolean;
  onClose: () => void;
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  playersTeamA: PlayerItem[];
  playersTeamB: PlayerItem[];
  onRecordEvent: (memberId: string, event: EventType, delta: number, meta?: { team?: string; minute?: number }) => void;
  onEndMatch?: (opts?: { coinFlipWinner?: string }) => void;
  onEndPelada?: () => void;
  matchId?: string | null;
  matchNumber?: number;
  peladaId?: string;
  match?: any; // db match row for timer fields
  allTeams?: string[]; // all regular teams
  outsideTeam?: PlayerItem[]; // De Fora
  onSwapPlayingTeam?: (slot: 0 | 1, newTeam: string) => void;
  onRenameTeam?: (oldName: string, newName: string) => void;
  onAddPlayer?: () => void;
}

const EVENT_META: Record<EventType, { label: string; icon: string; cls: string }> = {
  goal: { label: "GOL", icon: "⚽", cls: "bg-success text-success-foreground border-success shadow-[0_0_40px_hsl(var(--success)/0.5)]" },
  assist: { label: "ASSISTÊNCIA", icon: "🅰️", cls: "bg-primary text-primary-foreground border-primary shadow-[0_0_40px_hsl(var(--primary)/0.5)]" },
  yellow: { label: "AMARELO", icon: "🟨", cls: "bg-warning text-warning-foreground border-warning shadow-[0_0_30px_hsl(var(--warning)/0.5)]" },
  red: { label: "VERMELHO", icon: "🟥", cls: "bg-destructive text-destructive-foreground border-destructive shadow-[0_0_30px_hsl(var(--destructive)/0.5)]" },
};

function vibrate(ms: number | number[] = 30) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as any).vibrate(ms);
    }
  } catch {}
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

type FlowStep =
  | { kind: "team"; event: EventType }
  | { kind: "player"; event: EventType; team: string }
  | { kind: "assistAsk"; goalTeam: string; goalPlayer: PlayerItem }
  | { kind: "assistPlayer"; goalTeam: string; goalPlayer: PlayerItem };

export function LiveActionMode({
  open,
  onClose,
  teamAName,
  teamBName,
  teamAScore,
  teamBScore,
  playersTeamA,
  playersTeamB,
  onRecordEvent,
  onEndMatch,
  onEndPelada,
  matchId,
  matchNumber,
  peladaId,
  match,
  allTeams = [],
  outsideTeam = [],
  onSwapPlayingTeam,
  onRenameTeam,
  onAddPlayer,
}: LiveActionModeProps) {
  const [flow, setFlow] = useState<FlowStep | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const timerActions = useMatchTimerActions(peladaId || "");
  const persistedElapsed = useMatchElapsed(match);
  const isTimerRunning = !!match?.started_at && !match?.is_paused;
  const isPaused = !!match?.is_paused;
  const elapsed = persistedElapsed;

  useEffect(() => {
    if (open) {
      setShowIntro(true);
      vibrate([40, 60, 40, 60, 120]);
      const t = setTimeout(() => setShowIntro(false), 1800);
      return () => clearTimeout(t);
    }
  }, [open, matchId]);

  useEffect(() => {
    if (!open) return;
    setEvents([]);
  }, [open, matchId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const styleA = useMemo(() => getTeamStyle(teamAName), [teamAName]);
  const styleB = useMemo(() => getTeamStyle(teamBName), [teamBName]);

  if (!open) return null;

  const teams = [
    { name: teamAName, style: styleA, players: playersTeamA },
    { name: teamBName, style: styleB, players: playersTeamB },
  ];

  const handleEventTap = (e: EventType) => {
    vibrate(20);
    setFlow({ kind: "team", event: e });
  };

  const logEvent = (
    type: EventType,
    team: string,
    player: PlayerItem,
    assist?: PlayerItem,
  ) => {
    const minute = Math.max(1, Math.floor(elapsed / 60) + 1);
    setEvents((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        ts: Date.now(),
        minute,
        type,
        team,
        playerId: player.id,
        playerName: player.name,
        assistPlayerId: assist?.id,
        assistPlayerName: assist?.name,
      },
      ...prev,
    ]);
  };

  const pickTeam = (team: string) => {
    if (!flow || flow.kind !== "team") return;
    vibrate(15);
    setFlow({ kind: "player", event: flow.event, team });
  };

  const pickPlayer = (player: PlayerItem) => {
    if (!flow || flow.kind !== "player") return;
    const event = flow.event;
    const team = flow.team;
    const minute = Math.max(1, Math.floor(elapsed / 60) + 1);
    if (event === "goal") {
      vibrate([40, 60, 120]);
      onRecordEvent(player.id, "goal", 1, { team, minute });
      setFlow({ kind: "assistAsk", goalTeam: team, goalPlayer: player });
      return;
    }
    vibrate(event === "red" ? [80, 60, 80] : [25, 30, 40]);
    onRecordEvent(player.id, event, 1, { team, minute });
    logEvent(event, team, player);
    setFlow(null);
  };

  const skipAssist = () => {
    if (!flow || flow.kind !== "assistAsk") return;
    logEvent("goal", flow.goalTeam, flow.goalPlayer);
    setFlow(null);
  };

  const promptAssist = () => {
    if (!flow || flow.kind !== "assistAsk") return;
    setFlow({ kind: "assistPlayer", goalTeam: flow.goalTeam, goalPlayer: flow.goalPlayer });
  };

  const pickAssistPlayer = (player: PlayerItem) => {
    if (!flow || flow.kind !== "assistPlayer") return;
    vibrate(25);
    const minute = Math.max(1, Math.floor(elapsed / 60) + 1);
    onRecordEvent(player.id, "assist", 1, { team: flow.goalTeam, minute });
    logEvent("goal", flow.goalTeam, flow.goalPlayer, player);
    setFlow(null);
  };

  const sheetOpen = !!flow;
  const goBack = () => {
    if (!flow) return;
    if (flow.kind === "team") setFlow(null);
    else if (flow.kind === "player") setFlow({ kind: "team", event: flow.event });
    else if (flow.kind === "assistAsk") setFlow(null);
    else if (flow.kind === "assistPlayer") setFlow({ kind: "assistAsk", goalTeam: flow.goalTeam, goalPlayer: flow.goalPlayer });
  };

  const currentTeamPlayers = flow && flow.kind === "player"
    ? (flow.team === teamAName ? playersTeamA : playersTeamB)
    : [];

  const assistTeamPlayers = flow && (flow.kind === "assistPlayer")
    ? (flow.goalTeam === teamAName ? playersTeamA : playersTeamB).filter(p => p.id !== flow.goalPlayer.id)
    : [];

  const waitingTeams = allTeams.filter(t => t !== teamAName && t !== teamBName);

  const handleStartOrResume = () => {
    if (!matchId) return;
    if (!match?.started_at) {
      timerActions.start.mutate(matchId);
    } else if (isPaused) {
      timerActions.resume.mutate({
        matchId,
        pausedAt: match.paused_at,
        pausedSeconds: match.paused_seconds || 0,
      });
    }
  };

  const handleEndClick = () => {
    if (!onEndMatch) return;
    vibrate([60, 40, 60]);
    onEndMatch();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden animate-fade-in select-none">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(153_84%_36%/0.18)_0%,transparent_55%),radial-gradient(ellipse_at_top_left,hsl(210_100%_50%/0.12),transparent_45%),radial-gradient(ellipse_at_bottom_right,hsl(43_76%_52%/0.10),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[linear-gradient(transparent_0,transparent_2px,hsl(var(--primary))_3px,transparent_3px)] bg-[length:100%_4px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(0_0%_0%/0.4)_0%,transparent_25%,transparent_70%,hsl(0_0%_0%/0.6)_100%)]" />

      {showIntro && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="text-center space-y-3">
            <p className="text-xs font-display tracking-[0.5em] text-primary animate-pulse">● AO VIVO</p>
            <h1
              className="font-display font-black text-5xl md:text-7xl text-foreground tracking-tight"
              style={{ textShadow: "0 0 30px hsl(var(--primary)/0.8), 0 0 80px hsl(var(--primary)/0.4)" }}
            >
              MODO PELADA
            </h1>
            <p className="text-sm text-muted-foreground uppercase tracking-[0.3em]">
              Partida {matchNumber ?? 1} · Iniciada
            </p>
            <div className="mx-auto mt-4 h-1 w-48 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-full bg-gradient-to-r from-primary via-accent to-primary animate-[shimmer_1.6s_linear_infinite] bg-[length:200%_100%]" />
            </div>
          </div>
        </div>
      )}

      {/* Header HUD */}
      <div className="relative flex items-center justify-between gap-2 px-3 py-2 border-b border-primary/20 backdrop-blur-md bg-background/40">
        <Button variant="ghost" size="sm" onClick={() => { vibrate(15); onClose(); }} className="h-11 text-muted-foreground shrink-0">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Voltar</span>
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <Badge className={`${isTimerRunning ? "bg-destructive/20 text-destructive border-destructive/50 animate-pulse" : "bg-muted/40 text-muted-foreground border-muted/40"} text-[10px] font-display font-black tracking-[0.2em]`}>
            ● {isTimerRunning ? "LIVE" : isPaused ? "PAUSADO" : "AGUARDANDO"}
          </Badge>
          <span className="font-display text-xs uppercase tracking-widest text-muted-foreground hidden md:inline">
            Partida {matchNumber ?? 1}
          </span>
          <span className="font-display font-black text-lg md:text-xl tabular-nums text-primary ml-1"
            style={{ textShadow: "0 0 12px hsl(var(--primary)/0.6)" }}>
            {fmtTime(elapsed)}
          </span>
          {(match?.added_time_seconds || 0) > 0 && (
            <span className="text-[10px] font-mono text-accent">+{Math.round((match.added_time_seconds || 0) / 60)}'</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setHistoryOpen(true)} className="h-11 w-11 text-muted-foreground relative">
            <History className="w-5 h-5" />
            {events.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {events.length}
              </span>
            )}
          </Button>
          {onEndPelada && (
            <Button
              size="sm"
              onClick={() => { vibrate([60, 40, 60, 40, 120]); onEndPelada(); }}
              className="h-11 px-3 md:px-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-display font-black tracking-wider shadow-[0_0_24px_hsl(var(--destructive)/0.55)] border border-destructive/60"
            >
              <Flag className="w-4 h-4" />
              <span className="hidden xs:inline ml-1">FINALIZAR</span>
            </Button>
          )}
        </div>
      </div>


      {/* Timer controls */}
      {matchId && (
        <div className="relative flex items-center justify-center gap-2 px-2 py-1.5 border-b border-border/40 bg-background/30 overflow-x-auto">
          {!isTimerRunning && (
            <Button size="sm" onClick={handleStartOrResume} className="h-9 bg-success hover:bg-success/90 text-success-foreground">
              <Play className="w-4 h-4" /> {match?.started_at ? "Retomar" : "Iniciar tempo"}
            </Button>
          )}
          {isTimerRunning && (
            <Button size="sm" variant="outline" onClick={() => matchId && timerActions.pause.mutate(matchId)} className="h-9">
              <Pause className="w-4 h-4" /> Pausar
            </Button>
          )}
          {match?.started_at && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => matchId && timerActions.addTime.mutate({ matchId, currentAdded: match.added_time_seconds || 0, deltaSeconds: 60 })}
              className="h-9"
            >
              <Plus className="w-4 h-4" /> Acréscimo
            </Button>
          )}
          {match?.started_at && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => matchId && timerActions.reset.mutate(matchId)}
              className="h-9 text-muted-foreground"
            >
              <RotateCcw className="w-4 h-4" /> Zerar
            </Button>
          )}
          {onAddPlayer && (
            <Button size="sm" variant="outline" onClick={onAddPlayer} className="h-9 border-accent/40 text-accent">
              <UserPlus className="w-4 h-4" /> Jogador
            </Button>
          )}
        </div>
      )}

      {/* Teams queue bar */}
      {allTeams.length > 0 && (
        <div className="relative px-3 py-2 border-b border-border/40 bg-background/30">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">Em campo:</span>
            {[teamAName, teamBName].map((tn, idx) => {
              const style = getTeamStyle(tn);
              const teamIdx = allTeams.indexOf(tn);
              return (
                <TeamPill
                  key={`p-${idx}`}
                  name={tn}
                  label={teamDisplayLabel(tn, teamIdx >= 0 ? teamIdx : idx)}
                  style={style}
                  active
                  canSwap={allTeams.length > 2 && !!onSwapPlayingTeam}
                  options={allTeams.filter(t => t !== (idx === 0 ? teamBName : teamAName))}
                  onSwap={(nt) => onSwapPlayingTeam?.(idx as 0 | 1, nt)}
                  canRecolor={!!onRenameTeam}
                  onRename={(nn) => onRenameTeam?.(tn, nn)}
                />
              );
            })}
            {waitingTeams.length > 0 && (
              <>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0 ml-2">Fila:</span>
                {waitingTeams.map((tn) => {
                  const teamIdx = allTeams.indexOf(tn);
                  return (
                    <TeamPill
                      key={`w-${tn}`}
                      name={tn}
                      label={teamDisplayLabel(tn, teamIdx)}
                      style={getTeamStyle(tn)}
                      canRecolor={!!onRenameTeam}
                      onRename={(nn) => onRenameTeam?.(tn, nn)}
                    />
                  );
                })}
              </>
            )}
            {outsideTeam.length > 0 && (
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0 ml-2">
                De Fora: {outsideTeam.length}
              </span>
            )}
          </div>
        </div>
      )}


      {/* Giant Scoreboard */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-3 py-2 min-h-0">
        <div className="w-full max-w-3xl">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${styleA.dot} shadow-[0_0_12px_currentColor]`} />
                <p className="font-display font-black text-foreground text-sm md:text-xl uppercase tracking-wider truncate">
                  {teamShortLabel(teamAName, Math.max(0, allTeams.indexOf(teamAName)))}
                </p>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground -mt-1 truncate">{teamAName}</p>
              <p
                className="font-display font-black text-[6rem] md:text-[10rem] text-foreground leading-[0.85] tabular-nums"
                style={{ textShadow: "0 0 30px hsl(var(--primary)/0.7), 0 0 80px hsl(var(--primary)/0.3)" }}
                key={`a-${teamAScore}`}
              >
                <span className="inline-block animate-scale-in">{teamAScore}</span>
              </p>
            </div>
            <span className="text-muted-foreground/60 font-display font-bold text-3xl md:text-6xl">×</span>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <p className="font-display font-black text-foreground text-sm md:text-xl uppercase tracking-wider truncate">
                  {teamShortLabel(teamBName, Math.max(1, allTeams.indexOf(teamBName)))}
                </p>
                <span className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${styleB.dot} shadow-[0_0_12px_currentColor]`} />
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground -mt-1 truncate">{teamBName}</p>
              <p
                className="font-display font-black text-[6rem] md:text-[10rem] text-foreground leading-[0.85] tabular-nums"
                style={{ textShadow: "0 0 30px hsl(var(--primary)/0.7), 0 0 80px hsl(var(--primary)/0.3)" }}
                key={`b-${teamBScore}`}
              >
                <span className="inline-block animate-scale-in">{teamBScore}</span>
              </p>
            </div>

          </div>

          {events.length > 0 && (
            <div className="mt-2 max-h-16 overflow-y-auto px-2 space-y-1">
              {events.slice(0, 3).map((ev) => (
                <div key={ev.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono text-primary">{ev.minute}'</span>
                  <span>{EVENT_META[ev.type].icon}</span>
                  <span className="font-semibold text-foreground truncate">{ev.playerName}</span>
                  {ev.assistPlayerName && <span className="text-muted-foreground">🅰️ {ev.assistPlayerName}</span>}
                  <span className="text-muted-foreground/70 ml-auto truncate">{ev.team}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons grid */}
      <div className="relative px-3 pb-3 pt-1 grid grid-cols-2 gap-3 max-w-2xl mx-auto w-full">
        {(Object.keys(EVENT_META) as EventType[]).map((e) => {
          const meta = EVENT_META[e];
          return (
            <button
              key={e}
              onClick={() => handleEventTap(e)}
              className={`min-h-[88px] rounded-2xl border-2 ${meta.cls} font-display font-black text-lg md:text-2xl tracking-wider active:scale-95 transition-transform flex flex-col items-center justify-center gap-1`}
            >
              <span className="text-3xl md:text-5xl drop-shadow-md">{meta.icon}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom controls — apenas Finalizar Partida (FINALIZAR pelada está no topo) */}
      {onEndMatch && (
        <div className="relative px-3 pb-5 max-w-2xl mx-auto w-full">
          <Button
            variant="outline"
            className="w-full h-14 font-display font-bold tracking-wider border-warning/60 text-warning hover:bg-warning/10"
            onClick={handleEndClick}
          >
            <Square className="w-4 h-4" /> Finalizar Partida
          </Button>
        </div>
      )}


      {/* Multi-step picker overlay */}
      {sheetOpen && (
        <div
          className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in"
          onClick={() => setFlow(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border-2 border-primary/40 bg-card shadow-[0_-10px_60px_hsl(var(--primary)/0.25)] p-5 animate-slide-in-bottom"
          >
            <div className="flex items-center gap-2 mb-4">
              {flow && flow.kind !== "team" && (
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={goBack}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <h3 className="font-display flex items-center gap-2 text-lg md:text-xl font-bold text-foreground flex-1 min-w-0">
                {flow?.kind === "team" && <><span>{EVENT_META[flow.event].icon}</span> <span className="truncate">{EVENT_META[flow.event].label} — qual time?</span></>}
                {flow?.kind === "player" && <><span>{EVENT_META[flow.event].icon}</span> <span className="truncate">{EVENT_META[flow.event].label} — qual jogador?</span></>}
                {flow?.kind === "assistAsk" && <><span>⚽</span> <span className="truncate">Gol de {flow.goalPlayer.name} — teve assistência?</span></>}
                {flow?.kind === "assistPlayer" && <><span>🅰️</span> <span className="truncate">Quem deu a assistência?</span></>}
              </h3>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setFlow(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {flow?.kind === "team" && (
              <div className="grid grid-cols-2 gap-3">
                {teams.map((team) => (
                  <button
                    key={team.name}
                    onClick={() => pickTeam(team.name)}
                    className={`min-h-[120px] rounded-2xl border-2 ${team.style.border} ${team.style.bg} p-4 flex flex-col items-start gap-2 active:scale-[0.97] transition-all text-left`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full ${team.style.dot} shadow-[0_0_12px_currentColor]`} />
                      <p className="font-display font-black text-lg md:text-xl uppercase tracking-wider text-foreground truncate">{team.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{team.players.length} jogadores</p>
                  </button>
                ))}
              </div>
            )}

            {flow?.kind === "player" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentTeamPlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickPlayer(p)}
                    className="w-full min-h-[64px] flex items-center justify-between px-4 rounded-xl bg-secondary/80 hover:bg-secondary active:scale-[0.97] transition-all text-left border border-border/40"
                  >
                    <span className="text-base font-semibold text-foreground truncate">{p.name}</span>
                    <span className="text-xs font-mono text-muted-foreground ml-2">{p.position}</span>
                  </button>
                ))}
                {currentTeamPlayers.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-6 text-center col-span-full">Sem jogadores neste time</p>
                )}
              </div>
            )}

            {flow?.kind === "assistAsk" && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={skipAssist}
                  className="min-h-[120px] rounded-2xl border-2 border-border bg-secondary p-4 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-all"
                >
                  <X className="w-8 h-8 text-muted-foreground" />
                  <p className="font-display font-black text-lg">NÃO</p>
                  <p className="text-xs text-muted-foreground">Sem assistência</p>
                </button>
                <button
                  onClick={promptAssist}
                  className="min-h-[120px] rounded-2xl border-2 border-primary bg-primary/10 p-4 flex flex-col items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-[0_0_24px_hsl(var(--primary)/0.3)]"
                >
                  <span className="text-4xl">🅰️</span>
                  <p className="font-display font-black text-lg text-primary">SIM</p>
                  <p className="text-xs text-muted-foreground">Escolher jogador</p>
                </button>
              </div>
            )}

            {flow?.kind === "assistPlayer" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {assistTeamPlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => pickAssistPlayer(p)}
                    className="w-full min-h-[64px] flex items-center justify-between px-4 rounded-xl bg-secondary/80 hover:bg-secondary active:scale-[0.97] transition-all text-left border border-border/40"
                  >
                    <span className="text-base font-semibold text-foreground truncate">{p.name}</span>
                    <span className="text-xs font-mono text-muted-foreground ml-2">{p.position}</span>
                  </button>
                ))}
                {assistTeamPlayers.length === 0 && (
                  <p className="text-sm text-muted-foreground px-3 py-6 text-center col-span-full">Sem outros jogadores no time</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* History overlay */}
      {historyOpen && (
        <div
          className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in"
          onClick={() => setHistoryOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border-2 border-primary/40 bg-card shadow-[0_-10px_60px_hsl(var(--primary)/0.25)] p-5 animate-slide-in-bottom"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg md:text-xl font-bold flex items-center gap-2 text-foreground">
                <History className="w-5 h-5 text-primary" /> Linha do Tempo da Partida
              </h3>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setHistoryOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-2">
              {events.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento registrado ainda.</p>
              )}
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/60 border border-border/40">
                  <span className="font-mono text-sm text-primary min-w-[36px]">{ev.minute}'</span>
                  <span className="text-2xl">{EVENT_META[ev.type].icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {ev.playerName}
                      {ev.assistPlayerName && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          🅰️ {ev.assistPlayerName}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                      {EVENT_META[ev.type].label} · {ev.team}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamPill({
  name,
  label,
  style,
  active,
  canSwap,
  options = [],
  onSwap,
  canRecolor,
  onRename,
}: {
  name: string;
  label?: string;
  style: ReturnType<typeof getTeamStyle>;
  active?: boolean;
  canSwap?: boolean;
  options?: string[];
  onSwap?: (newTeam: string) => void;
  canRecolor?: boolean;
  onRename?: (newName: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${style.border} ${style.bg} ${active ? "shadow-[0_0_18px_hsl(var(--primary)/0.35)]" : "opacity-80"} active:scale-95 transition-all`}
        >
          <span className={`w-3 h-3 rounded-full ${style.dot} shadow-[0_0_8px_currentColor]`} />
          <span className="font-display font-bold text-xs uppercase tracking-wider text-foreground">{label || name}</span>
          {active && <span className="text-[9px] font-mono text-primary">●</span>}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-60 p-3 space-y-3" align="start">
        {canSwap && options.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Trocar por…</p>
            <div className="flex flex-wrap gap-1">
              {options.map(o => (
                <button
                  key={o}
                  onClick={() => onSwap?.(o)}
                  className={`px-2 py-1 rounded-md text-xs border ${getTeamStyle(o).border} ${getTeamStyle(o).bg} text-foreground`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}
        {canRecolor && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Palette className="w-3 h-3" /> Mudar cor do time
            </p>
            <div className="grid grid-cols-5 gap-1">
              {TEAM_COLOR_NAMES.map(c => {
                const s = getTeamStyle(c);
                return (
                  <button
                    key={c}
                    title={c}
                    onClick={() => onRename?.(c)}
                    className={`h-7 rounded-md border-2 ${s.border} ${s.bg} flex items-center justify-center`}
                  >
                    <span className={`w-3 h-3 rounded-full ${s.dot}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
