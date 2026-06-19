export type CookiePreferences = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  decidedAt: string;
};

const KEY = "joga_cookie_prefs_v1";

export function getCookiePreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.decidedAt) return null;
    return { ...parsed, essential: true } as CookiePreferences;
  } catch {
    return null;
  }
}

export function saveCookiePreferences(p: Omit<CookiePreferences, "essential" | "decidedAt">) {
  const value: CookiePreferences = {
    essential: true,
    analytics: !!p.analytics,
    marketing: !!p.marketing,
    personalization: !!p.personalization,
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("joga:cookie-prefs-changed", { detail: value }));
  return value;
}

export function acceptAllCookies() {
  return saveCookiePreferences({ analytics: true, marketing: true, personalization: true });
}

export function rejectNonEssentialCookies() {
  return saveCookiePreferences({ analytics: false, marketing: false, personalization: false });
}
