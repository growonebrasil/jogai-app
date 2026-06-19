import { cn } from "@/lib/utils";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PeladaCardProps {
  id: string;
  name: string;
  location: string;
  date: string;
  time: string;
  confirmedPlayers: number;
  totalPlayers: number;
  status: "scheduled" | "live" | "finished";
  onClick?: () => void;
  className?: string;
}

export function PeladaCard({
  name,
  location,
  date,
  time,
  confirmedPlayers,
  totalPlayers,
  status,
  onClick,
  className,
}: PeladaCardProps) {
  const statusConfig = {
    scheduled: { label: "Agendada", className: "bg-secondary text-secondary-foreground" },
    live: { label: "AO VIVO", className: "status-live" },
    finished: { label: "Finalizada", className: "bg-muted text-muted-foreground" },
  };

  const progressPercent = Math.min((confirmedPlayers / totalPlayers) * 100, 100);

  return (
    <div
      className={cn(
        "gaming-card p-4 md:p-5 cursor-pointer group animate-fade-in",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">{name}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm">{location}</span>
          </div>
        </div>
        <Badge className={cn("text-xs font-semibold", statusConfig[status].className)}>
          {statusConfig[status].label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{time}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            <span className="text-primary text-glow-primary">{confirmedPlayers}</span>
            <span className="text-muted-foreground">/{totalPlayers} confirmados</span>
          </span>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
          Ver detalhes
        </Button>
      </div>

      {/* Progress bar with glow */}
      <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progressPercent}%`,
            background: `linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))`,
            boxShadow: progressPercent > 0 ? '0 0 8px hsl(var(--primary) / 0.5)' : 'none',
          }}
        />
      </div>
    </div>
  );
}
