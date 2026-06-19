import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, UserPlus, CheckCircle, Share2, Users, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { useFollowedPlayers } from "@/hooks/useFollowedPlayers";
import { useSearchPlayers } from "@/hooks/useSearchPlayers";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InvitePlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peladaId: string;
  peladaName: string;
  peladaDate: string;
  peladaTime: string;
  peladaLocation: string;
  existingMemberIds: string[];
}

interface SearchResult {
  id: string;
  user_id: string;
  name: string;
  username: string | null;
  position: string;
  avatar_url: string | null;
}

export function InvitePlayerModal({
  open,
  onOpenChange,
  peladaId,
  peladaName,
  peladaDate,
  peladaTime,
  peladaLocation,
  existingMemberIds,
}: InvitePlayerModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [inviting, setInviting] = useState<string | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [guestName, setGuestName] = useState("");
  const [guestPosition, setGuestPosition] = useState("MEI");
  const [addingGuest, setAddingGuest] = useState(false);
  const { data: followedPlayers } = useFollowedPlayers();
  const { data: allPlayers, isLoading: loadingPlayers } = useSearchPlayers(search, positionFilter);

  const filteredFollowed = (followedPlayers || []).filter(
    (p) => !existingMemberIds.includes(p.user_id) && p.user_id !== user?.id
  );

  // Filter out self from results
  const displayPlayers = (allPlayers || []).filter((p) => p.user_id !== user?.id);

  const handleInvite = async (player: SearchResult) => {
    if (!user || inviting) return;
    if (player.user_id === user.id) {
      toast.error("Você já é o administrador desta pelada");
      return;
    }
    if (existingMemberIds.includes(player.user_id)) {
      toast.error("Jogador já está na pelada");
      return;
    }
    if (invited.has(player.user_id)) {
      toast.error("Convite já enviado");
      return;
    }

    setInviting(player.user_id);
    try {
      // Add as pelada member with pendente status
      const { error: memberError } = await supabase.from("pelada_members").insert({
        pelada_id: peladaId,
        user_id: player.user_id,
        role: "player",
        status: "pendente",
      });
      if (memberError) {
        if (memberError.code === "23505") {
          toast.error("Jogador já está na pelada");
        } else {
          throw memberError;
        }
        return;
      }

      // Send notification
      await supabase.from("notifications").insert({
        recipient_user_id: player.user_id,
        actor_user_id: user.id,
        type: "pelada_invite",
        message: `Você foi convidado para a pelada "${peladaName}"`,
      });

      setInvited((prev) => new Set(prev).add(player.user_id));
      queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] });
      toast.success(`Convite enviado para ${player.name}!`);
    } catch (err: any) {
      toast.error("Erro ao convidar: " + err.message);
    } finally {
      setInviting(null);
    }
  };

  const handleAddGuest = async () => {
    if (!guestName.trim()) {
      toast.error("Nome do convidado é obrigatório");
      return;
    }
    setAddingGuest(true);
    try {
      const { error } = await supabase.from("pelada_members").insert({
        pelada_id: peladaId,
        guest_name: guestName.trim(),
        guest_position: guestPosition as any,
        role: "guest",
        status: "pendente",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] });
      toast.success(`${guestName.trim()} adicionado como convidado!`);
      setGuestName("");
    } catch (err: any) {
      toast.error("Erro ao adicionar convidado: " + err.message);
    } finally {
      setAddingGuest(false);
    }
  };

  const handleWhatsApp = () => {
    const formattedDate = format(new Date(peladaDate + "T12:00:00"), "dd/MM/yyyy");
    const msg = encodeURIComponent(
      `⚽ *${peladaName}*\n\n📅 ${formattedDate} às ${peladaTime.slice(0, 5)}\n📍 ${peladaLocation}\n\nVem jogar! Confirme sua presença no JOGAI!`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const isAlreadyMember = (userId: string) => existingMemberIds.includes(userId);
  const isAlreadyInvited = (userId: string) => invited.has(userId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar Jogador</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="buscar">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="buscar">Buscar</TabsTrigger>
            <TabsTrigger value="convidado">Convidado</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="buscar" className="space-y-3 mt-3">
            {/* Search + Position Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou @username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="all">Todas</option>
                <option value="GOL">GOL</option>
                <option value="ZAG">ZAG</option>
                <option value="LAT">LAT</option>
                <option value="VOL">VOL</option>
                <option value="MEI">MEI</option>
                <option value="ATA">ATA</option>
              </select>
            </div>

            {/* Followed players section (only when no search/filter active) */}
            {!search.trim() && positionFilter === "all" && filteredFollowed.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> Jogadores que você segue
                </p>
                {filteredFollowed.map((player) => {
                  const invitedAlready = isAlreadyInvited(player.user_id);
                  return (
                    <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {player.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{player.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {player.username ? `@${player.username} · ` : ""}{player.position}
                        </p>
                      </div>
                      {invitedAlready ? (
                        <span className="text-xs text-primary flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Convidado</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          disabled={inviting === player.user_id}
                          onClick={() => handleInvite({ ...player, user_id: player.user_id } as SearchResult)}
                        >
                          {inviting === player.user_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><UserPlus className="w-4 h-4" /> Convidar</>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
                <div className="border-t border-border" />
              </div>
            )}

            {/* All players list */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-2">
                {loadingPlayers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : displayPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum jogador encontrado</p>
                ) : (
                  displayPlayers.map((player) => {
                    const member = isAlreadyMember(player.user_id);
                    const invitedAlready = isAlreadyInvited(player.user_id);
                    return (
                      <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={player.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {player.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{player.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {player.username ? `@${player.username} · ` : ""}{player.position}
                          </p>
                        </div>
                        {member ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Na pelada</span>
                        ) : invitedAlready ? (
                          <span className="text-xs text-primary flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Convidado</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            disabled={inviting === player.user_id}
                            onClick={() => handleInvite(player)}
                          >
                            {inviting === player.user_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <><UserPlus className="w-4 h-4" /> Convidar</>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="convidado" className="space-y-3 mt-3">
            <p className="text-sm text-muted-foreground">
              Adicione alguém que não tem conta no app como convidado.
            </p>
            <Input
              placeholder="Nome do convidado"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />
            <select
              value={guestPosition}
              onChange={(e) => setGuestPosition(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm"
            >
              <option value="GOL">Goleiro</option>
              <option value="ZAG">Zagueiro</option>
              <option value="LAT">Lateral</option>
              <option value="VOL">Volante</option>
              <option value="MEI">Meia</option>
              <option value="ATA">Atacante</option>
            </select>
            <Button className="w-full" onClick={handleAddGuest} disabled={addingGuest || !guestName.trim()}>
              {addingGuest ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Adicionar Convidado
            </Button>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-3 mt-3">
            <p className="text-sm text-muted-foreground">
              Compartilhe o convite da pelada pelo WhatsApp.
            </p>
            <Button className="w-full" onClick={handleWhatsApp}>
              <Share2 className="w-4 h-4" /> Enviar pelo WhatsApp
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
