import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Trophy } from "lucide-react";
import { getTeamStyle } from "@/lib/teamColors";

interface Props {
  open: boolean;
  teamA: string;
  teamB: string;
  onResult: (winner: string) => void;
  onCancel: () => void;
}

export function CoinFlipDialog({ open, teamA, teamB, onResult, onCancel }: Props) {
  const [phase, setPhase] = useState<"idle" | "flipping" | "result">("idle");
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPhase("idle");
      setWinner(null);
    }
  }, [open]);

  const flip = () => {
    setPhase("flipping");
    setTimeout(() => {
      const w = Math.random() < 0.5 ? teamA : teamB;
      setWinner(w);
      setPhase("result");
    }, 1600);
  };

  const styleA = getTeamStyle(teamA);
  const styleB = getTeamStyle(teamB);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Coins className="w-5 h-5 text-accent" /> Empate — Moeda decide quem fica
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4 py-4">
          <div className="flex flex-col items-center gap-2 flex-1">
            <span className={`w-6 h-6 rounded-full ${styleA.dot} shadow-[0_0_12px_currentColor]`} />
            <p className="font-display font-black text-foreground text-center">{teamA}</p>
          </div>
          <span className="text-muted-foreground font-bold text-2xl">×</span>
          <div className="flex flex-col items-center gap-2 flex-1">
            <span className={`w-6 h-6 rounded-full ${styleB.dot} shadow-[0_0_12px_currentColor]`} />
            <p className="font-display font-black text-foreground text-center">{teamB}</p>
          </div>
        </div>

        <div className="flex items-center justify-center py-6">
          <div
            className={`w-28 h-28 rounded-full bg-gradient-to-br from-accent to-warning shadow-[0_0_40px_hsl(var(--accent)/0.5)] flex items-center justify-center font-display font-black text-3xl text-background ${
              phase === "flipping" ? "animate-[spin_0.4s_linear_infinite]" : ""
            }`}
          >
            {phase === "result" ? "🏆" : "🪙"}
          </div>
        </div>

        {phase === "result" && winner && (
          <div className="text-center space-y-2 animate-fade-in">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Vencedor da moeda</p>
            <p className="font-display font-black text-2xl text-foreground flex items-center justify-center gap-2">
              <Trophy className="w-5 h-5 text-accent" /> {winner}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {phase === "idle" && (
            <>
              <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
              <Button className="flex-1 glow-primary" onClick={flip}>Sortear moeda</Button>
            </>
          )}
          {phase === "result" && winner && (
            <Button className="w-full glow-primary" onClick={() => onResult(winner)}>
              Confirmar — {winner} fica
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
