
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

const STORAGE_KEY = 'cpq_approval_requests';
const RULES_STORAGE_KEY = 'cpq_approval_rules';

export class ApprovalService {
  private static getRequests(): ApprovalRequest[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  private static saveRequests(requests: ApprovalRequest[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }

  private static getRules(): ApprovalRule[] {
    const stored = localStorage.getItem(RULES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : this.getDefaultRules();
  }

  private static getDefaultRules(): ApprovalRule[] {
    const defaultRules: ApprovalRule[] = [
      {
        id: '1',
        name: 'Aprovação por Valor Alto',
        description: 'Cotações acima de R$ 50.000 precisam de aprovação',
        condition: {
          type: 'VALUE',
          operator: 'GT',
          value: 50000
        },
        approver: {
          role: 'MANAGER',
          department: 'SALES'
        },
        priority: 'HIGH',
        isActive: true
      },
      {
        id: '2',
        name: 'Aprovação por Margem Baixa',
        description: 'Margens abaixo de 10% precisam de aprovação',
        condition: {
          type: 'MARGIN',
          operator: 'LT',
          value: 10
        },
        approver: {
          role: 'DIRECTOR',
          department: 'COMMERCIAL'
        },
        priority: 'MEDIUM',
        isActive: true
      },
      {
        id: '3',
        name: 'Aprovação por Desconto Alto',
        description: 'Descontos acima de 15% precisam de aprovação',
        condition: {
          type: 'DISCOUNT',
          operator: 'GT',
          value: 15
        },
        approver: {
          role: 'MANAGER',
          department: 'SALES'
        },
        priority: 'MEDIUM',
        isActive: true
      }
    ];

    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(defaultRules));
    return defaultRules;
  }

  static createApprovalRequest(
    quoteId: string,
    quoteNumber: string,
    requestedBy: string,
    reason: string,
    value: number,
    margin: number,
    discount: number
  ): ApprovalRequest {
    const requests = this.getRequests();
    const priority = this.calculatePriority(value, margin, discount);
    
    const newRequest: ApprovalRequest = {
      id: crypto.randomUUID(),
      quoteId,
      quoteNumber,
      requestedBy,
      reason,
      value,
      margin,
      discount,
      status: 'PENDING',
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    };

    requests.push(newRequest);
    this.saveRequests(requests);
    
    // Notificar aprovador
    this.notifyApprover(newRequest);
    
    return newRequest;
  }

  static approveRequest(
    requestId: string,
    approver: string,
    comments?: string
  ): ApprovalRequest | null {
    const requests = this.getRequests();
    const request = requests.find(r => r.id === requestId);
    
    if (!request || request.status !== 'PENDING') return null;
    
    request.status = 'APPROVED';
    request.approver = approver;
    request.approvedAt = new Date();
    request.updatedAt = new Date();
    request.comments = comments;
    
    this.saveRequests(requests);
    return request;
  }

  static rejectRequest(
    requestId: string,
    approver: string,
    comments: string
  ): ApprovalRequest | null {
    const requests = this.getRequests();
    const request = requests.find(r => r.id === requestId);
    
    if (!request || request.status !== 'PENDING') return null;
    
    request.status = 'REJECTED';
    request.approver = approver;
    request.approvedAt = new Date();
    request.updatedAt = new Date();
    request.comments = comments;
    
    this.saveRequests(requests);
    return request;
  }

  static getPendingRequests(): ApprovalRequest[] {
    return this.getRequests()
      .filter(r => r.status === 'PENDING' && new Date() < new Date(r.expiresAt))
      .sort((a, b) => {
        const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
  }

  static getRequestsByQuote(quoteId: string): ApprovalRequest[] {
    return this.getRequests().filter(r => r.quoteId === quoteId);
  }

  static isApprovalRequired(value: number, margin: number, discount: number): boolean {
    const rules = this.getRules().filter(r => r.isActive);
    
    return rules.some(rule => {
      const { condition } = rule;
      let checkValue = 0;
      
      switch (condition.type) {
        case 'VALUE':
          checkValue = value;
          break;
        case 'MARGIN':
          checkValue = margin;
          break;
        case 'DISCOUNT':
          checkValue = discount;
          break;
      }
      
      switch (condition.operator) {
        case 'GT':
          return checkValue > condition.value;
        case 'LT':
          return checkValue < condition.value;
        case 'GTE':
          return checkValue >= condition.value;
        case 'LTE':
          return checkValue <= condition.value;
        case 'EQ':
          return checkValue === condition.value;
        default:
          return false;
      }
    });
  }

  private static calculatePriority(
    value: number,
    margin: number,
    discount: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (value > 100000 || margin < 5 || discount > 25) return 'URGENT';
    if (value > 50000 || margin < 10 || discount > 15) return 'HIGH';
    if (value > 25000 || margin < 15 || discount > 10) return 'MEDIUM';
    return 'LOW';
  }

  private static notifyApprover(request: ApprovalRequest): void {
    // Mock de notificação - em produção enviaria email/SMS
    console.log(`Notificação: Nova aprovação pendente - ${request.quoteNumber}`);
    console.log(`Valor: R$ ${request.value.toLocaleString('pt-BR')}`);
    console.log(`Prioridade: ${request.priority}`);
  }

  static getApprovalStats(): {
    pending: number;
    approved: number;
    rejected: number;
    expired: number;
    averageTime: number;
  } {
    const requests = this.getRequests();
    const now = new Date();
    
    const pending = requests.filter(r => 
      r.status === 'PENDING' && new Date(r.expiresAt) > now
    ).length;
    
    const approved = requests.filter(r => r.status === 'APPROVED').length;
    const rejected = requests.filter(r => r.status === 'REJECTED').length;
    
    const expired = requests.filter(r => 
      r.status === 'PENDING' && new Date(r.expiresAt) <= now
    ).length;
    
    // Calcular tempo médio de aprovação (em horas)
    const processedRequests = requests.filter(r => 
      r.status !== 'PENDING' && r.approvedAt
    );
    
    const averageTime = processedRequests.length > 0
      ? processedRequests.reduce((sum, r) => {
          const diff = new Date(r.approvedAt!).getTime() - new Date(r.createdAt).getTime();
          return sum + (diff / (1000 * 60 * 60)); // converter para horas
        }, 0) / processedRequests.length
      : 0;
    
    return {
      pending,
      approved,
      rejected,
      expired,
      averageTime
    };
  }
}
