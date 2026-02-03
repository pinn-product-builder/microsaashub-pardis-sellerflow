import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type VtexPolicyMode = "auto" | "fixed";

type PolicyRow = {
  trade_policy_id: string;
  computed_count?: number;
  fixed_count?: number;
};

interface VtexPolicyStore {
  mode: VtexPolicyMode;
  tradePolicyId: string; // usado quando mode === 'fixed'
  policies: PolicyRow[];
  loadingPolicies: boolean;

  setMode: (mode: VtexPolicyMode) => void;
  setTradePolicyId: (id: string) => void;
  loadPolicies: () => Promise<void>;
}

export const useVtexPolicyStore = create<VtexPolicyStore>((set, get) => ({
  mode: "fixed",
  tradePolicyId: "1",
  policies: [],
  loadingPolicies: false,

  setMode: (mode) => set({ mode }),
  setTradePolicyId: (id) => set({ tradePolicyId: id }),

  loadPolicies: async () => {
    if (get().loadingPolicies) return;
    set({ loadingPolicies: true });
    try {
      const { data, error } = await (supabase as any).rpc("list_vtex_trade_policies");
      if (error) throw error;
      set({
        policies: (data ?? []).map((r: any) => ({
          trade_policy_id: String(r.trade_policy_id),
          computed_count: r.computed_count ?? undefined,
          fixed_count: r.fixed_count ?? undefined,
        })),
      });
    } catch {
      set({ policies: [] });
    } finally {
      set({ loadingPolicies: false });
    }
  },
}));

