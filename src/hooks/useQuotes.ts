import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QuoteFilters } from '@/types/pardis';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

export function useQuotes(filters?: QuoteFilters) {
  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: async () => {
      let query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters?.marginMin !== undefined) {
        query = query.gte('total_margin_percent', filters.marginMin);
      }
      if (filters?.marginMax !== undefined) {
        query = query.lte('total_margin_percent', filters.marginMax);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_input: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      throw new Error('useCreateQuote (legado) não é usado no Seller Flow VTEX. Use VtexQuoteService.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Cotação criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar cotação: ${error.message}`);
    },
  });
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', variables.id] });
      toast.success('Cotação atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar cotação: ${error.message}`);
    },
  });
}

export function useUpdateQuoteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: any }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as any;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', variables.id] });
    },
  });
}

export function useAddQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      throw new Error('useAddQuoteItem (legado) não é usado no Seller Flow VTEX. Use VtexQuoteService.');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quote', (variables as any)?.quoteId] });
    },
  });
}

export function useUpdateQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      throw new Error('useUpdateQuoteItem (legado) não é usado no Seller Flow VTEX. Use VtexQuoteService.');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quote', (variables as any)?.quoteId] });
    },
  });
}

export function useRemoveQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      throw new Error('useRemoveQuoteItem (legado) não é usado no Seller Flow VTEX. Use VtexQuoteService.');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quote', (variables as any)?.quoteId] });
    },
  });
}

export function useQuoteStats() {
  return useQuery({
    queryKey: ['quote-stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekAgo = format(addDays(new Date(), -7), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('quotes')
        .select('status, total_offered, total_margin_percent, created_at');

      if (error) throw error;

      const quotes = data ?? [];
      const stats = {
        total: quotes.length,
        draft: quotes.filter((q: any) => q.status === 'draft').length,
        pending: quotes.filter((q: any) => q.status === 'pending_approval').length,
        approved: quotes.filter((q: any) => q.status === 'approved').length,
        sent: quotes.filter((q: any) => q.status === 'sent').length,
        converted: quotes.filter((q: any) => q.status === 'converted').length,
        totalValue: quotes.reduce((acc: number, q: any) => acc + (q.total_offered || 0), 0),
        avgMargin: quotes.length > 0 
          ? quotes.reduce((acc: number, q: any) => acc + (q.total_margin_percent || 0), 0) / quotes.length 
          : 0,
        todayCount: quotes.filter((q: any) => q.created_at?.startsWith(today)).length,
        weekCount: quotes.filter((q: any) => q.created_at >= weekAgo).length,
      };

      return stats;
    },
  });
}
