import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageBackground } from "@/components/PageBackground";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { Bell, Check, CheckCheck, Loader2, UserPlus, DollarSign, AlertTriangle, Clock, Trophy, Users, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import bgDashboard from "@/assets/bg-dashboard.jpg";

const typeIcons: Record<string, typeof Bell> = {
  new_follower: UserPlus,
  payment_created: DollarSign,
  payment_due_soon: Clock,
  payment_overdue: AlertTriangle,
  match_started: Trophy,
  partida_started: Trophy,
  draw_started: Trophy,
  attendance_request: Users,
  pelada_created: Shield,
  voting_open: Star,
};

type Category = "all" | "pelada" | "partida" | "social" | "cobranca" | "privacidade";

const categoryLabels: Record<Category, string> = {
  all: "Tudo",
  pelada: "Peladas",
  partida: "Partidas",
  social: "Social",
  cobranca: "Cobrança",
  privacidade: "Privacidade",
};

export default function Notificacoes() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const [tab, setTab] = useState<Category>("all");

  const handleOpen = (notif: any) => {
    if (!notif.is_read) markAsRead.mutate(notif.id);
    const link = notif.link as string | null | undefined;
    if (link) {
      navigate(link);
    }
  };

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const filtered = useMemo(() => {
    if (!notifications) return [];
    if (tab === "all") return notifications;
    return notifications.filter((n) => (n as any).category === tab);
  }, [notifications, tab]);

  const countsByCat = useMemo(() => {
    const c: Record<string, number> = {};
    (notifications || []).forEach((n) => {
      const cat = (n as any).category || "social";
      if (!n.is_read) c[cat] = (c[cat] || 0) + 1;
    });
    return c;
  }, [notifications]);

  return (
    <AppLayout>
      <PageBackground image={bgDashboard} overlay="heavy">
        <div className="space-y-6 max-w-2xl mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Notificações</h1>
              <p className="text-muted-foreground mt-1">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Tudo em dia"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Marcar todas
              </Button>
            )}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as Category)} className="w-full">
            <TabsList className="w-full overflow-x-auto flex justify-start gap-1 h-auto p-1 bg-card/50 backdrop-blur">
              {(Object.keys(categoryLabels) as Category[]).map((c) => (
                <TabsTrigger key={c} value={c} className="relative data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-[0_0_12px_hsl(var(--primary)/0.4)]">
                  {categoryLabels[c]}
                  {c !== "all" && countsByCat[c] > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-primary text-primary-foreground">
                      {countsByCat[c]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={tab} className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !filtered.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground glass-card">
                  <Bell className="w-12 h-12 mb-4 opacity-50" />
                  <p>Nenhuma notificação</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((notif) => {
                    const Icon = typeIcons[notif.type] || Bell;
                    const hasLink = !!(notif as any).link;
                    return (
                      <div
                        key={notif.id}
                        role={hasLink ? "button" : undefined}
                        tabIndex={hasLink ? 0 : undefined}
                        onClick={hasLink ? () => handleOpen(notif) : undefined}
                        onKeyDown={hasLink ? (e) => { if (e.key === "Enter") handleOpen(notif); } : undefined}
                        className={cn(
                          "gaming-card flex items-start gap-3 p-4 transition-colors",
                          hasLink && "cursor-pointer hover:border-primary/60",
                          !notif.is_read && "border-primary/40 shadow-[0_0_18px_hsl(var(--primary)/0.15)]"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                          notif.is_read ? "bg-secondary" : "bg-primary/15"
                        )}>
                          <Icon className={cn("w-5 h-5", notif.is_read ? "text-muted-foreground" : "text-primary")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm", !notif.is_read && "font-medium text-foreground")}>
                            {notif.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                          {hasLink && (
                            <p className="text-[11px] text-primary mt-1 font-semibold">Toque para abrir →</p>
                          )}
                        </div>
                        {!notif.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => { e.stopPropagation(); markAsRead.mutate(notif.id); }}
                            disabled={markAsRead.isPending}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </PageBackground>
    </AppLayout>
  );
}
