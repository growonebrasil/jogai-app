import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TERMS_VERSION, PRIVACY_VERSION, COOKIES_VERSION } from "@/lib/legal";
import { getCookiePreferences, type CookiePreferences } from "@/lib/cookieConsent";

type ConsentRow = {
  terms_version: string;
  privacy_version: string;
  cookies_version: string;
  cookie_preferences: unknown;
  accepted_at: string;
};

export function useLegalConsent() {
  const { user } = useAuth();
  const [latest, setLatest] = useState<ConsentRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLatest(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("legal_consents")
      .select("terms_version,privacy_version,cookies_version,cookie_preferences,accepted_at")
      .eq("user_id", user.id)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLatest((data as ConsentRow | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const needsAcceptance = !!user && !loading && (
    !latest ||
    latest.terms_version !== TERMS_VERSION ||
    latest.privacy_version !== PRIVACY_VERSION ||
    latest.cookies_version !== COOKIES_VERSION
  );

  const recordConsent = useCallback(async (prefs?: Partial<Omit<CookiePreferences, "essential" | "decidedAt">>) => {
    if (!user) return { error: new Error("no user") };
    const stored = getCookiePreferences();
    const cookie_preferences = {
      essential: true,
      analytics: prefs?.analytics ?? stored?.analytics ?? true,
      marketing: prefs?.marketing ?? stored?.marketing ?? true,
      personalization: prefs?.personalization ?? stored?.personalization ?? true,
    };
    let ip_address: string | null = null;
    try {
      const r = await fetch("https://api.ipify.org?format=json");
      if (r.ok) ip_address = (await r.json())?.ip ?? null;
    } catch { /* best-effort */ }
    const { error } = await supabase.from("legal_consents").insert({
      user_id: user.id,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      cookies_version: COOKIES_VERSION,
      cookie_preferences,
      ip_address,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
    });
    if (!error) await refresh();
    return { error };
  }, [user, refresh]);

  return { latest, loading, needsAcceptance, recordConsent, refresh };
}
