import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageBackground } from "@/components/PageBackground";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Loader2, UserPlus, UserMinus } from "lucide-react";
import { useSearchPlayers, SearchPlayer } from "@/hooks/useSearchPlayers";
import { useAuth } from "@/contexts/AuthContext";
import { useIsFollowing, useToggleFollow } from "@/hooks/useFollows";
import { PlayerCardEAFC } from "@/components/PlayerCardEAFC";
import bgJogadores from "@/assets/bg-jogadores.jpg";

const positions = [
  { value: "all", label: "Todas posições" },
  { value: "GOL", label: "Goleiro" },
  { value: "ZAG", label: "Zagueiro" },
  { value: "LAT", label: "Lateral" },
  { value: "VOL", label: "Volante" },
  { value: "MEI", label: "Meia" },
  { value: "ATA", label: "Atacante" },
];

function calcAge(birthDate: string | null): number | undefined {
  if (!birthDate) return undefined;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function MarketCard({ player }: { player: SearchPlayer }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: isFollowing, isLoading: checkingFollow } = useIsFollowing(player.user_id);
  const toggleFollow = useToggleFollow();
  const isSelf = user?.id === player.user_id;

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFollow.mutate({ targetUserId: player.user_id, isFollowing: !!isFollowing });
  };

  const card = player.player_cards;
  const age = calcAge(player.birth_date);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="cursor-pointer transition-transform duration-200 hover:scale-105"
        onClick={() => navigate(`/jogadores/${player.user_id}`)}
      >
        <PlayerCardEAFC
          name={player.name}
          username={player.username || undefined}
          position={player.position}
          overall={card?.overall ?? 50}
          rarity={(card?.rarity as any) ?? "ouro"}
          avatarUrl={player.avatar_url}
          size="sm"
          userId={player.user_id}
        />
      </div>
      {!isSelf && (
        <Button
          size="sm"
          variant={isFollowing ? "outline" : "default"}
          disabled={checkingFollow || toggleFollow.isPending}
          onClick={handleFollow}
          className="w-full max-w-[180px] text-xs h-8"
        >
          {toggleFollow.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isFollowing ? (
            <><UserMinus className="w-3 h-3" /> Seguindo</>
          ) : (
            <><UserPlus className="w-3 h-3" /> Seguir</>
          )}
        </Button>
      )}
    </div>
  );
}

export default function Jogadores() {
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const { data: players, isLoading } = useSearchPlayers(search, positionFilter);

  return (
    <AppLayout>
      <PageBackground image={bgJogadores} overlay="heavy">
        <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
          {/* Header */}
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Mercado de Jogadores</h1>
            <p className="text-muted-foreground mt-1">Explore e descubra jogadores na plataforma</p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou @username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12 bg-card/80 backdrop-blur-sm border-border"
              />
            </div>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-full sm:w-48 h-12 bg-card/80 backdrop-blur-sm border-border">
                <SelectValue placeholder="Filtrar por posição" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Card Grid */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : !players?.length ? (
            <div className="text-center py-16 glass-card rounded-xl">
              <p className="text-muted-foreground text-lg">Nenhum jogador encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center pb-8">
              {players.map((player) => (
                <MarketCard key={player.id} player={player} />
              ))}
            </div>
          )}
        </div>
      </PageBackground>
    </AppLayout>
  );
}
