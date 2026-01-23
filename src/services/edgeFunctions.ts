import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface PricingRequest {
  productId: string;
  customerId?: string;
  quantity: number;
  destinationUF: string;
  offeredPrice?: number;
}

interface TaxResult {
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  total: number;
}

interface PricingResult {
  listPrice: number;
  minimumPrice: number;
  offeredPrice: number;
  marginPercent: number;
  marginValue: number;
  taxes: TaxResult;
  freight: number;
  isAuthorized: boolean;
  requiresApproval: boolean;
  approverRole?: string;
  alerts: string[];
}

interface ApprovalCreateRequest {
  action: 'create';
  quoteId: string;
  reason?: string;
  marginPercent: number;
  totalValue: number;
}

interface ApprovalProcessRequest {
  action: 'approve' | 'reject';
  requestId: string;
  comments?: string;
}

interface ApprovalResult {
  success: boolean;
  approvalRequest?: any;
  requiredRole?: string;
  expiresAt?: string;
  status?: string;
  quoteId?: string;
}

export class EdgeFunctions {
  /**
   * Cria um orderForm na VTEX a partir de uma vtex_quote (server-side, com AppKey/Token)
   */
  static async createVtexOrderForm(params: { quoteId: string; tradePolicyId?: string; seller?: string }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Usuário não autenticado');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/vtex-create-orderform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(params)
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json?.error || 'Erro ao criar orderForm na VTEX');
    }
    return json as { success: boolean; orderFormId: string; orderForm: any };
  }

  /**
   * Calcula preço de forma segura no servidor
   */
  static async calculatePricing(request: PricingRequest): Promise<PricingResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/calculate-pricing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao calcular preço');
    }

    return response.json();
  }

  /**
   * Cria solicitação de aprovação no servidor
   */
  static async createApprovalRequest(
    quoteId: string,
    marginPercent: number,
    totalValue: number,
    reason?: string
  ): Promise<ApprovalResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    const request: ApprovalCreateRequest = {
      action: 'create',
      quoteId,
      marginPercent,
      totalValue,
      reason
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar solicitação de aprovação');
    }

    return response.json();
  }

  /**
   * Aprova uma solicitação no servidor
   */
  static async approveRequest(requestId: string, comments?: string): Promise<ApprovalResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    const request: ApprovalProcessRequest = {
      action: 'approve',
      requestId,
      comments
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao aprovar solicitação');
    }

    return response.json();
  }

  /**
   * Rejeita uma solicitação no servidor
   */
  static async rejectRequest(requestId: string, comments: string): Promise<ApprovalResult> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    const request: ApprovalProcessRequest = {
      action: 'reject',
      requestId,
      comments
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao rejeitar solicitação');
    }

    return response.json();
  }
}
