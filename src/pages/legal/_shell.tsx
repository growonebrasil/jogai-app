import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function LegalPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-5 sm:p-8">
          {children}
        </div>
        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground mt-6">
          <Link to="/legal/termos" className="hover:text-primary">Termos</Link>
          <span>·</span>
          <Link to="/legal/privacidade" className="hover:text-primary">Privacidade</Link>
          <span>·</span>
          <Link to="/legal/cookies" className="hover:text-primary">Cookies</Link>
        </div>
      </div>
    </div>
  );
}
