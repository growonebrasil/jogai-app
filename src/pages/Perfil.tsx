import { useState, useEffect, useRef, useCallback } from "react";
import { toPng } from "html-to-image";
import { usePlayerPerformance } from "@/hooks/usePlayerPerformance";
import { PlayerProgression, PlayerLevelBadge } from "@/components/PlayerProgression";
import { useAutoMilestoneCheck } from "@/hooks/usePlayerProgression";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { AppLayout } from "@/components/AppLayout";
import { PageBackground } from "@/components/PageBackground";
import { PlayerCardEAFC } from "@/components/PlayerCardEAFC";
import { AvatarCropModal } from "@/components/AvatarCropModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Save, Loader2, LogOut, Users, Trophy, Target, Award, PlusCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, usePlayerCard, useUpdateProfile } from "@/hooks/useProfile";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { useFollowCounts } from "@/hooks/useFollows";
import { useUserPosts, useCreatePost } from "@/hooks/useFeed";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import bgPerfil from "@/assets/bg-perfil.jpg";

const positions = [
  { value: "GOL", label: "Goleiro" },
  { value: "ZAG", label: "Zagueiro" },
  { value: "LAT", label: "Lateral" },
  { value: "VOL", label: "Volante" },
  { value: "MEI", label: "Meia" },
  { value: "ATA", label: "Atacante" },
];

function PerformanceAchievements({ userId }: { userId: string | undefined }) {
  const { data: performance } = usePlayerPerformance(userId);
  if (!performance) return null;
  const hasAny = performance.goals >= 3 || performance.assists >= 3 || performance.fairPlayVotes > 0 || performance.bolaMurchaVotes > 0 || performance.matches >= 5 || performance.avgRating >= 8;
  if (!hasAny) return null;
  return (
    <div className="glass-card p-5">
      <h3 className="font-display text-lg font-bold text-foreground mb-3">Conquistas</h3>
      <div className="flex flex-wrap gap-2">
        {performance.goals >= 3 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium border border-accent/30">⚽ Hat Trick ({Math.floor(performance.goals / 3)}x)</span>}
        {performance.assists >= 3 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium border border-primary/30">🎯 Garçom ({Math.floor(performance.assists / 3)}x)</span>}
        {performance.fairPlayVotes > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/20 text-success text-xs font-medium border border-success/30">🤝 Fair Play ({performance.fairPlayVotes}x)</span>}
        {performance.bolaMurchaVotes > 0 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium border border-destructive/30">💀 Bola Murcha ({performance.bolaMurchaVotes}x)</span>}
        {performance.matches >= 5 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-foreground text-xs font-medium border border-border">🏆 Veterano ({performance.matches} partidas)</span>}
        {performance.avgRating >= 8 && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium border border-accent/30">⭐ Craque da Galera</span>}
      </div>
    </div>
  );
}
export default function Perfil() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: playerCard, isLoading: cardLoading } = usePlayerCard();
  const updateProfile = useUpdateProfile();
  const { uploadAvatar, uploading } = useAvatarUpload();
  const { data: followCounts } = useFollowCounts(user?.id);
  const { data: userPosts } = useUserPosts(user?.id);
  const createPost = useCreatePost();
  const queryClient = useQueryClient();
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  useAutoMilestoneCheck();
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharingCard, setSharingCard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    birth_date: "",
    gender: "" as "masculino" | "feminino" | "",
    position: "MEI" as "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA",
    height_cm: "",
    weight_kg: "",
    dominant_foot: "direito" as "direito" | "esquerdo" | "ambidestro",
    username: "",
    bio: "",
    city: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        phone: profile.phone || "",
        birth_date: profile.birth_date || "",
        gender: profile.gender || "",
        position: profile.position || "MEI",
        height_cm: profile.height_cm?.toString() || "",
        weight_kg: profile.weight_kg?.toString() || "",
        dominant_foot: profile.dominant_foot || "direito",
        username: (profile as any).username || "",
        bio: (profile as any).bio || "",
        city: (profile as any).city || "",
      });
    }
  }, [profile]);

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const updates: any = {
      name: formData.name.trim(),
      phone: formData.phone || null,
      birth_date: formData.birth_date || null,
      gender: formData.gender || null,
      position: formData.position,
      height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
      weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
      dominant_foot: formData.dominant_foot,
      username: formData.username || null,
      bio: formData.bio || null,
      city: formData.city || null,
    };
    updateProfile.mutate(updates);
  };

  const handleShareCard = async () => {
    if (!profile || !playerCard || !cardRef.current) return;
    setSharingCard(true);
    try {
      // Capture the card as a PNG image
      const dataUrl = await toPng(cardRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        cacheBust: true,
      });

      // Convert data URL to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const fileName = `card_${user!.id}_${Date.now()}.png`;

      // Upload to feed_media bucket
      const { data: uploadData, error: uploadError } = await (await import("@/integrations/supabase/client")).supabase
        .storage
        .from("feed_media")
        .upload(`${user!.id}/${fileName}`, blob, { contentType: "image/png" });

      if (uploadError) throw uploadError;

      const { data: urlData } = (await import("@/integrations/supabase/client")).supabase
        .storage
        .from("feed_media")
        .getPublicUrl(uploadData.path);

      const usernameVal = (profile as any).username;
      const caption = `🎮 Minha carta JOGA.I!\n\n⭐ Overall: ${playerCard.overall}\n📍 ${profile.position} • ${(playerCard.rarity || "ouro").toUpperCase()}\n\n${usernameVal ? `@${usernameVal}` : profile.name}`;

      await createPost.mutateAsync({
        caption,
        mediaUrls: [urlData.publicUrl],
        mediaType: "photo",
      });
      toast.success("Carta compartilhada no Feed!");
    } catch (error: any) {
      toast.error("Erro ao compartilhar: " + error.message);
    } finally {
      setSharingCard(false);
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    setCropFile(file);
    setCropModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropSave = async (croppedBlob: Blob) => {
    if (!user) return;
    try {
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Foto atualizada com sucesso!");
      setCropModalOpen(false);
      setCropFile(null);
    } catch (error: any) {
      toast.error("Erro ao salvar foto: " + error.message);
      throw error;
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logout realizado!");
    navigate("/login");
  };

  if (profileLoading || cardLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const username = (profile as any)?.username;

  return (
    <AppLayout>
      <PageBackground image={bgPerfil} overlay="medium">
        <div className="space-y-6 max-w-3xl mx-auto p-4 md:p-6">
          {/* Profile Header */}
          <div className="glass-card p-6">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/50"
                  style={{ boxShadow: "var(--glow-primary)" }}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <span className="text-3xl font-display font-bold text-primary">
                        {(profile?.name || "J").charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 rounded-full w-8 h-8"
                  onClick={handleAvatarClick}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <h1 className="font-display text-2xl font-bold text-foreground">{profile?.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {username && <p className="text-muted-foreground text-sm">@{username}</p>}
                {user?.id && <PlayerLevelBadge userId={user.id} />}
              </div>

              <div className="flex items-center gap-6 mt-3">
                <div className="text-center">
                  <p className="text-lg font-display font-bold text-foreground">{followCounts?.followers || 0}</p>
                  <p className="text-xs text-muted-foreground">Seguidores</p>
                </div>
                <Separator orientation="vertical" className="h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-display font-bold text-foreground">{followCounts?.following || 0}</p>
                  <p className="text-xs text-muted-foreground">Seguindo</p>
                </div>
                <Separator orientation="vertical" className="h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-display font-bold text-primary text-glow-primary">{playerCard?.overall || 50}</p>
                  <p className="text-xs text-muted-foreground">Overall</p>
                </div>
                <Separator orientation="vertical" className="h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-display font-bold text-foreground">{profile?.position || "MEI"}</p>
                  <p className="text-xs text-muted-foreground">Posição</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => setPostDialogOpen(true)}
              className="flex-1 h-12 glow-primary"
            >
              <PlusCircle className="w-5 h-5" />
              Nova publicação
            </Button>
          </div>

          <CreatePostDialog open={postDialogOpen} onOpenChange={setPostDialogOpen} />

          <AvatarCropModal
            open={cropModalOpen}
            onClose={() => { setCropModalOpen(false); setCropFile(null); }}
            imageFile={cropFile}
            onSave={handleCropSave}
            playerName={formData.name || "Jogador"}
            username={username || undefined}
            position={formData.position}
            overall={playerCard?.overall || 50}
            rarity={playerCard?.rarity || "ouro"}
          />

          <Tabs defaultValue="posts" className="w-full">
            <TabsList className="w-full bg-card/50 border border-border">
              <TabsTrigger value="posts" className="flex-1">Imagens</TabsTrigger>
              <TabsTrigger value="videos" className="flex-1">Vídeos</TabsTrigger>
              <TabsTrigger value="texts" className="flex-1">Textos</TabsTrigger>
              <TabsTrigger value="stats" className="flex-1">Estatísticas</TabsTrigger>
              <TabsTrigger value="edit" className="flex-1">Editar</TabsTrigger>
            </TabsList>

            {/* Images Tab */}
            <TabsContent value="posts" className="space-y-4 mt-4">
              {/* Player Card + Share */}
              <div className="flex flex-col items-center gap-3">
                <div ref={cardRef}>
                  <PlayerCardEAFC
                    name={formData.name || "Jogador"}
                    username={username || undefined}
                    position={formData.position}
                    overall={playerCard?.overall || 50}
                    rarity={playerCard?.rarity || "ouro"}
                    avatarUrl={profile?.avatar_url}
                    userId={user?.id}
                    size="lg"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareCard}
                  disabled={sharingCard}
                  className="gap-2"
                >
                  {sharingCard ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Compartilhando...</>
                  ) : (
                    <><Share2 className="w-4 h-4" /> Compartilhar carta no Futgram</>
                  )}
                </Button>
              </div>

              {(() => {
                const imagePosts = userPosts?.filter(p => p.media_type === "photo" && p.media_urls && p.media_urls.length > 0) || [];
                return imagePosts.length > 0 ? (
                  <div className="grid grid-cols-3 gap-1">
                    {imagePosts.map((post) => (
                      <div key={post.id} className="aspect-square bg-secondary/30 rounded overflow-hidden">
                        <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 glass-card">
                    <p className="text-muted-foreground text-sm">Nenhuma foto publicada</p>
                  </div>
                );
              })()}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos" className="space-y-4 mt-4">
              {(() => {
                const videoPosts = userPosts?.filter(p => p.media_type === "video") || [];
                return videoPosts.length > 0 ? (
                  <div className="space-y-3">
                    {videoPosts.map((post) => (
                      <div key={post.id} className="gaming-card overflow-hidden">
                        <video src={post.media_urls[0]} controls className="w-full max-h-[300px] object-contain bg-black" />
                        {post.caption && <p className="px-3 py-2 text-xs text-muted-foreground">{post.caption}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 glass-card">
                    <p className="text-muted-foreground text-sm">Nenhum vídeo publicado</p>
                  </div>
                );
              })()}
            </TabsContent>

            {/* Texts Tab */}
            <TabsContent value="texts" className="space-y-4 mt-4">
              {(() => {
                const textPosts = userPosts?.filter(p => p.media_type === "text" || (!p.media_urls || p.media_urls.length === 0)) || [];
                return textPosts.length > 0 ? (
                  <div className="space-y-2">
                    {textPosts.map((post) => (
                      <div key={post.id} className="bg-card/95 border-b border-border/40 px-4 py-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{post.caption}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(post.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 glass-card">
                    <p className="text-muted-foreground text-sm">Nenhum texto publicado</p>
                  </div>
                );
              })()}
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="gaming-card p-4 text-center">
                  <Trophy className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-display font-bold text-primary text-glow-primary">{playerCard?.games_played || 0}</p>
                  <p className="text-xs text-muted-foreground">Partidas</p>
                </div>
                <div className="gaming-card p-4 text-center">
                  <Target className="w-5 h-5 text-accent mx-auto mb-1" />
                  <p className="text-2xl font-display font-bold text-accent text-glow-gold">{playerCard?.overall || 50}</p>
                  <p className="text-xs text-muted-foreground">Overall</p>
                </div>
                <div className="gaming-card p-4 text-center">
                  <Award className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-display font-bold text-foreground">{(playerCard?.rarity || "ouro").toUpperCase()}</p>
                  <p className="text-xs text-muted-foreground">Raridade</p>
                </div>
                <div className="gaming-card p-4 text-center">
                  <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-2xl font-display font-bold text-foreground">{profile?.position || "MEI"}</p>
                  <p className="text-xs text-muted-foreground">Posição</p>
                </div>
              </div>

              {/* Subscription */}
              <SubscriptionCard />

              {/* Progression System */}
              {user?.id && <PlayerProgression userId={user.id} />}

              {/* Performance-based stats replace old attributes */}
              <PerformanceAchievements userId={user?.id} />

            </TabsContent>

            {/* Edit Tab */}
            <TabsContent value="edit" className="space-y-4 mt-4">
              <div className="glass-card p-5 md:p-6">
                <h2 className="font-display text-xl font-bold text-foreground mb-4">Informações Pessoais</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" placeholder="meu_username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} className="bg-secondary/30 border-border" maxLength={30} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" placeholder="Conte sobre você..." value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="bg-secondary/30 border-border" maxLength={160} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" placeholder="São Paulo" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Posição</Label>
                    <Select value={formData.position} onValueChange={(value: any) => setFormData({ ...formData, position: value })}>
                      <SelectTrigger className="bg-secondary/30 border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (<SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-secondary/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de nascimento</Label>
                    <Input id="birth_date" type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} className="bg-secondary/30 border-border" />
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} disabled={updateProfile.isPending} className="w-full h-12 glow-primary">
                {updateProfile.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4" /> Salvar Alterações</>
                )}
              </Button>

              <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Sair da conta
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </PageBackground>
    </AppLayout>
  );
}
