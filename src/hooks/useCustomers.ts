import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Customer, CustomerFilters } from '@/types/pardis';
import { toast } from 'sonner';

type VtexClientRow = Database['public']['Tables']['vtex_clients']['Row'];

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: ['vtex_clients', filters],
    queryFn: async () => {
      let query = supabase
        .from('vtex_clients')
        .select('*')
        .order('company_name');

      if (filters?.uf) {
        query = query.eq('uf', filters.uf);
      }
      if (filters?.isLabToLab !== undefined) {
        query = query.eq('is_lab_to_lab', filters.isLabToLab);
      }
      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters?.search) {
        const raw = filters.search.trim();
        const digits = raw.replace(/\D/g, '');
        const term = raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        if (digits) {
          query = query.or(
            `company_name.ilike.%${term}%,trade_name.ilike.%${term}%,cnpj.ilike.%${digits}%`
          );
        } else {
          query = query.or(`company_name.ilike.%${term}%,trade_name.ilike.%${term}%`);
        }
      }

      // Segurança/performance: se não há busca, não carrega a base inteira no combobox
      if (!filters?.search) query = query.limit(100);
      else query = query.limit(50);

      const { data, error } = await query;

      if (error) throw error;
      // Mantém compatibilidade do tipo legado, mas o shape real aqui é vtex_clients
      return (data ?? []) as unknown as Customer[];
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['vtex_client', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vtex_clients')
        .select('*')
        .eq('md_id', id)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as Customer;
    },
    enabled: !!id,
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Customer> }) => {
      const { data, error } = await supabase
        .from('vtex_clients')
        .update(updates as unknown as Partial<VtexClientRow>)
        .eq('md_id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vtex_clients'] });
      toast.success('Cliente atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    },
  });
}

export function useCustomerSearch() {
  return useMutation({
    mutationFn: async (search: string) => {
      const raw = (search || '').trim();
      const digits = raw.replace(/\D/g, '');
      const term = raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

      let q = supabase
        .from('vtex_clients')
        .select('*')
        .eq('is_active', true)
        .order('company_name')
        .limit(20);

      if (digits) {
        q = q.or(`company_name.ilike.%${term}%,trade_name.ilike.%${term}%,cnpj.ilike.%${digits}%`);
      } else if (term) {
        q = q.or(`company_name.ilike.%${term}%,trade_name.ilike.%${term}%`);
      }

      const { data, error } = await q;

      if (error) throw error;
      return (data ?? []) as unknown as Customer[];
    },
  });
}
