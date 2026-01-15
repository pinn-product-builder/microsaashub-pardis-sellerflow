import { Product, Customer, QuoteItem, TaxRule, FreightRate, PricingRule } from '@/types/seller-flow';
import { freightRates, pricingRules } from '@/data/mockData';
import { AdvancedPricingEngine, PricingContext } from './advancedPricingEngine';
import { ApprovalService } from './approvalService';
import { TaxService } from './taxService';
import { taxRulesCache, DatabaseTaxRule } from './taxRulesCache';

// Variável para armazenar regras carregadas do banco
let cachedTaxRules: DatabaseTaxRule[] = [];

// Função para inicializar o cache de regras fiscais
export async function initializePricingService(): Promise<void> {
  cachedTaxRules = await taxRulesCache.loadRules();
}

export class PricingService {
  static calculateTaxes(product: Product, destinationUF: string, basePrice: number) {
    // Buscar regra do cache (síncrono para manter compatibilidade)
    let rule = cachedTaxRules.find(r => r.uf === destinationUF);
    
    // Fallback para SP ou primeira regra disponível
    if (!rule) {
      rule = cachedTaxRules.find(r => r.uf === 'SP') || cachedTaxRules[0];
    }
    
    // Se ainda não há regra (cache vazio), usar valores padrão
    if (!rule) {
      console.warn(`Cache de regras fiscais vazio. Usando valores padrão para UF: ${destinationUF}`);
      return {
        icms: (basePrice * 18) / 100,
        ipi: (basePrice * 5) / 100,
        pis: (basePrice * 1.65) / 100,
        cofins: (basePrice * 7.6) / 100,
        total: (basePrice * 32.25) / 100,
        taxBasis: basePrice,
        effectiveRate: 32.25
      };
    }

    const icms = (basePrice * rule.icms) / 100;
    const ipi = (basePrice * rule.ipi) / 100;
    const pis = (basePrice * rule.pis) / 100;
    const cofins = (basePrice * rule.cofins) / 100;
    const fcp = rule.fcp ? (basePrice * rule.fcp) / 100 : 0;

    return {
      icms,
      ipi,
      pis,
      cofins,
      fcp,
      total: icms + ipi + pis + cofins + fcp,
      taxBasis: basePrice,
      effectiveRate: ((icms + ipi + pis + cofins + fcp) / basePrice) * 100
    };
  }

  // Versão assíncrona para casos onde precisamos garantir dados atualizados
  static async calculateTaxesAsync(product: Product, destinationUF: string, basePrice: number) {
    await taxRulesCache.loadRules();
    cachedTaxRules = taxRulesCache.getRulesCached();
    return this.calculateTaxes(product, destinationUF, basePrice);
  }

  static calculateFreight(product: Product, quantity: number, destinationUF: string) {
    const totalWeight = product.weight * quantity;
    const rate = freightRates.find(r => 
      r.originUF === 'SP' && 
      r.destinationUF === destinationUF &&
      totalWeight >= r.weightMin && 
      totalWeight <= r.weightMax
    );

    if (!rate) {
      // Fallback para peso maior que tabela
      const fallbackRate = freightRates.find(r => 
        r.originUF === 'SP' && r.destinationUF === destinationUF
      );
      if (fallbackRate) {
        const freightValue = Math.max(totalWeight * fallbackRate.ratePerKg, fallbackRate.minimumValue);
        return freightValue * quantity;
      }
      return 50 * quantity; // Valor padrão
    }

    const freightValue = Math.max(totalWeight * rate.ratePerKg, rate.minimumValue);
    return freightValue;
  }

  static calculateMargin(product: Product, channel: string = 'B2B') {
    const rule = pricingRules.find(r => 
      r.category === product.category && r.channel === channel
    );
    
    return rule ? rule.standardMargin : 25; // Margem padrão 25%
  }

  static calculateQuoteItem(
    product: Product, 
    quantity: number, 
    destinationUF: string,
    customer?: Customer,
    customMargin?: number,
    campaignCode?: string
  ): QuoteItem {
    // Usar motor avançado se há cliente
    if (customer) {
      const context: PricingContext = {
        customer,
        product,
        quantity,
        destinationUF,
        channel: 'B2B',
        campaignCode
      };

      const advancedResult = AdvancedPricingEngine.calculateAdvancedPrice(context);
      
      // Usar TaxService para cálculos fiscais avançados
      const taxContext = {
        product,
        customer,
        quantity,
        unitPrice: advancedResult.finalPrice,
        originUF: 'SP',
        destinationUF,
        operationType: 'VENDA' as const,
        paymentTerm: 'À vista'
      };

      const taxResult = TaxService.calculateAdvancedTaxes(taxContext);
      
      return {
        id: `${product.id}-${Date.now()}`,
        product,
        quantity,
        unitPrice: advancedResult.finalPrice,
        totalPrice: advancedResult.finalPrice * quantity,
        taxes: taxResult.taxes,
        freight: advancedResult.freight,
        margin: advancedResult.margin,
        // Propriedades adicionais do motor avançado
        discounts: advancedResult.discounts,
        alerts: advancedResult.alerts,
        approvalRequired: advancedResult.approvalRequired,
        minimumPrice: advancedResult.minimumPrice,
        // Alertas fiscais do TaxService
        taxAlerts: taxResult.benefits.map(benefit => ({
          type: 'TAX_BENEFIT' as const,
          message: `Benefício aplicado: ${benefit.name}`,
          impact: 'POSITIVE' as const
        }))
      };
    }

    // Cálculo básico (fallback)
    const margin = customMargin || this.calculateMargin(product);
    const basePrice = product.baseCost * (1 + margin / 100);
    
    const taxes = this.calculateTaxes(product, destinationUF, basePrice);
    const freight = this.calculateFreight(product, quantity, destinationUF);
    
    const unitPrice = basePrice + taxes.total + (freight / quantity);
    const totalPrice = unitPrice * quantity;

    return {
      id: `${product.id}-${Date.now()}`,
      product,
      quantity,
      unitPrice,
      totalPrice,
      taxes,
      freight,
      margin
    };
  }

  static validateMargin(product: Product, margin: number, channel: string = 'B2B'): boolean {
    const rule = pricingRules.find(r => 
      r.category === product.category && r.channel === channel
    );
    
    if (!rule) return true;
    return margin >= rule.minimumMargin;
  }

  static getMaxDiscount(product: Product, channel: string = 'B2B'): number {
    const rule = pricingRules.find(r => 
      r.category === product.category && r.channel === channel
    );
    
    return rule ? rule.maxDiscount : 5;
  }

  // Novos métodos para motor avançado
  static simulatePricing(
    product: Product,
    customer: Customer,
    quantity: number,
    destinationUF: string,
    scenarios: { margin?: number; discount?: number; quantity?: number }[]
  ) {
    const context: PricingContext = {
      customer,
      product,
      quantity,
      destinationUF,
      channel: 'B2B'
    };

    return AdvancedPricingEngine.simulateScenario(context, scenarios);
  }

  static async checkApprovalRequired(
    value: number,
    margin: number,
    discount: number
  ): Promise<boolean> {
    return ApprovalService.isApprovalRequired(value, margin, discount);
  }

  static createApprovalRequest(
    quoteId: string,
    quoteNumber: string,
    requestedBy: string,
    reason: string,
    value: number,
    margin: number,
    discount: number
  ) {
    return ApprovalService.createApprovalRequest(
      quoteId,
      quoteNumber,
      requestedBy,
      reason,
      value,
      margin,
      discount
    );
  }

  // Novos métodos integrados com TaxService
  static calculateAdvancedTaxes(
    product: Product,
    customer: Customer,
    quantity: number,
    unitPrice: number,
    destinationUF: string
  ) {
    const context = {
      product,
      customer,
      quantity,
      unitPrice,
      originUF: 'SP',
      destinationUF,
      operationType: 'VENDA' as const,
      paymentTerm: 'À vista'
    };

    return TaxService.calculateAdvancedTaxes(context);
  }

  static simulateTaxScenarios(
    product: Product,
    customer: Customer,
    quantity: number,
    unitPrice: number,
    destinationUF: string,
    scenarios: any[]
  ) {
    const context = {
      product,
      customer,
      quantity,
      unitPrice,
      originUF: 'SP',
      destinationUF,
      operationType: 'VENDA' as const,
      paymentTerm: 'À vista'
    };

    return TaxService.simulateScenarios(context, scenarios);
  }

  static getTaxBreakdown(taxes: any) {
    return TaxService.getTaxBreakdown(taxes);
  }

  // Otimização de margem
  static optimizeMargin(product: Product, targetMargin: number, constraints?: {
    maxDiscount?: number;
    minPrice?: number;
  }) {
    const currentMargin = this.calculateMargin(product);
    const maxDiscount = constraints?.maxDiscount || this.getMaxDiscount(product);
    const minPrice = constraints?.minPrice || product.baseCost * 1.1;
    
    const optimizedPrice = product.baseCost * (1 + targetMargin / 100);
    const maxDiscountedPrice = optimizedPrice * (1 - maxDiscount / 100);
    
    return {
      targetPrice: Math.max(optimizedPrice, minPrice),
      achievableMargin: targetMargin,
      maxDiscountPrice: maxDiscountedPrice,
      recommendation: targetMargin > currentMargin 
        ? 'Aumento de preço necessário'
        : 'Redução de margem possível',
      riskLevel: targetMargin < 15 ? 'HIGH' : targetMargin < 20 ? 'MEDIUM' : 'LOW'
    };
  }

  // Método para recarregar cache de regras fiscais
  static async refreshTaxRulesCache(): Promise<void> {
    taxRulesCache.invalidateCache();
    cachedTaxRules = await taxRulesCache.loadRules();
  }

  // Getter para regras fiscais atuais (para debug)
  static getCurrentTaxRules(): DatabaseTaxRule[] {
    return cachedTaxRules;
  }
}
