import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, HandshakeIcon, Skull, Clock } from "lucide-react";
import { useMatchTeams, useMatchVotes, useAllPeladaMatches, useAllPeladaStats } from "@/hooks/useMatchManagement";
import { useFinalizedAwards } from "@/hooks/useFinalizedAwards";
import { getTeamStyle } from "@/lib/teamColors";

interface MatchSummaryProps {
  matchId: string;
  members: any[];
  peladaId?: string;
  votingFinalized?: boolean;
}

export function MatchSummary({ matchId, members, peladaId, votingFinalized }: MatchSummaryProps) {
  const { data: teams } = useMatchTeams(matchId);
  const { data: votes } = useMatchVotes(matchId);
  const { data: allMatches } = useAllPeladaMatches(peladaId);
  const { data: aggregated } = useAllPeladaStats(peladaId);
  const { data: finalizedAwards } = useFinalizedAwards(matchId, votingFinalized);

  const totalMatches = (allMatches || []).filter(m => m.is_finished).length;
  const useAggregated = totalMatches > 1 && aggregated;

  const memberMap = useMemo(() => {
    const map: Record<string, any> = {};
    members?.forEach((m: any) => (map[m.id] = m));
    return map;
  }, [members]);

  const getName = (memberId: string) => {
    const m = memberMap[memberId];
    return m?.profile?.name || m?.guest_name || "Jogador";
  };

  const teamGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    teams?.forEach((t) => {
      if (!groups[t.team]) groups[t.team] = [];
      groups[t.team].push(t.pelada_member_id);
    });
    return groups;
  }, [teams]);

  const statsMap = useMemo(() => {
    if (useAggregated) return aggregated.statsMap;
    return aggregated?.statsMap || {};
  }, [useAggregated, aggregated]);

  const matchCountMap = useAggregated ? aggregated.matchCountMap : {};

  // Use finalized awards (official) or show nothing if not finalized
  const awards = useMemo(() => {
    if (!votingFinalized || !finalizedAwards) {
      // Calculate avg ratings from votes for display, but NO award winners
      const ratingSums: Record<string, { total: number; count: number }> = {};
      votes?.ratings?.forEach((v: any) => {
        if (!ratingSums[v.rated_member_id]) ratingSums[v.rated_member_id] = { total: 0, count: 0 };
        ratingSums[v.rated_member_id].total += v.stars;
        ratingSums[v.rated_member_id].count += 1;
      });
      const avgRatings: Record<string, number> = {};
      Object.entries(ratingSums).forEach(([id, { total, count }]) => {
        avgRatings[id] = Math.round((total / count) * 10) / 10;
      });
      return { craque: null, fairPlay: null, bolaMurcha: null, avgRatings };
    }

    // Official finalized results
    const ratingSums: Record<string, { total: number; count: number }> = {};
    votes?.ratings?.forEach((v: any) => {
      if (!ratingSums[v.rated_member_id]) ratingSums[v.rated_member_id] = { total: 0, count: 0 };
      ratingSums[v.rated_member_id].total += v.stars;
      ratingSums[v.rated_member_id].count += 1;
    });
    const avgRatings: Record<string, number> = {};
    Object.entries(ratingSums).forEach(([id, { total, count }]) => {
      avgRatings[id] = Math.round((total / count) * 10) / 10;
    });

    const craque = finalizedAwards.find(a => a.award_type === "craque")?.winner_member_id || null;
    const fairPlay = finalizedAwards.find(a => a.award_type === "fair_play")?.winner_member_id || null;
    const bolaMurcha = finalizedAwards.find(a => a.award_type === "bola_murcha")?.winner_member_id || null;

    return { craque, fairPlay, bolaMurcha, avgRatings };
  }, [votes, finalizedAwards, votingFinalized]);

  const teamNames = Object.keys(teamGroups).filter((n) => n !== "De Fora").sort();
  const hasVotes = (votes?.ratings?.length || 0) > 0;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        Resumo da Pelada
        {totalMatches > 1 && (
          <Badge variant="outline" className="text-xs ml-2">{totalMatches} partidas</Badge>
        )}
      </h2>

      {/* Awards - only show when finalized */}
      {votingFinalized && (awards.craque || awards.fairPlay || awards.bolaMurcha) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {awards.craque && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">⭐ Craque da Pelada</p>
                <p className="font-display font-bold text-foreground mt-1">{getName(awards.craque)}</p>
              </CardContent>
            </Card>
          )}
          {awards.fairPlay && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-4 text-center">
                <HandshakeIcon className="w-8 h-8 text-success mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">🤝 Fair Play</p>
                <p className="font-display font-bold text-foreground mt-1">{getName(awards.fairPlay)}</p>
              </CardContent>
            </Card>
          )}
          {awards.bolaMurcha && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 text-center">
                <Skull className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">💀 Bola Murcha</p>
                <p className="font-display font-bold text-foreground mt-1">{getName(awards.bolaMurcha)}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Voting pending message */}
      {hasVotes && !votingFinalized && (
        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Votação em andamento — os prêmios serão revelados após a finalização.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Teams and stats */}
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
                    <span className="text-lg font-bold text-primary">{teamGoals}</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1">
                {memberIds.map((memberId) => {
                  const s = statsMap[memberId];
                  const avg = awards.avgRatings[memberId];
                  const matchesPlayed = matchCountMap[memberId] || 0;
                  return (
                    <div key={memberId} className="flex items-center gap-2 py-1.5 px-2 rounded bg-secondary/30">
                      <span className="text-sm text-foreground flex-1 truncate">{getName(memberId)}</span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {totalMatches > 1 && matchesPlayed > 0 && (
                          <Badge variant="outline" className="px-1 py-0 h-4 text-muted-foreground border-muted">
                            {matchesPlayed}/{totalMatches}
                          </Badge>
                        )}
                        {s?.goals > 0 && <Badge variant="outline" className="px-1 py-0 h-4 text-primary border-primary/30">⚽{s.goals}</Badge>}
                        {s?.assists > 0 && <Badge variant="outline" className="px-1 py-0 h-4 text-accent border-accent/30">🅰️{s.assists}</Badge>}
                        {s?.yellow_cards > 0 && <Badge variant="outline" className="px-1 py-0 h-4 text-warning border-warning/30">🟨{s.yellow_cards}</Badge>}
                        {s?.red_cards > 0 && <Badge variant="outline" className="px-1 py-0 h-4 text-destructive border-destructive/30">🟥{s.red_cards}</Badge>}
                        {votingFinalized && avg !== undefined && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 px-1 py-0 h-4">
                            <Star className="w-2.5 h-2.5 mr-0.5" />{avg}
                          </Badge>
                        )}
                      </div>
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

      {!hasVotes && !votingFinalized && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aguardando votos dos jogadores...
        </p>
      )}
    </div>
  );
}
