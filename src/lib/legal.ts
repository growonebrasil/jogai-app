// Current legal document versions. Bump any of these to force users to re-accept on next login.
export const TERMS_VERSION = "1.0.0";
export const PRIVACY_VERSION = "1.0.0";
export const COOKIES_VERSION = "1.0.0";

export type LegalKind = "terms" | "privacy" | "cookies";

export const LEGAL_TITLES: Record<LegalKind, string> = {
  terms: "Termos de Uso",
  privacy: "Política de Privacidade",
  cookies: "Política de Cookies",
};
