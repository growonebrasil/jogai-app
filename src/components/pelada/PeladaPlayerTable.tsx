import { useMemo, useState } from "react";
import { useAllPeladaStats, useAllPeladaMatches } from "@/hooks/useMatchManagement";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users } from "lucide-react";

interface PeladaPlayerTableProps {
  peladaId: string;
  members: any[];
  pelada: any;
}

const statusLabels: Record<string, { label: string; cls: string }> = {
  confirmado: { label: "Vou", cls: "bg-success/20 text-success" },
  talvez: { label: "Talvez", cls: "bg-warning/20 text-warning" },
  nao_vou: { label: "Não vou", cls: "bg-destructive/20 text-destructive" },
  pendente: { label: "Pendente", cls: "bg-muted text-muted-foreground" },
};

/**
 * Complete roster table with per-player aggregated stats.
 * Used in the president-facing "Jogadores" tab.
 */
export function PeladaPlayerTable({ peladaId, members, pelada }: PeladaPlayerTableProps) {
  const { data: stats } = useAllPeladaStats(peladaId);
  const { data: allMatches } = useAllPeladaMatches(peladaId);
  const [filter, setFilter] = useState<"todos" | "confirmados" | "pendentes" | "mensalistas">("todos");
  const [search, setSearch] = useState("");

  const statsMap = stats?.statsMap || {};
  const matchCountMap = stats?.matchCountMap || {};
  const totalMatches = (allMatches || []).filter((m: any) => m.is_finished).length;

  const rows = useMemo(() => {
    let list = (members || []).map((m: any) => {
      const s = statsMap[m.id] || { goals: 0, assists: 0, yellow_cards: 0, red_cards: 0 };
      const matches = matchCountMap[m.id] || 0;
      const presence = totalMatches > 0 ? Math.round((matches / totalMatches) * 100) : 0;
      const isMonthly = !!m.user_id && !!pelada?.is_paid;
      return {
        id: m.id,
        name: m.profile?.name || m.guest_name || "Jogador",
        avatar_url: m.profile?.avatar_url || null,
        position: m.profile?.position || m.guest_position || "MEI",
        overall: m.overall || 50,
        matches,
        presence,
        goals: s.goals,
        assists: s.assists,
        cards: s.yellow_cards + s.red_cards,
        isMonthly,
        status: m.status,
      };
    });

    if (filter === "confirmados") list = list.filter((r) => r.status === "confirmado");
    else if (filter === "pendentes") list = list.filter((r) => r.status === "pendente");
    else if (filter === "mensalistas") list = list.filter((r) => r.isMonthly);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }

    list.sort((a, b) => b.overall - a.overall);
    return list;
  }, [members, statsMap, matchCountMap, totalMatches, filter, search, pelada]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar jogador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50 border-border h-10"
          />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-full sm:w-48 h-10 bg-secondary/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({members?.length || 0})</SelectItem>
            <SelectItem value="confirmados">Confirmados</SelectItem>
            <SelectItem value="pendentes">Pendentes</SelectItem>
            <SelectItem value="mensalistas">Mensalistas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="gaming-card p-8 text-center text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum jogador encontrado</p>
        </div>
      ) : (
        <div className="gaming-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/30">
              <tr className="text-left">
                <Th>Jogador</Th>
                <Th className="text-center">OVR</Th>
                <Th className="text-center hidden sm:table-cell">Pres.</Th>
                <Th className="text-center">G</Th>
                <Th className="text-center">A</Th>
                <Th className="text-center hidden sm:table-cell">Cart.</Th>
                <Th className="text-center hidden md:table-cell">Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = statusLabels[r.status] || statusLabels.pendente;
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          {r.avatar_url ? <AvatarImage src={r.avatar_url} /> : null}
                          <AvatarFallback className="text-xs bg-muted">
                            {r.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-foreground font-medium truncate max-w-[140px]">{r.name}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-mono">{r.position}</span>
                            {r.isMonthly && (
                              <Badge className="bg-accent/20 text-accent text-[9px] px-1 py-0 h-3.5">MENS.</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-2.5 text-center font-bold text-primary">{r.overall}</td>
                    <td className="p-2.5 text-center hidden sm:table-cell">
                      <span className="text-foreground">{r.presence}%</span>
                      <span className="text-[10px] text-muted-foreground block">({r.matches}/{totalMatches})</span>
                    </td>
                    <td className="p-2.5 text-center font-mono text-foreground">{r.goals}</td>
                    <td className="p-2.5 text-center font-mono text-foreground">{r.assists}</td>
                    <td className="p-2.5 text-center hidden sm:table-cell font-mono text-muted-foreground">{r.cards}</td>
                    <td className="p-2.5 text-center hidden md:table-cell">
                      <Badge className={`text-[10px] ${st.cls}`}>{st.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children: any; className?: string }) {
  return (
    <th className={`p-2.5 font-medium text-muted-foreground text-xs uppercase tracking-wider ${className}`}>
      {children}
    </th>
  );
}
