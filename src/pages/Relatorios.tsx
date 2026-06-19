import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Star, Target, Award, AlertTriangle, FileText, Calendar, Loader2,
  Trophy, Users, Share2, TrendingUp, TrendingDown, Wallet, CheckCircle, XCircle, Download,
} from "lucide-react";
import { useMyPaidPeladas, usePeladaExpenses, usePeladaIncome, usePeladaPayments, useUpdatePaymentStatus } from "@/hooks/useFinanceiro";
import { usePeladaMembers } from "@/hooks/usePeladas";
import { useAllPeladaMatches, useAllPeladaStats } from "@/hooks/useMatchManagement";
import { format } from "date-fns";
import { generatePeladaPdf } from "@/lib/generatePeladaPdf";

type Period = "weekly" | "monthly" | "quarterly" | "semiannual" | "yearly";

export default function Relatorios() {
  const { data: peladas, isLoading } = useMyPaidPeladas();
  const [selectedPeladaId, setSelectedPeladaId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("monthly");

  const activePeladaId = selectedPeladaId || peladas?.[0]?.id || null;
  const selectedPelada = peladas?.find((p: any) => p.id === activePeladaId);

  const { data: members } = usePeladaMembers(activePeladaId || undefined);
  const { data: allMatches } = useAllPeladaMatches(activePeladaId || undefined);
  const { data: peladaStats } = useAllPeladaStats(activePeladaId || undefined);
  const { data: expenses } = usePeladaExpenses(activePeladaId || undefined);
  const { data: income } = usePeladaIncome(activePeladaId || undefined);
  const { data: payments } = usePeladaPayments(activePeladaId || undefined);
  const updatePaymentStatus = useUpdatePaymentStatus();

  const finishedMatches = useMemo(() => (allMatches || []).filter((m) => m.is_finished), [allMatches]);
  const statsMap = peladaStats?.statsMap || {};
  const matchCountMap = peladaStats?.matchCountMap || {};

  // Filter by period
  const now = new Date();
  const periodStart = useMemo(() => {
    const d = new Date();
    switch (period) {
      case "weekly": d.setDate(d.getDate() - 7); break;
      case "monthly": d.setMonth(d.getMonth() - 1); break;
      case "quarterly": d.setMonth(d.getMonth() - 3); break;
      case "semiannual": d.setMonth(d.getMonth() - 6); break;
      case "yearly": d.setFullYear(d.getFullYear() - 1); break;
    }
    return d;
  }, [period]);

  const filteredExpenses = useMemo(() => (expenses || []).filter((e: any) => new Date(e.expense_date) >= periodStart), [expenses, periodStart]);
  const filteredIncome = useMemo(() => (income || []).filter((i: any) => new Date(i.income_date) >= periodStart), [income, periodStart]);
  const totalExp = filteredExpenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const totalInc = filteredIncome.reduce((s: number, i: any) => s + Number(i.amount), 0);

  const paidCount = (payments || []).filter((p: any) => p.status === "pago").length;
  const unpaidCount = (payments || []).filter((p: any) => p.status !== "pago").length;

  // Top scorers/assisters
  const topPlayers = useMemo(() => {
    const entries = Object.entries(statsMap as Record<string, any>).map(([memberId, stats]) => {
      const member = members?.find((m: any) => m.id === memberId);
      return { memberId, name: member?.profile?.name || member?.guest_name || "Jogador", ...stats, matches: matchCountMap[memberId] || 0 };
    });
    return {
      topScorer: [...entries].sort((a, b) => b.goals - a.goals)[0],
      topAssister: [...entries].sort((a, b) => b.assists - a.assists)[0],
      mostCards: [...entries].sort((a, b) => (b.yellow_cards + b.red_cards) - (a.yellow_cards + a.red_cards))[0],
      mostGames: [...entries].sort((a, b) => b.matches - a.matches)[0],
    };
  }, [statsMap, matchCountMap, members]);

  // Biggest expense
  const biggestExpense = useMemo(() => {
    if (filteredExpenses.length === 0) return null;
    return filteredExpenses.reduce((max: any, e: any) => Number(e.amount) > Number(max.amount) ? e : max, filteredExpenses[0]);
  }, [filteredExpenses]);

  const handleShareReport = () => {
    if (!selectedPelada) return;
    const periodLabels: Record<Period, string> = { weekly: "Semanal", monthly: "Mensal", quarterly: "Trimestral", semiannual: "Semestral", yearly: "Anual" };
    let text = `📊 *Relatório ${periodLabels[period]} - ${(selectedPelada as any).name}*\n\n`;
    text += `💰 Receitas: R$ ${totalInc.toFixed(2)}\n`;
    text += `💸 Despesas: R$ ${totalExp.toFixed(2)}\n`;
    text += `📈 Saldo: R$ ${(totalInc - totalExp).toFixed(2)}\n\n`;
    text += `⚽ ${finishedMatches.length} partida(s) jogada(s)\n`;
    if (topPlayers.topScorer?.goals > 0) text += `🏆 Artilheiro: ${topPlayers.topScorer.name} (${topPlayers.topScorer.goals} gols)\n`;
    if (topPlayers.topAssister?.assists > 0) text += `🤝 Garçom: ${topPlayers.topAssister.name} (${topPlayers.topAssister.assists} assist.)\n`;
    text += `\n👥 Pagamentos: ${paidCount} pagos, ${unpaidCount} pendentes\n`;
    if (biggestExpense) text += `📌 Maior despesa: ${biggestExpense.category} - R$ ${Number(biggestExpense.amount).toFixed(2)}\n`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleExportPdf = () => {
    if (!selectedPelada) return;
    const periodLabels: Record<Period, string> = { weekly: "Semanal", monthly: "Mensal", quarterly: "Trimestral", semiannual: "Semestral", yearly: "Anual" };
    const paymentsList = (payments || []).map((p: any) => {
      const member = members?.find((m: any) => m.id === p.pelada_member_id);
      return {
        name: member?.profile?.name || member?.guest_name || "Jogador",
        status: p.status,
        amount: Number(p.amount),
        month: format(new Date(p.reference_month), "MM/yyyy"),
      };
    });
    generatePeladaPdf({
      peladaName: (selectedPelada as any).name,
      periodLabel: periodLabels[period],
      totalInc,
      totalExp,
      finishedMatchesCount: finishedMatches.length,
      membersCount: members?.length || 0,
      paidCount,
      unpaidCount,
      topScorer: topPlayers.topScorer,
      topAssister: topPlayers.topAssister,
      mostGames: topPlayers.mostGames,
      mostCards: topPlayers.mostCards,
      expenses: filteredExpenses.map((e: any) => ({ category: e.category, description: e.description, amount: Number(e.amount) })),
      payments: paymentsList,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!peladas || peladas.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto space-y-6 p-4">
          <h1 className="font-display text-3xl font-bold text-foreground">Relatórios</h1>
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Você não administra nenhuma pelada ainda.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Relatórios</h1>
            <p className="text-muted-foreground mt-1">Resumos e prestação de contas</p>
          </div>
          <div className="flex gap-2">
            {peladas.length > 1 && (
              <Select value={activePeladaId || ""} onValueChange={setSelectedPeladaId}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Pelada" /></SelectTrigger>
                <SelectContent>
                  {peladas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="semiannual">Semestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="font-display text-2xl font-bold text-primary">R$ {totalInc.toFixed(2)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <TrendingDown className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="font-display text-2xl font-bold text-destructive">R$ {totalExp.toFixed(2)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 text-center">
            <Wallet className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={`font-display text-2xl font-bold ${(totalInc - totalExp) >= 0 ? "text-primary" : "text-destructive"}`}>
              R$ {(totalInc - totalExp).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Resumo de Atividade
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Partidas</p>
              <p className="font-display text-2xl font-bold text-foreground">{finishedMatches.length}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Jogadores</p>
              <p className="font-display text-2xl font-bold text-foreground">{members?.length || 0}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Pagos</p>
              <p className="font-display text-2xl font-bold text-success">{paidCount}</p>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50 text-center">
              <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
              <p className="font-display text-2xl font-bold text-warning">{unpaidCount}</p>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {(payments || []).length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> Status de Pagamento
            </h2>
            <div className="space-y-2">
              {(payments || []).map((payment: any) => {
                const member = members?.find((m: any) => m.id === payment.pelada_member_id);
                const name = member?.profile?.name || member?.guest_name || "Jogador";
                const isPaid = payment.status === "pago";
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      {isPaid ? (
                        <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-foreground text-sm">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(payment.reference_month), "MM/yyyy")} · R$ {Number(payment.amount).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={isPaid ? "outline" : "default"}
                      onClick={() => updatePaymentStatus.mutate({
                        id: payment.id,
                        status: isPaid ? "pendente" : "pago",
                        peladaId: activePeladaId!,
                      })}
                      disabled={updatePaymentStatus.isPending}
                      className={isPaid ? "" : "glow-primary"}
                    >
                      {isPaid ? "Desfazer" : "Confirmar Pgto"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance Highlights */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" /> Destaques de Performance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Artilheiro</span>
              </div>
              {topPlayers.topScorer?.goals > 0 ? (
                <div>
                  <p className="font-semibold text-foreground text-sm">{topPlayers.topScorer.name}</p>
                  <Badge className="bg-primary/20 text-primary text-xs mt-1">{topPlayers.topScorer.goals} gols</Badge>
                </div>
              ) : <p className="text-xs text-muted-foreground">Sem dados</p>}
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">Garçom</span>
              </div>
              {topPlayers.topAssister?.assists > 0 ? (
                <div>
                  <p className="font-semibold text-foreground text-sm">{topPlayers.topAssister.name}</p>
                  <Badge className="bg-blue-400/20 text-blue-400 text-xs mt-1">{topPlayers.topAssister.assists} assist.</Badge>
                </div>
              ) : <p className="text-xs text-muted-foreground">Sem dados</p>}
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">Mais presente</span>
              </div>
              {topPlayers.mostGames?.matches > 0 ? (
                <div>
                  <p className="font-semibold text-foreground text-sm">{topPlayers.mostGames.name}</p>
                  <Badge className="bg-accent/20 text-accent text-xs mt-1">{topPlayers.mostGames.matches} jogos</Badge>
                </div>
              ) : <p className="text-xs text-muted-foreground">Sem dados</p>}
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">Mais cartões</span>
              </div>
              {topPlayers.mostCards && (topPlayers.mostCards.yellow_cards + topPlayers.mostCards.red_cards) > 0 ? (
                <div>
                  <p className="font-semibold text-foreground text-sm">{topPlayers.mostCards.name}</p>
                  <Badge className="bg-warning/20 text-warning text-xs mt-1">
                    {topPlayers.mostCards.yellow_cards > 0 && `${topPlayers.mostCards.yellow_cards}🟨 `}
                    {topPlayers.mostCards.red_cards > 0 && `${topPlayers.mostCards.red_cards}🟥`}
                  </Badge>
                </div>
              ) : <p className="text-xs text-muted-foreground">Sem dados</p>}
            </div>
          </div>
        </div>

        {/* Top Expenses */}
        {filteredExpenses.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-5">
            <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-destructive" /> Maiores Despesas
            </h2>
            <div className="space-y-2">
              {[...filteredExpenses].sort((a: any, b: any) => Number(b.amount) - Number(a.amount)).slice(0, 5).map((exp: any) => (
                <div key={exp.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                  <span className="text-sm text-foreground">{exp.category}{exp.description ? ` · ${exp.description}` : ""}</span>
                  <span className="font-display font-bold text-destructive text-sm">R$ {Number(exp.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-3 flex-wrap">
          <Button onClick={handleExportPdf} size="lg" variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Gerar Relatório PDF
          </Button>
          <Button onClick={handleShareReport} size="lg" className="gap-2">
            <Share2 className="w-4 h-4" /> Compartilhar via WhatsApp
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
