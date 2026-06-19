import { format } from "date-fns";

export type PaymentLike = {
  id?: string;
  amount: number | string | null;
  status: string | null;
  reference_month: string;
  paid_at?: string | null;
};

export type DerivedPaymentStatus = "pago" | "pendente" | "inadimplente";

function toAmount(value: number | string | null | undefined) {
  return Number(value || 0);
}

function normalizeReferenceMonth(referenceMonth: string | null | undefined) {
  if (!referenceMonth) return null;
  return referenceMonth.split("T")[0];
}

function sortByReferenceMonth(payments: PaymentLike[]) {
  return [...payments].sort((a, b) => {
    const left = normalizeReferenceMonth(a.reference_month) || "";
    const right = normalizeReferenceMonth(b.reference_month) || "";
    return left.localeCompare(right);
  });
}

export function getPaymentDueDate(referenceMonth: string | null | undefined, feeDueDay: number | null) {
  const normalized = normalizeReferenceMonth(referenceMonth);
  if (!normalized) return null;

  const [yearRaw, monthRaw] = normalized.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!year || !month) return null;

  const desiredDay = Math.max(1, feeDueDay || 10);
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const dueDay = Math.min(desiredDay, lastDayOfMonth);

  return new Date(year, month - 1, dueDay, 12, 0, 0);
}

export function formatPaymentDueDate(referenceMonth: string | null | undefined, feeDueDay: number | null) {
  const dueDate = getPaymentDueDate(referenceMonth, feeDueDay);
  return dueDate ? format(dueDate, "dd/MM/yyyy") : null;
}

export function getDerivedPaymentStatus(payment: PaymentLike, feeDueDay: number | null, now = new Date()): DerivedPaymentStatus {
  if (payment.status === "pago") return "pago";

  const dueDate = getPaymentDueDate(payment.reference_month, feeDueDay);
  if (dueDate && now.getTime() > dueDate.getTime()) {
    return "inadimplente";
  }

  return "pendente";
}

export function getFinancialStatus(payments: PaymentLike[], feeDueDay: number | null, now = new Date()) {
  if (!payments || payments.length === 0) {
    return { status: "sem_cobranca" as const, label: "Sem cobrança", payment: null };
  }

  const sorted = sortByReferenceMonth(payments);
  const unpaid = sorted.filter((payment) => payment.status !== "pago");

  if (unpaid.length === 0) {
    const latestPaid = sorted[sorted.length - 1];
    return {
      status: "pago" as const,
      label: "Pago",
      amount: toAmount(latestPaid.amount),
      dueDate: formatPaymentDueDate(latestPaid.reference_month, feeDueDay) || undefined,
      payment: latestPaid,
    };
  }

  const oldestOutstanding = unpaid[0];
  const derivedStatus = getDerivedPaymentStatus(oldestOutstanding, feeDueDay, now);

  return {
    status: derivedStatus,
    label: derivedStatus === "inadimplente" ? "Inadimplente" : "Pendente",
    amount: unpaid.reduce((sum, payment) => sum + toAmount(payment.amount), 0),
    dueDate: formatPaymentDueDate(oldestOutstanding.reference_month, feeDueDay) || undefined,
    payment: oldestOutstanding,
  };
}

export function getPaymentDashboardMetrics(payments: PaymentLike[], feeDueDay: number | null, now = new Date()) {
  return payments.reduce(
    (acc, payment) => {
      const amount = toAmount(payment.amount);
      const derivedStatus = getDerivedPaymentStatus(payment, feeDueDay, now);

      acc.totalGenerated += amount;

      if (payment.status === "pago") {
        acc.totalReceived += amount;
        acc.paidCount += 1;
      } else {
        acc.totalReceivable += amount;

        if (derivedStatus === "inadimplente") {
          acc.overdueCount += 1;
        } else {
          acc.pendingCount += 1;
        }
      }

      return acc;
    },
    {
      totalGenerated: 0,
      totalReceived: 0,
      totalReceivable: 0,
      paidCount: 0,
      pendingCount: 0,
      overdueCount: 0,
    }
  );
}