import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export default function CheckoutCancel() {
  const navigate = useNavigate();
  const { startCheckout, loading } = useSubscription();

  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Pagamento cancelado</h1>
          <p className="text-muted-foreground mb-6">
            Você cancelou o checkout. Nenhuma cobrança foi feita.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={startCheckout} disabled={loading} size="lg" className="w-full">
              Tentar novamente
            </Button>
            <Button onClick={() => navigate("/home")} variant="outline" className="w-full">
              Voltar ao início
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
