import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PricingEngineConfig, ApprovalRule } from '@/types/pardis';
import { toast } from 'sonner';

// Default engine config when loading or unavailable
const DEFAULT_ENGINE_CONFIG: PricingEngineConfig = {
  id: 'default',
  default_markup_mg: 1.5,
  default_markup_br: 1.6,
  margin_green_threshold: 10,
  margin_yellow_threshold: 0,
  margin_orange_threshold: -5,
  margin_authorized_threshold: 0,
  minimum_price_margin_target: 1,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Fetch the active pricing engine config
export function usePricingEngineConfig() {
  return useQuery({
    queryKey: ['pricing-engine-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_engine_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return DEFAULT_ENGINE_CONFIG;
      }
      
      return data as PricingEngineConfig;
    },
  });
}

// Update pricing engine config
export function useUpdatePricingEngineConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PricingEngineConfig> }) => {
      const { data, error } = await supabase
        .from('pricing_engine_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PricingEngineConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-engine-config'] });
      toast.success('Configuração do motor atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

// Fetch active approval rules for the engine (ordered by margin_min)
export function useActiveApprovalRulesForEngine() {
  return useQuery({
    queryKey: ['approval-rules-engine'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_rules')
        .select('*')
        .eq('is_active', true)
        .order('margin_min', { ascending: true, nullsFirst: true });

      if (error) throw error;
      return data as ApprovalRule[];
    },
  });
}

// Get default config for use in places without async access
export function getDefaultEngineConfig(): PricingEngineConfig {
  return DEFAULT_ENGINE_CONFIG;
}
