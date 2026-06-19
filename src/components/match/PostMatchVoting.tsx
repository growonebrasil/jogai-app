import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Star, Trophy, HandshakeIcon, Skull, Loader2, CheckCircle } from "lucide-react";
import { useSubmitVotes } from "@/hooks/useMatchManagement";
import { toast } from "sonner";

interface PlayerForVote {
  memberId: string;
  name: string;
  position: string;
  overall: number;
}

interface PostMatchVotingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  voterId: string;
  players: PlayerForVote[];
  myMemberId?: string;
}

export function PostMatchVoting({ open, onOpenChange, matchId, voterId, players, myMemberId }: PostMatchVotingProps) {
  const submitVotes = useSubmitVotes();
  const otherPlayers = players.filter((p) => p.memberId !== myMemberId);

  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    otherPlayers.forEach((p) => (init[p.memberId] = 5));
    return init;
  });
  const [craque, setCraque] = useState<string>("");
  const [fairPlay, setFairPlay] = useState<string>("");
  const [bolaMurcha, setBolaMurcha] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const ratingsList = Object.entries(ratings).map(([memberId, stars]) => ({ memberId, stars }));
    submitVotes.mutate(
      {
        matchId,
        voterId,
        ratings: ratingsList,
        awards: {
          craque: craque || undefined,
          fairPlay: fairPlay || undefined,
          bolaMurcha: bolaMurcha || undefined,
        },
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (err: any) => {
          if (err?.message?.includes("unique") || err?.code === "23505") {
            setSubmitted(true);
            toast.info("Você já votou nesta pelada.");
          }
        },
      }
    );
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-16 h-16 text-success mx-auto" />
            <h3 className="font-display text-xl font-bold text-foreground">Votos enviados!</h3>
            <p className="text-sm text-muted-foreground">Obrigado por avaliar os jogadores.</p>
            <Button onClick={() => onOpenChange(false)} className="mt-4">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Avaliação Pós-Partida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Player ratings */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground mb-3">Avalie cada jogador (0-10)</h3>
            {otherPlayers.map((p) => (
              <div key={p.memberId} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-secondary/40">
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{p.position}</span>
                </div>
                <div className="flex items-center gap-2 w-40">
                  <Slider
                    value={[ratings[p.memberId] || 5]}
                    onValueChange={(v) => setRatings((prev) => ({ ...prev, [p.memberId]: v[0] }))}
                    min={0}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold text-primary w-6 text-right">{ratings[p.memberId] || 0}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Special awards */}
          <div className="space-y-4">
            {/* Craque */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> ⭐ Craque da Pelada
              </h3>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.map((p) => (
                  <button
                    key={p.memberId}
                    onClick={() => setCraque(craque === p.memberId ? "" : p.memberId)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      craque === p.memberId
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/40 text-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Fair Play */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <HandshakeIcon className="w-4 h-4 text-success" /> 🤝 Fair Play
              </h3>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.map((p) => (
                  <button
                    key={p.memberId}
                    onClick={() => setFairPlay(fairPlay === p.memberId ? "" : p.memberId)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      fairPlay === p.memberId
                        ? "bg-success text-success-foreground border-success"
                        : "bg-secondary/40 text-foreground border-border hover:border-success/50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Bola Murcha */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Skull className="w-4 h-4 text-destructive" /> 💀 Bola Murcha
              </h3>
              <div className="flex flex-wrap gap-2">
                {otherPlayers.map((p) => (
                  <button
                    key={p.memberId}
                    onClick={() => setBolaMurcha(bolaMurcha === p.memberId ? "" : p.memberId)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${
                      bolaMurcha === p.memberId
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "bg-secondary/40 text-foreground border-border hover:border-destructive/50"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full glow-primary"
            disabled={submitVotes.isPending}
          >
            {submitVotes.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Enviar Avaliação</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
