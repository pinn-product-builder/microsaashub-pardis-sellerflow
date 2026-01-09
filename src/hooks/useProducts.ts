import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductFilters } from '@/types/pardis';
import { toast } from 'sonner';

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .order('name');

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.hasCampaign) {
        query = query.not('campaign_name', 'is', null);
      }
      if (filters?.hasStock) {
        query = query.gt('stock_quantity', 0);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar produto: ${error.message}`);
    },
  });
}

export function useProductSearch() {
  return useMutation({
    mutationFn: async (search: string) => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
        .eq('is_active', true)
        .eq('status', 'active')
        .limit(20);

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;
      
      const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
      return categories as string[];
    },
  });
}

export function useBatchUpdateProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Product> }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .in('id', ids)
        .select();

      if (error) throw error;
      return data as Product[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${data.length} produtos atualizados com sucesso`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar produtos: ${error.message}`);
    },
  });
}
