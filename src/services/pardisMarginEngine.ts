// Motor de Cálculo de Margem Pardis (Dinâmico)
// Fórmula: Margem = Preço Ofertado - Custo - Adm% - Logística% - ICMS% - PIS/COFINS%
// Todas as regras são dinâmicas e vêm do banco de dados

import { Product, PricingConfig, Customer, MarginCalculation, AppRole, ApprovalRule, PricingEngineConfig } from '@/types/pardis';

// Default engine config for fallback when async loading
const DEFAULT_ENGINE_CONFIG: PricingEngineConfig = {
  id: 'default',
  default_markup_mg: 1.5,
  default_markup_br: 1.6,
  margin_green_threshold: 10,
  margin_yellow_threshold: 0,
  margin_orange_threshold: -5,
  margin_authorized_threshold: 0,
  minimum_price_margin_target: 1,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export class PardisMarginEngine {
  /**
   * Calcula a margem de um item (versão dinâmica)
   */
  static calculateItemMargin(
    product: Product,
    quantity: number,
    offeredPrice: number,
    customer: Customer,
    pricingConfig: PricingConfig,
    engineConfig?: PricingEngineConfig,
    approvalRules?: ApprovalRule[]
  ): MarginCalculation {
    const config = engineConfig || DEFAULT_ENGINE_CONFIG;
    
    // Determina o preço de tabela baseado na região do cliente (markup dinâmico)
    const listPrice = customer.price_table_type === 'MG' 
      ? (product.price_mg ?? product.base_cost * config.default_markup_mg)
      : (product.price_br ?? product.base_cost * config.default_markup_br);

    // Preço cluster (-X% para Lab-to-Lab) - percentual dinâmico
    const l2lDiscount = customer.is_lab_to_lab ? pricingConfig.lab_to_lab_discount / 100 : 0;
    const clusterPrice = listPrice * (1 - l2lDiscount);

    // Calcula a margem do cluster para determinar preço mínimo
    const clusterMarginPercent = this.calculateMarginPercent(
      clusterPrice,
      product.base_cost,
      pricingConfig
    );

    // Preço mínimo dinâmico baseado na heurística do JSON (BR-006)
    const minimumPrice = product.price_minimum ?? this.calculateMinimumPriceDynamic(
      clusterPrice,
      clusterMarginPercent,
      config.minimum_price_margin_target
    );

    // Calcula os custos
    const baseCost = product.base_cost;
    const adminCost = offeredPrice * (pricingConfig.admin_percent / 100);
    const logisticsCost = offeredPrice * (pricingConfig.logistics_percent / 100);
    const icmsCost = offeredPrice * (pricingConfig.icms_percent / 100);
    const pisCofins = offeredPrice * (pricingConfig.pis_cofins_percent / 100);

    const totalCosts = baseCost + adminCost + logisticsCost + icmsCost + pisCofins;

    // Margem
    const marginValue = (offeredPrice - totalCosts) * quantity;
    const marginPercent = offeredPrice > 0 
      ? ((offeredPrice - totalCosts) / offeredPrice) * 100 
      : 0;

    // Determina se está autorizado usando regras dinâmicas
    const { isAuthorized, requiredApproverRole } = approvalRules && approvalRules.length > 0
      ? this.determineAuthorizationDynamic(marginPercent, approvalRules, config.margin_authorized_threshold)
      : this.determineAuthorizationWithThreshold(marginPercent, config.margin_authorized_threshold);

    return {
      listPrice,
      clusterPrice,
      minimumPrice,
      offeredPrice,
      costs: {
        baseCost,
        adminCost,
        logisticsCost,
        icmsCost,
        pisCofins,
        total: totalCosts
      },
      marginValue,
      marginPercent,
      isAuthorized,
      requiredApproverRole
    };
  }

  /**
   * Calcula % da margem para um dado preço
   */
  static calculateMarginPercent(
    price: number,
    baseCost: number,
    pricingConfig: PricingConfig
  ): number {
    const adminCost = price * (pricingConfig.admin_percent / 100);
    const logisticsCost = price * (pricingConfig.logistics_percent / 100);
    const icmsCost = price * (pricingConfig.icms_percent / 100);
    const pisCofins = price * (pricingConfig.pis_cofins_percent / 100);
    const totalCosts = baseCost + adminCost + logisticsCost + icmsCost + pisCofins;
    
    return price > 0 ? ((price - totalCosts) / price) * 100 : 0;
  }

  /**
   * Calcula o preço mínimo dinâmico conforme JSON (BR-006)
   * Heurística: se margem cluster > target%, reduz preço para manter target%
   */
  static calculateMinimumPriceDynamic(
    clusterPrice: number,
    clusterMarginPercent: number,
    targetMarginPercent: number
  ): number {
    if (clusterMarginPercent > targetMarginPercent) {
      return clusterPrice * (1 - (clusterMarginPercent - targetMarginPercent) / 100);
    }
    return clusterPrice;
  }

  /**
   * Calcula o preço mínimo baseado no custo e configuração (fallback)
   */
  static calculateMinimumPrice(baseCost: number, pricingConfig: PricingConfig): number {
    const totalPercent = (
      pricingConfig.admin_percent +
      pricingConfig.logistics_percent +
      pricingConfig.icms_percent +
      pricingConfig.pis_cofins_percent
    ) / 100;

    return baseCost / (1 - totalPercent);
  }

  /**
   * Determina autorização baseado nas regras dinâmicas do banco
   */
  static determineAuthorizationDynamic(
    marginPercent: number,
    approvalRules: ApprovalRule[],
    authorizedThreshold: number = 0
  ): { 
    isAuthorized: boolean; 
    requiredApproverRole?: AppRole;
    ruleName?: string;
  } {
    // Se margem >= threshold configurado, autorizado automaticamente
    if (marginPercent >= authorizedThreshold) {
      return { isAuthorized: true };
    }

    // Ordena regras por margin_min (mais restritiva primeiro)
    const sortedRules = [...approvalRules]
      .filter(r => r.is_active)
      .sort((a, b) => (a.margin_min ?? -999) - (b.margin_min ?? -999));
    
    for (const rule of sortedRules) {
      const min = rule.margin_min ?? -Infinity;
      const max = rule.margin_max ?? Infinity;
      
      if (marginPercent >= min && marginPercent < max) {
        // Se regra é para vendedor, considera autorizado
        if (rule.approver_role === 'vendedor') {
          return { isAuthorized: true, ruleName: rule.name };
        }
        return {
          isAuthorized: false,
          requiredApproverRole: rule.approver_role,
          ruleName: rule.name
        };
      }
    }
    
    // Fallback: usa threshold simples
    return { isAuthorized: marginPercent >= authorizedThreshold };
  }

  /**
   * Determina autorização usando apenas o threshold configurável
   */
  static determineAuthorizationWithThreshold(
    marginPercent: number,
    authorizedThreshold: number = 0
  ): { 
    isAuthorized: boolean; 
    requiredApproverRole?: AppRole 
  } {
    if (marginPercent >= authorizedThreshold) {
      return { isAuthorized: true };
    } else if (marginPercent >= -5) {
      return { isAuthorized: false, requiredApproverRole: 'coordenador' };
    } else if (marginPercent >= -10) {
      return { isAuthorized: false, requiredApproverRole: 'gerente' };
    } else {
      return { isAuthorized: false, requiredApproverRole: 'diretor' };
    }
  }

  /**
   * Calcula o valor do cupom para VTEX (BR-003)
   * Baseline = cluster_price se L2L, senão list_price
   */
  static calculateCouponValue(
    items: Array<{
      quantity: number;
      listPrice: number;
      clusterPrice: number;
      offeredPrice: number;
      isLabToLab: boolean;
    }>
  ): number {
    return items.reduce((total, item) => {
      const baseline = item.isLabToLab ? item.clusterPrice : item.listPrice;
      const discount = (baseline - item.offeredPrice) * item.quantity;
      return total + Math.max(0, discount);
    }, 0);
  }

  /**
   * Calcula o valor do cupom (versão simplificada para compatibilidade)
   */
  static calculateCouponValueSimple(
    items: Array<{
      quantity: number;
      listPrice: number;
      offeredPrice: number;
    }>
  ): number {
    return items.reduce((total, item) => {
      const discount = (item.listPrice - item.offeredPrice) * item.quantity;
      return total + Math.max(0, discount);
    }, 0);
  }

  /**
   * Calcula resumo total da cotação
   */
  static calculateQuoteSummary(
    items: MarginCalculation[],
    quantities: number[],
    engineConfig?: PricingEngineConfig,
    approvalRules?: ApprovalRule[]
  ): {
    subtotal: number;
    totalOffered: number;
    totalDiscount: number;
    totalMarginValue: number;
    totalMarginPercent: number;
    couponValue: number;
    isAuthorized: boolean;
    requiresApproval: boolean;
    requiredApproverRole?: AppRole;
  } {
    const config = engineConfig || DEFAULT_ENGINE_CONFIG;
    
    let subtotal = 0;
    let totalOffered = 0;
    let totalMarginValue = 0;
    let totalCosts = 0;
    let worstMargin = 100;
    let requiredApproverRole: AppRole | undefined;

    items.forEach((item, index) => {
      const qty = quantities[index];
      subtotal += item.listPrice * qty;
      totalOffered += item.offeredPrice * qty;
      totalMarginValue += item.marginValue;
      totalCosts += item.costs.total * qty;

      if (item.marginPercent < worstMargin) {
        worstMargin = item.marginPercent;
        requiredApproverRole = item.requiredApproverRole;
      }
    });

    const totalDiscount = subtotal - totalOffered;
    const totalMarginPercent = totalOffered > 0 
      ? ((totalOffered - totalCosts) / totalOffered) * 100 
      : 0;

    // Usa threshold dinâmico para autorização
    const isAuthorized = worstMargin >= config.margin_authorized_threshold;
    const requiresApproval = !isAuthorized;

    const couponValue = this.calculateCouponValueSimple(
      items.map((item, index) => ({
        quantity: quantities[index],
        listPrice: item.listPrice,
        offeredPrice: item.offeredPrice
      }))
    );

    return {
      subtotal,
      totalOffered,
      totalDiscount,
      totalMarginValue,
      totalMarginPercent,
      couponValue,
      isAuthorized,
      requiresApproval,
      requiredApproverRole
    };
  }

  /**
   * Retorna a cor do semáforo baseado na margem (dinâmico)
   */
  static getMarginColorDynamic(
    marginPercent: number,
    thresholds: { green: number; yellow: number; orange: number }
  ): 'green' | 'yellow' | 'orange' | 'red' {
    if (marginPercent >= thresholds.green) return 'green';
    if (marginPercent >= thresholds.yellow) return 'yellow';
    if (marginPercent >= thresholds.orange) return 'orange';
    return 'red';
  }

  /**
   * Retorna a cor do semáforo baseado na margem (compatibilidade)
   */
  static getMarginColor(marginPercent: number): 'green' | 'yellow' | 'red' {
    if (marginPercent > 0) return 'green';
    if (marginPercent === 0) return 'yellow';
    return 'red';
  }

  /**
   * Formata a margem para exibição
   */
  static formatMargin(marginPercent: number): string {
    const sign = marginPercent >= 0 ? '+' : '';
    return `${sign}${marginPercent.toFixed(2)}%`;
  }

  /**
   * Formata valor em moeda
   */
  static formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
}
