import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface PlayerCardProps {
  name: string;
  position: string;
  rating: number;
  photo?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const positionColors: Record<string, string> = {
  GOL: "text-warning",
  ZAG: "text-blue-400",
  LAT: "text-cyan-400",
  VOL: "text-green-400",
  MEI: "text-primary",
  ATA: "text-destructive",
};

export function PlayerCard({ name, position, rating, photo, className, size = "md" }: PlayerCardProps) {
  const sizes = {
    sm: "w-24 h-32",
    md: "w-32 h-44",
    lg: "w-40 h-56",
  };

  const ratingSizes = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-5xl",
  };

  const positionColor = positionColors[position] || "text-muted-foreground";

  return (
    <div className={cn("player-card p-3 flex flex-col", sizes[size], className)}>
      {/* Rating */}
      <div className="flex items-start justify-between">
        <div className={cn("player-rating text-primary", ratingSizes[size])}>
          {rating}
        </div>
        <span className={cn("text-xs font-bold uppercase tracking-wider", positionColor)}>
          {position}
        </span>
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center my-2">
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="w-full h-full object-cover rounded-lg opacity-90"
          />
        ) : (
          <div className="w-full h-full bg-secondary/50 rounded-lg flex items-center justify-center">
            <User className="w-1/2 h-1/2 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="font-display font-bold text-sm truncate text-foreground">
          {name}
        </p>
      </div>
    </div>
  );
}
