import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus } from "lucide-react";
import { useMatchTeams, useMatchStats, useRecordMatchEvent, useRealtimeMatchStats } from "@/hooks/useMatchManagement";

interface PostMatchStatEditorProps {
  matchId: string;
  members: any[];
}

export function PostMatchStatEditor({ matchId, members }: PostMatchStatEditorProps) {
  const { data: teams } = useMatchTeams(matchId);
  const { data: stats } = useMatchStats(matchId);
  const recordEvent = useRecordMatchEvent();

  useRealtimeMatchStats(matchId);

  const memberMap = useMemo(() => {
    const map: Record<string, any> = {};
    members?.forEach((m: any) => (map[m.id] = m));
    return map;
  }, [members]);

  const statsMap = useMemo(() => {
    const map: Record<string, any> = {};
    stats?.forEach((s) => (map[s.pelada_member_id] = s));
    return map;
  }, [stats]);

  const getName = (memberId: string) => {
    const m = memberMap[memberId];
    return m?.profile?.name || m?.guest_name || "Jogador";
  };

  const teamGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    teams?.forEach((t) => {
      if (!groups[t.team]) groups[t.team] = [];
      groups[t.team].push(t.pelada_member_id);
    });
    return groups;
  }, [teams]);

  const allPlayerIds = useMemo(() => {
    return Object.values(teamGroups).flat();
  }, [teamGroups]);

  const handleEvent = (memberId: string, event: "goal" | "assist" | "yellow" | "red", delta: number) => {
    recordEvent.mutate({ matchId, memberId, event, delta });
  };

  if (allPlayerIds.length === 0) return null;

  return (
    <div className="space-y-1 mt-2 max-h-[300px] overflow-y-auto">
      {allPlayerIds.map((memberId) => {
        const s = statsMap[memberId];
        return (
          <div key={memberId} className="flex items-center gap-2 py-1.5 px-2 rounded bg-secondary/30">
            <span className="text-xs text-foreground flex-1 truncate">{getName(memberId)}</span>
            <div className="flex items-center gap-1">
              {/* Goals */}
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEvent(memberId, "goal", -1)} disabled={!s?.goals}>
                  <Minus className="w-2.5 h-2.5" />
                </Button>
                <Badge variant="outline" className="px-1 py-0 h-4 text-[10px] min-w-[28px] justify-center">⚽{s?.goals || 0}</Badge>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEvent(memberId, "goal", 1)}>
                  <Plus className="w-2.5 h-2.5" />
                </Button>
              </div>
              {/* Assists */}
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEvent(memberId, "assist", -1)} disabled={!s?.assists}>
                  <Minus className="w-2.5 h-2.5" />
                </Button>
                <Badge variant="outline" className="px-1 py-0 h-4 text-[10px] min-w-[28px] justify-center">🅰️{s?.assists || 0}</Badge>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEvent(memberId, "assist", 1)}>
                  <Plus className="w-2.5 h-2.5" />
                </Button>
              </div>
              {/* Yellow */}
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEvent(memberId, "yellow", -1)} disabled={!s?.yellow_cards}>
                  <Minus className="w-2.5 h-2.5" />
                </Button>
                <Badge variant="outline" className="px-1 py-0 h-4 text-[10px] min-w-[28px] justify-center">🟨{s?.yellow_cards || 0}</Badge>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEvent(memberId, "yellow", 1)}>
                  <Plus className="w-2.5 h-2.5" />
                </Button>
              </div>
              {/* Red */}
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEvent(memberId, "red", -1)} disabled={!s?.red_cards}>
                  <Minus className="w-2.5 h-2.5" />
                </Button>
                <Badge variant="outline" className="px-1 py-0 h-4 text-[10px] min-w-[28px] justify-center">🟥{s?.red_cards || 0}</Badge>
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleEvent(memberId, "red", 1)}>
                  <Plus className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
