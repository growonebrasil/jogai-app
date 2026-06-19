import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Loader2, Search, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSearchPlayers } from "@/hooks/useSearchPlayers";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddPlayerMidMatchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peladaId: string;
  matchId: string;
  existingMemberIds: string[];
  onPlayerAdded: (memberId: string, name: string) => void;
}

export function AddPlayerMidMatch({
  open, onOpenChange, peladaId, matchId, existingMemberIds, onPlayerAdded,
}: AddPlayerMidMatchProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPosition, setGuestPosition] = useState("MEI");
  const [adding, setAdding] = useState<string | null>(null);
  const { data: allPlayers, isLoading } = useSearchPlayers(search, "all");

  const displayPlayers = (allPlayers || []).filter(p => p.user_id !== user?.id);

  const handleAddExisting = async (player: { user_id: string; name: string }) => {
    if (adding) return;
    if (existingMemberIds.includes(player.user_id)) {
      toast.error("Jogador já está na pelada");
      return;
    }
    setAdding(player.user_id);
    try {
      // Add as pelada member
      const { data: member, error: memberError } = await supabase.from("pelada_members").insert({
        pelada_id: peladaId,
        user_id: player.user_id,
        role: "player" as any,
        status: "confirmado" as any,
      }).select().single();
      if (memberError) {
        if (memberError.code === "23505") {
          toast.error("Jogador já está na pelada");
        } else throw memberError;
        return;
      }
      // Add to match_teams as "De Fora"
      await supabase.from("match_teams").insert({
        match_id: matchId,
        pelada_member_id: member.id,
        team: "De Fora",
      });
      queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["matchTeams", matchId] });
      onPlayerAdded(member.id, player.name);
      toast.success(`${player.name} adicionado ao De Fora!`);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setAdding(null);
    }
  };

  const handleAddGuest = async () => {
    if (!guestName.trim()) { toast.error("Nome obrigatório"); return; }
    setAdding("guest");
    try {
      const { data: member, error } = await supabase.from("pelada_members").insert({
        pelada_id: peladaId,
        guest_name: guestName.trim(),
        guest_position: guestPosition as any,
        role: "guest" as any,
        status: "confirmado" as any,
      }).select().single();
      if (error) throw error;
      await supabase.from("match_teams").insert({
        match_id: matchId,
        pelada_member_id: member.id,
        team: "De Fora",
      });
      queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["matchTeams", matchId] });
      onPlayerAdded(member.id, guestName.trim());
      toast.success(`${guestName.trim()} adicionado ao De Fora!`);
      setGuestName("");
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Adicionar Jogador
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">O jogador será adicionado ao grupo "De Fora" e poderá ser movido para um time.</p>

        <Tabs defaultValue="convidado">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="convidado">Convidado</TabsTrigger>
            <TabsTrigger value="buscar">Buscar</TabsTrigger>
          </TabsList>

          <TabsContent value="convidado" className="space-y-3 mt-3">
            <Input
              placeholder="Nome do jogador"
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
            <Button className="w-full" onClick={handleAddGuest} disabled={adding === "guest" || !guestName.trim()}>
              {adding === "guest" ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Adicionar ao De Fora
            </Button>
          </TabsContent>

          <TabsContent value="buscar" className="space-y-3 mt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Nome ou @username..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2 pr-2">
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : displayPlayers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum jogador encontrado</p>
                ) : (
                  displayPlayers.map(player => {
                    const isMember = existingMemberIds.includes(player.user_id);
                    return (
                      <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={player.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {player.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{player.name}</p>
                          <p className="text-xs text-muted-foreground">{player.position}</p>
                        </div>
                        {isMember ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Na pelada</span>
                        ) : (
                          <Button size="sm" disabled={adding === player.user_id} onClick={() => handleAddExisting(player)}>
                            {adding === player.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Adicionar</>}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
