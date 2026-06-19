import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Minus } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";

interface PlayerItem {
  id: string;
  name: string;
  position: string;
  overall: number;
  team: string;
  avatarUrl?: string | null;
}

interface PlayerEventRowProps {
  player: PlayerItem;
  isAdmin: boolean;
  isLocked: boolean;
  stats?: { goals: number; assists: number; yellow_cards: number; red_cards: number };
  onEvent?: (event: "goal" | "assist" | "yellow" | "red", delta: number) => void;
  matchId?: string;
}

export function PlayerEventRow({ player, isAdmin, isLocked, stats, onEvent, matchId }: PlayerEventRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    disabled: !isAdmin || isLocked,
  });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50, opacity: 0.9 } : undefined;
  const [showMinus, setShowMinus] = useState(false);

  const eventButtons = [
    { key: "goal" as const, emoji: "⚽", count: stats?.goals || 0, color: "text-primary border-primary/30" },
    { key: "assist" as const, emoji: "🅰️", count: stats?.assists || 0, color: "text-accent border-accent/30" },
    { key: "yellow" as const, emoji: "🟨", count: stats?.yellow_cards || 0, color: "text-warning border-warning/30" },
    { key: "red" as const, emoji: "🟥", count: stats?.red_cards || 0, color: "text-destructive border-destructive/30" },
  ];

  return (
    <div ref={setNodeRef} style={style} className={`relative ${isDragging ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition group">
        {isAdmin && !isLocked && (
          <button {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
            <GripVertical className="w-4 h-4" />
          </button>
        )}
        <span className="text-xs font-bold text-primary w-7 text-center">{player.overall}</span>
        <span className="text-sm text-foreground flex-1 truncate">{player.name}</span>
        <span className="text-xs text-muted-foreground font-mono mr-1">{player.position}</span>

        {/* Inline event icons — always visible */}
        <div className="flex items-center gap-1">
          {eventButtons.map((ev) => (
            <div key={ev.key} className="flex items-center gap-0.5">
              {/* Add button (admin only, not locked) */}
              {isAdmin && !isLocked && matchId ? (
                <button
                  onClick={() => onEvent?.(ev.key, 1)}
                  className={`text-xs px-1.5 py-0.5 rounded hover:bg-secondary/80 transition ${ev.count > 0 ? "" : "opacity-50 hover:opacity-100"}`}
                  title={`Adicionar ${ev.emoji}`}
                >
                  {ev.emoji}
                </button>
              ) : (
                <span className={`text-xs px-1 ${ev.count > 0 ? "" : "opacity-30"}`}>{ev.emoji}</span>
              )}
              {ev.count > 0 && (
                <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${ev.color}`}>
                  {ev.count}
                </Badge>
              )}
              {/* Minus button */}
              {isAdmin && !isLocked && matchId && ev.count > 0 && showMinus && (
                <button
                  onClick={() => onEvent?.(ev.key, -1)}
                  className="text-xs text-destructive hover:bg-destructive/10 rounded p-0.5 transition"
                  title="Remover"
                >
                  <Minus className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Toggle minus buttons */}
        {isAdmin && !isLocked && matchId && (stats?.goals || stats?.assists || stats?.yellow_cards || stats?.red_cards) ? (
          <button
            onClick={() => setShowMinus(!showMinus)}
            className="text-[10px] text-muted-foreground hover:text-foreground ml-1 px-1 py-0.5 rounded hover:bg-secondary/80"
            title="Corrigir eventos"
          >
            {showMinus ? "✓" : "−"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
