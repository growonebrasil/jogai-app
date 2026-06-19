import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Trophy, Sparkles, CheckCircle2, X, Crown, Heart, Zap, Square, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  peladaId: string;
  peladaName: string;
  occurrenceId?: string | null;
  matchIds: string[];
  members: any[];
  isAdmin: boolean;
  onClose: () => void;
}

interface AggStats { goals: number; assists: number; yellow_cards: number; red_cards: number }

export function PeladaDayFullReport({
  open, peladaId, peladaName, occurrenceId, matchIds, members, isAdmin, onClose,
}: Props) {
  const [stats, setStats] = useState<Record<string, AggStats>>({});
  const [perMatchStats, setPerMatchStats] = useState<Record<string, Record<string, AggStats>>>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [teamsByMatch, setTeamsByMatch] = useState<Record<string, { A: string[]; B: string[] }>>({});
  const [awards, setAwards] = useState<{ craque?: string; fair_play?: string }>({});
  const [xpByUser, setXpByUser] = useState<Record<string, number>>({});
  const [playedMembers, setPlayedMembers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [recomputed, setRecomputed] = useState(false);

  useEffect(() => {
    if (!open || matchIds.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: ms }, { data: mt }, { data: mRows }, { data: aw }, { data: xp }] = await Promise.all([
        supabase.from("match_stats").select("*").in("match_id", matchIds),
        supabase.from("match_teams").select("match_id, pelada_member_id, team").in("match_id", matchIds),
        supabase.from("matches").select("*").in("id", matchIds).order("match_number"),
        supabase.from("pelada_award_results").select("*").in("match_id", matchIds),
        supabase.from("xp_events").select("user_id, xp").eq("ref_type", "match").in("ref_id", matchIds),
      ]);

      const agg: Record<string, AggStats> = {};
      const per: Record<string, Record<string, AggStats>> = {};
      (ms || []).forEach((s: any) => {
        agg[s.pelada_member_id] = agg[s.pelada_member_id] || { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 };
        agg[s.pelada_member_id].goals += s.goals;
        agg[s.pelada_member_id].assists += s.assists;
        agg[s.pelada_member_id].yellow_cards += s.yellow_cards;
        agg[s.pelada_member_id].red_cards += s.red_cards;
        per[s.match_id] = per[s.match_id] || {};
        per[s.match_id][s.pelada_member_id] = {
          goals: s.goals, assists: s.assists, yellow_cards: s.yellow_cards, red_cards: s.red_cards,
        };
      });

      const tbm: Record<string, { A: string[]; B: string[] }> = {};
      const played = new Set<string>();
      (mt || []).forEach((t: any) => {
        tbm[t.match_id] = tbm[t.match_id] || { A: [], B: [] };
        if (t.team === "A") tbm[t.match_id].A.push(t.pelada_member_id);
        else if (t.team === "B") tbm[t.match_id].B.push(t.pelada_member_id);
        played.add(t.pelada_member_id);
      });

      const aMap: { craque?: string; fair_play?: string } = {};
      (aw || []).forEach((a: any) => {
        if (a.award_type === "craque" && !aMap.craque) aMap.craque = a.winner_member_id;
        if (a.award_type === "fair_play" && !aMap.fair_play) aMap.fair_play = a.winner_member_id;
      });

      const xpMap: Record<string, number> = {};
      (xp || []).forEach((e: any) => { xpMap[e.user_id] = (xpMap[e.user_id] || 0) + e.xp; });

      if (cancelled) return;
      setStats(agg);
      setPerMatchStats(per);
      setTeamsByMatch(tbm);
      setMatches(mRows || []);
      setAwards(aMap);
      setXpByUser(xpMap);
      setPlayedMembers(played);
      setLoading(false);

      // Trigger recompute automatically once
      if (isAdmin && !recomputed) {
        handleRecompute(true);
      }
    })();
    return () => { cancelled = true; };
  }, [open, matchIds.join(",")]);

  const memberMap = useMemo(() => {
    const m: Record<string, { name: string; user_id?: string | null }> = {};
    (members || []).forEach((mb: any) => {
      m[mb.id] = { name: mb.profile?.name || mb.guest_name || "Jogador", user_id: mb.user_id };
    });
    return m;
  }, [members]);

  const totals = useMemo(() => {
    let g = 0, a = 0, y = 0, r = 0;
    Object.values(stats).forEach(s => { g += s.goals; a += s.assists; y += s.yellow_cards; r += s.red_cards; });
    return { goals: g, assists: a, yellow: y, red: r };
  }, [stats]);

  const rankBy = (key: keyof AggStats) =>
    Object.entries(stats)
      .filter(([, s]) => s[key] > 0)
      .sort((a, b) => b[1][key] - a[1][key]);

  const topScorers = rankBy("goals").slice(0, 5);
  const topAssist = rankBy("assists").slice(0, 5);
  const topYellow = rankBy("yellow_cards").slice(0, 3);
  const dayRanking = useMemo(() => {
    return Object.entries(stats)
      .map(([id, s]) => ({ id, score: s.goals * 3 + s.assists * 2 - s.yellow_cards - s.red_cards * 3, s }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [stats]);

  const present = (members || []).filter((m: any) => playedMembers.has(m.id));

  async function handleRecompute(silent = false) {
    if (recomputing) return;
    setRecomputing(true);
    try {
      const { data, error } = await supabase.functions.invoke("recompute-player-cards", {
        body: { pelada_id: peladaId, occurrence_id: occurrenceId },
      });
      if (error) throw error;
      setRecomputed(true);
      if (!silent) toast.success(`Cartas atualizadas: ${(data as any)?.updated || 0} jogadores`);
    } catch (e: any) {
      console.error(e);
      if (!silent) toast.error("Erro ao recalcular cartas: " + (e?.message || ""));
    } finally {
      setRecomputing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-background overflow-y-auto animate-fade-in">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_60%)]" />

      <div className="relative max-w-3xl mx-auto p-4 pb-28 space-y-5">
        <div className="flex items-center justify-between">
          <Badge className="bg-success/20 text-success border-success/40 font-bold tracking-wider">
            <CheckCircle2 className="w-3 h-3 mr-1" /> RESUMO COMPLETO
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-11 w-11">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl font-black text-foreground">Resumo Completo da Pelada</h1>
          <p className="text-sm text-muted-foreground">🏟️ {peladaName}</p>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Tile label="Partidas" value={matches.length} />
          <Tile label="Presentes" value={present.length} />
          <Tile label="Gols" value={totals.goals} />
          <Tile label="Assist." value={totals.assists} />
          <Tile label="Cartões" value={totals.yellow + totals.red} />
        </div>

        {/* Highlights */}
        <div className="space-y-2">
          <Row icon={<Crown className="w-4 h-4 text-accent" />} label="Artilheiro" name={topScorers[0] ? memberMap[topScorers[0][0]]?.name : null} extra={topScorers[0] ? `${topScorers[0][1].goals} gols` : null} />
          <Row icon={<Sparkles className="w-4 h-4 text-primary" />} label="Garçom" name={topAssist[0] ? memberMap[topAssist[0][0]]?.name : null} extra={topAssist[0] ? `${topAssist[0][1].assists} assist.` : null} />
          <Row icon={<Heart className="w-4 h-4 text-success" />} label="Fair Play" name={awards.fair_play ? memberMap[awards.fair_play]?.name : null} />
          {awards.craque && (
            <Row icon={<Trophy className="w-4 h-4 text-accent" />} label="Craque" name={memberMap[awards.craque]?.name || null} />
          )}
          {topYellow[0] && (
            <Row icon={<Square className="w-4 h-4 text-warning" />} label="Mais cartões" name={memberMap[topYellow[0][0]]?.name} extra={`${topYellow[0][1].yellow_cards + topYellow[0][1].red_cards}`} />
          )}
        </div>

        {/* Per match */}
        <div className="space-y-2">
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground">Partidas</h3>
          <Accordion type="single" collapsible>
            {matches.map((m: any) => {
              const ms = perMatchStats[m.id] || {};
              const t = teamsByMatch[m.id] || { A: [], B: [] };
              const dur = m.started_at && m.ended_at
                ? Math.round((new Date(m.ended_at).getTime() - new Date(m.started_at).getTime()) / 60000)
                : null;
              return (
                <AccordionItem key={m.id} value={m.id} className="border border-border/60 rounded-lg px-3 mb-2 bg-card/40">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <Badge variant="outline" className="font-mono text-xs">#{m.match_number}</Badge>
                      <div className="font-display font-black text-lg tabular-nums">{m.team_a_score} × {m.team_b_score}</div>
                      {dur != null && <span className="text-xs text-muted-foreground ml-auto">{dur} min</span>}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-3">
                    {(["A", "B"] as const).map((side) => (
                      <div key={side}>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Time {side}</p>
                        <div className="space-y-0.5">
                          {(t[side] || []).map((mid) => {
                            const s = ms[mid] || { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 };
                            const parts: string[] = [];
                            if (s.goals) parts.push(`⚽${s.goals}`);
                            if (s.assists) parts.push(`🅰️${s.assists}`);
                            if (s.yellow_cards) parts.push(`🟨${s.yellow_cards}`);
                            if (s.red_cards) parts.push(`🟥${s.red_cards}`);
                            return (
                              <div key={mid} className="flex items-center justify-between text-sm">
                                <span className="text-foreground truncate">{memberMap[mid]?.name || "—"}</span>
                                <span className="text-xs font-mono text-muted-foreground">{parts.join(" ") || "—"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Day ranking */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2">
          <p className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground">Ranking do dia</p>
          {dayRanking.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados.</p>
          ) : dayRanking.map((r, i) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground/90"><span className="font-mono text-primary mr-2">{i + 1}.</span>{memberMap[r.id]?.name}</span>
              <span className="font-mono font-bold text-foreground">{r.score} pts</span>
            </div>
          ))}
        </div>

        {/* XP */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="font-display font-bold text-xs uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" /> XP conquistado
          </p>
          {loading ? <p className="text-xs text-muted-foreground">Calculando...</p> : (
            <div className="space-y-1">
              {present.map((m: any) => ({ m, xp: m.user_id ? (xpByUser[m.user_id] || 0) : 0 }))
                .sort((a, b) => b.xp - a.xp)
                .map(({ m, xp }) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/90 truncate">{memberMap[m.id]?.name}</span>
                    <span className="font-mono font-bold text-primary">+{xp} XP</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {isAdmin && (
          <Button
            variant="outline"
            onClick={() => handleRecompute(false)}
            disabled={recomputing}
            className="w-full h-12"
          >
            {recomputing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {recomputing ? "Recalculando cartas..." : "Recalcular cartas dos jogadores"}
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Votação aberta por 24h. Cartas atualizadas com base nos dados reais da pelada.
        </p>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-[125] border-t border-border/60 bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <Button onClick={onClose} className="w-full h-14 text-base font-display font-bold tracking-wider bg-gradient-to-r from-primary to-accent glow-primary">
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-center">
      <p className="font-display font-black text-2xl text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ icon, label, name, extra }: { icon: React.ReactNode; label: string; name: string | null | undefined; extra?: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        {icon}
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-bold text-foreground truncate">{name || "—"}</span>
        {extra && <span className="text-xs font-mono text-muted-foreground">{extra}</span>}
      </div>
    </div>
  );
}
