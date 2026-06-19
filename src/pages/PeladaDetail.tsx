import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar, MapPin, Clock, Users, Share2, CheckCircle, XCircle,
  HelpCircle, MessageCircle, Loader2, ArrowLeft, UserPlus, Send,
  Pencil, Save, X, Repeat, Shuffle, Copy, Hash, Trophy, Star, Shield, LogOut, Trash2, Play, Square, AlertTriangle,
} from "lucide-react";
import { InvitePlayerModal } from "@/components/InvitePlayerModal";
import { TeamDrawModal, GeneratedTeam } from "@/components/TeamDrawModal";
// MatchManagement is used via LivePeladaScreen
import { LivePeladaScreen } from "@/components/match/LivePeladaScreen";
import { PostMatchVoting } from "@/components/match/PostMatchVoting";
import { MatchSummary } from "@/components/match/MatchSummary";
import { MatchReport } from "@/components/match/MatchReport";
import { PostMatchStatEditor } from "@/components/match/PostMatchStatEditor";
import { VotingStatusTracker } from "@/components/match/VotingStatusTracker";
import { CancelOccurrenceDialog } from "@/components/match/CancelOccurrenceDialog";
import { CentralDaPelada } from "@/components/match/CentralDaPelada";
import { PeladaActionBar } from "@/components/pelada/PeladaActionBar";
import { PeladaDashboard } from "@/components/pelada/PeladaDashboard";
import { PeladaCountsBar } from "@/components/pelada/PeladaCountsBar";
import { PeladaTimeline } from "@/components/pelada/PeladaTimeline";
import { PeladaPlayerTable } from "@/components/pelada/PeladaPlayerTable";
import { PlayerFinancialBadge, MyPaymentStatus, useAllMemberPayments } from "@/components/PlayerFinancialStatus";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePeladaDetail, usePeladaMembers, useJoinPelada,
  useUpdateAttendance, useUpdatePelada, useLeavePelada, useDeletePelada,
} from "@/hooks/usePeladas";
import { useActiveMatch, useFinishedMatches, useHasVoted, useAllPeladaMatches } from "@/hooks/useMatchManagement";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LocationInput, type LocationData } from "@/components/LocationInput";
import { RecurrenceSelector, recurrenceLabel, type RecurrenceData } from "@/components/RecurrenceSelector";
import { usePeladaPixKey } from "@/hooks/usePeladaPixKey";
import { useCurrentOccurrence } from "@/hooks/useOccurrences";

function usePeladaMessages(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["peladaMessages", peladaId],
    queryFn: async () => {
      if (!peladaId) return [];
      const { data, error } = await supabase
        .from("pelada_messages").select("*").eq("pelada_id", peladaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const userIds = [...new Set(data.map((m) => m.user_id))];
      let names: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles").select("user_id, name").in("user_id", userIds);
        profiles?.forEach((p) => (names[p.user_id] = p.name));
      }
      return data.map((m) => ({ ...m, authorName: names[m.user_id] || "Jogador" }));
    },
    enabled: !!peladaId,
    refetchInterval: 5000,
  });
}

export default function PeladaDetail() {
  const { peladaId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userProfile } = useProfile();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("central");
  const [chatMessage, setChatMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [drawnTeams, setDrawnTeams] = useState<GeneratedTeam[] | null>(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [livePeladaMode, setLivePeladaMode] = useState(false);
  const [cancelOccurrenceOpen, setCancelOccurrenceOpen] = useState(false);

  const { data: pelada, isLoading: peladaLoading } = usePeladaDetail(peladaId);
  const { data: peladaPixKey } = usePeladaPixKey(peladaId);
  const { data: members, isLoading: membersLoading } = usePeladaMembers(peladaId);
  const { data: messages } = usePeladaMessages(peladaId);
  const { data: activeMatch } = useActiveMatch(peladaId);
  const { data: finishedMatches } = useFinishedMatches(peladaId);
  const { data: allMatches } = useAllPeladaMatches(peladaId);
  const { data: allMemberPayments } = useAllMemberPayments(peladaId);
  const latestFinished = finishedMatches?.[0];
  const votingMatch = finishedMatches?.find(m => m.voting_open);
  const { data: hasVoted } = useHasVoted(votingMatch?.id || latestFinished?.id, user?.id);
  const joinPelada = useJoinPelada();
  const updateAttendance = useUpdateAttendance();
  const updatePelada = useUpdatePelada();
  const leavePelada = useLeavePelada();
  const deletePelada = useDeletePelada();

  // Edit form state
  const [editForm, setEditForm] = useState<any>(null);
  const [editLocation, setEditLocation] = useState<LocationData>({ location_name: "", full_address: "", latitude: null, longitude: null });
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceData>({ recurrence_type: "none", recurrence_day_of_week: null, recurrence_interval: 1, recurrence_enabled: false });

  const isLoading = peladaLoading || membersLoading;
  const myMembership = members?.find((m) => m.user_id === user?.id);
  const isPending = myMembership?.status === "pendente";
  const isMember = !!myMembership && !isPending;
  const isAdmin = isMember && myMembership?.role === "admin";
  const confirmedCount = members?.filter((m) => m.status === "confirmado").length || 0;
  const totalNeeded = pelada?.max_players || 20;

  // All members available for draw (regardless of status)
  const allMembersCount = members?.length || 0;

  // All players available for draw (any member)
  const drawPlayers = (members || [])
    .filter((m) => (m.user_id || m.guest_name) && m.status === "confirmado")
    .map((m) => ({
      id: m.id,
      user_id: m.user_id,
      name: m.profile?.name || m.guest_name || "Jogador",
      position: m.profile?.position || m.guest_position || "MEI",
      overall: m.overall || 50,
    }));

  const isVotingOpen = finishedMatches?.some(m => m.voting_open);
  const isBetweenMatches = !activeMatch && finishedMatches && finishedMatches.length > 0 && !isVotingOpen;
  const showVoting = !!isVotingOpen;
  const showSummary = !!latestFinished;

  // Auto-enter live pelada mode when pelada is_live OR active match OR between-matches
  // Modo Ação só é ativado explicitamente via INICIAR ou se a pelada já está marcada como ao vivo (refresh durante pelada).
  const shouldShowLiveScreen = livePeladaMode || (pelada as any)?.is_live === true;

  // Auto-abre sorteio ao entrar no Modo Ação sem partida e sem times sorteados
  useEffect(() => {
    if (shouldShowLiveScreen && isAdmin && !activeMatch && !drawnTeams && !drawOpen) {
      setDrawOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowLiveScreen, activeMatch?.id, drawnTeams]);

  const handleTeamsGenerated = (teams: GeneratedTeam[]) => {
    setDrawnTeams(teams);
    setLivePeladaMode(true);
  };

  const isPro = userProfile?.plan_type === "pro" || userProfile?.plan_type === "demo";

  const startEdit = () => {
    if (!pelada) return;
    setEditForm({
      name: pelada.name,
      description: pelada.description || "",
      scheduled_date: pelada.scheduled_date,
      scheduled_time: pelada.scheduled_time,
      pelada_type: pelada.pelada_type,
      max_players: String(pelada.max_players || 20),
      is_paid: (pelada as any).is_paid || false,
      fee_amount: String((pelada as any).fee_amount || ""),
      fee_due_day: String((pelada as any).fee_due_day || ""),
      pix_key: peladaPixKey || "",
    });
    setEditLocation({
      location_name: pelada.location_name || pelada.location || "",
      full_address: pelada.full_address || "",
      latitude: pelada.latitude || null,
      longitude: pelada.longitude || null,
    });
    setEditRecurrence({
      recurrence_type: (pelada.recurrence_type as any) || "none",
      recurrence_day_of_week: pelada.recurrence_day_of_week ?? null,
      recurrence_interval: pelada.recurrence_interval || 1,
      recurrence_enabled: pelada.recurrence_enabled || false,
    });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setEditForm(null); };

  const saveEdit = () => {
    if (!peladaId || !editForm) return;
    if (!editForm.name.trim()) { toast.error("Nome obrigatório"); return; }
    if (!editLocation.location_name.trim()) { toast.error("Local obrigatório"); return; }
    if (!editForm.scheduled_date) { toast.error("Data obrigatória"); return; }
    if (!editForm.scheduled_time) { toast.error("Horário obrigatório"); return; }

    const updateData: any = {
      id: peladaId,
      name: editForm.name.trim(),
      location: editLocation.location_name.trim(),
      location_name: editLocation.location_name.trim(),
      full_address: editLocation.full_address.trim() || undefined,
      latitude: editLocation.latitude ?? undefined,
      longitude: editLocation.longitude ?? undefined,
      description: editForm.description.trim() || undefined,
      scheduled_date: editForm.scheduled_date,
      scheduled_time: editForm.scheduled_time,
      pelada_type: editForm.pelada_type,
      max_players: parseInt(editForm.max_players) || 20,
      recurrence_type: editRecurrence.recurrence_type,
      recurrence_day_of_week: editRecurrence.recurrence_day_of_week ?? undefined,
      recurrence_interval: editRecurrence.recurrence_interval,
      recurrence_enabled: editRecurrence.recurrence_enabled,
    };
    if (isPro) {
      updateData.is_paid = editForm.is_paid || false;
      updateData.fee_amount = editForm.fee_amount ? parseFloat(editForm.fee_amount) : null;
      updateData.fee_due_day = editForm.fee_due_day ? parseInt(editForm.fee_due_day) : null;
      updateData.pix_key = editForm.pix_key?.trim() || null;
    }
    updatePelada.mutate(updateData, { onSuccess: () => setEditing(false) });
  };

  const handleShare = () => {
    if (!pelada) return;
    const formattedDate = format(new Date(pelada.scheduled_date + "T12:00:00"), "dd/MM/yyyy");
    const loc = pelada.location_name || pelada.location;
    const matchCode = (pelada as any).match_id_code ? `\n🆔 ID: ${(pelada as any).match_id_code}` : "";
    const message = encodeURIComponent(
      `⚽ *${pelada.name}*${matchCode}\n\n📅 ${formattedDate} às ${pelada.scheduled_time.slice(0, 5)}\n📍 ${loc}\n\nConfirme sua presença!`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const handleJoin = () => { if (peladaId) joinPelada.mutate(peladaId); };
  const handleStatusChange = (status: "confirmado" | "talvez" | "nao_vou") => {
    if (peladaId) updateAttendance.mutate({ peladaId, status });
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !peladaId || !user) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.from("pelada_messages").insert({
        pelada_id: peladaId, user_id: user.id, message: chatMessage.trim(),
      });
      if (error) throw error;
      setChatMessage("");
      queryClient.invalidateQueries({ queryKey: ["peladaMessages", peladaId] });
    } catch {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSendingMessage(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!pelada) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Pelada não encontrada</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/peladas")}>Voltar</Button>
        </div>
      </AppLayout>
    );
  }

  // Block access for pending members (invite not yet accepted)
  if (isPending && pelada?.pelada_type === "privada") {
    return (
      <AppLayout>
        <div className="text-center py-12 max-w-md mx-auto space-y-4">
          <Clock className="w-12 h-12 text-warning mx-auto" />
          <h2 className="font-display text-xl font-bold text-foreground">Convite pendente</h2>
          <p className="text-muted-foreground">Você recebeu um convite para esta pelada. Aceite o convite na aba "Convites" para ter acesso.</p>
          <Button variant="outline" onClick={() => navigate("/peladas")}>
            <ArrowLeft className="w-4 h-4" /> Voltar para Peladas
          </Button>
        </div>
      </AppLayout>
    );
  }

  const formattedDate = format(new Date(pelada.scheduled_date + "T12:00:00"), "dd/MM/yyyy");
  const recLabel = recurrenceLabel({
    recurrence_type: (pelada.recurrence_type as any) || "none",
    recurrence_day_of_week: pelada.recurrence_day_of_week ?? null,
    recurrence_interval: pelada.recurrence_interval || 1,
    recurrence_enabled: pelada.recurrence_enabled || false,
  });

  const statusConfig: Record<string, { label: string; className: string }> = {
    confirmado: { label: "Confirmado", className: "bg-success/20 text-success" },
    talvez: { label: "Talvez", className: "bg-warning/20 text-warning" },
    nao_vou: { label: "Não vou", className: "bg-destructive/20 text-destructive" },
    pendente: { label: "Pendente", className: "bg-muted text-muted-foreground" },
  };

  const isFull = confirmedCount >= totalNeeded;
  const hasActiveMatch = !!activeMatch;

  // LIVE PELADA SCREEN — Full-screen match management mode
  if (shouldShowLiveScreen && !isVotingOpen) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto">
          <LivePeladaScreen
            peladaId={peladaId!}
            matchId={activeMatch?.id || null}
            initialTeams={drawnTeams || undefined}
            isAdmin={isAdmin}
            members={members || []}
            peladaName={pelada.name}
            peladaData={pelada}
            onExit={() => {
              setLivePeladaMode(false);
              setDrawnTeams(null);
            }}
            onResort={() => {
              setDrawnTeams(null);
              setDrawOpen(true);
            }}
            onClose={() => {
              setDrawnTeams(null);
              setLivePeladaMode(false);
            }}
          />
        </div>

        <TeamDrawModal
          open={drawOpen}
          onOpenChange={setDrawOpen}
          players={drawPlayers}
          onTeamsGenerated={handleTeamsGenerated}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* Barra de ações administrativas — INICIAR é o botão principal */}
        {!editing && isAdmin && (
          <PeladaActionBar
            pelada={pelada}
            peladaId={peladaId!}
            isAdmin={isAdmin}
            members={members || []}
            userId={user?.id}
            onEdit={startEdit}
            onAddPlayer={() => setInviteOpen(true)}
            onShareWhatsApp={handleShare}
            onStartLive={() => setLivePeladaMode(true)}
          />
        )}

        {/* Header / Edit mode */}
        <div className="bg-gradient-card rounded-xl border border-border p-5 md:p-6">
          {editing && editForm ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-foreground">Editar Pelada</h2>
                <Button variant="ghost" size="icon" onClick={cancelEdit}><X className="w-5 h-5" /></Button>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-secondary/50 border-border" maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Local *</Label>
                <LocationInput value={editLocation} onChange={setEditLocation} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input type="date" value={editForm.scheduled_date} onChange={(e) => setEditForm({ ...editForm, scheduled_date: e.target.value })} className="bg-secondary/50 border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Horário *</Label>
                  <Input type="time" value={editForm.scheduled_time} onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })} className="bg-secondary/50 border-border" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input value={editForm.pelada_type === "publica" ? "Pública" : "Privada"} disabled className="bg-secondary/50 border-border" />
                </div>
                <div className="space-y-2">
                  <Label>Máx. jogadores</Label>
                  <Input type="number" min={2} max={50} value={editForm.max_players} onChange={(e) => setEditForm({ ...editForm, max_players: e.target.value })} className="bg-secondary/50 border-border" />
                </div>
              </div>
              <RecurrenceSelector value={editRecurrence} onChange={setEditRecurrence} />
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="bg-secondary/50 border-border min-h-[80px]" maxLength={1000} placeholder="Regras, informações sobre mensalidade, horários..." />
              </div>
              {isPro && (
                <div className="border-t border-border pt-4 space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-1">💰 Configuração Financeira (PRO)</Label>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Pelada com cobrança</Label>
                    <Switch checked={editForm.is_paid || false} onCheckedChange={(v) => setEditForm({ ...editForm, is_paid: v })} />
                  </div>
                  {editForm.is_paid && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Mensalidade (R$)</Label>
                        <Input type="number" min="0" step="0.01" value={editForm.fee_amount || ""} onChange={(e) => setEditForm({ ...editForm, fee_amount: e.target.value })} className="bg-secondary/50 border-border" placeholder="100.00" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Dia vencimento</Label>
                        <Input type="number" min="1" max="28" value={editForm.fee_due_day || ""} onChange={(e) => setEditForm({ ...editForm, fee_due_day: e.target.value })} className="bg-secondary/50 border-border" placeholder="9" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Chave PIX</Label>
                        <Input value={editForm.pix_key || ""} onChange={(e) => setEditForm({ ...editForm, pix_key: e.target.value })} className="bg-secondary/50 border-border" placeholder="CPF, e-mail, telefone..." />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={cancelEdit}>Cancelar</Button>
                <Button className="flex-1" onClick={saveEdit} disabled={updatePelada.isPending}>
                  {updatePelada.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar</>}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/peladas")}><ArrowLeft className="w-5 h-5" /></Button>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{pelada.name}</h1>
                    <Badge className="bg-secondary text-secondary-foreground capitalize">{pelada.pelada_type}</Badge>
                  </div>
                  {(pelada as any).match_id_code && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono font-bold text-primary flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5" />
                        {(pelada as any).match_id_code}
                      </span>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => { navigator.clipboard.writeText((pelada as any).match_id_code); toast.success("ID copiado!"); }}
                      >
                        <Copy className="w-3 h-3" /> Copiar ID
                      </Button>
                    </div>
                  )}
                  {pelada.description && <p className="text-sm text-muted-foreground mb-2">{pelada.description}</p>}
                  <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {pelada.location_name || pelada.location}</span>
                    {((pelada as any).neighborhood || (pelada as any).city) && (
                      <span className="flex items-center gap-1.5 text-accent">
                        {[(pelada as any).neighborhood, (pelada as any).city].filter(Boolean).join(", ")}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {formattedDate}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {pelada.scheduled_time.slice(0, 5)}</span>
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-primary" />
                      <span className={`font-semibold ${isFull ? "text-destructive" : "text-primary"}`}>{confirmedCount}</span>/{totalNeeded}
                      {isFull && <span className="text-xs text-destructive ml-1">LOTADO</span>}
                    </span>
                  </div>
                  {recLabel && (
                    <div className="flex items-center gap-1.5 text-sm text-accent mt-2">
                      <Repeat className="w-4 h-4" /> {recLabel}
                    </div>
                  )}
                  {pelada.full_address && pelada.full_address !== (pelada.location_name || pelada.location) && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {pelada.full_address}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {isAdmin && !activeMatch && !latestFinished && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={() => setCancelOccurrenceOpen(true)}
                  >
                    <X className="w-4 h-4" /> Pelada não aconteceu
                  </Button>
                )}

                {!isMember && (
                  <Button size="sm" onClick={handleJoin} disabled={joinPelada.isPending || isFull}>
                    {joinPelada.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {isFull ? "Lotado" : "Participar"}
                  </Button>
                )}
                {/* Leave pelada — non-president members */}
                {isMember && !isAdmin && pelada.created_by !== user?.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                        <LogOut className="w-4 h-4" /> Sair da pelada
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza que deseja sair desta pelada?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Você será removido da lista de participantes. Pagamentos pendentes serão removidos, mas o histórico será mantido.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => { leavePelada.mutate(peladaId!); navigate("/peladas"); }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sair da pelada
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {/* Admin (non-creator) leaving — loses admin role */}
                {isMember && isAdmin && pelada.created_by !== user?.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                        <LogOut className="w-4 h-4" /> Sair da pelada
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deseja sair desta pelada?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Você perderá seu papel de administrador e será removido da lista de participantes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => { leavePelada.mutate(peladaId!); navigate("/peladas"); }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Sair da pelada
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                {/* Delete pelada — president only */}
                {pelada.created_by === user?.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" /> Excluir pelada
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-destructive">
                          Tem certeza que deseja excluir esta pelada?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Essa ação não pode ser desfeita. Todos os participantes, partidas, dados financeiros e histórico serão removidos permanentemente. As estatísticas globais dos jogadores serão mantidas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => { deletePelada.mutate(peladaId!); navigate("/peladas"); }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir pelada permanentemente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {isMember && (
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant={myMembership?.status === "confirmado" ? "default" : "outline"} onClick={() => handleStatusChange("confirmado")} disabled={updateAttendance.isPending}>
                    <CheckCircle className="w-4 h-4" /> Vou
                  </Button>
                  <Button size="sm" variant={myMembership?.status === "talvez" ? "default" : "outline"} onClick={() => handleStatusChange("talvez")} disabled={updateAttendance.isPending}
                    className={myMembership?.status === "talvez" ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""}>
                    <HelpCircle className="w-4 h-4" /> Talvez
                  </Button>
                  <Button size="sm" variant={myMembership?.status === "nao_vou" ? "destructive" : "outline"} onClick={() => handleStatusChange("nao_vou")} disabled={updateAttendance.isPending}>
                    <XCircle className="w-4 h-4" /> Não vou
                  </Button>
                </div>
              )}

              {/* Player-side payment status */}
              {isMember && myMembership && (pelada as any).is_paid && (
                <div className="mt-3">
                  <MyPaymentStatus
                    peladaId={peladaId!}
                    memberId={myMembership.id}
                    feeDueDay={(pelada as any).fee_due_day || null}
                    pixKey={peladaPixKey ?? null}
                  />
                </div>
              )}
              <div className="mt-4">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.min((confirmedCount / totalNeeded) * 100, 100)}%` }} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`w-full grid bg-card border border-border ${
            showSummary ? "grid-cols-6" : "grid-cols-5"
          }`}>
            <TabsTrigger value="central" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">📋 Central</TabsTrigger>
            <TabsTrigger value="presenca" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">👥 Presença</TabsTrigger>
            <TabsTrigger value="estatisticas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">📈 Estatísticas</TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">🕒 Histórico</TabsTrigger>
            {showSummary && (
              <TabsTrigger value="resumo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
                🏆 Resumo
              </TabsTrigger>
            )}
            <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">💬 Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="estatisticas" className="mt-4 space-y-4">
            <CentralDaPelada peladaId={peladaId!} />
          </TabsContent>


          <TabsContent value="timeline" className="mt-4 space-y-4">
            <PeladaTimeline peladaId={peladaId!} />
          </TabsContent>


          <TabsContent value="presenca" className="mt-4 space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Lista de Presença ({members?.length || 0})</h2>
            {!members || members.length === 0 ? (
              <div className="text-center py-8 bg-card rounded-xl border border-border">
                <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum participante ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => {
                  const name = member.profile?.name || member.guest_name || "Convidado";
                  const position = member.profile?.position || member.guest_position || "—";
                  const st = statusConfig[member.status] || statusConfig.pendente;
                  const isCreator = pelada?.created_by === member.user_id;
                  const isMemberAdmin = member.role === "admin";
                  const isPresident = pelada?.created_by === user?.id;
                  const currentAdminCount = members.filter((m) => m.role === "admin" && m.user_id !== pelada?.created_by).length;
                  const canPromote = isPresident && !isCreator && member.user_id && member.user_id !== user?.id && currentAdminCount < 2;
                  const canDemote = isPresident && !isCreator && isMemberAdmin && member.user_id !== user?.id;

                  const toggleAdmin = async () => {
                    if (!member.id) return;
                    const newRole = isMemberAdmin ? "player" : "admin";
                    const { error } = await supabase
                      .from("pelada_members")
                      .update({ role: newRole as any })
                      .eq("id", member.id);
                    if (error) { toast.error("Erro ao alterar função"); return; }
                    queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] });
                    toast.success(newRole === "admin" ? `${name} agora é administrador` : `${name} removido como administrador`);
                  };

                  return (
                    <div key={member.id} className="flex items-center justify-between bg-card rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                          {member.profile?.avatar_url ? (
                            <img src={member.profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">{name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground text-sm">{name}</p>
                            {isCreator && (
                              <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0">Presidente</Badge>
                            )}
                            {isMemberAdmin && !isCreator && (
                              <Badge className="bg-accent/20 text-accent text-[10px] px-1.5 py-0">Admin</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{position}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isPresident && !isCreator && member.user_id && member.user_id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={toggleAdmin}
                            disabled={!isMemberAdmin && !canPromote}
                            title={isMemberAdmin ? "Remover admin" : currentAdminCount >= 2 ? "Máximo de 2 admins" : "Tornar admin"}
                          >
                            <Shield className={`w-3.5 h-3.5 ${isMemberAdmin ? "text-accent" : "text-muted-foreground"}`} />
                          </Button>
                        )}
                        <span className="text-xs font-bold text-primary">{member.overall}</span>
                        {(pelada as any).is_paid && isAdmin && allMemberPayments && (
                          <PlayerFinancialBadge
                            payments={(allMemberPayments || []).filter((p: any) => p.pelada_member_id === member.id)}
                            feeDueDay={(pelada as any).fee_due_day || null}
                            isAdmin={isAdmin}
                            memberId={member.id}
                            peladaId={peladaId!}
                          />
                        )}
                        <Badge className={st.className + " text-xs"}>{st.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {showSummary && latestFinished && peladaId && (
            <TabsContent value="resumo" className="mt-4 space-y-4">
              {showVoting && <VotingStatusTracker peladaId={peladaId} isAdmin={isAdmin} />}
              {isAdmin && latestFinished.voting_open && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-accent" />
                    <p className="text-sm font-medium text-foreground">Correção de estatísticas</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Como presidente/admin, você pode corrigir gols, assistências e cartões mesmo após o encerramento.
                  </p>
                  <PostMatchStatEditor matchId={latestFinished.id} members={members || []} />
                </div>
              )}
              <MatchSummary matchId={latestFinished.id} members={members || []} peladaId={peladaId} votingFinalized={latestFinished.voting_finalized} />
              <MatchReport matchId={latestFinished.id} peladaName={pelada.name} peladaDate={formattedDate} members={members || []} peladaId={peladaId} votingFinalized={latestFinished.voting_finalized} />
              {showVoting && votingMatch && isMember && myMembership && (
                hasVoted ? (
                  <div className="bg-success/5 border border-success/20 rounded-xl p-4 text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-success mx-auto" />
                    <p className="text-sm font-medium text-foreground">Você já votou nesta pelada</p>
                    <p className="text-xs text-muted-foreground">Aguarde o fim da votação para ver o resumo completo.</p>
                  </div>
                ) : (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center space-y-3">
                    <Star className="w-8 h-8 text-primary mx-auto" />
                    <p className="text-sm font-medium text-foreground">A votação pós-partida está aberta!</p>
                    <p className="text-xs text-muted-foreground">
                      Avalie os jogadores e vote nos destaques da pelada.
                      {votingMatch?.voting_deadline && (
                        <> Encerra em: {new Date(votingMatch.voting_deadline).toLocaleString("pt-BR")}</>
                      )}
                    </p>
                    <Button onClick={() => setVotingOpen(true)} className="glow-primary">
                      <Star className="w-4 h-4" /> Votar Agora
                    </Button>
                  </div>
                )
              )}
            </TabsContent>
          )}

          <TabsContent value="central" className="mt-4 space-y-4">
            {/* Compact status counters before INICIAR */}
            <PeladaCountsBar members={members || []} />

            {/* Step-by-step Command Center */}
            {/* Mini-dashboard do presidente */}
            <PeladaDashboard peladaId={peladaId!} members={members || []} pelada={pelada} isAdmin={isAdmin} />

            {/* Tabela completa de jogadores */}
            <PeladaPlayerTable peladaId={peladaId!} members={members || []} pelada={pelada} />

            {/* Quick confirmed players overview */}
            {isAdmin && (
              <div className="gaming-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> Confirmados ({confirmedCount}/{totalNeeded})
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setInviteOpen(true)}>
                      <UserPlus className="w-3.5 h-3.5" /> Adicionar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setActiveTab("presenca")}>
                      Ver todos
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(members || []).filter((m: any) => m.status === "confirmado").slice(0, 14).map((m: any) => {
                    const name = m.profile?.name || m.guest_name || "Jogador";
                    const avatarUrl = m.profile?.avatar_url;
                    return (
                      <div key={m.id} className="flex items-center gap-1.5 bg-secondary/50 rounded-full px-2 py-1" title={`${name} · OVR ${m.overall || 50}`}>
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] font-bold text-muted-foreground">{name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-foreground truncate max-w-[55px]">{name.split(" ")[0]}</span>
                        <span className="text-[9px] font-bold text-primary">{m.overall || 50}</span>
                      </div>
                    );
                  })}
                  {confirmedCount > 14 && (
                    <span className="text-xs text-muted-foreground self-center">+{confirmedCount - 14}</span>
                  )}
                </div>
                {confirmedCount < 2 && (
                  <p className="text-xs text-warning">⚠️ Confirme pelo menos 2 jogadores para sortear times.</p>
                )}
              </div>
            )}

          </TabsContent>


          <TabsContent value="chat" className="mt-4">
            {!isMember ? (
              <div className="bg-card rounded-xl border border-border p-5 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Participe da pelada para acessar o chat</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border flex flex-col h-[400px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {!messages || messages.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">Nenhuma mensagem ainda. Comece a conversa!</p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.user_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isMe ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                            {!isMe && <p className="text-xs font-bold mb-0.5 opacity-80">{msg.authorName}</p>}
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-border p-3 flex gap-2">
                  <Input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Mensagem..." className="bg-secondary/50 border-border" maxLength={500}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} />
                  <Button size="icon" onClick={handleSendMessage} disabled={sendingMessage || !chatMessage.trim()}>
                    {sendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {isAdmin && pelada && (
        <InvitePlayerModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          peladaId={pelada.id}
          peladaName={pelada.name}
          peladaDate={pelada.scheduled_date}
          peladaTime={pelada.scheduled_time}
          peladaLocation={pelada.location_name || pelada.location}
          existingMemberIds={members?.filter((m) => m.user_id).map((m) => m.user_id as string) || []}
        />
      )}

      <TeamDrawModal
        open={drawOpen}
        onOpenChange={setDrawOpen}
        players={drawPlayers}
        onTeamsGenerated={handleTeamsGenerated}
      />

      {showVoting && votingMatch && myMembership && user && (
        <PostMatchVoting
          open={votingOpen}
          onOpenChange={setVotingOpen}
          matchId={votingMatch.id}
          voterId={user.id}
          myMemberId={myMembership.id}
          players={(members || [])
            .filter((m) => m.user_id || m.guest_name)
            .map((m) => ({
              memberId: m.id,
              name: m.profile?.name || m.guest_name || "Jogador",
              position: m.profile?.position || m.guest_position || "MEI",
              overall: m.overall || 50,
            }))}
        />
      )}

      {isAdmin && peladaId && (
        <CancelOccurrenceDialog
          open={cancelOccurrenceOpen}
          onOpenChange={setCancelOccurrenceOpen}
          peladaId={peladaId}
          date={new Date().toISOString().split("T")[0]}
        />
      )}
    </AppLayout>
  );
}
