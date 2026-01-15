import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TaxRule {
  id: string;
  uf: string;
  uf_name: string;
  region: string;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  icms_st_margin: number | null;
  fcp: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaxRuleInput {
  uf: string;
  uf_name: string;
  region: string;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  icms_st_margin?: number | null;
  fcp?: number;
  is_active?: boolean;
  notes?: string | null;
}

export function useTaxRules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: taxRules = [], isLoading, error } = useQuery({
    queryKey: ['tax-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rules')
        .select('*')
        .order('region', { ascending: true })
        .order('uf', { ascending: true });

      if (error) throw error;
      return data as TaxRule[];
    }
  });

  const updateTaxRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaxRuleInput> }) => {
      const { data, error } = await supabase
        .from('tax_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
      toast({
        title: 'Regra fiscal atualizada',
        description: 'As alterações foram salvas com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error instanceof Error ? error.message : 'Não foi possível salvar as alterações.',
        variant: 'destructive'
      });
    }
  });

  const createTaxRule = useMutation({
    mutationFn: async (rule: TaxRuleInput) => {
      const { data, error } = await supabase
        .from('tax_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
      toast({
        title: 'Regra fiscal criada',
        description: 'A nova regra foi adicionada com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar',
        description: error instanceof Error ? error.message : 'Não foi possível criar a regra.',
        variant: 'destructive'
      });
    }
  });

  const deleteTaxRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
      toast({
        title: 'Regra fiscal removida',
        description: 'A regra foi excluída com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover',
        description: error instanceof Error ? error.message : 'Não foi possível remover a regra.',
        variant: 'destructive'
      });
    }
  });

  // Função helper para buscar regra por UF
  const getTaxRuleByUF = (uf: string): TaxRule | undefined => {
    return taxRules.find(rule => rule.uf === uf && rule.is_active);
  };

  // Função helper para converter para formato legado
  const getTaxRulesLegacy = () => {
    return taxRules
      .filter(rule => rule.is_active)
      .map(rule => ({
        uf: rule.uf,
        icms: Number(rule.icms),
        ipi: Number(rule.ipi),
        pis: Number(rule.pis),
        cofins: Number(rule.cofins)
      }));
  };

  return {
    taxRules,
    isLoading,
    error,
    updateTaxRule,
    createTaxRule,
    deleteTaxRule,
    getTaxRuleByUF,
    getTaxRulesLegacy
  };
}
