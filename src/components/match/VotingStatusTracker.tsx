import { useVotingProgress } from "@/hooks/useOccurrences";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, CheckCircle, Users, Vote } from "lucide-react";
import { useState, useEffect } from "react";

interface VotingStatusTrackerProps {
  peladaId: string;
  isAdmin: boolean;
}

function useCountdown(deadline: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!deadline) { setTimeLeft(""); return; }

    const calc = () => {
      const now = Date.now();
      const end = new Date(deadline).getTime();
      const diff = end - now;
      if (diff <= 0) { setTimeLeft("Encerrada"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}min`);
    };

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  return timeLeft;
}

export function VotingStatusTracker({ peladaId, isAdmin }: VotingStatusTrackerProps) {
  const { data: progress } = useVotingProgress(peladaId);
  const timeLeft = useCountdown(progress?.votingDeadline);

  if (!progress) return null;

  const pct = progress.totalEligible > 0
    ? Math.round((progress.totalVoted / progress.totalEligible) * 100)
    : 0;

  const isExpired = timeLeft === "Encerrada";

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Vote className="w-4 h-4 text-primary" />
            Votação Pós-Partida
          </h4>
          <Badge
            className={
              isExpired || progress.allVoted
                ? "bg-success/20 text-success border-success/30 text-xs"
                : "bg-primary/20 text-primary border-primary/30 text-xs animate-pulse"
            }
          >
            {isExpired || progress.allVoted ? (
              <><CheckCircle className="w-3 h-3 mr-1" /> Finalizada</>
            ) : (
              <><Clock className="w-3 h-3 mr-1" /> Em andamento</>
            )}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {progress.totalVoted} de {progress.totalEligible} jogadores já votaram
            </span>
            <span className="font-mono font-bold text-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {progress.totalPending > 0
              ? `${progress.totalPending} ainda não ${progress.totalPending === 1 ? "votou" : "votaram"}`
              : "Todos votaram!"}
          </span>
          {timeLeft && !isExpired && (
            <span className="text-accent font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Tempo restante: {timeLeft}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
