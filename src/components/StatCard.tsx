import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "gold" | "destructive";
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, variant = "default", className }: StatCardProps) {
  const variants = {
    default: "border-border",
    primary: "border-primary/20",
    gold: "border-accent/20",
    destructive: "border-destructive/20",
  };

  const iconVariants = {
    default: "text-muted-foreground bg-secondary/50",
    primary: "text-primary bg-primary/10",
    gold: "text-accent bg-accent/10",
    destructive: "text-destructive bg-destructive/10",
  };

  const glowVariants = {
    default: "",
    primary: "hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)]",
    gold: "hover:shadow-[0_0_20px_hsl(var(--accent)/0.15)]",
    destructive: "hover:shadow-[0_0_20px_hsl(var(--destructive)/0.15)]",
  };

  return (
    <div className={cn(
      "gaming-card p-4 md:p-5 transition-all duration-300",
      variants[variant],
      glowVariants[variant],
      className
    )}>
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
            <p className="text-2xl md:text-3xl font-display font-bold text-foreground text-glow-primary">{value}</p>
          </div>
          <div className={cn("p-2.5 rounded-lg", iconVariants[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1">
            <span className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">vs. mês anterior</span>
          </div>
        )}
      </div>
    </div>
  );
}
