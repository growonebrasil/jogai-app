import { Users, CheckCircle2, Clock, XCircle, UserCheck, UserPlus } from "lucide-react";

interface PeladaCountsBarProps {
  members: any[];
}

/**
 * Compact status counters visible at the top of the Central tab.
 * Helps the president/admin see who is confirmed before clicking INICIAR.
 */
export function PeladaCountsBar({ members }: PeladaCountsBarProps) {
  const list = members || [];
  const mensalistas = list.filter((m) => m.user_id).length;
  const diaristas = list.filter((m) => !m.user_id && m.guest_name).length;
  const confirmados = list.filter((m) => m.status === "confirmado").length;
  const pendentes = list.filter((m) => m.status === "pendente").length;
  const ausentes = list.filter((m) => m.status === "nao_vou").length;

  const items = [
    { label: "Mensalistas", value: mensalistas, icon: UserCheck, color: "text-primary" },
    { label: "Diaristas", value: diaristas, icon: UserPlus, color: "text-accent" },
    { label: "Confirmados", value: confirmados, icon: CheckCircle2, color: "text-success" },
    { label: "Pendentes", value: pendentes, icon: Clock, color: "text-warning" },
    { label: "Ausentes", value: ausentes, icon: XCircle, color: "text-destructive" },
    { label: "Cadastrados", value: list.length, icon: Users, color: "text-foreground" },
  ];

  return (
    <div className="bg-gradient-card rounded-xl border border-border p-3 md:p-4">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div
              key={it.label}
              className="flex flex-col items-center text-center p-2 rounded-lg bg-secondary/30"
            >
              <Icon className={`w-4 h-4 mb-1 ${it.color}`} />
              <span className="font-display font-black text-lg leading-none text-foreground">
                {it.value}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                {it.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
