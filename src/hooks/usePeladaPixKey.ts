import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the PIX key for a pelada via the SECURITY DEFINER RPC.
 * The pix_key column is not directly readable via the table API; only
 * members of the pelada will receive a value through this RPC.
 */
export function usePeladaPixKey(peladaId: string | undefined | null) {
  return useQuery({
    queryKey: ["peladaPixKey", peladaId],
    queryFn: async () => {
      if (!peladaId) return null;
      const { data, error } = await supabase.rpc("get_pelada_pix_key", { _pelada_id: peladaId });
      if (error) return null;
      return (data as string | null) ?? null;
    },
    enabled: !!peladaId,
    staleTime: 60_000,
  });
}
