import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ShieldCheck, Cookie, FileText, Lock } from "lucide-react";
import { useLegalConsent } from "@/hooks/useLegalConsent";
import { LegalMarkdown } from "./LegalMarkdown";
import { TERMS_MD } from "@/content/legal/terms";
import { PRIVACY_MD } from "@/content/legal/privacy";
import { COOKIES_MD } from "@/content/legal/cookies";
import { acceptAllCookies, getCookiePreferences } from "@/lib/cookieConsent";
import { LEGAL_TITLES, type LegalKind } from "@/lib/legal";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const DOC_MAP: Record<LegalKind, string> = {
  terms: TERMS_MD,
  privacy: PRIVACY_MD,
  cookies: COOKIES_MD,
};

export function LegalAcceptanceGate({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { needsAcceptance, loading, recordConsent, latest } = useLegalConsent();
  const [acceptDocs, setAcceptDocs] = useState(false);
  const [acceptCookies, setAcceptCookies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reading, setReading] = useState<LegalKind | null>(null);

  if (!user) return <>{children}</>;
  if (loading) return <>{children}</>;
  if (!needsAcceptance) return <>{children}</>;

  const isUpdate = !!latest;

  const submit = async () => {
    if (!acceptDocs || !acceptCookies) return;
    setSubmitting(true);
    // Ensure cookie prefs exist (default = all on if user hasn't decided yet)
    if (!getCookiePreferences()) acceptAllCookies();
    const { error } = await recordConsent();
    setSubmitting(false);
    if (error) { toast.error("Não foi possível registrar seu aceite. Tente novamente."); return; }
    toast.success("Aceite registrado. Bem-vindo!");
  };

  return (
    <>
      {/* Blocking overlay */}
      <Dialog open modal>
        <DialogContent
          className="max-w-lg bg-card border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.15)] [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <DialogTitle className="font-display">
                {isUpdate ? "Atualizamos nossos termos" : "Bem-vindo ao JOGA.I"}
              </DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {isUpdate
                ? "Revisamos nossos documentos legais. Para continuar usando o app, leia e aceite as condições abaixo."
                : "Para começar, leia e aceite nossos termos. Levam menos de 1 minuto."}
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2 my-2">
            <DocRow icon={FileText} label="Termos de Uso" onClick={() => setReading("terms")} />
            <DocRow icon={Lock} label="Política de Privacidade" onClick={() => setReading("privacy")} />
            <DocRow icon={Cookie} label="Política de Cookies" onClick={() => setReading("cookies")} />
          </div>

          <div className="space-y-3 mt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={acceptDocs} onCheckedChange={(c) => setAcceptDocs(c === true)} className="mt-0.5" />
              <span className="text-sm text-foreground leading-snug">
                Li e aceito os <button type="button" onClick={() => setReading("terms")} className="text-primary underline">Termos de Uso</button> e a <button type="button" onClick={() => setReading("privacy")} className="text-primary underline">Política de Privacidade</button>.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox checked={acceptCookies} onCheckedChange={(c) => setAcceptCookies(c === true)} className="mt-0.5" />
              <span className="text-sm text-foreground leading-snug">
                Estou ciente sobre o uso de <button type="button" onClick={() => setReading("cookies")} className="text-primary underline">cookies</button> e tecnologias similares.
              </span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-12"
              disabled={submitting}
              onClick={async () => {
                await signOut();
                navigate("/login", { replace: true });
              }}
            >
              Cancelar
            </Button>
            <Button
              className="w-full sm:flex-1 h-12"
              disabled={!acceptDocs || !acceptCookies || submitting}
              onClick={submit}
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</> : "Concordar e continuar"}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Você pode revisar ou gerenciar essas escolhas a qualquer momento em Privacidade e dados.
          </p>
        </DialogContent>
      </Dialog>

      {/* Reader dialog */}
      <Dialog open={!!reading} onOpenChange={(o) => !o && setReading(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">{reading ? LEGAL_TITLES[reading] : ""}</DialogTitle>
          </DialogHeader>
          {reading && <LegalMarkdown source={DOC_MAP[reading]} />}
        </DialogContent>
      </Dialog>

      {/* Hidden underlying app */}
      <div aria-hidden className="pointer-events-none select-none opacity-40">
        {children}
      </div>
    </>
  );
}

function DocRow({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 hover:bg-secondary px-3 py-2.5 transition-colors text-left"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span className="text-xs text-primary">Ler</span>
    </button>
  );
}
