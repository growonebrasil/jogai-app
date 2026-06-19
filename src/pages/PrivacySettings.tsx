import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CookiePreferencesModal } from "@/components/legal/CookiePreferencesModal";
import { Cookie, FileText, Lock, ShieldAlert, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [cookiesOpen, setCookiesOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const requestDeletion = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("request-account-deletion", { body: {} });
      if (error) throw error;
      toast.success("Sua conta foi excluída. Até logo!");
      await signOut();
      navigate("/", { replace: true });
    } catch (e: any) {
      toast.error("Não foi possível processar a exclusão. " + (e?.message ?? ""));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        <header>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-primary" /> Privacidade e dados
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus consentimentos, leia nossos documentos legais e exerça seus direitos como titular dos dados (LGPD).
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="font-semibold text-foreground">Documentos legais</h2>
          <DocLink to="/legal/termos" icon={FileText} label="Termos de Uso" />
          <DocLink to="/legal/privacidade" icon={Lock} label="Política de Privacidade" />
          <DocLink to="/legal/cookies" icon={Cookie} label="Política de Cookies" />
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold text-foreground mb-1">Cookies</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Ajuste quais categorias de cookies podem ser usadas no seu dispositivo. Cookies essenciais não podem ser desativados.
          </p>
          <Button variant="outline" onClick={() => setCookiesOpen(true)}>
            <Cookie className="w-4 h-4" /> Gerenciar cookies
          </Button>
        </section>

        <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <h2 className="font-semibold text-destructive flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Excluir minha conta
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Sua solicitação será analisada conforme a legislação aplicável e poderá impactar seu histórico, ranking,
            carta de jogador e participação em peladas. Esta ação é irreversível.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : "Solicitar exclusão"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão da conta</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação remove sua conta e dados pessoais do JOGA.I. Estatísticas históricas podem ser anonimizadas e mantidas para integridade das peladas das quais você participou.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={requestDeletion} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sim, excluir minha conta
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>

        <CookiePreferencesModal open={cookiesOpen} onOpenChange={setCookiesOpen} />
      </div>
    </AppLayout>
  );
}

function DocLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary px-3 py-2.5 transition-colors">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span className="text-xs text-primary">Abrir</span>
    </Link>
  );
}
