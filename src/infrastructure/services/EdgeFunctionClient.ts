import { supabase } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface PricingRequest {
  productId: string;
  customerId?: string;
  quantity: number;
  destinationUF: string;
  offeredPrice?: number;
}

export interface PricingResult {
  listPrice: number;
  minimumPrice: number;
  offeredPrice: number;
  marginPercent: number;
  marginValue: number;
  taxes: {
    icms: number;
    ipi: number;
    pis: number;
    cofins: number;
    total: number;
  };
  freight: number;
  isAuthorized: boolean;
  requiresApproval: boolean;
  approverRole?: string;
  alerts: string[];
}

export interface ApprovalRequest {
  action: 'create' | 'approve' | 'reject';
  quoteId?: string;
  requestId?: string;
  reason?: string;
  marginPercent?: number;
  totalValue?: number;
  comments?: string;
}

export interface ApprovalResult {
  success: boolean;
  approvalRequest?: any;
  requiredRole?: string;
  expiresAt?: string;
  status?: string;
  quoteId?: string;
}

export class EdgeFunctionClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    };
  }

  async calculatePricing(request: PricingRequest): Promise<PricingResult> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-pricing`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao calcular preço');
    }

    return response.json();
  }

  async createApprovalRequest(
    quoteId: string,
    marginPercent: number,
    totalValue: number,
    reason?: string
  ): Promise<ApprovalResult> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-approval`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'create',
        quoteId,
        marginPercent,
        totalValue,
        reason
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar solicitação de aprovação');
    }

    return response.json();
  }

  async approveRequest(requestId: string, comments?: string): Promise<ApprovalResult> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-approval`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'approve',
        requestId,
        comments
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao aprovar solicitação');
    }

    return response.json();
  }

  async rejectRequest(requestId: string, comments: string): Promise<ApprovalResult> {
    const headers = await this.getAuthHeaders();

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-approval`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'reject',
        requestId,
        comments
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao rejeitar solicitação');
    }

    return response.json();
  }
}

// Singleton instance
export const edgeFunctionClient = new EdgeFunctionClient();
