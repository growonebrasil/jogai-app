import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { PageBackground } from "@/components/PageBackground";
import { PlayerCardEAFC } from "@/components/PlayerCardEAFC";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2, UserPlus, UserMinus, Trophy, Target, TrendingUp, Star, Calendar,
  Heart, MessageCircle, Send,
} from "lucide-react";
import { useProfileByUserId, usePlayerCardByUserId } from "@/hooks/usePlayerProfile";
import { useFollowCounts, useIsFollowing, useToggleFollow } from "@/hooks/useFollows";
import { useUserPosts } from "@/hooks/useFeed";
import { usePlayerPerformance } from "@/hooks/usePlayerPerformance";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { InviteToPeladaModal } from "@/components/InviteToPeladaModal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import bgJogadores from "@/assets/bg-jogadores.jpg";

const footLabels: Record<string, string> = {
  direito: "Direito",
  esquerdo: "Esquerdo",
  ambidestro: "Ambidestro",
};

const positionLabels: Record<string, string> = {
  GOL: "Goleiro", ZAG: "Zagueiro", LAT: "Lateral",
  VOL: "Volante", MEI: "Meia", ATA: "Atacante",
};

export default function JogadorDetail() {
  const { jogadorId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: myProfile } = useProfile();
  const { data: profile, isLoading: profileLoading } = useProfileByUserId(jogadorId);
  const { data: playerCard, isLoading: cardLoading } = usePlayerCardByUserId(jogadorId);
  const { data: followCounts } = useFollowCounts(jogadorId);
  const { data: isFollowing, isLoading: checkingFollow } = useIsFollowing(jogadorId);
  const toggleFollow = useToggleFollow();
  const { data: userPosts } = useUserPosts(jogadorId);
  const { data: performance } = usePlayerPerformance(jogadorId);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const isPresidente = myProfile?.user_role === "presidente";

  const isSelf = user?.id === jogadorId;

  if (isSelf) {
    navigate("/perfil", { replace: true });
    return null;
  }

  if (profileLoading || cardLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!profile) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Jogador não encontrado</p>
        </div>
      </AppLayout>
    );
  }

  const username = profile.username;
  const age = profile.birth_date
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : undefined;

  const handleFollow = () => {
    toggleFollow.mutate({ targetUserId: jogadorId!, isFollowing: !!isFollowing });
  };


  return (
    <AppLayout>
      <PageBackground image={bgJogadores} overlay="heavy">
        <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6">

          {/* ───── 1. PLAYER HEADER ───── */}
          <div className="glass-card p-5 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Player Card */}
              <PlayerCardEAFC
                name={profile.name}
                username={username || undefined}
                position={profile.position}
                overall={performance?.calculatedScore || playerCard?.overall || 50}
                goals={performance?.goals}
                assists={performance?.assists}
                yellowCards={performance?.yellowCards}
                redCards={performance?.redCards}
                craqueVotes={performance?.fairPlayVotes}
                matches={performance?.matches}
                rarity={playerCard?.rarity || "ouro"}
                avatarUrl={profile.avatar_url}
                size="lg"
                userId={jogadorId}
              />

              {/* Player Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="font-display text-3xl font-bold text-foreground">{profile.name}</h1>
                {username && (
                  <p className="text-muted-foreground text-sm mt-0.5">@{username}</p>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Posição:</span>
                    <p className="text-foreground font-medium">{positionLabels[profile.position] || profile.position}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pé dominante:</span>
                    <p className="text-foreground font-medium">{footLabels[profile.dominant_foot || "direito"]}</p>
                  </div>
                  {profile.birth_date && (
                    <div>
                      <span className="text-muted-foreground">Nascimento:</span>
                      <p className="text-foreground font-medium">
                        {new Date(profile.birth_date + "T12:00:00").toLocaleDateString("pt-BR")}
                        {age !== undefined && ` (${age} anos)`}
                      </p>
                    </div>
                  )}
                  {profile.weight_kg && (
                    <div>
                      <span className="text-muted-foreground">Peso:</span>
                      <p className="text-foreground font-medium">{profile.weight_kg}kg</p>
                    </div>
                  )}
                  {profile.height_cm && (
                    <div>
                      <span className="text-muted-foreground">Altura:</span>
                      <p className="text-foreground font-medium">{profile.height_cm}cm</p>
                    </div>
                  )}
                </div>

                {/* Follow + social stats */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-5">
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    disabled={checkingFollow || toggleFollow.isPending}
                    onClick={handleFollow}
                    className="min-w-[120px]"
                  >
                    {toggleFollow.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFollowing ? (
                      <><UserMinus className="w-4 h-4" /> Seguindo</>
                    ) : (
                      <><UserPlus className="w-4 h-4" /> Seguir</>
                    )}
                  </Button>
                  {isPresidente && (
                    <Button
                      variant="outline"
                      onClick={() => setInviteModalOpen(true)}
                      className="min-w-[120px]"
                    >
                      <Send className="w-4 h-4" /> Convidar para Pelada
                    </Button>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span><strong className="text-foreground">{followCounts?.followers || 0}</strong> seguidores</span>
                    <span><strong className="text-foreground">{followCounts?.following || 0}</strong> seguindo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ───── 2. PERFORMANCE STATS ───── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="gaming-card p-4 text-center">
              <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-display font-bold text-primary text-glow-primary">{performance?.matches || 0}</p>
              <p className="text-xs text-muted-foreground">Partidas</p>
            </div>
            <div className="gaming-card p-4 text-center">
              <Target className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-2xl font-display font-bold text-accent text-glow-gold">{performance?.goals || 0}</p>
              <p className="text-xs text-muted-foreground">Gols</p>
            </div>
            <div className="gaming-card p-4 text-center">
              <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-display font-bold text-primary text-glow-primary">{performance?.assists || 0}</p>
              <p className="text-xs text-muted-foreground">Assistências</p>
            </div>
            <div className="gaming-card p-4 text-center">
              <Star className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-2xl font-display font-bold text-accent text-glow-gold">{performance?.avgRating || 0}</p>
              <p className="text-xs text-muted-foreground">Média</p>
            </div>
          </div>

          {/* ───── 3. CONQUISTAS ───── */}
          {performance && (performance.goals >= 3 || performance.fairPlayVotes > 0 || performance.bolaMurchaVotes > 0 || performance.assists >= 3 || performance.matches >= 5) && (
            <div className="glass-card p-5 md:p-6">
              <h2 className="font-display text-xl font-bold text-foreground mb-3">Conquistas</h2>
              <div className="flex flex-wrap gap-2">
                {performance.goals >= 3 && (
                  <Badge className="bg-accent/20 text-accent border-accent/30 gap-1">⚽ Hat Trick ({Math.floor(performance.goals / 3)}x)</Badge>
                )}
                {performance.assists >= 3 && (
                  <Badge className="bg-primary/20 text-primary border-primary/30 gap-1">🎯 Garçom ({Math.floor(performance.assists / 3)}x)</Badge>
                )}
                {performance.fairPlayVotes > 0 && (
                  <Badge className="bg-success/20 text-success border-success/30 gap-1">🤝 Fair Play ({performance.fairPlayVotes}x)</Badge>
                )}
                {performance.bolaMurchaVotes > 0 && (
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 gap-1">💀 Bola Murcha ({performance.bolaMurchaVotes}x)</Badge>
                )}
                {performance.matches >= 5 && (
                  <Badge className="bg-secondary text-foreground border-border gap-1">🏆 Veterano ({performance.matches} partidas)</Badge>
                )}
                {performance.avgRating >= 8 && (
                  <Badge className="bg-accent/20 text-accent border-accent/30 gap-1">⭐ Craque da Galera</Badge>
                )}
              </div>
            </div>
          )}


          <div className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">Publicações</h2>

            {userPosts && userPosts.length > 0 ? (
              userPosts.map((post) => (
                <div key={post.id} className="gaming-card overflow-hidden">
                  {/* Post caption */}
                  {post.caption && (
                    <div className="px-4 pt-4 pb-2">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{post.caption}</p>
                    </div>
                  )}

                  {/* Post media */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className={post.media_urls.length === 1 ? "" : "grid grid-cols-3 gap-0.5"}>
                      {post.media_type === "video" ? (
                        <video src={post.media_urls[0]} controls className="w-full max-h-[500px] object-contain bg-black" />
                      ) : (
                        post.media_urls.map((url, i) => (
                          <div key={i} className="aspect-square">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Post footer */}
                  <div className="flex items-center gap-4 px-4 py-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" /> {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" /> {post.comments_count}
                    </span>
                    <span className="ml-auto text-xs">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card py-14 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-secondary/20 flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground/60 text-sm italic">Ainda sem nenhuma postagem</p>
              </div>
            )}
          </div>

        </div>
      </PageBackground>
      {isPresidente && jogadorId && profile && (
        <InviteToPeladaModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
          targetUserId={jogadorId}
          targetUserName={profile.name}
        />
      )}
    </AppLayout>
  );
}
