import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertTriangle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getFinancialStatus } from "@/lib/paymentStatus";

interface PlayerFinancialStatusProps {
  peladaId: string;
  memberId: string;
  isAdmin: boolean;
  compact?: boolean;
}

function usePaymentRealtimeSync(peladaId: string | undefined, memberId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!peladaId) return;

    const channel = supabase
      .channel(`payment_status_${peladaId}_${memberId || "all"}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "pelada_payments",
        filter: `pelada_id=eq.${peladaId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["allMemberPayments", peladaId] });
        queryClient.invalidateQueries({ queryKey: ["peladaPayments", peladaId] });

        if (memberId) {
          queryClient.invalidateQueries({ queryKey: ["playerPayments", peladaId, memberId] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId, peladaId, queryClient]);
}

export function usePlayerPayments(peladaId: string | undefined, memberId: string | undefined) {
  usePaymentRealtimeSync(peladaId, memberId);

  return useQuery({
    queryKey: ["playerPayments", peladaId, memberId],
    queryFn: async () => {
      if (!peladaId || !memberId) return [];
      const { data, error } = await supabase
        .from("pelada_payments")
        .select("*")
        .eq("pelada_id", peladaId)
        .eq("pelada_member_id", memberId)
        .order("reference_month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!peladaId && !!memberId,
  });
}

export function useAllMemberPayments(peladaId: string | undefined) {
  usePaymentRealtimeSync(peladaId);

  return useQuery({
    queryKey: ["allMemberPayments", peladaId],
    queryFn: async () => {
      if (!peladaId) return [];
      const { data, error } = await supabase
        .from("pelada_payments")
        .select("*")
        .eq("pelada_id", peladaId)
        .order("reference_month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!peladaId,
  });
}

const statusStyles = {
  pago: { icon: CheckCircle, className: "bg-success/20 text-success border-success/30" },
  pendente: { icon: Clock, className: "bg-warning/20 text-warning border-warning/30" },
  inadimplente: { icon: AlertTriangle, className: "bg-destructive/20 text-destructive border-destructive/30" },
  sem_cobranca: { icon: DollarSign, className: "bg-muted text-muted-foreground border-border" },
};

export function PlayerFinancialBadge({
  payments,
  feeDueDay,
  isAdmin,
  memberId,
  peladaId,
}: {
  payments: any[];
  feeDueDay: number | null;
  isAdmin: boolean;
  memberId: string;
  peladaId: string;
}) {
  const queryClient = useQueryClient();
  const fin = getFinancialStatus(payments, feeDueDay);

  if (fin.status === "sem_cobranca") return null;

  const style = statusStyles[fin.status];
  const Icon = style.icon;

  const togglePayment = async () => {
    if (!isAdmin) return;
    const payment = fin.payment;
    if (!payment) return;

    const newStatus = payment.status === "pago" ? "pendente" : "pago";
    const updates: any = { status: newStatus };
    if (newStatus === "pago") updates.paid_at = new Date().toISOString();
    else updates.paid_at = null;

    const { error } = await supabase
      .from("pelada_payments")
      .update(updates)
      .eq("id", payment.id);
    if (error) {
      toast.error("Erro ao atualizar pagamento");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["allMemberPayments", peladaId] });
    queryClient.invalidateQueries({ queryKey: ["playerPayments", peladaId, memberId] });
    queryClient.invalidateQueries({ queryKey: ["peladaPayments", peladaId] });
    toast.success(newStatus === "pago" ? "Pagamento confirmado!" : "Pagamento revertido");
  };

  return (
    <Badge
      className={`${style.className} text-[10px] ${isAdmin ? "cursor-pointer hover:opacity-80" : ""}`}
      onClick={isAdmin ? togglePayment : undefined}
      title={isAdmin ? "Clique para alternar status" : undefined}
    >
      <Icon className="w-3 h-3 mr-0.5" />
      {fin.label}
      {fin.amount && <span className="ml-0.5">R${fin.amount.toFixed(0)}</span>}
    </Badge>
  );
}

// Player-side: show their own payment info in pelada
export function MyPaymentStatus({ peladaId, memberId, feeDueDay, pixKey }: {
  peladaId: string;
  memberId: string;
  feeDueDay: number | null;
  pixKey?: string | null;
}) {
  const { data: payments } = usePlayerPayments(peladaId, memberId);
  const fin = getFinancialStatus(payments || [], feeDueDay);

  if (fin.status === "sem_cobranca") return null;

  const style = statusStyles[fin.status];
  const Icon = style.icon;

  return (
    <div className={`rounded-lg border p-3 ${
      fin.status === "pago" ? "border-success/30 bg-success/5" :
      fin.status === "inadimplente" ? "border-destructive/30 bg-destructive/5" :
      "border-warning/30 bg-warning/5"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${
            fin.status === "pago" ? "text-success" :
            fin.status === "inadimplente" ? "text-destructive" : "text-warning"
          }`} />
          <div>
            <p className="text-sm font-medium text-foreground">
              {fin.status === "pago" ? "Mensalidade paga" :
               fin.status === "inadimplente" ? "Mensalidade atrasada" :
               "Mensalidade pendente"}
            </p>
            {fin.dueDate && fin.status !== "pago" && (
              <p className="text-xs text-muted-foreground">Vencimento: {fin.dueDate}</p>
            )}
          </div>
        </div>
        {fin.amount && (
          <span className="font-display font-bold text-foreground">R$ {fin.amount.toFixed(2)}</span>
        )}
      </div>
      {pixKey && fin.status !== "pago" && (
        <p className="text-xs text-muted-foreground mt-2">
          💳 PIX: <span className="font-mono text-foreground">{pixKey}</span>
        </p>
      )}
    </div>
  );
}
