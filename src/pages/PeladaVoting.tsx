import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Star, Trophy, Shield, HandshakeIcon, Flame, Sparkles, ChevronLeft, ChevronRight, CheckCircle2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getTeamStyle } from "@/lib/teamColors";

type Awards = {
  craque?: string;
  garcom?: string;
  melhor_defensor?: string;
  mais_raca?: string;
  fair_play?: string;
};

interface Participant {
  memberId: string;
  userId?: string | null;
  name: string;
  position: string;
  avatar?: string | null;
  overall: number;
  team: string;
  goals: number;
  assists: number;
  yellow: number;
  red: number;
}

const CATEGORIES = [
  { key: "nota_desempenho", label: "Desempenho", icon: Trophy },
  { key: "nota_tecnica", label: "Técnica", icon: Sparkles },
  { key: "nota_defesa", label: "Marcação", icon: Shield },
  { key: "nota_coletivo", label: "Coletivo", icon: HandshakeIcon },
  { key: "nota_fair_play", label: "Fair Play", icon: Star },
] as const;

const AWARDS = [
  { key: "craque" as const, label: "⭐ Craque da Pelada", color: "bg-accent text-background" },
  { key: "garcom" as const, label: "🎯 Garçom", color: "bg-primary text-primary-foreground" },
  { key: "melhor_defensor" as const, label: "🛡 Melhor Defensor", color: "bg-success text-success-foreground" },
  { key: "mais_raca" as const, label: "🔥 Mais Raça", color: "bg-warning text-warning-foreground" },
  { key: "fair_play" as const, label: "🤝 Fair Play", color: "bg-secondary text-foreground" },
];

export default function PeladaVoting() {
  const { peladaId, occurrenceId } = useParams<{ peladaId: string; occurrenceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [peladaName, setPeladaName] = useState("");
  const [idx, setIdx] = useState(0);
  const [ratings, setRatings] = useState<Record<string, Record<string, number>>>({});
  const [awards, setAwards] = useState<Awards>({});
  const [selfMemberId, setSelfMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!peladaId || !occurrenceId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      // pelada name
      const { data: p } = await supabase.from("peladas").select("name").eq("id", peladaId).single();
      if (p) setPeladaName(p.name);

      // self member
      const { data: self } = await supabase.from("pelada_members")
        .select("id").eq("pelada_id", peladaId).eq("user_id", user.id).maybeSingle();
      const sId = self?.id || null;
      setSelfMemberId(sId);

      // matches of occurrence
      const { data: matches } = await supabase.from("matches")
        .select("id").eq("occurrence_id", occurrenceId);
      const matchIds = (matches || []).map((m: any) => m.id);
      if (matchIds.length === 0) { setLoading(false); return; }

      // teams + stats
      const [{ data: teamRows }, { data: statRows }] = await Promise.all([
        supabase.from("match_teams").select("match_id, pelada_member_id, team").in("match_id", matchIds),
        supabase.from("match_stats").select("*").in("match_id", matchIds),
      ]);

      const memberIds = Array.from(new Set((teamRows || []).map((t: any) => t.pelada_member_id)));
      if (memberIds.length === 0) { setLoading(false); return; }

      const [{ data: memberRows }, { data: cardRows }, { data: existing }] = await Promise.all([
        supabase.from("pelada_members")
          .select("id, user_id, guest_name, guest_position, profile:profiles!pelada_members_user_id_fkey(name, position, avatar_url)" as any)
          .in("id", memberIds),
        supabase.from("player_cards").select("user_id, overall").in("user_id", (await supabase.from("pelada_members").select("user_id").in("id", memberIds)).data?.map((r: any) => r.user_id).filter(Boolean) || []),
        supabase.from("pelada_day_votes" as any).select("rated_member_id").eq("occurrence_id", occurrenceId).eq("voter_id", user.id),
      ]);

      if ((existing as any)?.length > 0) {
        if (!cancelled) setSubmitted(true);
        setLoading(false);
        return;
      }

      const cardByUser = new Map<string, number>();
      (cardRows || []).forEach((c: any) => cardByUser.set(c.user_id, c.overall));

      const teamByMember = new Map<string, string>();
      (teamRows || []).forEach((t: any) => {
        if (!teamByMember.has(t.pelada_member_id)) teamByMember.set(t.pelada_member_id, t.team);
      });

      const statsByMember = new Map<string, { g: number; a: number; y: number; r: number }>();
      (statRows || []).forEach((s: any) => {
        const cur = statsByMember.get(s.pelada_member_id) || { g: 0, a: 0, y: 0, r: 0 };
        cur.g += s.goals; cur.a += s.assists; cur.y += s.yellow_cards; cur.r += s.red_cards;
        statsByMember.set(s.pelada_member_id, cur);
      });

      const list: Participant[] = (memberRows || [])
        .filter((m: any) => m.id !== sId)
        .map((m: any) => {
          const st = statsByMember.get(m.id) || { g: 0, a: 0, y: 0, r: 0 };
          return {
            memberId: m.id,
            userId: m.user_id,
            name: m.profile?.name || m.guest_name || "Jogador",
            position: m.profile?.position || m.guest_position || "MEI",
            avatar: m.profile?.avatar_url,
            overall: (m.user_id && cardByUser.get(m.user_id)) || 50,
            team: teamByMember.get(m.id) || "—",
            goals: st.g, assists: st.a, yellow: st.y, red: st.r,
          };
        });

      if (!cancelled) {
        setParticipants(list);
        const init: Record<string, Record<string, number>> = {};
        list.forEach((p) => {
          init[p.memberId] = {};
          CATEGORIES.forEach((c) => (init[p.memberId][c.key] = 3));
        });
        setRatings(init);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [peladaId, occurrenceId, user]);

  const current = participants[idx];

  const setRating = (memberId: string, cat: string, val: number) => {
    setRatings((r) => ({ ...r, [memberId]: { ...r[memberId], [cat]: val } }));
  };

  const toggleAward = (key: keyof Awards, memberId: string) => {
    setAwards((a) => ({ ...a, [key]: a[key] === memberId ? undefined : memberId }));
  };

  const handleSubmit = async () => {
    if (!user || !peladaId || !occurrenceId) return;
    setSubmitting(true);
    try {
      const rows = participants.map((p) => ({
        pelada_id: peladaId,
        occurrence_id: occurrenceId,
        voter_id: user.id,
        rated_member_id: p.memberId,
        nota_desempenho: ratings[p.memberId]?.nota_desempenho,
        nota_tecnica: ratings[p.memberId]?.nota_tecnica,
        nota_defesa: ratings[p.memberId]?.nota_defesa,
        nota_coletivo: ratings[p.memberId]?.nota_coletivo,
        nota_fair_play: ratings[p.memberId]?.nota_fair_play,
        special_awards: awards as any,
      }));
      const { error } = await supabase
        .from("pelada_day_votes" as any)
        .upsert(rows, { onConflict: "occurrence_id,voter_id,rated_member_id" });
      if (error) throw error;

      // Audit log
      try {
        await supabase.from("pelada_timeline_events").insert({
          pelada_id: peladaId,
          occurrence_id: occurrenceId,
          actor_id: user.id,
          event_type: "vote_submitted",
          payload: { rated_count: rows.length, awards },
        } as any);
      } catch (err) {
        console.warn("timeline log failed", err);
      }

      setSubmitted(true);
      toast.success("Votos enviados! Obrigado por avaliar.");
    } catch (e: any) {
      if (e?.code === "23505") {
        setSubmitted(true);
        toast.info("Você já votou nesta pelada.");
      } else {
        toast.error("Não foi possível enviar seus votos.");
        console.error(e);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
          <h2 className="font-display font-black text-2xl">Votos enviados!</h2>
          <p className="text-sm text-muted-foreground">
            Obrigado por avaliar os jogadores. Os resultados aparecem assim que a votação encerrar.
          </p>
          <Button className="w-full" onClick={() => navigate(`/pelada/${peladaId}`)}>Voltar para a Pelada</Button>
        </Card>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">Nenhum jogador participante encontrado.</p>
          <Button onClick={() => navigate(`/pelada/${peladaId}`)}>Voltar</Button>
        </Card>
      </div>
    );
  }

  const style = current ? getTeamStyle(current.team) : null;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-bold">Votação Pós-Pelada</p>
            <p className="font-display font-black text-foreground truncate">{peladaName}</p>
          </div>
          <Badge variant="outline" className="font-bold">
            {idx + 1} / {participants.length}
          </Badge>
        </div>
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${((idx + 1) / participants.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Player card */}
        {current && style && (
          <Card className="overflow-hidden border-2 border-border bg-gradient-to-br from-secondary/60 to-secondary/20">
            <div className="p-5 flex items-center gap-4">
              <Avatar className="w-20 h-20 ring-2 ring-accent/40">
                <AvatarImage src={current.avatar || undefined} />
                <AvatarFallback className="text-xl font-bold">{current.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-black text-xl text-foreground truncate">{current.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{current.position}</Badge>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                    <span className="text-muted-foreground">{current.team}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-2 text-xs">
                  <span className="font-bold">⚽ {current.goals}</span>
                  <span className="font-bold">🎯 {current.assists}</span>
                  {current.yellow > 0 && <span className="text-warning">🟨 {current.yellow}</span>}
                  {current.red > 0 && <span className="text-destructive">🟥 {current.red}</span>}
                </div>
              </div>
              <div className="text-center">
                <div className="font-display font-black text-3xl text-accent">{current.overall}</div>
                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">OVR</p>
              </div>
            </div>

            {/* Ratings */}
            <div className="border-t border-border p-5 space-y-4 bg-background/40">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const val = ratings[current.memberId]?.[c.key] || 3;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-accent" />
                        <span className="text-sm font-bold text-foreground">{c.label}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`w-4 h-4 ${n <= val ? "fill-accent text-accent" : "text-muted-foreground/40"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <Slider
                      value={[val]}
                      onValueChange={(v) => setRating(current.memberId, c.key, v[0])}
                      min={1} max={5} step={1}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
            <ChevronLeft className="w-4 h-4" /> Anterior
          </Button>
          {idx < participants.length - 1 ? (
            <Button className="flex-1 glow-primary" onClick={() => setIdx((i) => i + 1)}>
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          ) : null}
        </div>

        {/* Final awards section (visible on last) */}
        {idx === participants.length - 1 && (
          <Card className="p-5 space-y-5 border-2 border-accent/30">
            <div>
              <h3 className="font-display font-black text-lg text-foreground flex items-center gap-2">
                <Flame className="w-5 h-5 text-accent" /> Votos Especiais
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Escolha 1 jogador para cada prêmio (opcional).</p>
            </div>
            {AWARDS.map((a) => (
              <div key={a.key} className="space-y-2">
                <p className="text-sm font-bold text-foreground">{a.label}</p>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p) => (
                    <button
                      key={p.memberId}
                      onClick={() => toggleAward(a.key, p.memberId)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition ${
                        awards[a.key] === p.memberId
                          ? `${a.color} border-transparent font-bold`
                          : "bg-secondary/50 border-border hover:border-accent/40"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <Button
              className="w-full glow-primary h-12 font-display font-black text-base"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enviar Avaliação"}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
