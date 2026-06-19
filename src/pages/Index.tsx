import { useState, useEffect } from "react";
import { Shield, Zap, BarChart3, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingScreen";
import stadiumBg from "@/assets/stadium-hero.jpg";

export default function Index() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <LoadingScreen isVisible={loading} onComplete={() => setShowContent(true)} />

      <div className="min-h-screen relative overflow-hidden bg-background">
        {/* === STADIUM BACKGROUND === */}
        <motion.div
          className="fixed inset-0 z-0"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={showContent ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <img
            src={stadiumBg}
            alt=""
            className="w-full h-full object-cover"
            width={1920}
            height={1080}
          />
          {/* Dark + green gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.95) 100%)",
            }}
          />
          {/* Green accent overlay */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 60%, hsl(153 84% 36% / 0.08) 0%, transparent 60%)",
            }}
          />
          {/* Vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
            }}
          />
        </motion.div>

        {/* === FLOATING PARTICLES === */}
        {showContent && (
          <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: Math.random() * 2 + 1,
                  height: Math.random() * 2 + 1,
                  left: `${Math.random() * 100}%`,
                  bottom: `-5%`,
                  background:
                    i % 4 === 0
                      ? "hsl(var(--primary) / 0.6)"
                      : "hsl(0 0% 100% / 0.15)",
                }}
                animate={{
                  y: [0, -(window.innerHeight * 1.2)],
                  opacity: [0, 0.7, 0],
                }}
                transition={{
                  duration: Math.random() * 6 + 5,
                  repeat: Infinity,
                  delay: Math.random() * 4,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        )}

        {/* === STICKY HEADER === */}
        {showContent && (
          <motion.header
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 h-14"
            style={{
              background: "hsl(var(--background) / 0.4)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderBottom: "1px solid hsl(0 0% 100% / 0.06)",
            }}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <Logo size="md" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/login")}
                className="text-muted-foreground hover:text-foreground"
              >
                Entrar
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/signup")}
                className="glow-primary"
              >
                Criar conta
              </Button>
            </div>
          </motion.header>
        )}

        {/* === HERO CONTENT === */}
        {showContent && (
          <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-14">
            {/* Central glow */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                width: 500,
                height: 500,
                background:
                  "radial-gradient(circle, hsl(153 84% 36% / 0.1) 0%, transparent 70%)",
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Logo - Main visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 relative"
            >
              {/* Glow behind logo */}
              <motion.div
                className="absolute inset-0 -m-8 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, hsl(153 84% 36% / 0.2) 0%, transparent 70%)",
                  filter: "blur(20px)",
                }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <Logo size="xl" />
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-center max-w-2xl leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="text-foreground">Futebol </span>
              <span className="text-gradient-primary">Inteligente</span>
              <br />
              <span className="text-foreground">para Todos</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="mt-4 text-base sm:text-lg text-muted-foreground text-center max-w-md"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Organize peladas, monte times equilibrados, acompanhe estatísticas e
              transforme seu futebol amador em uma experiência profissional.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <Button
                size="xl"
                onClick={() => navigate("/signup")}
                className="relative overflow-hidden glow-primary-strong"
              >
                {/* Shimmer effect */}
                <span
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 30%, hsl(0 0% 100% / 0.12) 50%, transparent 70%)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 3s linear infinite",
                  }}
                />
                Começar Agora
              </Button>
              <Button
                size="xl"
                variant="outline"
                onClick={() => navigate("/login")}
                className="border-muted-foreground/30"
              >
                Já tenho conta
              </Button>
            </motion.div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 flex flex-col items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <motion.div
                className="w-5 h-8 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1"
                animate={{}}
              >
                <motion.div
                  className="w-1 h-2 rounded-full bg-primary"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            </motion.div>
          </div>
        )}

        {/* === FEATURES SECTION === */}
        {showContent && (
          <div className="relative z-10 pb-20">
            <div className="container max-w-3xl mx-auto px-4">
              <motion.div
                className="grid grid-cols-2 gap-3 md:gap-4"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6 }}
              >
                {[
                  { icon: Shield, title: "Peladas Organizadas", desc: "Gerencie presenças, times e partidas." },
                  { icon: Zap, title: "Times com IA", desc: "Montagem automática e equilibrada." },
                  { icon: BarChart3, title: "Estatísticas", desc: "Gols, assistências e evolução." },
                  { icon: Trophy, title: "Votação Pós-Jogo", desc: "Eleja o craque da partida." },
                ].map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <motion.div
                      key={f.title}
                      className="relative group cursor-pointer rounded-xl p-4 md:p-5 text-center overflow-hidden"
                      style={{
                        background: "linear-gradient(160deg, hsl(0 0% 13%) 0%, hsl(153 30% 8%) 100%)",
                        border: "1px solid hsl(153 84% 36% / 0.15)",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
                        transition: "all 280ms cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      whileHover={{
                        y: -4,
                        boxShadow: "0 12px 40px rgba(0,0,0,0.6), 0 0 20px hsl(153 84% 36% / 0.15), inset 0 1px 0 hsl(0 0% 100% / 0.08)",
                        borderColor: "hsl(153 84% 36% / 0.4)",
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.4 }}
                    >
                      {/* Top light reflection */}
                      <div
                        className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }}
                      />
                      {/* Icon */}
                      <div className="relative mx-auto mb-3 w-10 h-10 flex items-center justify-center rounded-lg"
                        style={{
                          background: "hsl(153 84% 36% / 0.1)",
                          boxShadow: "0 0 12px hsl(153 84% 36% / 0.1)",
                        }}
                      >
                        <Icon size={20} className="text-primary" style={{ filter: "drop-shadow(0 0 4px hsl(153 84% 36% / 0.4))" }} />
                      </div>
                      <h3 className="font-display text-sm md:text-base font-bold text-foreground mb-1"
                        style={{ textShadow: "0 0 20px hsl(0 0% 100% / 0.05)" }}
                      >
                        {f.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-snug">{f.desc}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            {/* Footer */}
            <div className="container mt-12 pt-6 border-t border-border/30">
              <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
                <Logo size="md" />
                <p>© 2025 JOGA.I — Futebol inteligente para todos.</p>
                <p className="text-muted-foreground/60">Todos os direitos reservados para GrowOne — Plataforma desenvolvedora do JOGA.I.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
