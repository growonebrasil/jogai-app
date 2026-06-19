import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2, Trophy, Brain, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { z } from "zod";
import bgStadium from "@/assets/bg-login-stadium.jpg";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").max(100),
});

const features = [
  { icon: Trophy, title: "Organize peladas", desc: "Crie partidas, convide jogadores e gerencie tudo em um só lugar." },
  { icon: Brain, title: "Times com IA", desc: "Sorteia times balanceados por posição, idade e desempenho." },
  { icon: Users, title: "Perfil de jogador", desc: "Carta digital, estatísticas reais e ranking da pelada." },
];

const audience = [
  "Peladeiros que organizam futebol com os amigos",
  "Jogadores que querem acompanhar suas estatísticas",
  "Quem quer encontrar novas peladas na cidade",
  "Presidentes de pelada que precisam organizar os times",
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      const from = location.state?.from?.pathname || "/home";
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) { toast.error(validation.error.errors[0].message); return; }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setIsLoading(false);
      if (error.message.includes("Invalid login credentials")) toast.error("E-mail ou senha incorretos");
      else if (error.message.includes("Email not confirmed")) toast.error("Confirme seu e-mail antes de fazer login");
      else toast.error("Erro ao fazer login: " + error.message);
      return;
    }
    toast.success("Login realizado com sucesso!");
    navigate(location.state?.from?.pathname || "/home", { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Background */}
      <div className="absolute inset-0">
        <img src={bgStadium} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-4 py-10 md:py-16 flex flex-col items-center gap-10">

          {/* Hero — Large Logo */}
          <div className="text-center">
            <Logo size="xl" className="justify-center mb-6" />
            <p className="text-primary font-display text-xl md:text-2xl font-bold tracking-wide">
              Futebol inteligente para quem vive a pelada.
            </p>
            <p className="text-muted-foreground mt-3 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
              Organize peladas, sorteie times equilibrados com IA e construa seu perfil de jogador com estatísticas reais.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 text-center transition-all hover:border-primary/30 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
              >
                <f.icon className="w-7 h-7 text-primary mx-auto mb-2" />
                <h3 className="font-display font-bold text-sm text-foreground">{f.title}</h3>
                <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Login Card */}
          <div className="w-full max-w-sm">
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 md:p-8">
              <h1 className="font-display text-2xl font-bold text-center mb-6">Entrar</h1>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-secondary/50 border-border" autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 bg-secondary/50 border-border pr-12" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-12" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : "Entrar"}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-3">
                <Separator className="flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <Separator className="flex-1 bg-border" />
              </div>

              <Button
                variant="outline"
                className="w-full h-12 gap-3"
                onClick={async () => {
                  const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                  if (error) toast.error("Erro ao entrar com Google");
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Entrar com Google
              </Button>

              <div className="mt-6 text-center">
                <p className="text-muted-foreground text-sm">
                  Não tem uma conta?{" "}
                  <Link to="/signup" className="text-primary font-medium hover:underline">Criar conta</Link>
                </p>
              </div>
            </div>
          </div>

          {/* For Who */}
          <div className="w-full max-w-md text-center">
            <h3 className="font-display text-base font-bold text-foreground mb-3">Para quem é o JOGAI?</h3>
            <ul className="space-y-2">
              {audience.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground text-left">
                  <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-muted-foreground text-xs text-center pb-4">
            Conectando peladeiros em uma nova forma de jogar futebol.
          </p>
        </div>
      </div>
    </div>
  );
}
