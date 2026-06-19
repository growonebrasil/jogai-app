import { Card, CardContent } from "@/components/ui/card";
import { Crown, Dice5, Users } from "lucide-react";
import type { MatchRuleType } from "./MatchRotationDialog";

interface MatchRuleSelectorProps {
  value: MatchRuleType;
  onChange: (value: MatchRuleType) => void;
  disabled?: boolean;
}

const rules = [
  {
    key: "rei_da_mesa" as MatchRuleType,
    label: "Rei da Mesa",
    desc: "Vencedor fica, perdedor sai",
    icon: Crown,
  },
  {
    key: "sorteio" as MatchRuleType,
    label: "Sorteio",
    desc: "Em empate, sorteio decide",
    icon: Dice5,
  },
  {
    key: "manual" as MatchRuleType,
    label: "Manual",
    desc: "Admin escolhe quem joga",
    icon: Users,
  },
];

export function MatchRuleSelector({ value, onChange, disabled }: MatchRuleSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {rules.map(r => {
        const Icon = r.icon;
        const active = value === r.key;
        return (
          <button
            key={r.key}
            onClick={() => !disabled && onChange(r.key)}
            disabled={disabled}
            className={`p-3 rounded-lg border text-left transition-all ${
              active
                ? "border-primary bg-primary/10 ring-1 ring-primary"
                : "border-border bg-card hover:border-primary/40"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <Icon className={`w-4 h-4 mb-1 ${active ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-xs font-medium text-foreground">{r.label}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{r.desc}</p>
          </button>
        );
      })}
    </div>
  );
}
