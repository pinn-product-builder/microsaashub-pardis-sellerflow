// Motor de Cálculo de Margem Pardis
// Fórmula: Margem = Preço Ofertado - Custo - Adm% - Logística% - ICMS% - PIS/COFINS%

import { Product, PricingConfig, Customer, MarginCalculation, AppRole } from '@/types/pardis';

export class PardisMarginEngine {
  /**
   * Calcula a margem de um item
   */
  static calculateItemMargin(
    product: Product,
    quantity: number,
    offeredPrice: number,
    customer: Customer,
    pricingConfig: PricingConfig
  ): MarginCalculation {
    // Determina o preço de tabela baseado na região do cliente
    const listPrice = customer.price_table_type === 'MG' 
      ? (product.price_mg ?? product.base_cost * 1.5)
      : (product.price_br ?? product.base_cost * 1.6);

    // Preço cluster (-1% para Lab-to-Lab)
    const l2lDiscount = customer.is_lab_to_lab ? pricingConfig.lab_to_lab_discount / 100 : 0;
    const clusterPrice = listPrice * (1 - l2lDiscount);

    // Preço mínimo (se não definido, calcula como custo + impostos mínimos)
    const minimumPrice = product.price_minimum ?? this.calculateMinimumPrice(
      product.base_cost,
      pricingConfig
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

    // Determina se está autorizado e qual nível de aprovação necessário
    const { isAuthorized, requiredApproverRole } = this.determineAuthorization(marginPercent);

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
   * Calcula o preço mínimo baseado no custo e configuração
   */
  static calculateMinimumPrice(baseCost: number, pricingConfig: PricingConfig): number {
    // Preço mínimo = Custo / (1 - soma_percentuais)
    const totalPercent = (
      pricingConfig.admin_percent +
      pricingConfig.logistics_percent +
      pricingConfig.icms_percent +
      pricingConfig.pis_cofins_percent
    ) / 100;

    return baseCost / (1 - totalPercent);
  }

  /**
   * Determina autorização baseado na margem
   */
  static determineAuthorization(marginPercent: number): { 
    isAuthorized: boolean; 
    requiredApproverRole?: AppRole 
  } {
    if (marginPercent >= 0) {
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
   * Calcula o valor do cupom para VTEX
   * O cupom representa o desconto total dado em relação ao preço de tabela
   */
  static calculateCouponValue(
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
    quantities: number[]
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

    const isAuthorized = worstMargin >= 0;
    const requiresApproval = !isAuthorized;

    const couponValue = this.calculateCouponValue(
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
   * Retorna a cor do semáforo baseado na margem
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
