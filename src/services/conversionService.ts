
import { Quote } from '@/types/seller-flow';
import { 
  VTEXIntegrationSettings, 
  ApprovalRule, 
  ValidationRule, 
  ValidationResult, 
  ApprovalData,
  ConversionMetrics,
  ConversionTimeline,
  ConversionStep
} from '@/types/vtex';
import { VTEXService } from './vtexService';

const STORAGE_KEY_CONVERSIONS = 'conversion_history';
const STORAGE_KEY_APPROVALS = 'pending_approvals';

export class ConversionService {
  private static getConversions(): ConversionTimeline[] {
    const stored = localStorage.getItem(STORAGE_KEY_CONVERSIONS);
    return stored ? JSON.parse(stored) : [];
  }

  private static saveConversions(conversions: ConversionTimeline[]): void {
    localStorage.setItem(STORAGE_KEY_CONVERSIONS, JSON.stringify(conversions));
  }

  private static getPendingApprovals(): string[] {
    const stored = localStorage.getItem(STORAGE_KEY_APPROVALS);
    return stored ? JSON.parse(stored) : [];
  }

  private static savePendingApprovals(approvals: string[]): void {
    localStorage.setItem(STORAGE_KEY_APPROVALS, JSON.stringify(approvals));
  }

  static getDefaultApprovalRules(): ApprovalRule[] {
    return [
      {
        id: '1',
        name: 'Auto-aprovação para valores baixos',
        condition: 'value',
        operator: 'lt',
        value: 10000,
        action: 'auto_approve',
        priority: 1,
        isActive: true
      },
      {
        id: '2',
        name: 'Aprovação obrigatória para valores altos',
        condition: 'value',
        operator: 'gte',
        value: 100000,
        action: 'require_approval',
        priority: 2,
        isActive: true
      },
      {
        id: '3',
        name: 'Auto-aprovação para margem alta',
        condition: 'margin',
        operator: 'gte',
        value: 30,
        action: 'auto_approve',
        priority: 3,
        isActive: true
      }
    ];
  }

  static getDefaultValidationRules(): ValidationRule[] {
    return [
      {
        id: '1',
        name: 'Verificar estoque VTEX',
        type: 'stock',
        isRequired: true,
        isActive: true
      },
      {
        id: '2',
        name: 'Validar dados do cliente',
        type: 'customer',
        isRequired: true,
        isActive: true
      },
      {
        id: '3',
        name: 'Conferir preços e impostos',
        type: 'price',
        isRequired: false,
        isActive: true
      }
    ];
  }

  static async validateQuote(quote: Quote, validationRules: ValidationRule[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const rule of validationRules.filter(r => r.isActive)) {
      switch (rule.type) {
        case 'stock':
          results.push(await this.validateStock(quote, rule));
          break;
        case 'customer':
          results.push(this.validateCustomer(quote, rule));
          break;
        case 'price':
          results.push(this.validatePrices(quote, rule));
          break;
        case 'tax':
          results.push(this.validateTaxes(quote, rule));
          break;
        case 'product':
          results.push(this.validateProducts(quote, rule));
          break;
      }
    }

    return results;
  }

  private static async validateStock(quote: Quote, rule: ValidationRule): Promise<ValidationResult> {
    // Simular verificação de estoque
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const hasStockIssues = Math.random() < 0.1; // 10% chance de problema de estoque
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: hasStockIssues ? 'failed' : 'passed',
      message: hasStockIssues ? 'Alguns produtos estão com estoque baixo' : 'Estoque verificado com sucesso',
      details: hasStockIssues ? { lowStockItems: ['Produto A', 'Produto B'] } : null
    };
  }

  private static validateCustomer(quote: Quote, rule: ValidationRule): ValidationResult {
    const hasValidCnpj = quote.customer.cnpj && quote.customer.cnpj.length >= 14;
    const hasValidData = quote.customer.companyName && quote.customer.city && quote.customer.uf;
    
    const isValid = hasValidCnpj && hasValidData;
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: isValid ? 'passed' : 'failed',
      message: isValid ? 'Dados do cliente válidos' : 'Dados do cliente incompletos ou inválidos',
      details: !isValid ? { missingFields: ['CNPJ', 'Razão Social', 'Endereço'] } : null
    };
  }

  private static validatePrices(quote: Quote, rule: ValidationRule): ValidationResult {
    const hasNegativeMargin = quote.items.some(item => item.totalPrice < item.unitPrice * 0.8);
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: hasNegativeMargin ? 'warning' : 'passed',
      message: hasNegativeMargin ? 'Alguns itens possuem margem muito baixa' : 'Preços validados com sucesso',
      details: hasNegativeMargin ? { lowMarginItems: quote.items.filter(i => i.totalPrice < i.unitPrice * 0.8).length } : null
    };
  }

  private static validateTaxes(quote: Quote, rule: ValidationRule): ValidationResult {
    const hasTaxIssues = quote.totalTaxes < quote.subtotal * 0.05; // Menos de 5% de impostos pode ser suspeito
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: hasTaxIssues ? 'warning' : 'passed',
      message: hasTaxIssues ? 'Carga tributária parece baixa - verificar cálculos' : 'Impostos calculados corretamente'
    };
  }

  private static validateProducts(quote: Quote, rule: ValidationRule): ValidationResult {
    const hasInvalidProducts = quote.items.some(item => !item.product.sku || !item.product.name);
    
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      status: hasInvalidProducts ? 'failed' : 'passed',
      message: hasInvalidProducts ? 'Alguns produtos possuem dados incompletos' : 'Produtos validados com sucesso'
    };
  }

  static evaluateApprovalRules(quote: Quote, approvalRules: ApprovalRule[]): ApprovalData {
    const activeRules = approvalRules.filter(r => r.isActive).sort((a, b) => a.priority - b.priority);
    
    for (const rule of activeRules) {
      const matches = this.evaluateRule(quote, rule);
      
      if (matches) {
        switch (rule.action) {
          case 'auto_approve':
            return {
              status: 'approved',
              approvedBy: 'sistema',
              approvedAt: new Date(),
              comments: `Auto-aprovado pela regra: ${rule.name}`
            };
          case 'reject':
            return {
              status: 'rejected',
              rejectedBy: 'sistema',
              rejectedAt: new Date(),
              rejectionReason: `Rejeitado pela regra: ${rule.name}`
            };
          case 'require_approval':
            return {
              status: 'pending',
              comments: `Aprovação necessária pela regra: ${rule.name}`
            };
        }
      }
    }

    // Se nenhuma regra se aplica, requer aprovação manual
    return {
      status: 'pending',
      comments: 'Aprovação manual necessária'
    };
  }

  private static evaluateRule(quote: Quote, rule: ApprovalRule): boolean {
    switch (rule.condition) {
      case 'value':
        return this.compareValues(quote.total, rule.operator, Number(rule.value));
      case 'margin':
        const margin = ((quote.total - quote.subtotal) / quote.subtotal) * 100;
        return this.compareValues(margin, rule.operator, Number(rule.value));
      case 'customer':
        return quote.customer.companyName.toLowerCase().includes(String(rule.value).toLowerCase());
      case 'product':
        return quote.items.some(item => 
          item.product.name.toLowerCase().includes(String(rule.value).toLowerCase())
        );
      default:
        return false;
    }
  }

  private static compareValues(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      case 'eq': return actual === expected;
      default: return false;
    }
  }

  static async processConversion(quote: Quote): Promise<{ success: boolean; message: string; timeline: ConversionTimeline }> {
    const timeline: ConversionTimeline = {
      quoteId: quote.id,
      steps: []
    };

    try {
      // Passo 1: Inicialização
      timeline.steps.push({
        id: '1',
        name: 'Iniciando conversão',
        status: 'completed',
        timestamp: new Date(),
        details: 'Processo de conversão iniciado'
      });

      // Passo 2: Validações
      timeline.steps.push({
        id: '2',
        name: 'Executando validações',
        status: 'pending',
        timestamp: new Date()
      });

      const settings = VTEXService.getCurrentSettings();
      if (!settings) {
        throw new Error('Configurações VTEX não encontradas');
      }

      const validationResults = await this.validateQuote(quote, settings.validationRules || this.getDefaultValidationRules());
      const hasFailures = validationResults.some(r => r.status === 'failed');

      if (hasFailures) {
        timeline.steps[1].status = 'failed';
        timeline.steps[1].error = 'Falha nas validações pré-envio';
        return { success: false, message: 'Validações falharam', timeline };
      }

      timeline.steps[1].status = 'completed';
      timeline.steps[1].details = 'Todas as validações passaram';

      // Passo 3: Avaliação de aprovação
      timeline.steps.push({
        id: '3',
        name: 'Avaliando aprovação',
        status: 'pending',
        timestamp: new Date()
      });

      const approvalData = this.evaluateApprovalRules(quote, settings.approvalRules || this.getDefaultApprovalRules());

      if (approvalData.status === 'pending') {
        timeline.steps[2].status = 'completed';
        timeline.steps[2].details = 'Aprovação manual necessária';
        
        // Adicionar à lista de aprovações pendentes
        const pending = this.getPendingApprovals();
        pending.push(quote.id);
        this.savePendingApprovals(pending);

        return { success: true, message: 'Aguardando aprovação manual', timeline };
      }

      if (approvalData.status === 'rejected') {
        timeline.steps[2].status = 'failed';
        timeline.steps[2].error = approvalData.rejectionReason;
        return { success: false, message: 'Cotação rejeitada automaticamente', timeline };
      }

      timeline.steps[2].status = 'completed';
      timeline.steps[2].details = 'Aprovado automaticamente';

      // Passo 4: Envio para VTEX
      timeline.steps.push({
        id: '4',
        name: 'Enviando para VTEX',
        status: 'pending',
        timestamp: new Date()
      });

      const vtexResult = await VTEXService.sendOrderToVTEX(quote);

      if (!vtexResult.success) {
        timeline.steps[3].status = 'failed';
        timeline.steps[3].error = vtexResult.message;
        return { success: false, message: vtexResult.message, timeline };
      }

      timeline.steps[3].status = 'completed';
      timeline.steps[3].details = `Pedido criado: ${vtexResult.orderId}`;

      // Salvar timeline
      this.saveConversionTimeline(timeline);

      return { success: true, message: 'Conversão realizada com sucesso', timeline };

    } catch (error) {
      const currentStep = timeline.steps[timeline.steps.length - 1];
      if (currentStep) {
        currentStep.status = 'failed';
        currentStep.error = error instanceof Error ? error.message : 'Erro desconhecido';
      }

      return { success: false, message: 'Erro na conversão', timeline };
    }
  }

  private static saveConversionTimeline(timeline: ConversionTimeline): void {
    const conversions = this.getConversions();
    const existingIndex = conversions.findIndex(c => c.quoteId === timeline.quoteId);
    
    if (existingIndex >= 0) {
      conversions[existingIndex] = timeline;
    } else {
      conversions.push(timeline);
    }
    
    this.saveConversions(conversions);
  }

  static getConversionTimeline(quoteId: string): ConversionTimeline | null {
    const conversions = this.getConversions();
    return conversions.find(c => c.quoteId === quoteId) || null;
  }

  static getConversionMetrics(): ConversionMetrics {
    const conversions = this.getConversions();
    const vtexLogs = VTEXService.getIntegrationLogs();
    
    const totalQuotes = conversions.length;
    const convertedQuotes = conversions.filter(c => 
      c.steps.some(s => s.name === 'Enviando para VTEX' && s.status === 'completed')
    ).length;
    
    const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;
    
    const successfulIntegrations = vtexLogs.filter(l => l.status === 'success').length;
    const failedIntegrations = vtexLogs.filter(l => l.status === 'error').length;
    
    const pendingApprovals = this.getPendingApprovals().length;
    
    // Calcular tempo médio de conversão (simulado)
    const averageConversionTime = 2.5; // em horas
    
    // Calcular receita total (simulado)
    const totalRevenue = convertedQuotes * 50000; // valor médio simulado
    
    return {
      totalQuotes,
      convertedQuotes,
      conversionRate,
      averageConversionTime,
      totalRevenue,
      successfulIntegrations,
      failedIntegrations,
      pendingApprovals
    };
  }

  static approveQuote(quoteId: string, approvedBy: string, comments?: string): boolean {
    const pending = this.getPendingApprovals();
    const index = pending.indexOf(quoteId);
    
    if (index === -1) return false;
    
    pending.splice(index, 1);
    this.savePendingApprovals(pending);
    
    // Atualizar timeline
    const timeline = this.getConversionTimeline(quoteId);
    if (timeline) {
      const approvalStep = timeline.steps.find(s => s.name === 'Avaliando aprovação');
      if (approvalStep) {
        approvalStep.status = 'completed';
        approvalStep.details = `Aprovado por ${approvedBy}${comments ? ': ' + comments : ''}`;
      }
      this.saveConversionTimeline(timeline);
    }
    
    return true;
  }

  static rejectQuote(quoteId: string, rejectedBy: string, reason: string): boolean {
    const pending = this.getPendingApprovals();
    const index = pending.indexOf(quoteId);
    
    if (index === -1) return false;
    
    pending.splice(index, 1);
    this.savePendingApprovals(pending);
    
    // Atualizar timeline
    const timeline = this.getConversionTimeline(quoteId);
    if (timeline) {
      const approvalStep = timeline.steps.find(s => s.name === 'Avaliando aprovação');
      if (approvalStep) {
        approvalStep.status = 'failed';
        approvalStep.error = `Rejeitado por ${rejectedBy}: ${reason}`;
      }
      this.saveConversionTimeline(timeline);
    }
    
    return true;
  }
}
