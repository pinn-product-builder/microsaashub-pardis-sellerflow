
import { Product, Customer, QuoteItem, TaxRule, FreightRate, PricingRule } from '@/types/cpq';
import { taxRules, freightRates, pricingRules } from '@/data/mockData';

export class PricingService {
  static calculateTaxes(product: Product, destinationUF: string, basePrice: number) {
    const rule = taxRules.find(r => r.uf === destinationUF);
    if (!rule) {
      throw new Error(`Regra fiscal não encontrada para UF: ${destinationUF}`);
    }

    const icms = (basePrice * rule.icms) / 100;
    const ipi = (basePrice * rule.ipi) / 100;
    const pis = (basePrice * rule.pis) / 100;
    const cofins = (basePrice * rule.cofins) / 100;

    return {
      icms,
      ipi,
      pis,
      cofins,
      total: icms + ipi + pis + cofins
    };
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
    customMargin?: number
  ): QuoteItem {
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
}
