import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageBackground } from "@/components/PageBackground";
import { PeladaCard } from "@/components/PeladaCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Loader2, Copy, MapPin, Calendar, Clock, Users, Lock, Globe, Mail, LogOut, CheckCircle, Trash2 } from "lucide-react";
import { useMyPeladas, useSearchPeladas, usePendingInvites, useJoinPelada, useRequestJoinPelada, useLeavePelada, useDeletePelada, type Pelada } from "@/hooks/usePeladas";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import bgPeladas from "@/assets/bg-peladas.jpg";

function getPeladaStatus(pelada: { scheduled_date: string; is_active: boolean }): "scheduled" | "live" | "finished" {
  if (!pelada.is_active) return "finished";
  const today = new Date().toISOString().split("T")[0];
  if (pelada.scheduled_date === today) return "live";
  if (pelada.scheduled_date < today) return "finished";
  return "scheduled";
}

function SearchResultCard({ pelada, onJoin, onRequest, joining }: {
  pelada: Pelada;
  onJoin: (id: string) => void;
  onRequest: (id: string) => void;
  joining: boolean;
}) {
  const formattedDate = format(new Date(pelada.scheduled_date + "T12:00:00"), "dd/MM");
  const isPublic = pelada.pelada_type === "publica";

  return (
    <div className="gaming-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-bold text-foreground truncate">{pelada.name}</h3>
            <Badge variant="outline" className={isPublic ? "border-success/40 text-success text-[10px]" : "border-warning/40 text-warning text-[10px]"}>
              {isPublic ? <><Globe className="w-3 h-3" /> Pública</> : <><Lock className="w-3 h-3" /> Privada</>}
            </Badge>
          </div>
          {pelada.match_id_code && (
            <p className="text-xs text-primary font-mono font-bold mb-1">{pelada.match_id_code}</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(pelada.neighborhood || pelada.city) && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {[pelada.neighborhood, pelada.city].filter(Boolean).join(", ")}</span>
            )}
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formattedDate}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {pelada.scheduled_time.slice(0, 5)}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {pelada.max_players || 20} vagas</span>
          </div>
        </div>
        <Button
          size="sm"
          variant={isPublic ? "default" : "outline"}
          onClick={() => isPublic ? onJoin(pelada.id) : onRequest(pelada.id)}
          disabled={joining}
          className={isPublic ? "glow-primary shrink-0" : "shrink-0"}
        >
          {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : isPublic ? "Entrar" : "Solicitar"}
        </Button>
      </div>
    </div>
  );
}

function InviteCard({ pelada, onAccept, onDecline, isAccepting = false, isDeclining = false }: {
  pelada: Pelada;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}) {
  const formattedDate = format(new Date(pelada.scheduled_date + "T12:00:00"), "dd/MM");
  return (
    <div className="gaming-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-foreground truncate">{pelada.name}</h3>
          {pelada.match_id_code && (
            <p className="text-xs text-primary font-mono font-bold">{pelada.match_id_code}</p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {pelada.location_name || pelada.location}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formattedDate}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {pelada.scheduled_time.slice(0, 5)}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={onDecline} disabled={isAccepting || isDeclining}>
            {isDeclining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Recusar"}
          </Button>
          <Button size="sm" onClick={onAccept} disabled={isAccepting || isDeclining}>
            {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aceitar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Peladas() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [mainTab, setMainTab] = useState("minhas");
  const [subTab, setSubTab] = useState("all");
  const [discoverySearch, setDiscoverySearch] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterNeighborhood, setFilterNeighborhood] = useState("");
  const [filterDay, setFilterDay] = useState<number | null>(null);
  const [inviteAction, setInviteAction] = useState<{ peladaId: string; type: "accept" | "decline" } | null>(null);
  const [encerradaDialog, setEncerradaDialog] = useState<{ peladaName: string; nextPeladaMsg: string } | null>(null);

  useEffect(() => {
    const state = location.state as any;
    if (state?.peladaEncerrada) {
      setEncerradaDialog({
        peladaName: state.peladaName || "Pelada",
        nextPeladaMsg: state.nextPeladaMsg || "",
      });
      // Clear state so it doesn't show again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state]);
  
  const { data: peladas, isLoading } = useMyPeladas();
  const { data: profile } = useProfile();
  const { data: searchResults, isLoading: searching } = useSearchPeladas({
    search: discoverySearch,
    city: filterCity || undefined,
    neighborhood: filterNeighborhood || undefined,
    dayOfWeek: filterDay,
  });
  const { data: invites, isLoading: invitesLoading } = usePendingInvites();
  const joinPelada = useJoinPelada();
  const requestJoin = useRequestJoinPelada();
  const leavePelada = useLeavePelada();
  const deletePelada = useDeletePelada();

  const isPresidente = profile?.user_role === "presidente";

  const peladasWithStatus = (peladas || []).map((p) => ({
    ...p,
    status: getPeladaStatus(p),
    formattedDate: format(new Date(p.scheduled_date + "T12:00:00"), "dd/MM"),
    formattedTime: p.scheduled_time.slice(0, 5),
  }));

  const filtered = peladasWithStatus.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase()) ||
      (p.match_id_code || "").toLowerCase().includes(search.toLowerCase());
    if (subTab === "all") return matchesSearch;
    return matchesSearch && p.status === subTab;
  });

  // Filter search results to exclude peladas user is already member of
  const myPeladaIds = new Set((peladas || []).map(p => p.id));
  const filteredSearchResults = (searchResults || []).filter(p => !myPeladaIds.has(p.id));

  const removeInviteFromCache = (peladaId: string) => {
    if (!user?.id) return;

    queryClient.setQueryData<Pelada[]>(["pendingInvites", user.id], (currentInvites) => {
      if (!currentInvites) return [];
      return currentInvites.filter((invite) => invite.id !== peladaId);
    });
  };

  const handleAcceptInvite = async (peladaId: string) => {
    if (!user?.id) {
      toast.error("Você precisa estar logado para aceitar convites.");
      return;
    }

    setInviteAction({ peladaId, type: "accept" });

    try {
      const { data, error } = await supabase
        .from("pelada_members")
        .update({ status: "confirmado" })
        .eq("pelada_id", peladaId)
        .eq("user_id", user.id)
        .eq("status", "pendente")
        .select()
;

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Nenhum convite pendente foi encontrado.");

      removeInviteFromCache(peladaId);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pendingInvites", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["myPeladas", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] }),
      ]);

      toast.success("Convite aceito!");
      navigate(`/peladas/${peladaId}`);
    } catch (err: any) {
      toast.error("Erro ao aceitar convite: " + err.message);
    } finally {
      setInviteAction(null);
    }
  };

  const handleDeclineInvite = async (peladaId: string) => {
    if (!user?.id) {
      toast.error("Você precisa estar logado para recusar convites.");
      return;
    }

    setInviteAction({ peladaId, type: "decline" });

    try {
      const { error } = await supabase
        .from("pelada_members")
        .delete()
        .eq("pelada_id", peladaId)
        .eq("user_id", user.id)
        .eq("status", "pendente");

      if (error) throw error;

      removeInviteFromCache(peladaId);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pendingInvites", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["myPeladas", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] }),
      ]);

      toast.success("Convite recusado");
    } catch (err: any) {
      toast.error("Erro ao recusar convite: " + err.message);
    } finally {
      setInviteAction(null);
    }
  };

  return (
    <AppLayout>
      {/* Pelada Encerrada Confirmation Dialog */}
      <AlertDialog open={!!encerradaDialog} onOpenChange={(open) => !open && setEncerradaDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-primary">
              <CheckCircle className="w-6 h-6 text-primary" />
              Pelada encerrada com sucesso!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-2">
              <span className="block">
                A pelada <strong className="text-foreground">{encerradaDialog?.peladaName}</strong> foi encerrada. A votação pós-partida está aberta por 24h.
              </span>
              {encerradaDialog?.nextPeladaMsg && (
                <span className="block font-semibold text-foreground">{encerradaDialog.nextPeladaMsg}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setEncerradaDialog(null)} className="glow-primary">
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PageBackground image={bgPeladas} overlay="heavy">
        <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Peladas</h1>
              <p className="text-muted-foreground mt-1">Gerencie e descubra partidas</p>
            </div>
            {isPresidente && (
              <Button onClick={() => navigate("/peladas/nova")} className="w-full md:w-auto glow-primary">
                <Plus className="w-4 h-4" />
                Nova Pelada
              </Button>
            )}
          </div>

          {/* Main Tabs */}
          <Tabs value={mainTab} onValueChange={setMainTab}>
            <TabsList className="w-full grid grid-cols-3 bg-card/80 backdrop-blur-sm border border-border">
              <TabsTrigger value="minhas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Minhas Peladas
              </TabsTrigger>
              <TabsTrigger value="buscar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Search className="w-3.5 h-3.5 mr-1" /> Buscar
              </TabsTrigger>
              <TabsTrigger value="convites" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
                <Mail className="w-3.5 h-3.5 mr-1" /> Convites
                {invites && invites.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-bold">
                    {invites.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* MINHAS PELADAS */}
            <TabsContent value="minhas" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar nas minhas peladas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-12 bg-card/80 backdrop-blur-sm border-border"
                />
              </div>

              <Tabs value={subTab} onValueChange={setSubTab}>
                <TabsList className="w-full md:w-auto grid grid-cols-4 bg-card/60 border border-border">
                  <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Todas</TabsTrigger>
                  <TabsTrigger value="scheduled" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Agendadas</TabsTrigger>
                  <TabsTrigger value="live" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground text-xs">Ao Vivo</TabsTrigger>
                  <TabsTrigger value="finished" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">Finalizadas</TabsTrigger>
                </TabsList>

                <TabsContent value={subTab} className="mt-4">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-12 glass-card">
                      <p className="text-muted-foreground mb-4">Nenhuma pelada encontrada</p>
                      {isPresidente && (
                        <Button onClick={() => navigate("/peladas/nova")} variant="outline">
                          <Plus className="w-4 h-4 mr-2" /> Criar primeira pelada
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {filtered.map((pelada) => {
                        const isCreator = pelada.created_by === user?.id;
                        return (
                          <div key={pelada.id} className="flex flex-col">
                            <PeladaCard
                              id={pelada.id}
                              name={pelada.name}
                              location={pelada.location}
                              date={pelada.formattedDate}
                              time={pelada.formattedTime}
                              confirmedPlayers={0}
                              totalPlayers={pelada.max_players || 20}
                              status={pelada.status}
                              onClick={() => navigate(`/peladas/${pelada.id}`)}
                            />
                            <div className="flex justify-end px-2 mt-1">
                              {!isCreator && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <LogOut className="w-3 h-3" /> Sair
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Tem certeza que deseja sair desta pelada?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Você será removido da lista de participantes de "{pelada.name}". Pagamentos pendentes serão removidos, mas o histórico será mantido.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => leavePelada.mutate(pelada.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Sair da pelada
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              {isCreator && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="w-3 h-3" /> Excluir
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-destructive">
                                        Tem certeza que deseja excluir esta pelada?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Essa ação não pode ser desfeita. Todos os participantes, partidas, dados financeiros e histórico serão removidos permanentemente.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deletePelada.mutate(pelada.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Excluir pelada permanentemente
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* BUSCAR PELADAS */}
            <TabsContent value="buscar" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, ID (ex: JG-12345), bairro ou cidade..."
                  value={discoverySearch}
                  onChange={(e) => setDiscoverySearch(e.target.value)}
                  className="pl-10 h-12 bg-card/80 backdrop-blur-sm border-border"
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Input
                  placeholder="Cidade"
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="h-9 bg-card/80 border-border text-sm"
                />
                <Input
                  placeholder="Bairro"
                  value={filterNeighborhood}
                  onChange={(e) => setFilterNeighborhood(e.target.value)}
                  className="h-9 bg-card/80 border-border text-sm"
                />
                <select
                  value={filterDay ?? ""}
                  onChange={(e) => setFilterDay(e.target.value === "" ? null : Number(e.target.value))}
                  className="h-9 rounded-md border border-border bg-card/80 px-2 text-sm text-foreground"
                >
                  <option value="">Dia da semana</option>
                  <option value="0">Domingo</option>
                  <option value="1">Segunda</option>
                  <option value="2">Terça</option>
                  <option value="3">Quarta</option>
                  <option value="4">Quinta</option>
                  <option value="5">Sexta</option>
                  <option value="6">Sábado</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => { setFilterCity(""); setFilterNeighborhood(""); setFilterDay(null); setDiscoverySearch(""); }}
                >
                  Limpar filtros
                </Button>
              </div>

              {!discoverySearch && !filterCity && !filterNeighborhood && filterDay === null ? (
                <div className="text-center py-12 glass-card">
                  <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Use os filtros ou busque pelo nome, ID, bairro ou cidade</p>
                </div>
              ) : searching ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredSearchResults.length === 0 ? (
                <div className="text-center py-12 glass-card">
                  <p className="text-muted-foreground">Nenhuma pelada encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{filteredSearchResults.length} pelada(s) encontrada(s)</p>
                  {filteredSearchResults.map((pelada) => (
                    <SearchResultCard
                      key={pelada.id}
                      pelada={pelada}
                      onJoin={(id) => joinPelada.mutate(id)}
                      onRequest={(id) => requestJoin.mutate(id)}
                      joining={joinPelada.isPending || requestJoin.isPending}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* CONVITES */}
            <TabsContent value="convites" className="mt-4 space-y-4">
              {invitesLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : !invites || invites.length === 0 ? (
                <div className="text-center py-12 glass-card">
                  <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhum convite pendente</p>
                  <p className="text-xs text-muted-foreground mt-1">Quando um presidente te convidar para uma pelada, aparecerá aqui</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{invites.length} convite(s) pendente(s)</p>
                  {invites.map((pelada) => (
                    <InviteCard
                      key={pelada.id}
                      pelada={pelada}
                      onAccept={() => handleAcceptInvite(pelada.id)}
                      onDecline={() => handleDeclineInvite(pelada.id)}
                      isAccepting={inviteAction?.peladaId === pelada.id && inviteAction.type === "accept"}
                      isDeclining={inviteAction?.peladaId === pelada.id && inviteAction.type === "decline"}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </PageBackground>
    </AppLayout>
  );
}
