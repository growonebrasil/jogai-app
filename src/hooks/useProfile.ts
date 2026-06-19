import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PlanType = "free" | "pro" | "demo";
export type UserRole = "presidente" | "jogador";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  gender: "masculino" | "feminino" | null;
  position: "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA";
  height_cm: number | null;
  weight_kg: number | null;
  dominant_foot: "direito" | "esquerdo" | "ambidestro";
  avatar_url: string | null;
  plan_type: PlanType;
  user_role: UserRole;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlayerCard {
  id: string;
  user_id: string;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  rarity: "bronze" | "prata" | "ouro" | "ouro_raro" | "roxo" | "azul";
  games_played: number;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });
}

export function usePlayerCard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["playerCard", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("player_cards")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as PlayerCard | null;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (error) => {
      if (error.message.includes("profiles_username_unique")) {
        toast.error("Este username já está em uso");
      } else {
        toast.error("Erro ao atualizar perfil: " + error.message);
      }
    },
  });
}

export function useUpdatePlayerCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<PlayerCard>) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("player_cards")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as PlayerCard;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playerCard", user?.id] });
      toast.success("Carta atualizada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar carta: " + error.message);
    },
  });
}
