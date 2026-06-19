import { Home, Users, Trophy, Wallet, BarChart3, UserCircle, HelpCircle, LogOut, Bell, Lock, MessageSquare, Camera, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useUnreadCount } from "@/hooks/useNotifications";
import { toast } from "sonner";

const menuItems = [
  { title: "Início", url: "/home", icon: Home },
  { title: "Perfil", url: "/perfil", icon: UserCircle },
  { title: "Fuwitter", url: "/fuwitter", icon: MessageSquare },
  { title: "Futgram", url: "/futgram", icon: Camera },
  { title: "Minhas Peladas", url: "/peladas", icon: Trophy },
  { title: "Jogadores", url: "/jogadores", icon: Users },
  { title: "Notificações", url: "/notificacoes", icon: Bell, badge: true },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, pro: true },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, pro: true },
];

const bottomItems = [
  { title: "Privacidade e dados", url: "/configuracoes/privacidade", icon: ShieldAlert },
  { title: "Ajuda", url: "/ajuda", icon: HelpCircle },
];


export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: unreadCount } = useUnreadCount();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const hasPro = profile?.plan_type === "pro" || profile?.plan_type === "demo";

  const handleLogout = async () => {
    await signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <Logo size={isCollapsed ? "sm" : "md"} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      activeClassName="bg-primary/10 text-primary border border-primary/20"
                    >
                      <div className="relative shrink-0">
                        <item.icon className="w-5 h-5" />
                        {(item as any).badge && !!unreadCount && unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && (
                        <span className="font-medium flex-1 flex items-center gap-2">
                          {item.title}
                          {(item as any).pro && !hasPro && (
                            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          {(item as any).pro && hasPro && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-accent text-accent">PRO</Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-4 bg-border" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      activeClassName="bg-primary/10 text-primary border border-primary/20"
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!isCollapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border/40 bg-background">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 min-h-11 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
