import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Coins, Sparkles } from "lucide-react";
import { getTeamStyle } from "@/lib/teamColors";
import { supabase } from "@/integrations/supabase/client";

type Side = "cara" | "coroa";

interface Props {
  open: boolean;
  teamA: string;
  teamB: string;
  matchId: string;
  peladaId: string;
  occurrenceId?: string;
  onResult: (winner: string) => void;
  onCancel: () => void;
}

type Phase = "choose" | "ready" | "flipping" | "reveal" | "done";

export function CoinTossCinematic({ open, teamA, teamB, matchId, peladaId, occurrenceId, onResult, onCancel }: Props) {
  const [phase, setPhase] = useState<Phase>("choose");
  const [caraTeam, setCaraTeam] = useState<string | null>(null);
  const [result, setResult] = useState<Side | null>(null);
  const [winnerName, setWinnerName] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPhase("choose");
      setCaraTeam(null);
      setResult(null);
      setWinnerName(null);
    }
  }, [open]);

  if (!open) return null;

  const coroaTeam = caraTeam ? (caraTeam === teamA ? teamB : teamA) : null;
  const styleA = getTeamStyle(teamA);
  const styleB = getTeamStyle(teamB);

  const handleFlip = async () => {
    setPhase("flipping");
    // Play soft beep
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.05, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      o.start(); o.stop(ctx.currentTime + 0.3);
    } catch {}

    setTimeout(async () => {
      const side: Side = Math.random() < 0.5 ? "cara" : "coroa";
      const winner = side === "cara" ? caraTeam! : coroaTeam!;
      const loser = winner === teamA ? teamB : teamA;
      setResult(side);
      setWinnerName(winner);
      setPhase("reveal");

      // Persist
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("coin_flip_results" as any).insert({
          match_id: matchId,
          pelada_id: peladaId,
          occurrence_id: occurrenceId || null,
          team_cara_name: caraTeam,
          team_coroa_name: coroaTeam,
          coin_result: side,
          winning_team_name: winner,
          losing_team_name: loser,
          admin_id: user?.id,
        });
        await supabase.from("matches").update({ coin_flip_winner_id: null } as any).eq("id", matchId);
      } catch (e) {
        console.error("coin flip save error", e);
      }

      setTimeout(() => {
        setPhase("done");
        onResult(winner);
      }, 3200);
    }, 2800);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      {/* Stadium-like gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-accent/10 pointer-events-none" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--accent)/0.4),transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/30">
            <Coins className="w-4 h-4 text-accent" />
            <span className="text-xs font-display font-bold uppercase tracking-[0.3em] text-accent">Decisão na Moeda</span>
          </div>
          <h2 className="font-display font-black text-3xl md:text-4xl text-foreground">Empate</h2>
          <p className="text-sm text-muted-foreground">A moeda decide quem permanece em campo</p>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={phase !== "choose"}
            onClick={() => setCaraTeam(teamA)}
            className={`rounded-2xl p-5 border-2 transition-all ${
              caraTeam === teamA
                ? "border-accent bg-accent/10 shadow-[0_0_30px_hsl(var(--accent)/0.3)]"
                : caraTeam === teamB
                ? "border-border bg-secondary/40 opacity-60"
                : "border-border bg-secondary/40 hover:border-accent/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-full mx-auto mb-3 ${styleA.dot} shadow-[0_0_16px_currentColor]`} />
            <p className="font-display font-black text-lg text-foreground">{teamA}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              {caraTeam === teamA ? "Cara" : caraTeam === teamB ? "Coroa" : "Escolher"}
            </p>
          </button>

          <button
            disabled={phase !== "choose"}
            onClick={() => setCaraTeam(teamB)}
            className={`rounded-2xl p-5 border-2 transition-all ${
              caraTeam === teamB
                ? "border-accent bg-accent/10 shadow-[0_0_30px_hsl(var(--accent)/0.3)]"
                : caraTeam === teamA
                ? "border-border bg-secondary/40 opacity-60"
                : "border-border bg-secondary/40 hover:border-accent/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-full mx-auto mb-3 ${styleB.dot} shadow-[0_0_16px_currentColor]`} />
            <p className="font-display font-black text-lg text-foreground">{teamB}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
              {caraTeam === teamB ? "Cara" : caraTeam === teamA ? "Coroa" : "Escolher"}
            </p>
          </button>
        </div>

        {phase === "choose" && (
          <p className="text-center text-xs text-muted-foreground">
            Toque no time que escolheu <span className="text-accent font-bold">CARA</span>. O outro fica com coroa.
          </p>
        )}

        {/* Coin */}
        <div className="flex items-center justify-center py-8 [perspective:1200px]">
          <div
            className={`relative w-40 h-40 rounded-full transition-transform ${
              phase === "flipping" ? "animate-[coin-flip_2.8s_cubic-bezier(0.45,0,0.55,1)_forwards]" : ""
            } ${phase === "reveal" || phase === "done" ? "animate-scale-in" : ""}`}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center font-display font-black text-3xl text-background shadow-[0_0_60px_hsl(var(--accent)/0.6)]"
              style={{
                background: "radial-gradient(circle at 30% 30%, #fff8c4, #d4af37 55%, #8b6914)",
                backfaceVisibility: "hidden",
              }}
            >
              {result === "cara" || phase !== "reveal" ? "CARA" : ""}
            </div>
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center font-display font-black text-2xl text-background shadow-[0_0_60px_hsl(var(--accent)/0.6)]"
              style={{
                background: "radial-gradient(circle at 30% 30%, #fff8c4, #b8860b 55%, #5a4209)",
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
              }}
            >
              COROA
            </div>
          </div>
        </div>

        {/* Reveal */}
        {(phase === "reveal" || phase === "done") && result && winnerName && (
          <div className="text-center space-y-3 animate-fade-in">
            <p className="font-display font-black text-5xl text-accent uppercase tracking-widest drop-shadow-[0_0_20px_hsl(var(--accent)/0.5)]">
              {result}
            </p>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/15 border border-accent/40">
              <Trophy className="w-5 h-5 text-accent" />
              <p className="font-display font-black text-foreground">
                {winnerName} permanece em campo
              </p>
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
          </div>
        )}

        {/* Actions */}
        {phase === "choose" && (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>Pular</Button>
            <Button
              className="flex-[2] glow-primary font-display font-black h-12 text-base"
              disabled={!caraTeam}
              onClick={() => setPhase("ready")}
            >
              Confirmar lados
            </Button>
          </div>
        )}
        {phase === "ready" && (
          <Button className="w-full glow-primary font-display font-black h-14 text-lg animate-pulse" onClick={handleFlip}>
            🪙 JOGAR MOEDA
          </Button>
        )}
      </div>

      <style>{`
        @keyframes coin-flip {
          0%   { transform: translateY(0) rotateY(0deg) rotateX(0deg); }
          15%  { transform: translateY(-180px) rotateY(720deg) rotateX(180deg); }
          50%  { transform: translateY(-220px) rotateY(2520deg) rotateX(720deg); }
          85%  { transform: translateY(-120px) rotateY(3960deg) rotateX(1260deg); }
          100% { transform: translateY(0) rotateY(${Math.random() < 0.5 ? 4320 : 4500}deg) rotateX(1440deg); }
        }
      `}</style>
    </div>
  );
}
