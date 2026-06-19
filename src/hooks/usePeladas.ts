import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Pelada {
  id: string;
  name: string;
  location: string;
  location_name: string | null;
  full_address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string;
  pelada_type: "publica" | "privada";
  max_players: number | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  recurrence_type: string;
  recurrence_day_of_week: number | null;
  recurrence_interval: number;
  recurrence_enabled: boolean;
  match_id_code: string | null;
  neighborhood: string | null;
  city: string | null;
}

export interface PeladaMember {
  id: string;
  pelada_id: string;
  user_id: string | null;
  guest_name: string | null;
  guest_position: string | null;
  role: "admin" | "player" | "guest";
  status: "confirmado" | "talvez" | "nao_vou" | "pendente";
  created_at: string;
  updated_at: string;
}

export function useMyPeladas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["myPeladas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships, error: memberError } = await supabase
        .from("pelada_members")
        .select("pelada_id")
        .eq("user_id", user.id)
        .neq("status", "pendente");
      if (memberError) throw memberError;
      const peladaIds = memberships?.map((m) => m.pelada_id) || [];
      if (peladaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("peladas")
        .select("*")
        .in("id", peladaIds)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data as Pelada[];
    },
    enabled: !!user,
  });
}

export function usePublicPeladas() {
  return useQuery({
    queryKey: ["publicPeladas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peladas")
        .select("*")
        .eq("pelada_type", "publica")
        .eq("is_active", true)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data as Pelada[];
    },
  });
}

export interface PeladaSearchFilters {
  search: string;
  city?: string;
  neighborhood?: string;
  dayOfWeek?: number | null; // 0=Sunday..6=Saturday
  isPaid?: boolean | null;
}

export function useSearchPeladas(filters: PeladaSearchFilters | string) {
  // Backward compat: accept string or object
  const f: PeladaSearchFilters = typeof filters === "string" ? { search: filters } : filters;

  return useQuery({
    queryKey: ["searchPeladas", f],
    queryFn: async () => {
      const hasAnyFilter = (f.search && f.search.length >= 2) || f.city || f.neighborhood || (f.dayOfWeek !== undefined && f.dayOfWeek !== null) || (f.isPaid !== undefined && f.isPaid !== null);
      if (!hasAnyFilter) return [];
      
      let query = supabase
        .from("peladas")
        .select("*")
        .eq("is_active", true)
        .order("scheduled_date", { ascending: true })
        .limit(30);
      
      if (f.search && f.search.length >= 2) {
        const isIdSearch = /^[A-Z]{2,3}-\d+$/i.test(f.search.trim());
        if (isIdSearch) {
          query = query.ilike("match_id_code", f.search.trim().toUpperCase());
        } else {
          const term = `%${f.search.trim()}%`;
          query = query.or(`name.ilike.${term},match_id_code.ilike.${term},neighborhood.ilike.${term},city.ilike.${term}`);
        }
      }

      if (f.city) query = query.ilike("city", `%${f.city}%`);
      if (f.neighborhood) query = query.ilike("neighborhood", `%${f.neighborhood}%`);
      
      const { data, error } = await query;
      if (error) throw error;

      let results = data as Pelada[];

      // Client-side filter by day of week
      if (f.dayOfWeek !== undefined && f.dayOfWeek !== null) {
        results = results.filter((p) => {
          const date = new Date(p.scheduled_date + "T12:00:00");
          return date.getDay() === f.dayOfWeek;
        });
      }

      return results;
    },
    enabled: !!(
      (f.search && f.search.length >= 2) || f.city || f.neighborhood ||
      (f.dayOfWeek !== undefined && f.dayOfWeek !== null) ||
      (f.isPaid !== undefined && f.isPaid !== null)
    ),
  });
}

export function usePendingInvites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pendingInvites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: memberships, error: memberError } = await supabase
        .from("pelada_members")
        .select("pelada_id")
        .eq("user_id", user.id)
        .eq("status", "pendente");
      if (memberError) throw memberError;
      const peladaIds = memberships?.map((m) => m.pelada_id) || [];
      if (peladaIds.length === 0) return [];
      const { data, error } = await supabase
        .from("peladas")
        .select("*")
        .in("id", peladaIds)
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data as Pelada[];
    },
    enabled: !!user,
  });
}

export function useRequestJoinPelada() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (peladaId: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("pelada_members")
        .insert({ pelada_id: peladaId, user_id: user.id, role: "player", status: "pendente" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["searchPeladas"] });
      queryClient.invalidateQueries({ queryKey: ["pendingInvites"] });
      toast.success("Solicitação enviada!");
    },
    onError: (error) => {
      if (error.message.includes("duplicate")) {
        toast.error("Você já solicitou entrada nesta pelada");
      } else {
        toast.error("Erro ao solicitar: " + error.message);
      }
    },
  });
}

export function usePeladaDetail(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["pelada", peladaId],
    queryFn: async () => {
      if (!peladaId) return null;
      const { data, error } = await supabase
        .from("peladas")
        .select("*")
        .eq("id", peladaId)
        .maybeSingle();
      if (error) throw error;
      return data as Pelada | null;
    },
    enabled: !!peladaId,
  });
}

export function usePeladaMembers(peladaId: string | undefined) {
  return useQuery({
    queryKey: ["peladaMembers", peladaId],
    queryFn: async () => {
      if (!peladaId) return [];
      const { data, error } = await supabase
        .from("pelada_members")
        .select("*")
        .eq("pelada_id", peladaId);
      if (error) throw error;
      const userIds = data.filter((m) => m.user_id).map((m) => m.user_id as string);
      let profiles: Record<string, { name: string; position: string; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, name, position, avatar_url")
          .in("user_id", userIds);
        profileData?.forEach((p) => {
          profiles[p.user_id] = { name: p.name, position: p.position, avatar_url: p.avatar_url };
        });
      }
      let cards: Record<string, number> = {};
      if (userIds.length > 0) {
        const { data: cardData } = await supabase
          .from("player_cards")
          .select("user_id, overall")
          .in("user_id", userIds);
        cardData?.forEach((c) => { cards[c.user_id] = c.overall; });
      }
      return data.map((member) => ({
        ...member,
        profile: member.user_id ? profiles[member.user_id] : null,
        overall: member.user_id ? cards[member.user_id] || 50 : 50,
      }));
    },
    enabled: !!peladaId,
  });
}

interface CreatePeladaInput {
  name: string;
  location: string;
  location_name?: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  scheduled_date: string;
  scheduled_time: string;
  pelada_type: "publica" | "privada";
  max_players?: number;
  recurrence_type?: string;
  recurrence_day_of_week?: number;
  recurrence_interval?: number;
  recurrence_enabled?: boolean;
  neighborhood?: string;
  city?: string;
}

export function useCreatePelada() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pelada: CreatePeladaInput) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("peladas")
        .insert({ ...pelada, created_by: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPeladas"] });
      queryClient.invalidateQueries({ queryKey: ["publicPeladas"] });
      toast.success("Pelada criada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar pelada: " + error.message);
    },
  });
}

export function useUpdatePelada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreatePeladaInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("peladas")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["pelada", data.id] });
      queryClient.invalidateQueries({ queryKey: ["myPeladas"] });
      queryClient.invalidateQueries({ queryKey: ["publicPeladas"] });
      toast.success("Pelada atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });
}

export function useJoinPelada() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (peladaId: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("pelada_members")
        .insert({ pelada_id: peladaId, user_id: user.id, role: "player", status: "confirmado" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, peladaId) => {
      queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["myPeladas"] });
      toast.success("Presença confirmada!");
    },
    onError: (error) => {
      toast.error("Erro ao participar: " + error.message);
    },
  });
}

export function useUpdateAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ peladaId, status }: { peladaId: string; status: "confirmado" | "talvez" | "nao_vou" }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("pelada_members")
        .update({ status })
        .eq("pelada_id", peladaId)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { peladaId }) => {
      queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar presença: " + error.message);
    },
  });
}

export function useLeavePelada() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (peladaId: string) => {
      if (!user) throw new Error("Usuário não autenticado");

      // Get member id for financial cleanup
      const { data: membership } = await supabase
        .from("pelada_members")
        .select("id")
        .eq("pelada_id", peladaId)
        .eq("user_id", user.id)
        .maybeSingle();

      // Remove future payments (keep historical paid ones)
      if (membership) {
        await supabase
          .from("pelada_payments")
          .delete()
          .eq("pelada_member_id", membership.id)
          .eq("status", "pendente");
      }

      // Remove membership
      const { error } = await supabase
        .from("pelada_members")
        .delete()
        .eq("pelada_id", peladaId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: (_, peladaId) => {
      queryClient.invalidateQueries({ queryKey: ["peladaMembers", peladaId] });
      queryClient.invalidateQueries({ queryKey: ["myPeladas"] });
      toast.success("Você saiu da pelada.");
    },
    onError: (error) => {
      toast.error("Erro ao sair: " + error.message);
    },
  });
}

export function useDeletePelada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (peladaId: string) => {
      // Delete all related data (cascading via FK should handle most, but be explicit)
      // Delete payments
      await supabase.from("pelada_payments").delete().eq("pelada_id", peladaId);
      // Delete expenses & income
      await supabase.from("pelada_expenses").delete().eq("pelada_id", peladaId);
      await supabase.from("pelada_income").delete().eq("pelada_id", peladaId);
      // Delete occurrences
      await supabase.from("pelada_occurrences" as any).delete().eq("pelada_id", peladaId);
      // Delete messages
      await supabase.from("pelada_messages").delete().eq("pelada_id", peladaId);

      // Delete match-related data
      const { data: matches } = await supabase
        .from("matches")
        .select("id")
        .eq("pelada_id", peladaId);
      if (matches && matches.length > 0) {
        const matchIds = matches.map((m) => m.id);
        await supabase.from("match_stats").delete().in("match_id", matchIds);
        await supabase.from("match_teams").delete().in("match_id", matchIds);
        await supabase.from("match_votes").delete().in("match_id", matchIds);
        await supabase.from("match_award_votes").delete().in("match_id", matchIds);
        await supabase.from("matches").delete().eq("pelada_id", peladaId);
      }

      // Delete members
      await supabase.from("pelada_members").delete().eq("pelada_id", peladaId);

      // Delete pelada itself
      const { error } = await supabase.from("peladas").delete().eq("id", peladaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPeladas"] });
      queryClient.invalidateQueries({ queryKey: ["publicPeladas"] });
      toast.success("Pelada excluída permanentemente.");
    },
    onError: (error) => {
      toast.error("Erro ao excluir pelada: " + error.message);
    },
  });
}
