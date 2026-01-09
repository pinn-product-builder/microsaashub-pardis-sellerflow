import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PricingConfig, PaymentCondition, ApprovalRule, QuoteValidityConfig, RegionType } from '@/types/pardis';
import { toast } from 'sonner';

// Pricing Config
export function usePricingConfigs() {
  return useQuery({
    queryKey: ['pricing-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('region');

      if (error) throw error;
      return data as PricingConfig[];
    },
  });
}

export function usePricingConfig(region: RegionType) {
  return useQuery({
    queryKey: ['pricing-config', region],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .eq('region', region)
        .maybeSingle();

      if (error) throw error;
      
      // Fallback to default values if no config found
      if (!data) {
        return {
          id: '',
          region,
          admin_percent: 8,
          logistics_percent: region === 'MG' ? 5 : 12,
          icms_percent: region === 'MG' ? 18 : 20,
          pis_cofins_percent: 3.65,
          lab_to_lab_discount: 5,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as PricingConfig;
      }
      
      return data as PricingConfig;
    },
  });
}

export function useUpdatePricingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PricingConfig> }) => {
      const { data, error } = await supabase
        .from('pricing_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PricingConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-configs'] });
      toast.success('Configuração de pricing atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

// Payment Conditions
export function usePaymentConditions() {
  return useQuery({
    queryKey: ['payment-conditions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_conditions')
        .select('*')
        .order('days');

      if (error) throw error;
      return data as PaymentCondition[];
    },
  });
}

export function useActivePaymentConditions() {
  return useQuery({
    queryKey: ['payment-conditions', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_conditions')
        .select('*')
        .eq('is_active', true)
        .order('days');

      if (error) throw error;
      return data as PaymentCondition[];
    },
  });
}

export function useUpdatePaymentCondition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PaymentCondition> }) => {
      const { data, error } = await supabase
        .from('payment_conditions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as PaymentCondition;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-conditions'] });
      toast.success('Condição de pagamento atualizada');
    },
  });
}

// Approval Rules
export function useApprovalRules() {
  return useQuery({
    queryKey: ['approval-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_rules')
        .select('*')
        .order('margin_min', { ascending: true, nullsFirst: true });

      if (error) throw error;
      return data as ApprovalRule[];
    },
  });
}

export function useActiveApprovalRules() {
  return useQuery({
    queryKey: ['approval-rules', 'active'],
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

export function useUpdateApprovalRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ApprovalRule> }) => {
      const { data, error } = await supabase
        .from('approval_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ApprovalRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast.success('Regra de aprovação atualizada');
    },
  });
}

// Quote Validity Config
export function useQuoteValidityConfig() {
  return useQuery({
    queryKey: ['quote-validity-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_validity_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as QuoteValidityConfig | null;
    },
  });
}

export function useUpdateQuoteValidityConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<QuoteValidityConfig> }) => {
      const { data, error } = await supabase
        .from('quote_validity_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuoteValidityConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote-validity-config'] });
      toast.success('Configuração de validade atualizada');
    },
  });
}
