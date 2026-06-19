import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface InviteToPeladaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUserName: string;
}

export function InviteToPeladaModal({ open, onOpenChange, targetUserId, targetUserName }: InviteToPeladaModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviting, setInviting] = useState<string | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());

  const { data: myPeladas, isLoading } = useQuery({
    queryKey: ["myCreatedPeladas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("peladas")
        .select("*")
        .eq("created_by", user.id)
        .eq("is_active", true)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  const handleInvite = async (peladaId: string, peladaName: string) => {
    if (!user || inviting) return;
    setInviting(peladaId);
    try {
      // Check if already member
      const { data: existing } = await supabase
        .from("pelada_members")
        .select("id")
        .eq("pelada_id", peladaId)
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existing) {
        toast.error("Jogador já está nesta pelada");
        return;
      }

      const { error: memberError } = await supabase.from("pelada_members").insert({
        pelada_id: peladaId,
        user_id: targetUserId,
        role: "player",
        status: "pendente",
      });
      if (memberError) throw memberError;

      await supabase.from("notifications").insert({
        recipient_user_id: targetUserId,
        actor_user_id: user.id,
        type: "pelada_invite",
        message: `Você foi convidado para a pelada "${peladaName}"`,
      });

      setInvited((prev) => new Set(prev).add(peladaId));
      queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] });
      toast.success(`Convite enviado para ${targetUserName}!`);
    } catch (err: any) {
      toast.error("Erro ao convidar: " + err.message);
    } finally {
      setInviting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Convidar {targetUserName} para Pelada</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !myPeladas || myPeladas.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Você não tem peladas criadas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myPeladas.map((pelada) => {
              const formattedDate = format(new Date(pelada.scheduled_date + "T12:00:00"), "dd/MM/yyyy");
              const alreadyInvited = invited.has(pelada.id);
              return (
                <div key={pelada.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{pelada.name}</p>
                    <p className="text-xs text-muted-foreground">{formattedDate} · {pelada.scheduled_time?.slice(0, 5)}</p>
                  </div>
                  {alreadyInvited ? (
                    <span className="text-xs text-primary font-medium">✓ Convidado</span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={inviting === pelada.id}
                      onClick={() => handleInvite(pelada.id, pelada.name)}
                    >
                      {inviting === pelada.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><Send className="w-4 h-4" /> Enviar convite</>
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
