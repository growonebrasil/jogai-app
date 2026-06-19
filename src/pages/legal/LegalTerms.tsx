import { LegalMarkdown } from "@/components/legal/LegalMarkdown";
import { TERMS_MD } from "@/content/legal/terms";
import { LegalPageShell } from "./_shell";

export default function LegalTerms() {
  return (
    <LegalPageShell>
      <LegalMarkdown source={TERMS_MD} />
    </LegalPageShell>
  );
}
