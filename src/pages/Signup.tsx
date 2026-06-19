import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Loader2, Crown, UserCircle, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const positions = [
  { value: "GOL", label: "Goleiro" },
  { value: "ZAG", label: "Zagueiro" },
  { value: "LAT", label: "Lateral" },
  { value: "VOL", label: "Volante" },
  { value: "MEI", label: "Meia" },
  { value: "ATA", label: "Atacante" },
];

const baseSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(100),
  username: z.string().trim().min(3, "Username deve ter pelo menos 3 caracteres").max(30).regex(/^[a-z0-9_]+$/, "Apenas letras minúsculas, números e _"),
  user_role: z.enum(["presidente", "jogador"], {
    errorMap: () => ({ message: "Selecione o tipo de conta" }),
  }),
});

const jogadorSchema = baseSchema.extend({
  position: z.enum(["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"], {
    errorMap: () => ({ message: "Selecione uma posição" }),
  }),
  dominant_foot: z.enum(["direito", "esquerdo", "ambidestro"], {
    errorMap: () => ({ message: "Selecione o pé dominante" }),
  }),
});

export default function Signup() {
  const navigate = useNavigate();
  const { signUp, user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    position: "",
    user_role: "",
    username: "",
    dominant_foot: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    if (user && !authLoading) {
      navigate("/home", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Debounced username check
  useEffect(() => {
    if (formData.username.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", formData.username)
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timeout);
  }, [formData.username]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    if (usernameStatus === "taken") {
      toast.error("Username já está em uso");
      return;
    }

    const isJogador = formData.user_role === "jogador";
    const schema = isJogador ? jogadorSchema : baseSchema;

    const dataToValidate: any = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      username: formData.username,
      user_role: formData.user_role,
    };
    if (isJogador) {
      dataToValidate.position = formData.position;
      dataToValidate.dominant_foot = formData.dominant_foot;
    }

    const validation = schema.safeParse(dataToValidate);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(
      formData.email,
      formData.password,
      formData.name,
      isJogador ? formData.position : "MEI",
      formData.user_role,
      formData.username,
      isJogador ? formData.dominant_foot : "direito"
    );

    if (error) {
      setIsLoading(false);
      if (error.message.includes("User already registered")) {
        toast.error("Este e-mail já está cadastrado");
      } else {
        toast.error("Erro ao criar conta: " + error.message);
      }
      return;
    }

    toast.success("Conta criada com sucesso!");
    navigate("/home", { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isJogador = formData.user_role === "jogador";

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-in">
        <div className="text-center mb-6">
          <Logo size="lg" className="justify-center" />
          <p className="text-muted-foreground mt-2">Crie sua conta</p>
        </div>

        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold text-center mb-6">Cadastro</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type Selection */}
            <div className="space-y-2">
              <Label>Tipo de conta *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange("user_role", "presidente")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    formData.user_role === "presidente"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Crown className="w-6 h-6" />
                  <span className="text-sm font-medium">Presidente</span>
                  <span className="text-[10px] leading-tight text-center opacity-70">Cria e gerencia peladas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleChange("user_role", "jogador")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    formData.user_role === "jogador"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <UserCircle className="w-6 h-6" />
                  <span className="text-sm font-medium">Jogador</span>
                  <span className="text-[10px] leading-tight text-center opacity-70">Participa de peladas</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="h-12 bg-secondary/50 border-border"
                autoComplete="name"
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">@username *</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="meu_username"
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="h-12 bg-secondary/50 border-border pr-10"
                  autoComplete="username"
                  maxLength={30}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {usernameStatus === "available" && <Check className="w-4 h-4 text-green-500" />}
                  {usernameStatus === "taken" && <X className="w-4 h-4 text-destructive" />}
                </div>
              </div>
              {usernameStatus === "available" && (
                <p className="text-xs text-green-500">@{formData.username} está disponível</p>
              )}
              {usernameStatus === "taken" && (
                <p className="text-xs text-destructive">@{formData.username} já está em uso</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="h-12 bg-secondary/50 border-border"
                autoComplete="email"
              />
            </div>

            {/* Position: only show for jogador */}
            {isJogador && (
              <div className="space-y-2">
                <Label htmlFor="position">Posição *</Label>
                <Select value={formData.position} onValueChange={(value) => handleChange("position", value)}>
                  <SelectTrigger className="h-12 bg-secondary/50 border-border">
                    <SelectValue placeholder="Selecione sua posição" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isJogador && (
              <div className="space-y-2">
                <Label>Pé dominante *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "direito", label: "Direito" },
                    { value: "esquerdo", label: "Esquerdo" },
                    { value: "ambidestro", label: "Ambidestro" },
                  ].map((foot) => (
                    <button
                      key={foot.value}
                      type="button"
                      onClick={() => handleChange("dominant_foot", foot.value)}
                      className={`py-2.5 px-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.dominant_foot === foot.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {foot.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="h-12 bg-secondary/50 border-border pr-12"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                className="h-12 bg-secondary/50 border-border"
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full h-12" disabled={isLoading || usernameStatus === "taken"}>
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
              ) : (
                "Criar conta"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">Entrar</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
