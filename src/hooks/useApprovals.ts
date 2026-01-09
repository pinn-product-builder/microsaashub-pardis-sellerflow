import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ApprovalRequest, ApprovalStatus } from '@/types/pardis';
import { toast } from 'sonner';

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_requests')
        .select(`
          *,
          quote:quotes(*, customer:customers(*)),
          rule:approval_rules(*)
        `)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as ApprovalRequest[];
    },
  });
}

export function useApprovalRequests(quoteId?: string) {
  return useQuery({
    queryKey: ['approvals', quoteId],
    queryFn: async () => {
      let query = supabase
        .from('approval_requests')
        .select(`
          *,
          quote:quotes(*, customer:customers(*)),
          rule:approval_rules(*)
        `)
        .order('requested_at', { ascending: false });

      if (quoteId) {
        query = query.eq('quote_id', quoteId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ApprovalRequest[];
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
        .from('approval_requests')
        .insert({
          ...input,
          requested_by: user.id,
          status: 'pending' as ApprovalStatus,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar status da cotação
      await supabase
        .from('quotes')
        .update({ 
          status: 'pending_approval',
          requires_approval: true 
        })
        .eq('id', input.quote_id);

      return data as ApprovalRequest;
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
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('approval_requests')
        .update({
          status: 'approved' as ApprovalStatus,
          approved_by: user.id,
          comments,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, quote:quotes(*)')
        .single();

      if (error) throw error;

      // Atualizar status da cotação
      if (data.quote_id) {
        await supabase
          .from('quotes')
          .update({ 
            status: 'approved',
            is_authorized: true 
          })
          .eq('id', data.quote_id);
      }

      return data as ApprovalRequest;
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
        .from('approval_requests')
        .update({
          status: 'rejected' as ApprovalStatus,
          approved_by: user.id,
          comments,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, quote:quotes(*)')
        .single();

      if (error) throw error;

      // Atualizar status da cotação
      if (data.quote_id) {
        await supabase
          .from('quotes')
          .update({ 
            status: 'rejected',
            is_authorized: false 
          })
          .eq('id', data.quote_id);
      }

      return data as ApprovalRequest;
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
        .from('approval_requests')
        .select('status, requested_at, decided_at');

      if (error) throw error;

      const stats = {
        pending: data.filter(r => r.status === 'pending').length,
        approved: data.filter(r => r.status === 'approved').length,
        rejected: data.filter(r => r.status === 'rejected').length,
        expired: data.filter(r => r.status === 'expired').length,
        total: data.length,
      };

      // Calcular tempo médio de aprovação
      const approvedWithTime = data.filter(
        r => r.status === 'approved' && r.decided_at && r.requested_at
      );
      
      if (approvedWithTime.length > 0) {
        const totalTime = approvedWithTime.reduce((acc, r) => {
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
