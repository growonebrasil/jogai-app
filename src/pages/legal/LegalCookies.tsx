import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { COOKIES_MD } from "@/content/legal/cookies";
import { LegalPageShell } from "./_shell";

export default function LegalCookies() {
  return (
    <LegalPageShell>
      <LegalMarkdown source={COOKIES_MD} />
    </LegalPageShell>
  );
}
