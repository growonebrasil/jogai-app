import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function useFinanceRealtimeSync(peladaId: string | undefined, table: "pelada_expenses" | "pelada_income" | "pelada_payments", keys: unknown[][]) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!peladaId) return;

    const channel = supabase
      .channel(`finance_${table}_${peladaId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table,
        filter: `pelada_id=eq.${peladaId}`,
      }, () => {
        keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [peladaId, qc, table, keys]);
}

// ── Expenses ──
export function usePeladaExpenses(peladaId: string | undefined) {
  useFinanceRealtimeSync(peladaId, "pelada_expenses", [["peladaExpenses", peladaId]]);

  return useQuery({
    queryKey: ["peladaExpenses", peladaId],
    queryFn: async () => {
      if (!peladaId) return [];
      const { data, error } = await supabase
        .from("pelada_expenses" as any)
        .select("*")
        .eq("pelada_id", peladaId)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!peladaId,
  });
}

export function useAddExpense() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pelada_id: string; category: string; amount: number; description?: string; expense_date: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("pelada_expenses" as any).insert({ ...input, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["peladaExpenses", v.pelada_id] });
      toast.success("Despesa adicionada!");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, peladaId }: { id: string; peladaId: string }) => {
      const { error } = await supabase.from("pelada_expenses" as any).delete().eq("id", id);
      if (error) throw error;
      return peladaId;
    },
    onSuccess: (peladaId) => {
      qc.invalidateQueries({ queryKey: ["peladaExpenses", peladaId] });
      toast.success("Despesa removida!");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

// ── Income ──
export function usePeladaIncome(peladaId: string | undefined) {
  useFinanceRealtimeSync(peladaId, "pelada_income", [["peladaIncome", peladaId]]);

  return useQuery({
    queryKey: ["peladaIncome", peladaId],
    queryFn: async () => {
      if (!peladaId) return [];
      const { data, error } = await supabase
        .from("pelada_income" as any)
        .select("*")
        .eq("pelada_id", peladaId)
        .order("income_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!peladaId,
  });
}

export function useAddIncome() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pelada_id: string; category: string; amount: number; description?: string; income_date: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("pelada_income" as any).insert({ ...input, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["peladaIncome", v.pelada_id] });
      toast.success("Receita adicionada!");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, peladaId }: { id: string; peladaId: string }) => {
      const { error } = await supabase.from("pelada_income" as any).delete().eq("id", id);
      if (error) throw error;
      return peladaId;
    },
    onSuccess: (peladaId) => {
      qc.invalidateQueries({ queryKey: ["peladaIncome", peladaId] });
      toast.success("Receita removida!");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

// ── Player Payments ──
export function usePeladaPayments(peladaId: string | undefined) {
  useFinanceRealtimeSync(peladaId, "pelada_payments", [
    ["peladaPayments", peladaId],
    ["allMemberPayments", peladaId],
    ["playerPayments", peladaId],
  ]);

  return useQuery({
    queryKey: ["peladaPayments", peladaId],
    queryFn: async () => {
      if (!peladaId) return [];
      const { data, error } = await supabase
        .from("pelada_payments" as any)
        .select("*")
        .eq("pelada_id", peladaId)
        .order("reference_month", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!peladaId,
  });
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, peladaId, status }: { id: string; peladaId: string; status: string }) => {
      const updates: any = { status };
      if (status === "pago") updates.paid_at = new Date().toISOString();
      else updates.paid_at = null;
      const { error } = await supabase.from("pelada_payments" as any).update(updates).eq("id", id);
      if (error) throw error;
      return peladaId;
    },
    onSuccess: (peladaId) => {
      qc.invalidateQueries({ queryKey: ["peladaPayments", peladaId] });
      qc.invalidateQueries({ queryKey: ["allMemberPayments", peladaId] });
      qc.invalidateQueries({ queryKey: ["playerPayments", peladaId] });
      toast.success("Status atualizado!");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

export function useCreatePaymentEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ peladaId, memberIds, amount, referenceMonth }: { peladaId: string; memberIds: string[]; amount: number; referenceMonth: string }) => {
      const rows = memberIds.map(mid => ({
        pelada_id: peladaId,
        pelada_member_id: mid,
        amount,
        reference_month: referenceMonth,
        status: "pendente",
      }));
      const { error } = await supabase.from("pelada_payments" as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["peladaPayments", v.peladaId] });
      qc.invalidateQueries({ queryKey: ["allMemberPayments", v.peladaId] });
      qc.invalidateQueries({ queryKey: ["playerPayments", v.peladaId] });
      toast.success("Cobranças geradas!");
    },
    onError: (e: any) => {
      if (e.message?.includes("duplicate") || e.message?.includes("unique")) {
        toast.error("Cobranças já existem para este mês");
      } else {
        toast.error("Erro: " + e.message);
      }
    },
  });
}

// ── My peladas (for financial overview) ──
export function useMyPaidPeladas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["myPaidPeladas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Get peladas I admin that are paid
      const { data: memberships } = await supabase
        .from("pelada_members")
        .select("pelada_id")
        .eq("user_id", user.id)
        .eq("role", "admin");
      if (!memberships || memberships.length === 0) return [];
      const ids = memberships.map(m => m.pelada_id);
      const { data, error } = await supabase
        .from("peladas")
        .select("*")
        .in("id", ids)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user,
  });
}
