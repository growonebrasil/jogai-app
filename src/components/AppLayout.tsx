import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Logo } from "@/components/Logo";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="h-12 flex items-center justify-between px-4 border-b border-border/30 bg-card/40 backdrop-blur-xl sticky top-0 z-40"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}
          >
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <Logo size="sm" className="absolute left-1/2 -translate-x-1/2" />
            <div className="w-8" />
          </header>
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
