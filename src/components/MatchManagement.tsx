import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, Save, RotateCcw, X, Loader2, AlertTriangle, Shuffle, Play, Square, UserPlus, Zap,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { GeneratedTeam } from "./TeamDrawModal";
import {
  useCreateMatch, useCreateNextMatch, useMatchTeams, useMatchStats,
  useUpdateTeamAssignment, useRecordMatchEvent, useFinishMatch, useEndPelada,
  useRealtimeMatchStats, useRealtimeMatchTeams, useAllPeladaMatches,
} from "@/hooks/useMatchManagement";
import { DroppableTeamCard } from "./match/DroppableTeamCard";
import { MatchRuleSelector } from "./match/MatchRuleSelector";
import { MatchRotationDialog, type MatchRuleType } from "./match/MatchRotationDialog";
import { AddPlayerMidMatch } from "./match/AddPlayerMidMatch";
import { LiveActionMode } from "./match/LiveActionMode";
import { PostMatchSummary, type PMSPlayer, type PMSStats } from "./match/PostMatchSummary";
import { PeladaDayFullReport } from "./match/PeladaDayFullReport";
import { CoinTossCinematic } from "./match/CoinTossCinematic";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getTeamStyle } from "@/lib/teamColors";

interface MatchManagementProps {
  peladaId: string;
  matchId?: string | null;
  initialTeams?: GeneratedTeam[];
  isAdmin: boolean;
  onClose?: () => void;
  onResort?: () => void;
  members: any[];
  peladaData?: any;
}

interface PlayerItem {
  id: string;
  name: string;
  position: string;
  overall: number;
  team: string;
  avatarUrl?: string | null;
}

export function MatchManagement({ peladaId, matchId, initialTeams, isAdmin, onClose, onResort, members, peladaData }: MatchManagementProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMatch = useCreateMatch();
  const createNextMatch = useCreateNextMatch();
  const updateAssignment = useUpdateTeamAssignment();
  const recordEvent = useRecordMatchEvent();
  const finishMatch = useFinishMatch();
  const endPelada = useEndPelada();
  const { data: savedTeams } = useMatchTeams(matchId || undefined);
  const { data: matchStatsData } = useMatchStats(matchId || undefined);
  const { data: allMatches } = useAllPeladaMatches(peladaId);

  useRealtimeMatchStats(matchId || undefined);
  useRealtimeMatchTeams(matchId || undefined);

  const [localPlayers, setLocalPlayers] = useState<PlayerItem[]>(() => {
    if (initialTeams) {
      return initialTeams.flatMap((t) =>
        t.players.map((p) => ({ id: p.id, name: p.name, position: p.position, overall: p.overall, team: t.name }))
      );
    }
    return [];
  });

  // Match rule type
  const [ruleType, setRuleType] = useState<MatchRuleType>("rei_da_mesa");
  // Match pairing
  const [playingTeams, setPlayingTeams] = useState<[string, string] | null>(null);
  // Rotation dialog
  const [rotationDialogOpen, setRotationDialogOpen] = useState(false);
  const [pendingEndScores, setPendingEndScores] = useState<{ a: number; b: number } | null>(null);
  // Add player mid-match
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  // Live Action fullscreen
  const [actionModeOpen, setActionModeOpen] = useState(false);
  // Post-match summary (after finishing a single match)
  const [postSummary, setPostSummary] = useState<null | {
    matchId: string;
    matchNumber: number;
    teamAName: string;
    teamBName: string;
    teamAScore: number;
    teamBScore: number;
    players: PMSPlayer[];
    stats: Record<string, PMSStats>;
    startedAt?: string | null;
    endedAt?: string | null;
    occurrenceId?: string;
  }>(null);
  // End-of-day summary
  const [daySummary, setDaySummary] = useState<null | { matchIds: string[]; occurrenceId?: string | null }>(null);
  const [confirmEndDayOpen, setConfirmEndDayOpen] = useState(false);
  // Coin toss for tie
  const [coinToss, setCoinToss] = useState<null | { teamA: string; teamB: string; matchId: string; occurrenceId?: string }>(null);
  // Post-end notification dialog
  const [notifyVotingOpen, setNotifyVotingOpen] = useState(false);
  const [notifyOccurrenceId, setNotifyOccurrenceId] = useState<string | null>(null);


  // Multi-match state
  const finishedMatchesInPelada = useMemo(() =>
    (allMatches || []).filter(m => m.is_finished), [allMatches]);
  const isVotingOpen = finishedMatchesInPelada.some(m => m.voting_open);
  const isBetweenMatches = !matchId && finishedMatchesInPelada.length > 0 && !isVotingOpen;
  const lastFinishedMatch = finishedMatchesInPelada[finishedMatchesInPelada.length - 1];
  const currentMatchNumber = (allMatches || []).length;

  // Load teams from last finished match for between-matches state
  const { data: lastFinishedTeams } = useMatchTeams(
    isBetweenMatches ? lastFinishedMatch?.id : undefined
  );
  const { data: lastFinishedStats } = useMatchStats(
    isBetweenMatches ? lastFinishedMatch?.id : undefined
  );

  const players = useMemo(() => {
    if (matchId && savedTeams && savedTeams.length > 0) {
      return savedTeams.map((st) => {
        const member = members.find((m: any) => m.id === st.pelada_member_id);
        return {
          id: st.pelada_member_id,
          name: member?.profile?.name || member?.guest_name || "Jogador",
          position: member?.profile?.position || member?.guest_position || "MEI",
          overall: member?.overall || 50,
          team: st.team,
          avatarUrl: member?.profile?.avatar_url,
        } as PlayerItem;
      });
    }
    if (isBetweenMatches && lastFinishedTeams && lastFinishedTeams.length > 0) {
      return lastFinishedTeams.map((st) => {
        const member = members.find((m: any) => m.id === st.pelada_member_id);
        return {
          id: st.pelada_member_id,
          name: member?.profile?.name || member?.guest_name || "Jogador",
          position: member?.profile?.position || member?.guest_position || "MEI",
          overall: member?.overall || 50,
          team: st.team,
          avatarUrl: member?.profile?.avatar_url,
        } as PlayerItem;
      });
    }
    return localPlayers;
  }, [matchId, savedTeams, members, localPlayers, isBetweenMatches, lastFinishedTeams]);

  const teamGroups = useMemo(() => {
    const groups: Record<string, PlayerItem[]> = {};
    for (const p of players) {
      if (!groups[p.team]) groups[p.team] = [];
      groups[p.team].push(p);
    }
    return groups;
  }, [players]);

  const teamNames = useMemo(() => {
    const names = Object.keys(teamGroups);
    return names.sort((a, b) => {
      if (a === "De Fora") return 1;
      if (b === "De Fora") return -1;
      return a.localeCompare(b);
    });
  }, [teamGroups]);

  const regularTeams = teamNames.filter((n) => n !== "De Fora");

  // Auto-draw match pairing when match is saved and >2 teams
  useEffect(() => {
    if (matchId && regularTeams.length >= 2 && !playingTeams) {
      if (regularTeams.length > 2) {
        const shuffled = [...regularTeams].sort(() => Math.random() - 0.5);
        setPlayingTeams([shuffled[0], shuffled[1]]);
      } else {
        setPlayingTeams([regularTeams[0], regularTeams[1]]);
      }
    }
  }, [matchId, regularTeams.length]);

  // Auto-open Modo Ação fullscreen when a match goes live (admin only)
  useEffect(() => {
    if (isAdmin && matchId && playingTeams) {
      setActionModeOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, isAdmin]);


  const statsMap = useMemo(() => {
    const map: Record<string, { goals: number; assists: number; yellow_cards: number; red_cards: number }> = {};
    const dataSource = isBetweenMatches ? lastFinishedStats : matchStatsData;
    dataSource?.forEach((s) => {
      map[s.pelada_member_id] = { goals: s.goals, assists: s.assists, yellow_cards: s.yellow_cards, red_cards: s.red_cards };
    });
    return map;
  }, [matchStatsData, lastFinishedStats, isBetweenMatches]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const isLocked = isBetweenMatches;

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const playerId = String(active.id);
    const newTeam = String(over.id);
    const player = players.find((p) => p.id === playerId);
    if (!player || player.team === newTeam) return;

    if (matchId) {
      updateAssignment.mutate({ matchId, memberId: playerId, newTeam });
    } else {
      setLocalPlayers((prev) => prev.map((p) => p.id === playerId ? { ...p, team: newTeam } : p));
    }
  };

  const handleSaveTeams = async () => {
    if (matchId) return;
    const assignments = localPlayers.map((p) => ({ memberId: p.id, team: p.team }));
    // Get or create occurrence for today
    const today = new Date().toISOString().split("T")[0];
    const { data: occ } = await supabase
      .from("pelada_occurrences" as any)
      .upsert({
        pelada_id: peladaId,
        occurrence_date: today,
        status: "in_progress",
      } as any, { onConflict: "pelada_id,occurrence_date" })
      .select("id")
      .single();
    const occurrenceId = (occ as any)?.id;
    // Mark pelada as LIVE — entering Modo Ação for the whole session
    await supabase.from("peladas").update({ is_live: true } as any).eq("id", peladaId);
    queryClient.invalidateQueries({ queryKey: ["pelada", peladaId] });
    createMatch.mutate({ peladaId, teams: assignments, matchNumber: 1, occurrenceId });
  };



  const handleRecordEvent = (
    memberId: string,
    event: "goal" | "assist" | "yellow" | "red",
    delta: number,
    meta?: { team?: string; minute?: number },
  ) => {
    if (!matchId) { toast.error("Salve os times primeiro"); return; }
    const occId = (allMatches?.find((m: any) => m.id === matchId) as any)?.occurrence_id || undefined;
    recordEvent.mutate({
      matchId, memberId, event, delta,
      peladaId, occurrenceId: occId, team: meta?.team, minute: meta?.minute,
    });
  };


  // Score calculation based on playing teams
  const teamAName = playingTeams?.[0] || teamNames.find((n) => n !== "De Fora") || "Time A";
  const teamBName = playingTeams?.[1] || teamNames.find((n) => n !== "De Fora" && n !== teamAName) || "Time B";
  const teamAScore = (teamGroups[teamAName] || []).reduce((s, p) => s + (statsMap[p.id]?.goals || 0), 0);
  const teamBScore = (teamGroups[teamBName] || []).reduce((s, p) => s + (statsMap[p.id]?.goals || 0), 0);

  const handleEndMatch = async () => {
    if (!matchId) return;
    // Capture snapshot for the post-match summary
    const snapshotPlayers: PMSPlayer[] = (teamGroups[teamAName] || [])
      .map((p) => ({ id: p.id, name: p.name, position: p.position, team: teamAName }))
      .concat((teamGroups[teamBName] || []).map((p) => ({ id: p.id, name: p.name, position: p.position, team: teamBName })));
    const snapshotStats: Record<string, PMSStats> = {};
    snapshotPlayers.forEach((p) => {
      const s = statsMap[p.id];
      if (s) snapshotStats[p.id] = { goals: s.goals, assists: s.assists, yellow_cards: s.yellow_cards, red_cards: s.red_cards };
    });
    const occurrenceId = (allMatches?.find((m: any) => m.id === matchId) as any)?.occurrence_id || undefined;
    const startedAt = (allMatches?.find((m: any) => m.id === matchId) as any)?.started_at || (allMatches?.find((m: any) => m.id === matchId) as any)?.created_at || null;

    await finishMatch.mutateAsync({ matchId, peladaId, teamAScore, teamBScore });


    // Tie? Trigger cinematic coin toss before showing summary
    if (teamAScore === teamBScore && teamAName && teamBName && teamAName !== teamBName) {
      setCoinToss({ teamA: teamAName, teamB: teamBName, matchId, occurrenceId });
    }

    setPostSummary({
      matchId,
      matchNumber: currentMatchNumber,
      teamAName, teamBName, teamAScore, teamBScore,
      players: snapshotPlayers,
      stats: snapshotStats,
      startedAt,
      endedAt: new Date().toISOString(),
      occurrenceId,
    });
    // IMPORTANT: do NOT close Modo Ação here — the session continues across matches.
  };


  // Triggered from PostMatchSummary "Iniciar Nova Partida"
  const handleSummaryNextMatch = async () => {
    if (!postSummary) return;
    // If >2 teams, use rotation dialog flow
    if (regularTeams.length > 2) {
      setPendingEndScores({ a: postSummary.teamAScore, b: postSummary.teamBScore });
      setPlayingTeams([postSummary.teamAName, postSummary.teamBName]);
      setPostSummary(null);
      setRotationDialogOpen(true);
      return;
    }
    // 2 teams: just create the next match with the same lineup
    const occurrenceId = postSummary.occurrenceId;
    createNextMatch.mutate({
      peladaId,
      previousMatchId: postSummary.matchId,
      matchNumber: currentMatchNumber + 1,
      occurrenceId,
    });
    setPostSummary(null);
  };


  const handleEndPelada = async () => {
    const targetMatchId = matchId || lastFinishedMatch?.id;
    if (!targetMatchId) return;

    const scoreA = matchId ? teamAScore : (lastFinishedMatch?.team_a_score || 0);
    const scoreB = matchId ? teamBScore : (lastFinishedMatch?.team_b_score || 0);
    const votingDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Get or create occurrence for today
    const today = new Date().toISOString().split("T")[0];
    const { data: occ } = await supabase
      .from("pelada_occurrences" as any)
      .upsert({
        pelada_id: peladaId,
        occurrence_date: today,
        status: "finished",
        voting_deadline: votingDeadline,
        voting_closed: false,
      } as any, { onConflict: "pelada_id,occurrence_date" })
      .select("id")
      .single();
    const occurrenceId = (occ as any)?.id;

    if (matchId) {
      endPelada.mutate({ matchId: targetMatchId, peladaId, teamAScore: scoreA, teamBScore: scoreB, occurrenceId });
    } else {
      // Between matches - open voting on all matches for this occurrence
      if (occurrenceId) {
        await supabase
          .from("matches")
          .update({
            voting_open: true,
            voting_deadline: votingDeadline,
          })
          .eq("occurrence_id", occurrenceId)
          .eq("is_finished", true);
      } else {
        // Fallback: open voting on the last finished match only
        await supabase
          .from("matches")
          .update({
            voting_open: true,
            voting_deadline: votingDeadline,
          })
          .eq("id", targetMatchId);
      }
      toast.success("Pelada encerrada! Votação aberta por 24h.");
    }

    // Send notifications
    try {
      const confirmedMembers = (members || []).filter((m: any) => m.user_id);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && confirmedMembers.length > 0) {
        const notifications = confirmedMembers
          .filter((m: any) => m.user_id !== user.id)
          .map((m: any) => ({
            recipient_user_id: m.user_id,
            actor_user_id: user.id,
            type: "match_ended",
            message: "A pelada foi encerrada. Vote agora nos destaques da partida. Você tem 24h para votar.",
          }));
        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }

        const feedPosts: any[] = [];
        for (const m of confirmedMembers) {
          const s = statsMap[m.id];
          if (!s) continue;
          const name = m.profile?.name || m.guest_name || "Jogador";
          const lines: string[] = [];
          if (s.goals >= 3) lines.push(`⚽ Hat Trick! ${s.goals} gols`);
          else if (s.goals >= 1) lines.push(`⚽ ${s.goals} gol${s.goals > 1 ? "s" : ""}`);
          if (s.assists >= 1) lines.push(`🎯 ${s.assists} assistência${s.assists > 1 ? "s" : ""}`);
          if (lines.length > 0 && m.user_id) {
            feedPosts.push({
              user_id: m.user_id,
              caption: `🔥 ${name} na pelada!\n${lines.join("\n")}`,
              media_urls: [],
              media_type: "text",
            });
          }
        }
        if (feedPosts.length > 0) {
          await supabase.from("feed_posts").insert(feedPosts);
        }
      }
    } catch (e) {
      console.error("Error sending notifications:", e);
    }

    setPlayingTeams(null);

    // Collect all finished match ids of this day (including the one just finalized)
    const dayMatchIds = (allMatches || [])
      .filter((m: any) => m.is_finished || m.id === targetMatchId)
      .map((m: any) => m.id);

    // Exit Modo Ação — pelada is no longer live
    await supabase.from("peladas").update({ is_live: false } as any).eq("id", peladaId);
    setActionModeOpen(false);

    // Log timeline event
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("pelada_timeline_events").insert({
          pelada_id: peladaId,
          occurrence_id: occurrenceId,
          actor_id: user.id,
          event_type: "pelada_finished",
          payload: { match_count: dayMatchIds.length },
        } as any);
      }
    } catch (err) {
      console.warn("timeline log failed", err);
    }

    // Show end-of-day summary; navigation deferred to its close handler
    setPostSummary(null);
    setDaySummary({ matchIds: dayMatchIds.length > 0 ? dayMatchIds : [targetMatchId], occurrenceId });

    // Defer "send voting notifications" dialog until the day summary is closed,
    // otherwise the AlertDialog overlay locks scroll/clicks on the report.
    if (occurrenceId) {
      setNotifyOccurrenceId(occurrenceId);
    }

  };

  const handleSendVotingNotifications = async () => {
    if (!notifyOccurrenceId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Members who actually played (had a team row in any match of this occurrence)
      const { data: matchesRows } = await supabase
        .from("matches").select("id").eq("occurrence_id", notifyOccurrenceId);
      const mIds = (matchesRows || []).map((m: any) => m.id);
      const { data: tRows } = await supabase
        .from("match_teams").select("pelada_member_id").in("match_id", mIds);
      const memberIds = Array.from(new Set((tRows || []).map((r: any) => r.pelada_member_id)));
      const { data: membersRows } = await supabase
        .from("pelada_members").select("user_id").in("id", memberIds);
      const userIds = (membersRows || [])
        .map((r: any) => r.user_id)
        .filter((u: string) => u && u !== user?.id);

      if (user && userIds.length > 0) {
        const link = `/peladas/${peladaId}/votacao/${notifyOccurrenceId}`;
        const rows = userIds.map((uid: string) => ({
          recipient_user_id: uid,
          actor_user_id: user.id,
          type: "voting_open",
          category: "match",
          link,
          message: `Votação liberada na pelada do dia! Toque para avaliar os jogadores.`,
        }));
        await supabase.from("notifications").insert(rows as any);

        // Log timeline event
        await supabase.from("pelada_timeline_events").insert({
          pelada_id: peladaId,
          occurrence_id: notifyOccurrenceId,
          actor_id: user.id,
          event_type: "voting_dispatched",
          payload: { recipients: userIds.length },
        } as any);
      }

      await supabase
        .from("pelada_occurrences" as any)
        .update({ voting_notified_at: new Date().toISOString() } as any)
        .eq("id", notifyOccurrenceId);

      // Kick off card recompute for this occurrence (best-effort; admin auth required)
      try {
        await supabase.functions.invoke("recompute-player-cards", {
          body: { pelada_id: peladaId, occurrence_id: notifyOccurrenceId },
        });
      } catch (err) {
        console.warn("recompute-player-cards invoke failed", err);
      }

      toast.success(`${userIds.length} jogador(es) notificados para votar.`);
    } catch (e) {
      console.error(e);
      toast.error("Falha ao enviar notificações.");
    } finally {
      setNotifyVotingOpen(false);
      setNotifyOccurrenceId(null);
    }
  };



  const handleDaySummaryClose = () => {
    setDaySummary(null);
    // Now that the report is closed, prompt admin to send voting notifications
    if (notifyOccurrenceId) {
      setNotifyVotingOpen(true);
      return;
    }
    navigateAfterPelada();
  };

  const navigateAfterPelada = () => {
    const recurrenceLabels: Record<string, string> = {
      weekly: "semanal", biweekly: "quinzenal", monthly: "mensal", none: "",
    };
    let nextPeladaMsg = "";
    if (peladaData) {
      const recType = peladaData.recurrence_type || "none";
      if (recType !== "none" && peladaData.recurrence_enabled) {
        const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
        const dayOfWeek = peladaData.recurrence_day_of_week;
        const dayName = dayOfWeek != null ? dayNames[dayOfWeek] : "";
        const time = peladaData.scheduled_time || "";
        nextPeladaMsg = `\n\n📅 Próxima pelada: ${recurrenceLabels[recType] || recType}${dayName ? ` — ${dayName}` : ""}${time ? ` às ${time.slice(0, 5)}` : ""}`;
      }
    }
    navigate("/peladas", {
      state: {
        peladaEncerrada: true,
        peladaName: peladaData?.name || "Pelada",
        nextPeladaMsg,
      },
    });
  };



  // Rotation-based next match
  const handleRotationConfirm = async (nextPlaying: [string, string]) => {
    if (!lastFinishedMatch && !matchId) return;
    const refMatchId = lastFinishedMatch?.id || matchId;
    if (!refMatchId) return;

    // Get occurrence_id from the reference match
    const occurrenceId = (lastFinishedMatch as any)?.occurrence_id || undefined;

    setPlayingTeams(nextPlaying);
    createNextMatch.mutate({
      peladaId,
      previousMatchId: refMatchId,
      matchNumber: currentMatchNumber + 1,
      occurrenceId,
    });
    setPendingEndScores(null);
  };

  // Simple next match (2 teams only or between-matches)
  const handleNextMatch = async () => {
    if (!lastFinishedMatch) return;
    const occurrenceId = (lastFinishedMatch as any)?.occurrence_id || undefined;
    setPlayingTeams(null);
    createNextMatch.mutate({
      peladaId,
      previousMatchId: lastFinishedMatch.id,
      matchNumber: currentMatchNumber + 1,
      occurrenceId,
    });
  };

  const handleSwapPlayingTeam = (slot: 0 | 1, newTeam: string) => {
    if (!playingTeams) return;
    const updated: [string, string] = [...playingTeams];
    const otherSlot = slot === 0 ? 1 : 0;
    if (updated[otherSlot] === newTeam) {
      updated[otherSlot] = updated[slot];
    }
    updated[slot] = newTeam;
    setPlayingTeams(updated);
  };

  const activePlayer = activeId ? players.find((p) => p.id === activeId) : null;
  const hasTeams = players.length > 0;
  const isSaved = !!matchId;

  const gridCols = regularTeams.length <= 2 ? "grid-cols-1 md:grid-cols-2" :
    regularTeams.length <= 3 ? "grid-cols-1 md:grid-cols-3" :
    "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  if (!hasTeams && !isBetweenMatches) return null;

  const waitingTeams = playingTeams && regularTeams.length > 2
    ? regularTeams.filter(n => !playingTeams.includes(n))
    : [];

  const existingUserIds = (members || []).filter((m: any) => m.user_id).map((m: any) => m.user_id as string);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          {isBetweenMatches
            ? `Partida ${currentMatchNumber} encerrada`
            : isSaved
            ? `Partida ${currentMatchNumber} em andamento`
            : "Times sorteados"}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pre-save: Save + Resort */}
          {!isSaved && !isBetweenMatches && isAdmin && (
            <>
              <Button onClick={handleSaveTeams} disabled={createMatch.isPending} className="glow-primary">
                {createMatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Confirmar Times
              </Button>
              {onResort && (
                <Button variant="outline" size="sm" onClick={onResort}>
                  <Shuffle className="w-4 h-4" /> Sortear novamente
                </Button>
              )}
            </>
          )}

          {/* Live match actions */}
          {isSaved && isAdmin && (
            <>
              {/* Add player mid-match */}
              <Button variant="outline" size="sm" onClick={() => setAddPlayerOpen(true)}>
                <UserPlus className="w-4 h-4" /> Adicionar jogador
              </Button>

              {/* Re-open Modo Pelada (fullscreen) if user voltou */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActionModeOpen(true)}
                className="border-primary/40 text-primary"
              >
                <Zap className="w-4 h-4" /> Voltar ao Modo Pelada
              </Button>




              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={finishMatch.isPending}>
                    {finishMatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                    Encerrar Partida
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar esta partida?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A partida será finalizada. {regularTeams.length > 2 ? "Você poderá escolher quem joga a próxima." : "Você poderá iniciar uma nova partida ou encerrar a pelada."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndMatch}>Encerrar Partida</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={endPelada.isPending}>
                    {endPelada.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Encerrar Pelada
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      Deseja encerrar a pelada de hoje?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2 text-left">
                      <p>Os jogos e estatísticas da pelada de hoje serão finalizados.</p>
                      <p>A votação dos participantes será iniciada e ficará aberta por 24 horas.</p>
                      {peladaData?.recurrence_enabled && peladaData?.recurrence_type !== "none" && (
                        <p className="text-accent font-medium">
                          📅 Se esta pelada for recorrente, a próxima pelada continuará programada normalmente.
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndPelada} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Encerrar pelada de hoje
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {onResort && (
                <Button variant="outline" size="sm" onClick={onResort}>
                  <Shuffle className="w-4 h-4" /> Sortear novamente
                </Button>
              )}
            </>
          )}

          {/* Between matches */}
          {isBetweenMatches && isAdmin && (
            <>
              <Button onClick={handleNextMatch} disabled={createNextMatch.isPending} className="glow-primary">
                {createNextMatch.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Próxima Partida
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <X className="w-4 h-4" /> Encerrar Pelada
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning" />
                      Deseja encerrar a pelada de hoje?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2 text-left">
                      <p>Os jogos e estatísticas da pelada de hoje serão finalizados.</p>
                      <p>A votação dos participantes será iniciada e ficará aberta por 24 horas.</p>
                      {peladaData?.recurrence_enabled && peladaData?.recurrence_type !== "none" && (
                        <p className="text-accent font-medium">
                          📅 Se esta pelada for recorrente, a próxima pelada continuará programada normalmente.
                        </p>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndPelada} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Encerrar pelada de hoje
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {onResort && (
                <Button variant="outline" size="sm" onClick={onResort}>
                  <Shuffle className="w-4 h-4" /> Sortear novamente
                </Button>
              )}
            </>
          )}

          {onClose && !isSaved && !isBetweenMatches && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <RotateCcw className="w-4 h-4" /> Descartar
            </Button>
          )}
        </div>
      </div>

      {/* Match rule selector (only before first match or when not locked) */}
      {isAdmin && regularTeams.length > 2 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Regra de rotação:</p>
          <MatchRuleSelector value={ruleType} onChange={setRuleType} disabled={false} />
        </div>
      )}

      {isAdmin && !isSaved && !isBetweenMatches && (
        <p className="text-xs text-muted-foreground">
          Arraste jogadores entre os times para ajustar. Clique em "Confirmar Times" quando estiver satisfeito.
        </p>
      )}

      {isSaved && isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 text-xs text-muted-foreground">
            Clique nos ícones ⚽ 🅰️ 🟨 🟥 ao lado de cada jogador para registrar eventos. Use o botão "−" para corrigir erros. Arraste jogadores entre times e De Fora para rotação manual.
          </CardContent>
        </Card>
      )}

      {/* Match pairing display */}
      {isSaved && playingTeams && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full ${getTeamStyle(playingTeams[0]).dot} inline-block`} />
                {isAdmin && regularTeams.length > 2 ? (
                  <select
                    value={playingTeams[0]}
                    onChange={(e) => handleSwapPlayingTeam(0, e.target.value)}
                    className="font-display font-bold text-foreground bg-transparent border-none text-lg cursor-pointer"
                  >
                    {regularTeams.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-display font-bold text-foreground text-lg">{playingTeams[0]}</span>
                )}
                <span className="text-2xl font-bold text-primary">{teamAScore}</span>
              </div>
              <span className="text-muted-foreground font-bold text-lg">×</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-primary">{teamBScore}</span>
                {isAdmin && regularTeams.length > 2 ? (
                  <select
                    value={playingTeams[1]}
                    onChange={(e) => handleSwapPlayingTeam(1, e.target.value)}
                    className="font-display font-bold text-foreground bg-transparent border-none text-lg cursor-pointer"
                  >
                    {regularTeams.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-display font-bold text-foreground text-lg">{playingTeams[1]}</span>
                )}
                <span className={`w-4 h-4 rounded-full ${getTeamStyle(playingTeams[1]).dot} inline-block`} />
              </div>
            </div>
            {waitingTeams.length > 0 && (
              <div className="text-center mt-2">
                <p className="text-xs text-muted-foreground">
                  Aguardando: {waitingTeams.map(t => {
                    const style = getTeamStyle(t);
                    return t;
                  }).join(", ")}
                </p>
                {/* Next match preview */}
                {waitingTeams.length > 0 && ruleType === "rei_da_mesa" && (
                  <p className="text-[10px] text-accent mt-1">
                    Próximo jogo: vencedor × {waitingTeams[0]}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Match history */}
      {finishedMatchesInPelada.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {finishedMatchesInPelada.map((m) => (
            <Badge key={m.id} variant="outline" className="text-xs">
              Partida {m.match_number}: {m.team_a_score} × {m.team_b_score}
            </Badge>
          ))}
          {isSaved && (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
              Partida {currentMatchNumber} (ao vivo)
            </Badge>
          )}
        </div>
      )}

      {/* Between matches summary */}
      {isBetweenMatches && (
        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">
              {finishedMatchesInPelada.length} partida{finishedMatchesInPelada.length > 1 ? "s" : ""} jogada{finishedMatchesInPelada.length > 1 ? "s" : ""}
            </p>
            <p>Inicie uma nova partida ou encerre a pelada para abrir a votação.</p>
          </CardContent>
        </Card>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Playing teams first when >2 teams */}
        {isSaved && playingTeams && regularTeams.length > 2 ? (
          <>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {playingTeams.map((teamName) => (
                <DroppableTeamCard
                  key={teamName}
                  teamName={teamName}
                  players={teamGroups[teamName] || []}
                  isAdmin={isAdmin}
                  isLocked={isLocked}
                  stats={statsMap}
                  onEvent={handleRecordEvent}
                  matchId={matchId || undefined}
                />
              ))}
            </div>
            {waitingTeams.length > 0 && (
              <div className={`grid gap-4 mt-4 ${waitingTeams.length === 1 ? "grid-cols-1" : waitingTeams.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
                {waitingTeams.map((teamName) => (
                  <DroppableTeamCard
                    key={teamName}
                    teamName={teamName}
                    players={teamGroups[teamName] || []}
                    isAdmin={isAdmin}
                    isLocked={isLocked}
                    isWaiting
                    stats={statsMap}
                    onEvent={handleRecordEvent}
                    matchId={matchId || undefined}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={`grid gap-4 ${gridCols}`}>
            {regularTeams.map((teamName) => (
              <DroppableTeamCard
                key={teamName}
                teamName={teamName}
                players={teamGroups[teamName] || []}
                isAdmin={isAdmin}
                isLocked={isLocked}
                stats={statsMap}
                onEvent={handleRecordEvent}
                matchId={matchId || undefined}
              />
            ))}
          </div>
        )}

        {/* De Fora */}
        {(teamGroups["De Fora"]?.length > 0 || (isSaved && isAdmin)) && (
          <div className="mt-4">
            <DroppableTeamCard
              teamName="De Fora"
              players={teamGroups["De Fora"] || []}
              isAdmin={isAdmin}
              isLocked={isLocked}
              isOutside
              stats={statsMap}
              onEvent={handleRecordEvent}
              matchId={matchId || undefined}
            />
          </div>
        )}

        <DragOverlay>
          {activePlayer && (
            <div className="bg-primary/20 border border-primary rounded-lg px-3 py-2 text-sm font-medium text-foreground shadow-lg">
              {activePlayer.name} ({activePlayer.position})
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Rotation dialog */}
      {playingTeams && pendingEndScores && (
        <MatchRotationDialog
          open={rotationDialogOpen}
          onOpenChange={(open) => {
            setRotationDialogOpen(open);
            if (!open) setPendingEndScores(null);
          }}
          ruleType={ruleType}
          playingTeams={playingTeams}
          teamAScore={pendingEndScores.a}
          teamBScore={pendingEndScores.b}
          allTeamNames={teamNames}
          deForaPlayers={teamGroups["De Fora"] || []}
          onConfirmRotation={handleRotationConfirm}
        />
      )}

      {/* Add player mid-match */}
      {matchId && (
        <AddPlayerMidMatch
          open={addPlayerOpen}
          onOpenChange={setAddPlayerOpen}
          peladaId={peladaId}
          matchId={matchId}
          existingMemberIds={existingUserIds}
          onPlayerAdded={() => {}}
        />
      )}

      {/* Modo Ação fullscreen */}
      {isSaved && playingTeams && (
        <LiveActionMode
          open={actionModeOpen}
          onClose={() => setActionModeOpen(false)}
          teamAName={teamAName}
          teamBName={teamBName}
          teamAScore={teamAScore}
          teamBScore={teamBScore}
          playersTeamA={teamGroups[teamAName] || []}
          playersTeamB={teamGroups[teamBName] || []}
          onRecordEvent={handleRecordEvent}
          onEndMatch={() => { setActionModeOpen(false); handleEndMatch(); }}
          onEndPelada={() => { setActionModeOpen(false); setConfirmEndDayOpen(true); }}
          matchId={matchId}
          matchNumber={currentMatchNumber}
          peladaId={peladaId}
          match={allMatches?.find((m: any) => m.id === matchId)}
          allTeams={regularTeams}
          outsideTeam={teamGroups["De Fora"] || []}
          onSwapPlayingTeam={handleSwapPlayingTeam}
          onAddPlayer={() => setAddPlayerOpen(true)}
        />
      )}



      {/* Post-match summary */}
      {postSummary && (
        <PostMatchSummary
          open={!!postSummary}
          onClose={() => setPostSummary(null)}
          matchNumber={postSummary.matchNumber}
          teamAName={postSummary.teamAName}
          teamBName={postSummary.teamBName}
          teamAScore={postSummary.teamAScore}
          teamBScore={postSummary.teamBScore}
          players={postSummary.players}
          stats={postSummary.stats}
          startedAt={postSummary.startedAt}
          endedAt={postSummary.endedAt}
          isAdmin={isAdmin}
          onNextMatch={handleSummaryNextMatch}
          onEndDay={() => { setPostSummary(null); setConfirmEndDayOpen(true); }}
        />
      )}

      {/* Confirm end-of-day dialog (triggered from post-match summary) */}
      <AlertDialog open={confirmEndDayOpen} onOpenChange={setConfirmEndDayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Finalizar Pelada do Dia?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <p>Todos os eventos das partidas de hoje serão salvos.</p>
              <p>As estatísticas, XP e ranking dos jogadores serão atualizados.</p>
              <p>A votação dos destaques será aberta por 24 horas e notificações enviadas aos participantes.</p>
              {peladaData?.recurrence_enabled && peladaData?.recurrence_type !== "none" && (
                <p className="text-accent font-medium">📅 A próxima pelada recorrente continuará programada normalmente.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmEndDayOpen(false); handleEndPelada(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Finalizar Pelada do Dia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* End-of-day full summary */}
      {daySummary && (
        <PeladaDayFullReport
          open={!!daySummary}
          peladaId={peladaId}
          peladaName={peladaData?.name || "Pelada"}
          occurrenceId={daySummary.occurrenceId}
          matchIds={daySummary.matchIds}
          members={members}
          isAdmin={isAdmin}
          onClose={handleDaySummaryClose}
        />
      )}

      {/* Cinematic coin toss on tie */}
      {coinToss && (
        <CoinTossCinematic
          open={!!coinToss}
          teamA={coinToss.teamA}
          teamB={coinToss.teamB}
          matchId={coinToss.matchId}
          peladaId={peladaId}
          occurrenceId={coinToss.occurrenceId}
          onResult={() => setCoinToss(null)}
          onCancel={() => setCoinToss(null)}
        />
      )}

      {/* Voting notifications dispatch */}
      <AlertDialog open={notifyVotingOpen} onOpenChange={setNotifyVotingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pelada encerrada</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja enviar notificações de votação para todos os jogadores que participaram?
              Eles receberão um link direto para avaliar os outros jogadores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setNotifyVotingOpen(false); setNotifyOccurrenceId(null); navigateAfterPelada(); }}>
              Agora não
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await handleSendVotingNotifications(); navigateAfterPelada(); }}>
              Enviar notificações
            </AlertDialogAction>

          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
