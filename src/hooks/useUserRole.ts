import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["userRole", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data?.role || "viewer";
    },
    enabled: !!user,
  });
};

export const useIsAdmin = () => {
  const { data: role } = useUserRole();
  return role === "admin";
};

export const useCanManageMonitors = () => {
  const { data: role } = useUserRole();
  return role === "admin" || role === "operator";
};
