import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Crown, CheckCircle2 } from "lucide-react";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    // Webhook updates profile asynchronously; refetch a few times.
    const id = setInterval(() => qc.invalidateQueries({ queryKey: ["profile"] }), 2000);
    const stop = setTimeout(() => clearInterval(id), 15000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [qc]);

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-primary/10">
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-accent" />
            <span className="font-display font-bold text-accent uppercase tracking-wider text-sm">
              JOGA.I PRO Ativado
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Bem-vindo ao PRO!</h1>
          <p className="text-muted-foreground mb-6">
            Sua assinatura foi confirmada. Todas as funcionalidades PRO já estão liberadas.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/peladas")} className="w-full" size="lg">
              Ir para Minhas Peladas
            </Button>
            <Button onClick={() => navigate("/financeiro")} variant="outline" className="w-full">
              Abrir Financeiro
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
