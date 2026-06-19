import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy, Target, Award, AlertTriangle, Users, Calendar,
  TrendingUp, Star, Shield, Gamepad2, Filter,
} from "lucide-react";
import { useAllPeladaMatches, useAllPeladaStats } from "@/hooks/useMatchManagement";
import { useFinalizedAwardsAggregate } from "@/hooks/useFinalizedAwards";
import { usePeladaMembers } from "@/hooks/usePeladas";
import { usePeladaOccurrences } from "@/hooks/useOccurrences";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CentralDaPeladaProps {
  peladaId: string;
}

function useOccurrenceStats(peladaId: string) {
  return useQuery({
    queryKey: ["occurrenceStats", peladaId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pelada_occurrences")
        .select("status")
        .eq("pelada_id", peladaId);
      const total = data?.length || 0;
      const finished = data?.filter(o => o.status === "finished").length || 0;
      const canceled = data?.filter(o => o.status === "canceled").length || 0;
      return { total, finished, canceled };
    },
    enabled: !!peladaId,
  });
}

function useCentralRealtime(peladaId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!peladaId) return;
    const channel = supabase
      .channel(`central_${peladaId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `pelada_id=eq.${peladaId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["allPeladaMatches", peladaId] });
        queryClient.invalidateQueries({ queryKey: ["allPeladaStats", peladaId] });
        queryClient.invalidateQueries({ queryKey: ["finalizedAwardsAggregate", peladaId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_stats' }, () => {
        queryClient.invalidateQueries({ queryKey: ["allPeladaStats", peladaId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_teams' }, () => {
        queryClient.invalidateQueries({ queryKey: ["allPeladaStats", peladaId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pelada_award_results' }, () => {
        queryClient.invalidateQueries({ queryKey: ["finalizedAwardsAggregate", peladaId] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pelada_occurrences', filter: `pelada_id=eq.${peladaId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["occurrenceStats", peladaId] });
        queryClient.invalidateQueries({ queryKey: ["peladaOccurrences", peladaId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [peladaId, queryClient]);
}

export function CentralDaPelada({ peladaId }: CentralDaPeladaProps) {
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>("todos");

  const { data: members } = usePeladaMembers(peladaId);
  const { data: allMatches } = useAllPeladaMatches(peladaId);
  const { data: occurrences } = usePeladaOccurrences(peladaId);
  const { data: awardVotes } = useFinalizedAwardsAggregate(peladaId);
  const { data: occStats } = useOccurrenceStats(peladaId);

  const filterOccurrenceId = selectedOccurrence === "todos" ? undefined : selectedOccurrence;
  const { data: peladaStats } = useAllPeladaStats(peladaId, filterOccurrenceId);

  useCentralRealtime(peladaId);

  const filteredMatches = useMemo(() => {
    if (!allMatches) return [];
    if (selectedOccurrence === "todos") return allMatches.filter(m => m.is_finished);
    return allMatches.filter(m => m.is_finished && m.occurrence_id === selectedOccurrence);
  }, [allMatches, selectedOccurrence]);

  const finishedSessions = useMemo(() =>
    (occurrences || []).filter(o => o.status === "finished").sort((a: any, b: any) =>
      (b.occurrence_date || "").localeCompare(a.occurrence_date || "")
    ), [occurrences]);

  const statsMap = peladaStats?.statsMap || {};
  const matchCountMap = peladaStats?.matchCountMap || {};

  // Build member lookup with avatar
  const memberLookup = useMemo(() => {
    const map: Record<string, { name: string; avatar_url: string | null }> = {};
    (members || []).forEach((m: any) => {
      map[m.id] = {
        name: m.profile?.name || m.guest_name || "Jogador",
        avatar_url: m.profile?.avatar_url || null,
      };
    });
    return map;
  }, [members]);

  const getName = (memberId: string) => memberLookup[memberId]?.name || "Jogador";
  const getAvatar = (memberId: string) => memberLookup[memberId]?.avatar_url || null;

  const playerEntries = useMemo(() => {
    const allPlayerIds = new Set([
      ...Object.keys(statsMap),
      ...Object.keys(matchCountMap),
    ]);
    return Array.from(allPlayerIds).map(id => ({
      id,
      name: getName(id),
      avatar_url: getAvatar(id),
      goals: (statsMap as any)[id]?.goals || 0,
      assists: (statsMap as any)[id]?.assists || 0,
      yellow_cards: (statsMap as any)[id]?.yellow_cards || 0,
      red_cards: (statsMap as any)[id]?.red_cards || 0,
      matches: matchCountMap[id] || 0,
      craque: awardVotes?.craque[id] || 0,
      fairPlay: awardVotes?.fairPlay[id] || 0,
      bolaMurcha: awardVotes?.bolaMurcha[id] || 0,
    }));
  }, [statsMap, matchCountMap, memberLookup, awardVotes]);

  const topScorers = useMemo(() => [...playerEntries].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 10), [playerEntries]);
  const topAssisters = useMemo(() => [...playerEntries].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 10), [playerEntries]);
  const topAttendance = useMemo(() => [...playerEntries].filter(p => p.matches > 0).sort((a, b) => b.matches - a.matches).slice(0, 10), [playerEntries]);
  const topCraque = useMemo(() => [...playerEntries].filter(p => p.craque > 0).sort((a, b) => b.craque - a.craque).slice(0, 5), [playerEntries]);
  const topFairPlay = useMemo(() => [...playerEntries].filter(p => p.fairPlay > 0).sort((a, b) => b.fairPlay - a.fairPlay).slice(0, 5), [playerEntries]);
  const topBolaMurcha = useMemo(() => [...playerEntries].filter(p => p.bolaMurcha > 0).sort((a, b) => b.bolaMurcha - a.bolaMurcha).slice(0, 5), [playerEntries]);
  const topYellowCards = useMemo(() => [...playerEntries].filter(p => p.yellow_cards > 0).sort((a, b) => b.yellow_cards - a.yellow_cards).slice(0, 10), [playerEntries]);
  const topRedCards = useMemo(() => [...playerEntries].filter(p => p.red_cards > 0).sort((a, b) => b.red_cards - a.red_cards).slice(0, 10), [playerEntries]);

  const totalPeladas = selectedOccurrence === "todos" ? (occStats?.finished || 0) : 1;
  const totalPartidas = filteredMatches.length;
  const attendanceRate = occStats && occStats.total > 0
    ? Math.round((occStats.finished / occStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Day filter */}
      <div className="gaming-card p-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1">
            <Select value={selectedOccurrence} onValueChange={setSelectedOccurrence}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filtrar por pelada do dia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">📊 Todas as peladas (Geral)</SelectItem>

                {finishedSessions.map((occ: any) => {
                  const matchCount = (allMatches || []).filter(m => m.occurrence_id === occ.id && m.is_finished).length;
                  return (
                    <SelectItem key={occ.id} value={occ.id}>
                      📅 {format(new Date(occ.occurrence_date + "T12:00:00"), "dd/MM/yyyy")} · {matchCount} partida(s)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <OverviewCard icon={Calendar} label="Peladas" value={totalPeladas} color="primary" />
        <OverviewCard icon={Gamepad2} label="Partidas" value={totalPartidas} color="accent" />
        <OverviewCard icon={Users} label="Jogadores" value={members?.length || 0} color="primary" />
        <OverviewCard icon={TrendingUp} label="Taxa de Presença" value={`${attendanceRate}%`} color="accent" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankingCard title="⚽ Artilharia" entries={topScorers} valueKey="goals" suffix="gols" icon={Target} />
        <RankingCard title="🤝 Assistências" entries={topAssisters} valueKey="assists" suffix="assist." icon={Award} />
        <RankingCard title="📅 Frequência" entries={topAttendance} valueKey="matches" suffix="jogos" icon={Users} />
        <RankingCard title="⭐ Craque da Pelada" entries={topCraque} valueKey="craque" suffix="títulos" icon={Star} />
        <RankingCard title="🤝 Fair Play" entries={topFairPlay} valueKey="fairPlay" suffix="títulos" icon={Shield} />
        <RankingCard title="😞 Bola Murcha" entries={topBolaMurcha} valueKey="bolaMurcha" suffix="títulos" icon={AlertTriangle} />
        <RankingCard title="🟨 Cartões Amarelos" entries={topYellowCards} valueKey="yellow_cards" suffix="cartões" icon={AlertTriangle} />
        <RankingCard title="🟥 Cartões Vermelhos" entries={topRedCards} valueKey="red_cards" suffix="cartões" icon={AlertTriangle} />
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: "primary" | "accent" }) {
  return (
    <div className="gaming-card p-4 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1 text-${color}`} />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl font-bold text-${color}`}>{value}</p>
    </div>
  );
}

function RankingCard({
  title, entries, valueKey, suffix, icon: Icon,
}: {
  title: string;
  entries: any[];
  valueKey: string;
  suffix: string;
  icon: any;
}) {
  if (entries.length === 0) {
    return (
      <div className="gaming-card p-4">
        <h3 className="font-display text-sm font-bold text-foreground mb-3">{title}</h3>
        <p className="text-xs text-muted-foreground text-center py-4">Sem dados ainda</p>
      </div>
    );
  }

  return (
    <div className="gaming-card p-4">
      <h3 className="font-display text-sm font-bold text-foreground mb-3">{title}</h3>
      <div className="space-y-1.5">
        {entries.map((entry, i) => (
          <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                i === 0 ? "bg-primary text-primary-foreground" :
                i === 1 ? "bg-accent/20 text-accent" :
                i === 2 ? "bg-warning/20 text-warning" :
                "bg-secondary text-muted-foreground"
              }`}>
                {i + 1}
              </span>
              <Avatar className="w-6 h-6">
                {entry.avatar_url ? (
                  <AvatarImage src={entry.avatar_url} alt={entry.name} />
                ) : null}
                <AvatarFallback className="text-[10px] font-bold bg-muted">
                  {entry.name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground font-medium truncate max-w-[100px]">{entry.name}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {entry[valueKey]} {suffix}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
