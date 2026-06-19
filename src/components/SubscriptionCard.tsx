import { Crown, AlertCircle, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";

export function SubscriptionCard() {
  const {
    isLoading,
    isPresidente,
    isPro,
    isActive,
    isPastDue,
    isDemo,
    periodEnd,
    loading,
    startCheckout,
    openPortal,
  } = useSubscription();

  if (isLoading || !isPresidente) return null;

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : null;

  if (isPro && isActive) {
    return (
      <div className="bg-card border border-accent/40 rounded-2xl p-5 shadow-lg shadow-accent/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-accent" />
            <span className="font-display font-bold">Assinatura JOGA.I</span>
          </div>
          <Badge className="bg-accent text-accent-foreground">{isDemo ? "DEMO" : "PRO ATIVO"}</Badge>
        </div>
        {periodEnd && !isDemo && (
          <p className="text-sm text-muted-foreground mb-4">
            Próxima renovação: <span className="text-foreground font-medium">{formatDate(periodEnd)}</span>
          </p>
        )}
        {!isDemo && (
          <Button onClick={openPortal} disabled={loading} variant="outline" className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
            Gerenciar assinatura
          </Button>
        )}
      </div>
    );
  }

  if (isPastDue) {
    return (
      <div className="bg-card border border-warning/40 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-warning" />
          <span className="font-display font-bold">Pagamento pendente</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Sua última cobrança falhou. Atualize seu método de pagamento para manter o acesso PRO.
        </p>
        <Button onClick={openPortal} disabled={loading} variant="warning" className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar pagamento"}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Crown className="w-5 h-5 text-accent" />
        <span className="font-display font-bold">Desbloqueie o JOGA.I PRO</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Gestão financeira, mensalistas, inadimplentes e relatórios com IA.
      </p>
      <p className="text-2xl font-display font-bold text-primary mb-4">
        R$ 19,90<span className="text-sm text-muted-foreground font-normal">/mês</span>
      </p>
      <Button onClick={startCheckout} disabled={loading} className="w-full gap-2" size="lg">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
        ASSINAR AGORA
      </Button>
    </div>
  );
}
