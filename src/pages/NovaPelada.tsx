import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, ShieldAlert, Crown, DollarSign } from "lucide-react";
import { useCreatePelada } from "@/hooks/usePeladas";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { LocationInput, type LocationData } from "@/components/LocationInput";
import { RecurrenceSelector, type RecurrenceData } from "@/components/RecurrenceSelector";
export default function NovaPelada() {
  const navigate = useNavigate();
  const createPelada = useCreatePelada();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const isPresidente = profile?.user_role === "presidente";

  // Redirect jogador away
  useEffect(() => {
    if (!profileLoading && profile && !isPresidente) {
      toast.error("Apenas presidentes podem criar peladas");
      navigate("/peladas", { replace: true });
    }
  }, [profile, profileLoading, isPresidente, navigate]);

  const isPro = profile?.plan_type === "pro" || profile?.plan_type === "demo";

  const [form, setForm] = useState({
    name: "",
    description: "",
    scheduled_date: "",
    scheduled_time: "",
    pelada_type: "privada" as "publica" | "privada",
    max_players: "20",
    neighborhood: "",
    city: "",
    is_paid: false,
    fee_amount: "",
    fee_due_day: "",
    pix_key: "",
  });

  const [location, setLocation] = useState<LocationData>({
    location_name: "",
    full_address: "",
    latitude: null,
    longitude: null,
  });

  const [recurrence, setRecurrence] = useState<RecurrenceData>({
    recurrence_type: "none",
    recurrence_day_of_week: null,
    recurrence_interval: 1,
    recurrence_enabled: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPresidente) {
      toast.error("Apenas presidentes podem criar peladas");
      return;
    }

    if (!form.name.trim()) { toast.error("Informe o nome da pelada"); return; }
    if (!location.location_name.trim()) { toast.error("Informe o local"); return; }
    if (!form.scheduled_date) { toast.error("Informe a data"); return; }
    if (!form.scheduled_time) { toast.error("Informe o horário"); return; }
    if (!form.neighborhood.trim()) { toast.error("Informe o bairro"); return; }
    if (!form.city.trim()) { toast.error("Informe a cidade"); return; }

    const peladaData: any = {
        name: form.name.trim(),
        location: location.location_name.trim(),
        location_name: location.location_name.trim(),
        full_address: location.full_address.trim() || undefined,
        latitude: location.latitude ?? undefined,
        longitude: location.longitude ?? undefined,
        description: form.description.trim() || undefined,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        pelada_type: form.pelada_type,
        max_players: parseInt(form.max_players) || 20,
        recurrence_type: recurrence.recurrence_type,
        recurrence_day_of_week: recurrence.recurrence_day_of_week ?? undefined,
        recurrence_interval: recurrence.recurrence_interval,
        recurrence_enabled: recurrence.recurrence_enabled,
        neighborhood: form.neighborhood.trim(),
        city: form.city.trim(),
    };

    if (isPro && form.is_paid) {
      peladaData.is_paid = true;
      if (form.fee_amount) peladaData.fee_amount = parseFloat(form.fee_amount);
      if (form.fee_due_day) peladaData.fee_due_day = parseInt(form.fee_due_day);
      if (form.pix_key.trim()) peladaData.pix_key = form.pix_key.trim();
    }

    createPelada.mutate(
      peladaData,
      {
        onSuccess: (data) => {
          navigate(`/peladas/${data.id}`);
        },
      }
    );
  };

  if (profileLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isPresidente) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="font-display text-2xl font-bold text-foreground">Acesso restrito</h1>
          <p className="text-muted-foreground">Apenas contas de Presidente podem criar peladas.</p>
          <Button variant="outline" onClick={() => navigate("/peladas")}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/peladas")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Nova Pelada</h1>
            <p className="text-muted-foreground mt-1">Organize sua partida</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5 md:p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da pelada *</Label>
              <Input
                id="name"
                placeholder="Ex: Pelada do Parque"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-secondary/50 border-border"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Local *</Label>
              <LocationInput
                value={location}
                onChange={setLocation}
                placeholder="Buscar local pelo nome..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Horário *</Label>
                <Input
                  id="time"
                  type="time"
                  value={form.scheduled_time}
                  onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.pelada_type}
                  onValueChange={(v: "publica" | "privada") => setForm({ ...form, pelada_type: v })}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="privada">Privada</SelectItem>
                    <SelectItem value="publica">Pública</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">Máx. jogadores</Label>
                <Input
                  id="max"
                  type="number"
                  min={2}
                  max={50}
                  value={form.max_players}
                  onChange={(e) => setForm({ ...form, max_players: e.target.value })}
                  className="bg-secondary/50 border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  placeholder="Ex: Copacabana"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  className="bg-secondary/50 border-border"
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  placeholder="Ex: Rio de Janeiro"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-secondary/50 border-border"
                  maxLength={100}
                />
              </div>
            </div>

            <RecurrenceSelector value={recurrence} onChange={setRecurrence} />

            <div className="space-y-2">
              <Label htmlFor="desc">Descrição da pelada</Label>
              <Textarea
                id="desc"
                placeholder="Regras, informações sobre mensalidade, horários, comportamento esperado..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-secondary/50 border-border min-h-[100px]"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">Visível para todos os jogadores ao entrar na pelada</p>
            </div>
          </div>

          {/* PRO Financial Section */}
          {isPro && (
            <div className="bg-card rounded-xl border border-primary/30 p-5 md:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-accent" />
                <h2 className="font-display text-lg font-bold text-foreground">Configuração Financeira</h2>
                <Badge className="bg-accent/20 text-accent text-xs">PRO</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Pelada com cobrança?</Label>
                  <p className="text-xs text-muted-foreground">Ative para configurar mensalidade</p>
                </div>
                <Switch
                  checked={form.is_paid}
                  onCheckedChange={(v) => setForm({ ...form, is_paid: v })}
                />
              </div>

              {form.is_paid && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fee">Valor da mensalidade (R$)</Label>
                      <Input
                        id="fee"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 100.00"
                        value={form.fee_amount}
                        onChange={(e) => setForm({ ...form, fee_amount: e.target.value })}
                        className="bg-secondary/50 border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDay">Dia de vencimento</Label>
                      <Input
                        id="dueDay"
                        type="number"
                        min="1"
                        max="28"
                        placeholder="Ex: 9"
                        value={form.fee_due_day}
                        onChange={(e) => setForm({ ...form, fee_due_day: e.target.value })}
                        className="bg-secondary/50 border-border"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pix">Chave PIX (opcional)</Label>
                    <Input
                      id="pix"
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                      value={form.pix_key}
                      onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                      className="bg-secondary/50 border-border"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/peladas")}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={createPelada.isPending}>
              {createPelada.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
              ) : (
                <><Save className="w-4 h-4" /> Criar Pelada</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
