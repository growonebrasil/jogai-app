import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, Share2 } from "lucide-react";
import { useMatchTeams, useAllPeladaMatches, useAllPeladaStats } from "@/hooks/useMatchManagement";
import { useFinalizedAwards } from "@/hooks/useFinalizedAwards";
import { toast } from "sonner";

interface MatchReportProps {
  matchId: string;
  peladaName: string;
  peladaDate: string;
  members: any[];
  peladaId?: string;
  votingFinalized?: boolean;
}

export function MatchReport({ matchId, peladaName, peladaDate, members, peladaId, votingFinalized }: MatchReportProps) {
  const { data: teams } = useMatchTeams(matchId);
  const { data: allMatches } = useAllPeladaMatches(peladaId);
  const { data: aggregated } = useAllPeladaStats(peladaId);
  const { data: finalizedAwards } = useFinalizedAwards(matchId, votingFinalized);
  const [copied, setCopied] = useState(false);

  const totalMatches = (allMatches || []).filter(m => m.is_finished).length;

  const report = useMemo(() => {
    if (!teams) return "";

    const getMemberName = (memberId: string) => {
      const member = members.find((m: any) => m.id === memberId);
      return member?.profile?.name || member?.guest_name || "Jogador";
    };

    const statsMap = aggregated?.statsMap || {};
    const matchCountMap = aggregated?.matchCountMap || {};

    const teamGroups: Record<string, string[]> = {};
    teams.forEach((t) => {
      if (!teamGroups[t.team]) teamGroups[t.team] = [];
      teamGroups[t.team].push(t.pelada_member_id);
    });

    const teamNames = Object.keys(teamGroups).sort((a, b) => {
      if (a === "De Fora") return 1;
      if (b === "De Fora") return -1;
      return a.localeCompare(b);
    });

    let text = `⚽ *${peladaName}*\n📅 ${peladaDate}\n`;
    if (totalMatches > 1) text += `🎮 ${totalMatches} partidas\n`;

    if (allMatches && allMatches.length > 0) {
      const finished = allMatches.filter(m => m.is_finished);
      if (finished.length > 0) {
        text += "\n*Resultados:*\n";
        finished.forEach(m => {
          text += `  Partida ${m.match_number}: ${m.team_a_score} × ${m.team_b_score}\n`;
        });
      }
    }

    text += "\n";

    for (const teamName of teamNames) {
      const playerIds = teamGroups[teamName];
      const teamGoals = playerIds.reduce((s, id) => s + (statsMap[id]?.goals || 0), 0);
      
      text += `*${teamName}*${teamName !== "De Fora" ? ` (${teamGoals} gols)` : ""}\n`;
      
      for (const pid of playerIds) {
        const name = getMemberName(pid);
        const st = statsMap[pid];
        let line = `  • ${name}`;
        const parts: string[] = [];
        if (totalMatches > 1 && matchCountMap[pid]) parts.push(`${matchCountMap[pid]}/${totalMatches} jogos`);
        if (st?.goals) parts.push(`⚽${st.goals}`);
        if (st?.assists) parts.push(`🅰️${st.assists}`);
        if (st?.yellow_cards) parts.push(`🟨${st.yellow_cards}`);
        if (st?.red_cards) parts.push(`🟥${st.red_cards}`);
        if (parts.length > 0) line += ` — ${parts.join(" ")}`;
        text += line + "\n";
      }
      text += "\n";
    }

    // Only show awards in report if voting is finalized
    if (votingFinalized && finalizedAwards && finalizedAwards.length > 0) {
      const getWinnerName = (type: string) => {
        const award = finalizedAwards.find(a => a.award_type === type);
        return award ? getMemberName(award.winner_member_id) : null;
      };

      const craque = getWinnerName("craque");
      const fairPlay = getWinnerName("fair_play");
      const bolaMurcha = getWinnerName("bola_murcha");

      text += "*🏆 Destaques*\n";
      if (craque) text += `⭐ Craque: ${craque}\n`;
      if (fairPlay) text += `🤝 Fair Play: ${fairPlay}\n`;
      if (bolaMurcha) text += `💀 Bola Murcha: ${bolaMurcha}\n`;
    } else if (!votingFinalized) {
      text += "_⏳ Votação ainda em andamento_\n";
    }

    text += "\n_Relatório gerado pelo JOGAI_";
    return text;
  }, [teams, members, peladaName, peladaDate, aggregated, allMatches, totalMatches, finalizedAwards, votingFinalized]);

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    toast.success("Relatório copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(report)}`, "_blank");
  };

  if (!report) return null;

  return (
    <div className="space-y-3">
      <pre className="bg-secondary/50 rounded-lg p-4 text-xs text-foreground whitespace-pre-wrap font-mono border border-border max-h-[300px] overflow-y-auto">
        {report}
      </pre>
      <div className="flex gap-2">
        <Button onClick={handleCopy} variant="outline" className="flex-1">
          {copied ? <><CheckCircle className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar relatório</>}
        </Button>
        <Button onClick={handleWhatsApp} variant="outline" className="flex-1">
          <Share2 className="w-4 h-4" /> Compartilhar no WhatsApp
        </Button>
      </div>
    </div>
  );
}
