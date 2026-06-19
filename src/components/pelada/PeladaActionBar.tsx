import { Button } from "@/components/ui/button";
import { Pencil, UserPlus, Share2, Send, Play, Loader2, CheckCircle } from "lucide-react";
import { useCurrentOccurrence, useCreateOccurrence } from "@/hooks/useOccurrences";
import { useActiveMatch } from "@/hooks/useMatchManagement";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface PeladaActionBarProps {
  pelada: any;
  peladaId: string;
  isAdmin: boolean;
  members: any[];
  userId?: string;
  onEdit: () => void;
  onAddPlayer: () => void;
  onShareWhatsApp: () => void;
  onStartLive: () => void;
}

/**
 * Top admin action bar for the pelada page.
 * Houses the 5 primary actions: Editar · Adicionar jogador · WhatsApp ·
 * Solicitar confirmação · INICIAR (large green CTA).
 */
export function PeladaActionBar({
  pelada,
  peladaId,
  isAdmin,
  members,
  userId,
  onEdit,
  onAddPlayer,
  onShareWhatsApp,
  onStartLive,
}: PeladaActionBarProps) {
  const queryClient = useQueryClient();
  const { data: currentOccurrence } = useCurrentOccurrence(peladaId);
  const { data: activeMatch } = useActiveMatch(peladaId);
  const createOccurrence = useCreateOccurrence();
  const [requesting, setRequesting] = useState(false);
  const [starting, setStarting] = useState(false);

  const isLive = !!pelada?.is_live || currentOccurrence?.status === "in_progress" || !!activeMatch;
  const isFinishedToday = currentOccurrence?.status === "finished";
  const today = new Date().toISOString().split("T")[0];

  const handleRequestConfirmation = async () => {
    if (!userId || !pelada) return;
    setRequesting(true);
    try {
      const toNotify = (members || []).filter(
        (m: any) => m.user_id && m.user_id !== userId && m.status !== "confirmado"
      );
      if (toNotify.length === 0) {
        toast.info("Todos os jogadores já confirmaram");
        return;
      }
      const rows = toNotify.map((m: any) => ({
        recipient_user_id: m.user_id!,
        actor_user_id: userId,
        type: "attendance_request",
        message: `A pelada "${pelada.name}" está chegando. Confirme sua presença!`,
      }));
      const { error } = await supabase.from("notifications").insert(rows);
      if (error) throw error;
      toast.success(`Notificação enviada para ${toNotify.length} jogador(es)`);
    } catch (e: any) {
      toast.error("Erro ao enviar notificações: " + e.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleStart = async () => {
    if (!isAdmin) return;
    if (isFinishedToday) {
      toast.error("A pelada de hoje já foi finalizada");
      return;
    }
    setStarting(true);
    try {
      const wasLive = isLive;
      // Ensure today's occurrence is in_progress
      let occId = currentOccurrence?.id as string | undefined;
      if (!currentOccurrence || currentOccurrence.status !== "in_progress") {
        const occ = await createOccurrence.mutateAsync({ peladaId, date: today, status: "in_progress" });
        occId = (occ as any)?.id || occId;
      }
      // Mark pelada as live so refreshes land in Modo Ação
      await supabase.from("peladas").update({ is_live: true } as any).eq("id", peladaId);

      // Log timeline event only on first start (not when continuing)
      if (!wasLive && userId) {
        await supabase.from("pelada_timeline_events").insert({
          pelada_id: peladaId,
          occurrence_id: occId,
          actor_id: userId,
          event_type: "pelada_started",
          payload: { confirmed_count: (members || []).filter((m: any) => m.status === "confirmado").length },
        } as any);
      }

      queryClient.invalidateQueries({ queryKey: ["pelada", peladaId] });
      onStartLive();
    } catch (e: any) {
      toast.error("Erro ao iniciar pelada: " + e.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="bg-gradient-card rounded-xl border border-border p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onShareWhatsApp}>
          <Share2 className="w-4 h-4" /> WhatsApp
        </Button>
        {isAdmin && (
          <>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-4 h-4" /> Editar
            </Button>
            <Button variant="outline" size="sm" onClick={onAddPlayer}>
              <UserPlus className="w-4 h-4" /> Adicionar jogador
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestConfirmation}
              disabled={requesting}
            >
              {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Solicitar confirmação
            </Button>

            <div className="ml-auto">
              {isFinishedToday ? (
                <Button size="lg" disabled className="h-12 px-6 font-display font-black tracking-wider">
                  <CheckCircle className="w-5 h-5" /> Pelada de hoje finalizada
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleStart}
                  disabled={starting}
                  className={`h-12 px-8 font-display font-black tracking-wider text-base ${
                    isLive
                      ? "bg-warning text-warning-foreground hover:bg-warning/90 shadow-[0_0_30px_hsl(var(--warning)/0.5)]"
                      : "bg-success text-success-foreground hover:bg-success/90 shadow-[0_0_30px_hsl(var(--success)/0.5)] animate-pulse"
                  }`}
                >
                  {starting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5 fill-current" />
                  )}
                  {isLive ? "CONTINUAR" : "INICIAR"}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
