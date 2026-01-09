import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Customer, CustomerFilters } from '@/types/pardis';
import { toast } from 'sonner';

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      let query = supabase
        .from('customers')
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
        query = query.or(`company_name.ilike.%${filters.search}%,cnpj.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Customer[];
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id,
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Customer> }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
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
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`company_name.ilike.%${search}%,cnpj.ilike.%${search}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;
      return data as Customer[];
    },
  });
}
