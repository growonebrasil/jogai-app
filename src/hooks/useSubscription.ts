import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export function useSubscription() {
  const { data: profile, isLoading } = useProfile();
  const [loading, setLoading] = useState(false);

  const isPresidente = profile?.user_role === "presidente";
  const isDemo = profile?.plan_type === "demo";
  const status = (profile as any)?.subscription_status as string | undefined;
  const isPro = isDemo || profile?.plan_type === "pro";
  const isActive = isDemo || status === "active" || status === "trialing";
  const isPastDue = status === "past_due";
  const periodEnd = (profile as any)?.current_period_end as string | undefined;

  const startCheckout = async () => {
    if (!isPresidente) {
      toast.error("Apenas Presidentes podem assinar o JOGA.I PRO");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar checkout");
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message || "Erro ao abrir portal");
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    isLoading,
    isPresidente,
    isPro,
    isActive,
    isPastDue,
    isDemo,
    status,
    periodEnd,
    loading,
    startCheckout,
    openPortal,
  };
}
