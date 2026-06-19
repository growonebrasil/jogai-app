import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Require shared CRON secret for this admin-only job
  const cronSecret = Deno.env.get("CRON_SECRET");
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : req.headers.get("x-cron-secret");
  if (!cronSecret || !provided || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Get all pending payments with pelada info
  const { data: payments, error } = await supabase
    .from("pelada_payments")
    .select("id, amount, reference_month, pelada_id, pelada_member_id, status")
    .neq("status", "pago");

  if (error || !payments) {
    return new Response(JSON.stringify({ error: error?.message || "No payments" }), { status: 500 });
  }

  let notifiedDue = 0;
  let notifiedOverdue = 0;

  for (const payment of payments) {
    // Get pelada info
    const { data: pelada } = await supabase
      .from("peladas")
      .select("name, fee_due_day, created_by")
      .eq("id", payment.pelada_id)
      .single();

    if (!pelada) continue;

    const feeDueDay = pelada.fee_due_day || 10;
    const [yearStr, monthStr] = payment.reference_month.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const lastDay = new Date(year, month, 0).getDate();
    const dueDay = Math.min(feeDueDay, lastDay);
    const dueDate = new Date(year, month - 1, dueDay, 12, 0, 0);

    // Get member user_id
    const { data: member } = await supabase
      .from("pelada_members")
      .select("user_id")
      .eq("id", payment.pelada_member_id)
      .single();

    if (!member?.user_id || member.user_id === pelada.created_by) continue;

    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Check if notification already sent today for this payment
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_user_id", member.user_id)
      .in("type", ["payment_due_soon", "payment_overdue"])
      .gte("created_at", today + "T00:00:00Z")
      .lte("created_at", today + "T23:59:59Z");

    if ((count || 0) > 0) continue;

    if (diffDays <= 3 && diffDays > 0) {
      // Due soon
      await supabase.from("notifications").insert({
        recipient_user_id: member.user_id,
        actor_user_id: pelada.created_by,
        type: "payment_due_soon",
        message: `Sua mensalidade de R$ ${Number(payment.amount).toFixed(2)} na pelada ${pelada.name} vence em ${diffDays} dia(s)`,
      });
      notifiedDue++;
    } else if (diffDays <= 0) {
      // Overdue
      await supabase.from("notifications").insert({
        recipient_user_id: member.user_id,
        actor_user_id: pelada.created_by,
        type: "payment_overdue",
        message: `Sua mensalidade de R$ ${Number(payment.amount).toFixed(2)} na pelada ${pelada.name} está atrasada!`,
      });
      notifiedOverdue++;
    }
  }

  return new Response(JSON.stringify({ notifiedDue, notifiedOverdue }), {
    headers: { "Content-Type": "application/json" },
  });
});
