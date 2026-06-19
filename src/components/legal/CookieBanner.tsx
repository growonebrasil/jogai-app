import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";
import { acceptAllCookies, getCookiePreferences, rejectNonEssentialCookies } from "@/lib/cookieConsent";
import { CookiePreferencesModal } from "./CookiePreferencesModal";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    setVisible(!getCookiePreferences());
    const handler = () => setVisible(!getCookiePreferences());
    window.addEventListener("joga:cookie-prefs-changed", handler);
    return () => window.removeEventListener("joga:cookie-prefs-changed", handler);
  }, []);

  if (!visible && !prefsOpen) return null;

  return (
    <>
      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:p-4 pointer-events-none">
          <div className="mx-auto max-w-3xl pointer-events-auto rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-[0_0_40px_hsl(var(--primary)/0.12)] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Cookie className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground leading-snug">
                  Usamos cookies e tecnologias similares para melhorar sua experiência, segurança, desempenho e análise de uso do app.{" "}
                  <a href="/legal/cookies" className="text-primary underline">Saiba mais</a>
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" onClick={() => { acceptAllCookies(); setVisible(false); }}>
                    Aceitar todos
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPrefsOpen(true)}>
                    Gerenciar preferências
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { rejectNonEssentialCookies(); setVisible(false); }}>
                    Recusar não essenciais
                  </Button>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => { rejectNonEssentialCookies(); setVisible(false); }}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      <CookiePreferencesModal open={prefsOpen} onOpenChange={(o) => { setPrefsOpen(o); if (!o) setVisible(!getCookiePreferences()); }} />
    </>
  );
}
