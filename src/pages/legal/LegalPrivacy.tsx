import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { PRIVACY_MD } from "@/content/legal/privacy";
import { LegalPageShell } from "./_shell";

export default function LegalPrivacy() {
  return (
    <LegalPageShell>
      <LegalMarkdown source={PRIVACY_MD} />
    </LegalPageShell>
  );
}
