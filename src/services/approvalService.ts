import { supabase } from "@/integrations/supabase/client";
import { EdgeFunctions } from "./edgeFunctions";

export interface ApprovalRequest {
  id: string;
  quoteId: string;
  quoteNumber: string;
  requestedBy: string;
  reason: string;
  value: number;
  margin: number;
  discount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  approver?: string;
  approvedAt?: Date;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  condition: {
    type: 'VALUE' | 'MARGIN' | 'DISCOUNT';
    operator: 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ';
    value: number;
  };
  approver: {
    role: string;
    userId?: string;
    department?: string;
  };
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isActive: boolean;
}

/**
 * Serviço de aprovações - agora usa Edge Functions e Supabase
 * Removido o uso de localStorage para segurança
 */
export class ApprovalService {
  /**
   * Cria solicitação de aprovação via Edge Function
   */
  static async createApprovalRequest(
    quoteId: string,
    quoteNumber: string,
    requestedBy: string,
    reason: string,
    value: number,
    margin: number,
    discount: number
  ): Promise<ApprovalRequest | null> {
    try {
      const result = await EdgeFunctions.createApprovalRequest(
        quoteId,
        margin,
        value,
        reason
      );

      if (result.success && result.approvalRequest) {
        // Notificar aprovador (console por enquanto)
        console.log(`Notificação: Nova aprovação pendente - ${quoteNumber}`);
        console.log(`Valor: R$ ${value.toLocaleString('pt-BR')}`);
        console.log(`Aprovador necessário: ${result.requiredRole}`);

        return {
          id: result.approvalRequest.id,
          quoteId,
          quoteNumber,
          requestedBy,
          reason,
          value,
          margin,
          discount,
          status: 'PENDING',
          priority: this.mapPriority(result.approvalRequest.priority),
          createdAt: new Date(result.approvalRequest.created_at),
          updatedAt: new Date(result.approvalRequest.updated_at),
          expiresAt: result.expiresAt ? new Date(result.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao criar solicitação de aprovação:', error);
      throw error;
    }
  }

  /**
   * Aprova uma solicitação via Edge Function
   */
  static async approveRequest(
    requestId: string,
    approver: string,
    comments?: string
  ): Promise<boolean> {
    try {
      const result = await EdgeFunctions.approveRequest(requestId, comments);
      return result.success;
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
      throw error;
    }
  }

  /**
   * Rejeita uma solicitação via Edge Function
   */
  static async rejectRequest(
    requestId: string,
    approver: string,
    comments: string
  ): Promise<boolean> {
    try {
      const result = await EdgeFunctions.rejectRequest(requestId, comments);
      return result.success;
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      throw error;
    }
  }

  /**
   * Busca solicitações pendentes do Supabase
   */
  static async getPendingRequests(): Promise<ApprovalRequest[]> {
    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        quotes(quote_number, total_offered, total_margin_percent)
      `)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('priority', { ascending: false });

    if (error) {
      console.error('Erro ao buscar solicitações pendentes:', error);
      return [];
    }

    return (data || []).map(this.mapToApprovalRequest);
  }

  /**
   * Busca todas as aprovações do Supabase
   */
  static async getAllApprovals(): Promise<ApprovalRequest[]> {
    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        quotes(quote_number, total_offered, total_margin_percent)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar aprovações:', error);
      return [];
    }

    return (data || []).map(this.mapToApprovalRequest);
  }

  /**
   * Busca solicitações por cotação do Supabase
   */
  static async getRequestsByQuote(quoteId: string): Promise<ApprovalRequest[]> {
    const { data, error } = await supabase
      .from('approval_requests')
      .select(`
        *,
        quotes(quote_number, total_offered, total_margin_percent)
      `)
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar solicitações por cotação:', error);
      return [];
    }

    return (data || []).map(this.mapToApprovalRequest);
  }

  /**
   * Verifica se aprovação é necessária - consulta regras do Supabase
   */
  static async isApprovalRequired(value: number, margin: number, discount: number): Promise<boolean> {
    const { data: rules, error } = await supabase
      .from('approval_rules')
      .select('*')
      .eq('is_active', true);

    if (error || !rules) {
      console.error('Erro ao buscar regras de aprovação:', error);
      return false;
    }

    return rules.some(rule => {
      // Verifica se margem está na faixa que requer aprovação
      const marginMin = rule.margin_min ?? 0;
      const marginMax = rule.margin_max ?? 100;
      return margin >= marginMin && margin <= marginMax;
    });
  }

  /**
   * Busca estatísticas de aprovação do Supabase
   */
  static async getApprovalStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
    averageTime: number;
  }> {
    const now = new Date().toISOString();

    // Buscar todas as aprovações
    const { data, error } = await supabase
      .from('approval_requests')
      .select('status, created_at, decided_at, expires_at');

    if (error || !data) {
      return { pending: 0, approved: 0, rejected: 0, expired: 0, averageTime: 0 };
    }

    const pending = data.filter(r => 
      r.status === 'pending' && r.expires_at && new Date(r.expires_at) > new Date()
    ).length;

    const approved = data.filter(r => r.status === 'approved').length;
    const rejected = data.filter(r => r.status === 'rejected').length;

    const expired = data.filter(r => 
      r.status === 'pending' && r.expires_at && new Date(r.expires_at) <= new Date()
    ).length;

    // Calcular tempo médio de aprovação (em horas)
    const processedRequests = data.filter(r => 
      r.status !== 'pending' && r.decided_at
    );

    const averageTime = processedRequests.length > 0
      ? processedRequests.reduce((sum, r) => {
          const diff = new Date(r.decided_at!).getTime() - new Date(r.created_at).getTime();
          return sum + (diff / (1000 * 60 * 60));
        }, 0) / processedRequests.length
      : 0;

    return { pending, approved, rejected, expired, averageTime };
  }

  // Helpers privados
  private static mapPriority(priority: string | null): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    const priorityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = {
      'low': 'LOW',
      'medium': 'MEDIUM',
      'high': 'HIGH',
      'critical': 'URGENT'
    };
    return priorityMap[priority?.toLowerCase() ?? 'medium'] || 'MEDIUM';
  }

  private static mapStatus(status: string): 'PENDING' | 'APPROVED' | 'REJECTED' {
    const statusMap: Record<string, 'PENDING' | 'APPROVED' | 'REJECTED'> = {
      'pending': 'PENDING',
      'approved': 'APPROVED',
      'rejected': 'REJECTED'
    };
    return statusMap[status] || 'PENDING';
  }

  private static mapToApprovalRequest(row: any): ApprovalRequest {
    return {
      id: row.id,
      quoteId: row.quote_id,
      quoteNumber: row.quotes?.quote_number ?? '',
      requestedBy: row.requested_by,
      reason: row.reason ?? '',
      value: row.quote_total ?? 0,
      margin: row.quote_margin_percent ?? 0,
      discount: 0,
      status: ApprovalService.mapStatus(row.status),
      priority: ApprovalService.mapPriority(row.priority),
      approver: row.approved_by,
      approvedAt: row.decided_at ? new Date(row.decided_at) : undefined,
      comments: row.comments,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
  }
}
