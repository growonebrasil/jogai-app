import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Wallet, TrendingUp, TrendingDown, Plus, Users, DollarSign, Loader2,
  CheckCircle, Clock, AlertTriangle, Trash2, Calendar, ArrowLeft,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { useMyPaidPeladas, usePeladaExpenses, usePeladaIncome, usePeladaPayments, useAddExpense, useAddIncome, useDeleteExpense, useDeleteIncome, useUpdatePaymentStatus, useCreatePaymentEntries } from "@/hooks/useFinanceiro";
import { usePeladaMembers } from "@/hooks/usePeladas";
import { usePeladaPixKey } from "@/hooks/usePeladaPixKey";
import { format } from "date-fns";
import { formatPaymentDueDate, getDerivedPaymentStatus, getPaymentDashboardMetrics } from "@/lib/paymentStatus";

const EXPENSE_CATEGORIES = [
  "Aluguel de campo", "Bolas", "Coletes", "Árbitro", "Goleiro",
  "Churrasco", "Pelada", "Outros",
];
const INCOME_CATEGORIES = [
  "Mensalidade", "Diária", "Contribuição extra", "Pelada", "Outros",
];

function AddExpenseDialog({ peladaId }: { peladaId: string }) {
  const addExpense = useAddExpense();
  const [form, setForm] = useState({ category: "", amount: "", description: "", expense_date: format(new Date(), "yyyy-MM-dd") });
  const [open, setOpen] = useState(false);
  const handleSubmit = () => {
    if (!form.category || !form.amount) return;
    addExpense.mutate({ pelada_id: peladaId, category: form.category, amount: parseFloat(form.amount), description: form.description || undefined, expense_date: form.expense_date }, {
      onSuccess: () => { setOpen(false); setForm({ category: "", amount: "", description: "", expense_date: format(new Date(), "yyyy-MM-dd") }); },
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="text-destructive border-destructive/30"><Plus className="w-4 h-4" /> Despesa</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Despesa</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Categoria *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Valor (R$) *</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Data</Label><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></div>
          <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={addExpense.isPending || !form.category || !form.amount}>
            {addExpense.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddIncomeDialog({ peladaId }: { peladaId: string }) {
  const addIncome = useAddIncome();
  const [form, setForm] = useState({ category: "", amount: "", description: "", income_date: format(new Date(), "yyyy-MM-dd") });
  const [open, setOpen] = useState(false);
  const handleSubmit = () => {
    if (!form.category || !form.amount) return;
    addIncome.mutate({ pelada_id: peladaId, category: form.category, amount: parseFloat(form.amount), description: form.description || undefined, income_date: form.income_date }, {
      onSuccess: () => { setOpen(false); setForm({ category: "", amount: "", description: "", income_date: format(new Date(), "yyyy-MM-dd") }); },
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" className="text-primary border-primary/30"><Plus className="w-4 h-4" /> Receita</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Receita</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Categoria *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{INCOME_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Valor (R$) *</Label><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Data</Label><Input type="date" value={form.income_date} onChange={(e) => setForm({ ...form, income_date: e.target.value })} /></div>
          <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Opcional" /></div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={addIncome.isPending || !form.category || !form.amount}>
            {addIncome.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -6; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = format(d, "MMMM yyyy").replace(/^\w/, c => c.toUpperCase());
    options.push({ value, label });
  }
  return options;
}

export default function Financeiro() {
  const { data: peladas, isLoading: peladasLoading } = useMyPaidPeladas();
  const [selectedPeladaId, setSelectedPeladaId] = useState<string | null>(null);
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [filterMonth, setFilterMonth] = useState<string>("todos");
  const [generateMonth, setGenerateMonth] = useState<string>(currentMonthKey);
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const activePeladaId = selectedPeladaId || peladas?.[0]?.id || null;
  const selectedPelada = peladas?.find((p: any) => p.id === activePeladaId);

  const { data: expenses, isLoading: expLoading } = usePeladaExpenses(activePeladaId || undefined);
  const { data: income, isLoading: incLoading } = usePeladaIncome(activePeladaId || undefined);
  const { data: payments, isLoading: payLoading } = usePeladaPayments(activePeladaId || undefined);
  const { data: members } = usePeladaMembers(activePeladaId || undefined);
  const { data: pixKey } = usePeladaPixKey(activePeladaId);
  const updatePayment = useUpdatePaymentStatus();
  const deleteExpense = useDeleteExpense();
  const deleteIncome = useDeleteIncome();
  const createPayments = useCreatePaymentEntries();

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (filterMonth === "todos") return payments;
    return payments.filter((p: any) => {
      const ref = (p.reference_month || "").split("T")[0];
      return ref.startsWith(filterMonth);
    });
  }, [payments, filterMonth]);

  const totalExpenses = useMemo(() => (expenses || []).reduce((s: number, e: any) => s + Number(e.amount), 0), [expenses]);
  const manualIncome = useMemo(() => (income || []).reduce((s: number, i: any) => s + Number(i.amount), 0), [income]);
  const confirmedPaymentsIncome = useMemo(() => (payments || []).filter((p: any) => p.status === "pago").reduce((s: number, p: any) => s + Number(p.amount), 0), [payments]);
  const totalIncome = manualIncome + confirmedPaymentsIncome;
  const balance = totalIncome - totalExpenses;
  const feeDueDay = Number((selectedPelada as any)?.fee_due_day) || null;
  const paymentMetrics = useMemo(
    () => getPaymentDashboardMetrics(filteredPayments || [], feeDueDay),
    [feeDueDay, filteredPayments]
  );

  const isLoading = peladasLoading;

  const handleGeneratePayments = () => {
    if (!activePeladaId || !selectedPelada || !members) return;
    const feeAmount = Number((selectedPelada as any).fee_amount) || 0;
    if (feeAmount <= 0) { return; }
    const memberIds = members.filter((m: any) => m.user_id).map((m: any) => m.id);
    const refMonth = `${generateMonth}-01`;
    createPayments.mutate({ peladaId: activePeladaId, memberIds, amount: feeAmount, referenceMonth: refMonth });
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
          <h1 className="font-display text-3xl font-bold text-foreground">Financeiro</h1>
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Você não administra nenhuma pelada ainda.</p>
            <p className="text-sm text-muted-foreground mt-1">Crie uma pelada para gerenciar as finanças.</p>
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
            <h1 className="font-display text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground mt-1">Gerencie pagamentos e despesas da pelada</p>
          </div>
          {peladas.length > 1 && (
            <Select value={activePeladaId || ""} onValueChange={setSelectedPeladaId}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Selecione a pelada" /></SelectTrigger>
              <SelectContent>
                {peladas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Pelada name */}
        {selectedPelada && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="font-display text-lg font-bold text-foreground">{(selectedPelada as any).name}</h2>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              {(selectedPelada as any).fee_amount && (
                <span className="flex items-center gap-1"><DollarSign className="w-4 h-4 text-primary" /> Mensalidade: R$ {Number((selectedPelada as any).fee_amount).toFixed(2)}</span>
              )}
              {(selectedPelada as any).fee_due_day && (
                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Vencimento: dia {(selectedPelada as any).fee_due_day}</span>
              )}
              {pixKey && (
                <span className="flex items-center gap-1">PIX: {pixKey}</span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Saldo Atual" value={`R$ ${balance.toFixed(2)}`} icon={Wallet} variant={balance >= 0 ? "primary" : "destructive"} />
          <StatCard title="Receitas" value={`R$ ${totalIncome.toFixed(2)}`} icon={TrendingUp} variant="gold" />
          <StatCard title="Despesas" value={`R$ ${totalExpenses.toFixed(2)}`} icon={TrendingDown} variant="destructive" />
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard title="Total gerado" value={`R$ ${paymentMetrics.totalGenerated.toFixed(2)}`} icon={DollarSign} variant="gold" />
          <StatCard title="Total recebido" value={`R$ ${paymentMetrics.totalReceived.toFixed(2)}`} icon={CheckCircle} variant="primary" />
          <StatCard title="A receber" value={`R$ ${paymentMetrics.totalReceivable.toFixed(2)}`} icon={Wallet} variant={paymentMetrics.totalReceivable > 0 ? "destructive" : "default"} />
          <StatCard title="Pagos" value={paymentMetrics.paidCount} icon={CheckCircle} variant="primary" />
          <StatCard title="Pendentes" value={paymentMetrics.pendingCount} icon={Clock} variant="gold" />
          <StatCard title="Inadimplentes" value={paymentMetrics.overdueCount} icon={AlertTriangle} variant={paymentMetrics.overdueCount > 0 ? "destructive" : "default"} />
        </div>

        {/* Alerts */}
        {(paymentMetrics.overdueCount > 0 || paymentMetrics.pendingCount > 0) && (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <div className="text-sm">
              {paymentMetrics.overdueCount > 0 && <span className="font-semibold text-destructive">{paymentMetrics.overdueCount} jogador(es) inadimplente(s). </span>}
              {paymentMetrics.pendingCount > 0 && <span className="text-foreground">{paymentMetrics.pendingCount} pagamento(s) pendente(s).</span>}
            </div>
          </div>
        )}

        {/* Payments section */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Pagamentos dos Jogadores
              </h2>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {/* Month filter */}
              <div className="flex-1 min-w-[160px]">
                <Label className="text-xs text-muted-foreground mb-1 block">Filtrar por mês</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os meses</SelectItem>
                    {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Generate charges */}
              {selectedPelada && Number((selectedPelada as any).fee_amount) > 0 && (
                <div className="flex items-end gap-2">
                  <div className="min-w-[140px]">
                    <Label className="text-xs text-muted-foreground mb-1 block">Mês da cobrança</Label>
                    <Select value={generateMonth} onValueChange={setGenerateMonth}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" className="h-9" onClick={handleGeneratePayments} disabled={createPayments.isPending}>
                    {createPayments.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Gerar</>}
                  </Button>
                </div>
              )}
            </div>
          </div>
          {payLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : !filteredPayments || filteredPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {filterMonth !== "todos" ? "Nenhuma cobrança neste mês." : "Nenhuma cobrança gerada ainda."}
              {selectedPelada && Number((selectedPelada as any).fee_amount) > 0 && filterMonth === "todos" ? ' Selecione o mês e clique em "Gerar".' : ""}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredPayments.map((payment: any) => {
                const member = members?.find((m: any) => m.id === payment.pelada_member_id);
                const name = member?.profile?.name || member?.guest_name || "Jogador";
                const derivedStatus = getDerivedPaymentStatus(payment, feeDueDay);
                const dueDate = formatPaymentDueDate(payment.reference_month, feeDueDay);
                const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
                  pago: { label: "Pago", icon: CheckCircle, className: "bg-success/20 text-success border-success/30" },
                  pendente: { label: "Pendente", icon: Clock, className: "bg-warning/20 text-warning border-warning/30" },
                  inadimplente: { label: "Inadimplente", icon: AlertTriangle, className: "bg-destructive/20 text-destructive border-destructive/30" },
                };
                const st = statusConfig[derivedStatus] || statusConfig.pendente;
                const Icon = st.icon;
                return (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-bold text-foreground">{name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          Ref: {format(new Date(payment.reference_month + "T12:00:00"), "MM/yyyy")}
                          {dueDate ? ` · Venc: ${dueDate}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-foreground text-sm">R$ {Number(payment.amount).toFixed(2)}</span>
                      <Badge className={st.className + " text-xs cursor-pointer"} onClick={() => {
                        const next = payment.status === "pago" ? "pendente" : "pago";
                        updatePayment.mutate({ id: payment.id, peladaId: activePeladaId!, status: next });
                      }}>
                        <Icon className="w-3 h-3 mr-1" />{st.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expenses & Income side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expenses */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-destructive" /> Despesas
              </h2>
              {activePeladaId && <AddExpenseDialog peladaId={activePeladaId} />}
            </div>
            {expLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : !expenses || expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma despesa registrada</p>
            ) : (
              <div className="space-y-2">
                {expenses.map((exp: any) => (
                  <div key={exp.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div>
                      <p className="font-medium text-foreground text-sm">{exp.category}</p>
                      <p className="text-xs text-muted-foreground">{exp.description ? `${exp.description} · ` : ""}{format(new Date(exp.expense_date + "T12:00:00"), "dd/MM/yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-destructive text-sm">- R$ {Number(exp.amount).toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteExpense.mutate({ id: exp.id, peladaId: activePeladaId! })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Income */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Receitas
              </h2>
              {activePeladaId && <AddIncomeDialog peladaId={activePeladaId} />}
            </div>
            {incLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : !income || income.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma receita registrada</p>
            ) : (
              <div className="space-y-2">
                {income.map((inc: any) => (
                  <div key={inc.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div>
                      <p className="font-medium text-foreground text-sm">{inc.category}</p>
                      <p className="text-xs text-muted-foreground">{inc.description ? `${inc.description} · ` : ""}{format(new Date(inc.income_date + "T12:00:00"), "dd/MM/yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-primary text-sm">+ R$ {Number(inc.amount).toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteIncome.mutate({ id: inc.id, peladaId: activePeladaId! })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
