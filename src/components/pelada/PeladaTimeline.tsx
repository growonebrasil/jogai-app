import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag, Play, Square, Trophy, AlertTriangle, Coins, Goal, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEvent {
  id: string;
  event_type: string;
  created_at: string;
  payload: any;
  match_id: string | null;
  actor_id: string | null;
}

const EVENT_META: Record<string, { label: string; icon: any; color: string }> = {
  match_start: { label: "Partida iniciada", icon: Play, color: "text-success" },
  match_end: { label: "Partida encerrada", icon: Square, color: "text-warning" },
  goal: { label: "Gol marcado", icon: Goal, color: "text-success" },
  assist: { label: "Assistência", icon: Trophy, color: "text-primary" },
  yellow: { label: "Cartão amarelo", icon: AlertTriangle, color: "text-warning" },
  red: { label: "Cartão vermelho", icon: AlertTriangle, color: "text-destructive" },
  coin_flip: { label: "Decisão na moeda", icon: Coins, color: "text-accent" },
  pelada_end: { label: "Pelada encerrada", icon: Flag, color: "text-destructive" },
};

export function PeladaTimeline({
  peladaId,
  occurrenceId,
}: {
  peladaId: string;
  occurrenceId?: string | null;
}) {
  const { data: events, isLoading } = useQuery({
    queryKey: ["pelada-timeline", peladaId, occurrenceId],
    queryFn: async () => {
      let q = supabase
        .from("pelada_timeline_events" as any)
        .select("*")
        .eq("pelada_id", peladaId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (occurrenceId) q = q.eq("occurrence_id", occurrenceId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as TimelineEvent[];
    },
    enabled: !!peladaId,
  });

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4 text-primary" />
          Linha do Tempo da Pelada
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
        {isLoading && (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
        )}
        {!isLoading && (!events || events.length === 0) && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum evento registrado ainda.
          </p>
        )}
        {events?.map((ev) => {
          const meta = EVENT_META[ev.event_type] ?? {
            label: ev.event_type,
            icon: History,
            color: "text-muted-foreground",
          };
          const Icon = meta.icon;
          const minute = ev.payload?.minute;
          const team = ev.payload?.team;
          const score =
            ev.payload?.team_a_score != null && ev.payload?.team_b_score != null
              ? `${ev.payload.team_a_score} × ${ev.payload.team_b_score}`
              : null;
          const matchNum = ev.payload?.match_number;
          return (
            <div
              key={ev.id}
              className="flex items-start gap-3 p-2 rounded-lg border border-border/40 bg-card/50"
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  {matchNum && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Partida {matchNum}
                    </Badge>
                  )}
                  {minute && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {minute}'
                    </Badge>
                  )}
                  {team && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {team}
                    </Badge>
                  )}
                  {score && (
                    <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">
                      {score}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(ev.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
