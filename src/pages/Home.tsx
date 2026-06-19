import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PlayerCardEAFC } from "@/components/PlayerCardEAFC";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Plus, ArrowRight, Loader2, Newspaper, Wallet, BarChart3, Bell, UserCircle, Lock } from "lucide-react";
import { useProfile, usePlayerCard } from "@/hooks/useProfile";
import { useMyPeladas } from "@/hooks/usePeladas";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useNotifications";
import { PeladaCard } from "@/components/PeladaCard";
import { Logo } from "@/components/Logo";
import { format } from "date-fns";

const menuCards = [
  { title: "Minhas Peladas", icon: Trophy, route: "/peladas", color: "primary" },
  { title: "Jogadores", icon: Users, route: "/jogadores", color: "primary" },
  { title: "Feed", icon: Newspaper, route: "/feed", color: "primary" },
  { title: "Perfil", icon: UserCircle, route: "/perfil", color: "primary" },
  { title: "Notificações", icon: Bell, route: "/notificacoes", color: "primary", badge: true },
  { title: "Financeiro", icon: Wallet, route: "/financeiro", color: "accent", pro: true },
  { title: "Relatórios", icon: BarChart3, route: "/relatorios", color: "accent", pro: true },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: playerCard, isLoading: cardLoading } = usePlayerCard();
  const { data: peladas, isLoading: peladasLoading } = useMyPeladas();
  const { data: unreadCount } = useUnreadCount();

  const firstName = profile?.name?.split(" ")[0] || "Jogador";
  const hasPro = profile?.plan_type === "pro" || profile?.plan_type === "demo";

  if (profileLoading || cardLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const upcomingPeladas = (peladas || [])
    .filter((p) => p.scheduled_date >= today && p.is_active)
    .slice(0, 4);

  function getPeladaStatus(p: { scheduled_date: string; is_active: boolean }) {
    if (!p.is_active) return "finished" as const;
    if (p.scheduled_date === today) return "live" as const;
    return "scheduled" as const;
  }

  const username = (profile as any)?.username;

  return (
    <AppLayout>
      <div className="min-h-full">
        {/* ═══════════════════════ HERO SECTION ═══════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Background layers */}
          <div className="absolute inset-0" style={{
            background: "linear-gradient(160deg, #050a08 0%, #0a1a0f 25%, #0d2818 50%, #081510 75%, #030806 100%)",
          }} />

          {/* Stadium light rays */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 60% at 20% -10%, rgba(15,169,88,0.5) 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 80% -20%, rgba(15,169,88,0.3) 0%, transparent 60%),
              radial-gradient(ellipse 100% 40% at 50% 100%, rgba(15,169,88,0.2) 0%, transparent 50%)
            `,
          }} />

          {/* Pitch lines texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `
              repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(15,169,88,0.3) 80px, rgba(15,169,88,0.3) 81px),
              repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(15,169,88,0.15) 80px, rgba(15,169,88,0.15) 81px)
            `,
          }} />

          {/* Particle dots */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full animate-pulse"
                style={{
                  width: `${2 + Math.random() * 3}px`,
                  height: `${2 + Math.random() * 3}px`,
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  background: `rgba(15,169,88,${0.15 + Math.random() * 0.25})`,
                  animationDelay: `${Math.random() * 4}s`,
                  animationDuration: `${3 + Math.random() * 3}s`,
                }}
              />
            ))}
          </div>

          {/* Hero content */}
          <div className="relative z-10 flex flex-col items-center px-4 pt-6 pb-8 md:pt-10 md:pb-12 max-w-5xl mx-auto">

            {/* Logo with glow */}
            <div className="relative mb-5 md:mb-6">
              <div
                className="absolute inset-0 blur-3xl opacity-40 scale-150"
                style={{ background: "radial-gradient(circle, rgba(15,169,88,0.35) 0%, transparent 70%)" }}
              />
              <Logo size="xl" className="relative z-10" />
            </div>

            {/* Player card + CTA grouped */}
            <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:gap-10">

              {/* Card with glow + floating animation */}
              <div className="relative shrink-0" style={{ animation: "cardFloat 4s ease-in-out infinite" }}>
                <div
                  className="absolute -inset-6 rounded-3xl blur-2xl opacity-30"
                  style={{ background: "radial-gradient(ellipse, rgba(15,169,88,0.4) 0%, transparent 70%)" }}
                />
                <div className="relative z-10">
                  <PlayerCardEAFC
                    name={profile?.name || "Jogador"}
                    position={profile?.position || "MEI"}
                    overall={playerCard?.overall || 50}
                    rarity={playerCard?.rarity || "ouro"}
                    avatarUrl={profile?.avatar_url}
                    userId={user?.id}
                    size="md"
                  />
                </div>
              </div>

              {/* Text + CTA */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
                {username && (
                  <span className="text-xs font-medium tracking-wider uppercase text-primary/60">
                    @{username}
                  </span>
                )}
                <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
                  Olá, <span className="text-primary">{firstName}</span>!
                </h1>
                <p className="text-muted-foreground text-sm md:text-base max-w-xs">
                  Pronto para jogar?
                </p>

                {(profile as any)?.user_role === "presidente" && (
                  <Button
                    onClick={() => navigate("/peladas/nova")}
                    size="lg"
                    className="mt-3 glow-primary font-display font-bold text-base gap-2 px-8 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(15,169,88,0.4)]"
                  >
                    <Plus className="w-5 h-5" />
                    Nova Pelada
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom fade into content */}
          <div className="absolute bottom-0 left-0 right-0 h-16" style={{
            background: "linear-gradient(0deg, hsl(0 0% 7%) 0%, transparent 100%)",
          }} />
        </section>

        {/* ═══════════════════════ CONTENT ═══════════════════════ */}
        <div className="space-y-6 max-w-5xl mx-auto px-4 pb-6 md:px-6 md:pb-8">

          {/* Game Menu Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {menuCards.map((item) => {
              const isLocked = item.pro && !hasPro;
              return (
                <button
                  key={item.title}
                  onClick={() => navigate(item.route)}
                  className="gaming-card p-4 md:p-5 flex flex-col items-center gap-2 text-center transition-all duration-200 active:scale-95 min-h-[100px] justify-center relative group"
                >
                  <div className="relative">
                    <item.icon className={`w-7 h-7 md:w-8 md:h-8 transition-transform duration-300 group-hover:scale-110 ${item.color === "accent" ? "text-accent" : "text-primary"}`} />
                    {(item as any).badge && !!unreadCount && unreadCount > 0 && (
                      <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="font-display font-bold text-sm text-foreground">{item.title}</span>
                  {isLocked && (
                    <div className="absolute top-2 right-2">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                  {item.pro && hasPro && (
                    <span className="text-[9px] font-bold text-accent uppercase tracking-wider">PRO</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Próximas Peladas */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">Próximas Peladas</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate("/peladas")} className="text-primary">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {peladasLoading ? (
                <div className="col-span-2 flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : upcomingPeladas.length > 0 ? (
                upcomingPeladas.map((pelada) => (
                  <PeladaCard
                    key={pelada.id}
                    id={pelada.id}
                    name={pelada.name}
                    location={pelada.location}
                    date={format(new Date(pelada.scheduled_date + "T12:00:00"), "dd/MM")}
                    time={pelada.scheduled_time.slice(0, 5)}
                    confirmedPlayers={0}
                    totalPlayers={pelada.max_players || 20}
                    status={getPeladaStatus(pelada)}
                    onClick={() => navigate(`/peladas/${pelada.id}`)}
                  />
                ))
              ) : (
                <div className="col-span-2 text-center py-8 glass-card">
                  <p className="text-muted-foreground">Nenhuma pelada agendada</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate("/peladas/nova")}>
                    <Plus className="w-4 h-4 mr-2" /> Criar minha primeira pelada
                  </Button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
