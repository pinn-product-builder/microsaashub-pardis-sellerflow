import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Quote, QuoteItem, QuoteFilters, CreateQuoteInput, QuoteStatus } from '@/types/pardis';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

export function useQuotes(filters?: QuoteFilters) {
  return useQuery({
    queryKey: ['quotes', filters],
    queryFn: async () => {
      let query = supabase
        .from('quotes')
        .select(`
          *,
          customer:customers(*),
          payment_condition:payment_conditions(*),
          items:quote_items(*, product:products(*))
        `)
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
      return data as Quote[];
    },
  });
}

export function useQuote(id: string) {
  return useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          customer:customers(*),
          payment_condition:payment_conditions(*),
          items:quote_items(*, product:products(*))
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Quote;
    },
    enabled: !!id,
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuoteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Criar a cotação (quote_number é gerado automaticamente pelo trigger)
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          quote_number: '', // Será substituído pelo trigger
          customer_id: input.customer_id,
          created_by: user.id,
          payment_condition_id: input.payment_condition_id,
          valid_until: input.valid_until,
          notes: input.notes,
          status: 'draft',
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Criar os itens
      if (input.items.length > 0) {
        const itemsToInsert = input.items.map(item => ({
          quote_id: quote.id,
          product_id: item.product_id,
          quantity: item.quantity,
          list_price: item.offered_price, // Será calculado
          offered_price: item.offered_price,
          total_list: item.offered_price * item.quantity,
          total_offered: item.offered_price * item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return quote as Quote;
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
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Quote> }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
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
    mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Quote;
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
    mutationFn: async ({ quoteId, item }: { quoteId: string; item: Omit<QuoteItem, 'id' | 'quote_id' | 'created_at' | 'updated_at'> }) => {
      const { data, error } = await supabase
        .from('quote_items')
        .insert({
          quote_id: quoteId,
          ...item,
        })
        .select('*, product:products(*)')
        .single();

      if (error) throw error;
      return data as QuoteItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quote', variables.quoteId] });
    },
  });
}

export function useUpdateQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quoteId, updates }: { id: string; quoteId: string; updates: Partial<QuoteItem> }) => {
      const { data, error } = await supabase
        .from('quote_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as QuoteItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quote', variables.quoteId] });
    },
  });
}

export function useRemoveQuoteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quoteId }: { id: string; quoteId: string }) => {
      const { error } = await supabase
        .from('quote_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quote', variables.quoteId] });
    },
  });
}

export function useQuoteStats() {
  return useQuery({
    queryKey: ['quote-stats'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const weekAgo = format(addDays(new Date(), -7), 'yyyy-MM-dd');

      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('status, total_offered, total_margin_percent, created_at');

      if (error) throw error;

      const stats = {
        total: quotes.length,
        draft: quotes.filter(q => q.status === 'draft').length,
        pending: quotes.filter(q => q.status === 'pending_approval').length,
        approved: quotes.filter(q => q.status === 'approved').length,
        sent: quotes.filter(q => q.status === 'sent').length,
        converted: quotes.filter(q => q.status === 'converted').length,
        totalValue: quotes.reduce((acc, q) => acc + (q.total_offered || 0), 0),
        avgMargin: quotes.length > 0 
          ? quotes.reduce((acc, q) => acc + (q.total_margin_percent || 0), 0) / quotes.length 
          : 0,
        todayCount: quotes.filter(q => q.created_at?.startsWith(today)).length,
        weekCount: quotes.filter(q => q.created_at >= weekAgo).length,
      };

      return stats;
    },
  });
}
