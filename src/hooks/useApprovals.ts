import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ApprovalRequest, ApprovalStatus } from '@/types/pardis';
import { toast } from 'sonner';

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vtex_approval_requests')
        .select('*, quote:vtex_quotes(id, quote_number, vtex_client_id, total, status, created_at, client:vtex_clients(md_id, company_name, cnpj, city, uf))')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ApprovalRequest[];
    },
  });
}

export function useApprovalRequests(quoteId?: string) {
  return useQuery({
    queryKey: ['approvals', quoteId],
    queryFn: async () => {
      let query = supabase
        .from('vtex_approval_requests')
        .select('*, quote:vtex_quotes(id, quote_number, vtex_client_id, total, status, created_at, client:vtex_clients(md_id, company_name, cnpj, city, uf))')
        .order('requested_at', { ascending: false });

      if (quoteId) {
        query = query.eq('quote_id', quoteId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as unknown as ApprovalRequest[];
    },
  });
}

export function useCreateApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      quote_id: string;
      rule_id?: string;
      quote_total: number;
      quote_margin_percent: number;
      reason?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('vtex_approval_requests')
        .insert({
          quote_id: input.quote_id,
          rule_id: input.rule_id,
          quote_total: input.quote_total,
          quote_margin_percent: input.quote_margin_percent,
          reason: input.reason,
          requested_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar status da cotação
      await supabase
        .from('vtex_quotes')
        .update({ 
          status: 'pending_approval',
          requires_approval: true 
        })
        .eq('id', input.quote_id);

      // Registrar evento (best-effort)
      await supabase.from('vtex_quote_events').insert({
        quote_id: input.quote_id,
        event_type: 'approval_requested',
        from_status: null,
        to_status: 'pending_approval',
        message: input.reason ?? 'Solicitação de aprovação criada',
        payload: { source: 'ui' },
        created_by: user.id,
      } as any);

      return data as unknown as ApprovalRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Solicitação de aprovação enviada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao solicitar aprovação: ${error.message}`);
    },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      if (!comments?.trim()) throw new Error('Justificativa obrigatória para aprovar');

      const { data, error } = await supabase
        .from('vtex_approval_requests')
        .update({
          status: 'approved',
          approved_by: user.id,
          comments: comments.trim(),
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar status da cotação
      if (data?.quote_id) {
        await supabase
          .from('vtex_quotes')
          .update({ 
            status: 'approved',
            is_authorized: true 
          })
          .eq('id', data.quote_id);

        // Evento (best-effort)
        await supabase.from('vtex_quote_events').insert({
          quote_id: data.quote_id,
          event_type: 'approved',
          from_status: 'pending_approval',
          to_status: 'approved',
          message: comments ?? 'Aprovada',
          payload: { requestId: id, action: 'approve' },
          created_by: user.id,
        } as any);
      }

      return data as unknown as ApprovalRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Cotação aprovada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar: ${error.message}`);
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      if (!comments) throw new Error('Comentário obrigatório para rejeição');

      const { data, error } = await supabase
        .from('vtex_approval_requests')
        .update({
          status: 'rejected',
          approved_by: user.id,
          comments,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Atualizar status da cotação
      if (data?.quote_id) {
        await supabase
          .from('vtex_quotes')
          .update({ 
            status: 'rejected',
            is_authorized: false 
          })
          .eq('id', data.quote_id);

        // Evento (best-effort)
        await supabase.from('vtex_quote_events').insert({
          quote_id: data.quote_id,
          event_type: 'failed',
          from_status: 'pending_approval',
          to_status: 'rejected',
          message: comments,
          payload: { requestId: id, action: 'reject' },
          created_by: user.id,
        } as any);
      }

      return data as unknown as ApprovalRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Cotação rejeitada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao rejeitar: ${error.message}`);
    },
  });
}

export function useApprovalStats() {
  return useQuery({
    queryKey: ['approval-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vtex_approval_requests')
        .select('status, requested_at, decided_at');

      if (error) throw error;

      const rows = data ?? [];
      const stats: Record<string, number> = {
        pending: rows.filter((r: any) => r.status === 'pending').length,
        approved: rows.filter((r: any) => r.status === 'approved').length,
        rejected: rows.filter((r: any) => r.status === 'rejected').length,
        expired: rows.filter((r: any) => r.status === 'expired').length,
        total: rows.length,
      };

      // Calcular tempo médio de aprovação
      const approvedWithTime = rows.filter(
        (r: any) => r.status === 'approved' && r.decided_at && r.requested_at
      );
      
      if (approvedWithTime.length > 0) {
        const totalTime = approvedWithTime.reduce((acc: number, r: any) => {
          const requested = new Date(r.requested_at).getTime();
          const decided = new Date(r.decided_at!).getTime();
          return acc + (decided - requested);
        }, 0);
        
        stats['avgTimeHours'] = (totalTime / approvedWithTime.length) / (1000 * 60 * 60);
      }

      return stats;
    },
  });
}
