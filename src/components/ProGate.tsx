import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Loader2, Settings } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface ProGateProps {
  children: React.ReactNode;
}

export function ProGate({ children }: ProGateProps) {
  const {
    isLoading,
    isPresidente,
    isPro,
    isActive,
    isPastDue,
    loading,
    startCheckout,
    openPortal,
  } = useSubscription();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isPro && isActive) return <>{children}</>;

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md mx-auto p-8 bg-card rounded-2xl border border-border shadow-2xl shadow-primary/10">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">
            Desbloqueie o JOGA.I PRO
          </h2>
          <p className="text-muted-foreground mb-6">
            Transforme sua pelada em uma experiência profissional com gestão financeira automática
            e relatórios inteligentes.
          </p>
          <div className="bg-secondary/50 rounded-xl p-4 mb-6 border border-border">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-accent" />
              <span className="font-display font-bold text-foreground">Plano PRO</span>
            </div>
            <p className="text-3xl font-display font-bold text-primary">
              R$ 19,90<span className="text-sm text-muted-foreground font-normal">/mês</span>
            </p>
            <ul className="text-sm text-muted-foreground mt-4 space-y-1.5 text-left">
              <li>✅ Financeiro completo da pelada</li>
              <li>✅ Controle de mensalistas</li>
              <li>✅ Gestão de inadimplentes</li>
              <li>✅ Relatórios inteligentes com IA</li>
              <li>✅ Analytics da pelada</li>
            </ul>
          </div>

          {!isPresidente ? (
            <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4 border border-border">
              Apenas contas de <strong className="text-foreground">Presidente</strong> podem assinar
              o JOGA.I PRO. A assinatura cobre a pelada inteira.
            </div>
          ) : isPastDue ? (
            <Button onClick={openPortal} disabled={loading} variant="warning" size="lg" className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              Atualizar pagamento
            </Button>
          ) : (
            <Button onClick={startCheckout} disabled={loading} className="w-full gap-2" size="lg">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
              ASSINAR AGORA
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
