import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie } from "lucide-react";
import { getCookiePreferences, saveCookiePreferences } from "@/lib/cookieConsent";
import { toast } from "sonner";

export function CookiePreferencesModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);
  const [personalization, setPersonalization] = useState(true);

  useEffect(() => {
    if (!open) return;
    const cur = getCookiePreferences();
    if (cur) {
      setAnalytics(cur.analytics);
      setMarketing(cur.marketing);
      setPersonalization(cur.personalization);
    }
  }, [open]);

  const save = () => {
    saveCookiePreferences({ analytics, marketing, personalization });
    toast.success("Preferências de cookies salvas");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Cookie className="w-5 h-5 text-primary" />
            <DialogTitle className="font-display">Preferências de cookies</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <Row
            title="Essenciais"
            desc="Necessários para autenticação, segurança e funcionamento básico do app."
            checked
            disabled
          />
          <Row
            title="Desempenho e análise"
            desc="Métricas anônimas de uso, performance e estabilidade."
            checked={analytics}
            onChange={setAnalytics}
          />
          <Row
            title="Marketing"
            desc="Mensuração de campanhas e conversões."
            checked={marketing}
            onChange={setMarketing}
          />
          <Row
            title="Personalização"
            desc="Lembrar preferências de interface e conteúdo recomendado."
            checked={personalization}
            onChange={setPersonalization}
          />
        </div>

        <Button onClick={save} className="w-full mt-2">Salvar preferências</Button>
      </DialogContent>
    </Dialog>
  );
}

function Row({ title, desc, checked, onChange, disabled }: { title: string; desc: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
