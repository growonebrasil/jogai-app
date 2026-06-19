import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Sparkles, CheckCircle2, X, Crown, Heart, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DayPlayer {
  member_id: string;
  user_id?: string | null;
  name: string;
  played: boolean;
}

interface PeladaDaySummaryProps {
  open: boolean;
  peladaName: string;
  matchIds: string[];
  members: any[];
  onClose: () => void;
}

interface AggStats {
  goals: number; assists: number; yellow_cards: number; red_cards: number;
}

export function PeladaDaySummary({ open, peladaName, matchIds, members, onClose }: PeladaDaySummaryProps) {
  const [stats, setStats] = useState<Record<string, AggStats>>({});
  const [awards, setAwards] = useState<{ craque?: string; fair_play?: string }>({});
  const [xpByUser, setXpByUser] = useState<Record<string, number>>({});
  const [matches, setMatches] = useState<any[]>([]);
  const [playedMembers, setPlayedMembers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || matchIds.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: ms }, { data: mt }, { data: matchesRow }, { data: aw }] = await Promise.all([
        supabase.from("match_stats").select("*").in("match_id", matchIds),
        supabase.from("match_teams").select("match_id, pelada_member_id").in("match_id", matchIds),
        supabase.from("matches").select("*").in("id", matchIds),
        supabase.from("pelada_award_results").select("*").in("match_id", matchIds),
      ]);

      const agg: Record<string, AggStats> = {};
      (ms || []).forEach((s: any) => {
        if (!agg[s.pelada_member_id]) agg[s.pelada_member_id] = { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 };
        agg[s.pelada_member_id].goals += s.goals;
        agg[s.pelada_member_id].assists += s.assists;
        agg[s.pelada_member_id].yellow_cards += s.yellow_cards;
        agg[s.pelada_member_id].red_cards += s.red_cards;
      });

      const played = new Set<string>();
      (mt || []).forEach((t: any) => played.add(t.pelada_member_id));

      const aMap: { craque?: string; fair_play?: string } = {};
      (aw || []).forEach((a: any) => {
        if (a.award_type === "craque" && !aMap.craque) aMap.craque = a.winner_member_id;
        if (a.award_type === "fair_play" && !aMap.fair_play) aMap.fair_play = a.winner_member_id;
      });

      // XP from xp_events tied to these matches
      const { data: xp } = await supabase
        .from("xp_events")
        .select("user_id, xp")
        .eq("ref_type", "match")
        .in("ref_id", matchIds);
      const xpMap: Record<string, number> = {};
      (xp || []).forEach((e: any) => {
        xpMap[e.user_id] = (xpMap[e.user_id] || 0) + e.xp;
      });

      if (cancelled) return;
      setStats(agg);
      setAwards(aMap);
      setXpByUser(xpMap);
      setMatches(matchesRow || []);
      setPlayedMembers(played);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, matchIds.join(",")]);

  const memberNameMap = useMemo(() => {
    const m: Record<string, { name: string; user_id?: string | null }> = {};
    (members || []).forEach((mb: any) => {
      m[mb.id] = { name: mb.profile?.name || mb.guest_name || "Jogador", user_id: mb.user_id };
    });
    return m;
  }, [members]);

  const totals = useMemo(() => {
    let goals = 0, assists = 0, y = 0, r = 0;
    Object.values(stats).forEach(s => { goals += s.goals; assists += s.assists; y += s.yellow_cards; r += s.red_cards; });
    return { goals, assists, yellow: y, red: r };
  }, [stats]);

  const topScorer = useMemo(() => {
    const arr = Object.entries(stats).sort((a, b) => b[1].goals - a[1].goals).filter(([, s]) => s.goals > 0);
    return arr[0]?.[0] || null;
  }, [stats]);

  const topAssister = useMemo(() => {
    const arr = Object.entries(stats).sort((a, b) => b[1].assists - a[1].assists).filter(([, s]) => s.assists > 0);
    return arr[0]?.[0] || null;
  }, [stats]);

  const present = (members || []).filter((m: any) => playedMembers.has(m.id));
  const absent = (members || []).filter((m: any) => !playedMembers.has(m.id) && m.status === "confirmado");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-background overflow-y-auto animate-fade-in">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_60%)]" />

      <div className="relative max-w-2xl mx-auto p-4 pb-28 space-y-5">
        <div className="flex items-center justify-between">
          <Badge className="bg-success/20 text-success border-success/40 font-bold tracking-wider">
            <CheckCircle2 className="w-3 h-3 mr-1" /> PELADA FINALIZADA
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-11 w-11">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl font-black text-foreground">Resumo da Pelada do Dia</h1>
          <p className="text-sm text-muted-foreground">🏟️ {peladaName}</p>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile label="Partidas" value={matches.length} />
          <StatTile label="Gols" value={totals.goals} />
          <StatTile label="Assist." value={totals.assists} />
          <StatTile label="Cartões" value={totals.yellow + totals.red} />
        </div>

        {/* Highlights */}
        <div className="space-y-2">
          <Highlight icon={<Crown className="w-4 h-4 text-accent" />} label="Artilheiro do dia" name={topScorer ? memberNameMap[topScorer]?.name : null} extra={topScorer ? `${stats[topScorer].goals} gols` : null} />
          <Highlight icon={<Sparkles className="w-4 h-4 text-primary" />} label="Maestro (assistências)" name={topAssister ? memberNameMap[topAssister]?.name : null} extra={topAssister ? `${stats[topAssister].assists} assist.` : null} />
          <Highlight icon={<Heart className="w-4 h-4 text-success" />} label="Fair Play" name={awards.fair_play ? memberNameMap[awards.fair_play]?.name : null} />
          {awards.craque && (
            <Highlight icon={<Trophy className="w-4 h-4 text-accent" />} label="Craque da rodada" name={memberNameMap[awards.craque]?.name || null} />
          )}
        </div>

        {/* Players */}
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2">
          <p className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground">Presentes ({present.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {present.map((m: any) => (
              <Badge key={m.id} variant="outline" className="text-xs">{memberNameMap[m.id]?.name}</Badge>
            ))}
            {present.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
          </div>
          {absent.length > 0 && (
            <>
              <p className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground pt-2">Ausentes ({absent.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {absent.map((m: any) => (
                  <Badge key={m.id} variant="outline" className="text-xs border-destructive/30 text-destructive">{memberNameMap[m.id]?.name}</Badge>
                ))}
              </div>
            </>
          )}
        </div>

        {/* XP earned */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="font-display font-bold text-xs uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" /> XP conquistado
          </p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Calculando...</p>
          ) : (
            <div className="space-y-1">
              {present
                .map((m: any) => ({ m, xp: m.user_id ? (xpByUser[m.user_id] || 0) : 0 }))
                .sort((a, b) => b.xp - a.xp)
                .map(({ m, xp }) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground/90 truncate">{memberNameMap[m.id]?.name}</span>
                    <span className="font-mono font-bold text-primary">+{xp} XP</span>
                  </div>
                ))}
              {present.length === 0 && <p className="text-xs text-muted-foreground">Nenhum jogador.</p>}
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Votação aberta por 24h. Os destaques serão calculados ao final.
        </p>
      </div>

      <div className="fixed bottom-0 inset-x-0 z-[125] border-t border-border/60 bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <Button onClick={onClose} className="w-full h-14 text-base font-display font-bold tracking-wider bg-gradient-to-r from-primary to-accent glow-primary">
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3 text-center">
      <p className="font-display font-black text-3xl text-foreground tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Highlight({ icon, label, name, extra }: { icon: React.ReactNode; label: string; name: string | null | undefined; extra?: string | null }) {
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
