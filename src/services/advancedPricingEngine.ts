
import { Product, Customer, QuoteItem } from '@/types/cpq';
import { PricingService } from './pricingService';
import { PriceTableService, PriceTableItem } from './priceTableService';

export interface PricingContext {
  customer: Customer;
  product: Product;
  quantity: number;
  destinationUF: string;
  channel?: string;
  campaignCode?: string;
}

export interface PricingResult {
  basePrice: number;
  finalPrice: number;
  margin: number;
  discounts: Discount[];
  taxes: any;
  freight: number;
  alerts: PricingAlert[];
  approvalRequired: boolean;
  minimumPrice: number;
}

export interface Discount {
  type: 'VOLUME' | 'PROMOTIONAL' | 'CUSTOMER' | 'CAMPAIGN' | 'MANUAL';
  description: string;
  percentage: number;
  amount: number;
  priority: number;
}

export interface PricingAlert {
  type: 'WARNING' | 'ERROR' | 'INFO';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface Campaign {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED' | 'TIER';
  discountValue: number;
  minQuantity?: number;
  maxQuantity?: number;
  products: string[];
  customers: string[];
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
}

export class AdvancedPricingEngine {
  static calculateAdvancedPrice(context: PricingContext): PricingResult {
    const {
      customer,
      product,
      quantity,
      destinationUF,
      channel = 'B2B',
      campaignCode
    } = context;

    // 1. Obter preço base da tabela
    const priceTableItem = PriceTableService.getProductPrice(
      product.id,
      quantity,
      customer.id,
      channel
    );

    let basePrice = priceTableItem?.basePrice || product.baseCost;
    const minimumPrice = priceTableItem?.minimumPrice || (product.baseCost * 1.1);
    
    // 2. Aplicar margem padrão se não houver tabela
    if (!priceTableItem) {
      const margin = PricingService.calculateMargin(product, channel);
      basePrice = product.baseCost * (1 + margin / 100);
    }

    // 3. Calcular descontos
    const discounts = this.calculateDiscounts(context, basePrice, priceTableItem);
    const totalDiscountAmount = discounts.reduce((sum, d) => sum + d.amount, 0);
    
    // 4. Preço com desconto
    const discountedPrice = Math.max(basePrice - totalDiscountAmount, minimumPrice);
    
    // 5. Calcular impostos e frete
    const taxes = PricingService.calculateTaxes(product, destinationUF, discountedPrice);
    const freight = PricingService.calculateFreight(product, quantity, destinationUF);
    
    // 6. Preço final
    const finalPrice = discountedPrice + taxes.total + (freight / quantity);
    
    // 7. Calcular margem final
    const margin = ((discountedPrice - product.baseCost) / product.baseCost) * 100;
    
    // 8. Gerar alertas
    const alerts = this.generateAlerts(context, margin, discountedPrice, minimumPrice);
    
    // 9. Verificar se precisa aprovação
    const approvalRequired = this.requiresApproval(context, margin, totalDiscountAmount, basePrice);

    return {
      basePrice,
      finalPrice,
      margin,
      discounts,
      taxes,
      freight,
      alerts,
      approvalRequired,
      minimumPrice
    };
  }

  private static calculateDiscounts(
    context: PricingContext,
    basePrice: number,
    priceTableItem?: PriceTableItem | null
  ): Discount[] {
    const discounts: Discount[] = [];
    const { customer, product, quantity, campaignCode } = context;

    // 1. Desconto por volume
    if (priceTableItem?.tierPrices) {
      const tierPrice = priceTableItem.tierPrices.find(tier => 
        quantity >= tier.minQuantity && 
        (!tier.maxQuantity || quantity <= tier.maxQuantity)
      );
      
      if (tierPrice && tierPrice.discount > 0) {
        const discountAmount = (basePrice * tierPrice.discount) / 100;
        discounts.push({
          type: 'VOLUME',
          description: `Desconto por volume - ${quantity} unidades`,
          percentage: tierPrice.discount,
          amount: discountAmount,
          priority: 1
        });
      }
    }

    // 2. Desconto promocional
    if (priceTableItem?.promotionalPrice && priceTableItem.promotionalValidTo) {
      if (new Date() <= new Date(priceTableItem.promotionalValidTo)) {
        const discountAmount = basePrice - priceTableItem.promotionalPrice;
        if (discountAmount > 0) {
          discounts.push({
            type: 'PROMOTIONAL',
            description: 'Promoção ativa',
            percentage: (discountAmount / basePrice) * 100,
            amount: discountAmount,
            priority: 2
          });
        }
      }
    }

    // 3. Desconto por campanha
    if (campaignCode) {
      const campaign = this.getActiveCampaign(campaignCode, product.id, customer.id);
      if (campaign) {
        const discountAmount = campaign.discountType === 'PERCENTAGE' 
          ? (basePrice * campaign.discountValue) / 100
          : campaign.discountValue;
          
        discounts.push({
          type: 'CAMPAIGN',
          description: campaign.name,
          percentage: campaign.discountType === 'PERCENTAGE' ? campaign.discountValue : (discountAmount / basePrice) * 100,
          amount: discountAmount,
          priority: 3
        });
      }
    }

    // 4. Desconto especial do cliente (VIP)
    if (customer.priceTableId && customer.priceTableId.includes('VIP')) {
      const vipDiscount = basePrice * 0.05; // 5% para VIP
      discounts.push({
        type: 'CUSTOMER',
        description: 'Desconto cliente VIP',
        percentage: 5,
        amount: vipDiscount,
        priority: 4
      });
    }

    // Ordenar por prioridade e remover conflitos
    return discounts.sort((a, b) => a.priority - b.priority);
  }

  private static generateAlerts(
    context: PricingContext,
    margin: number,
    finalPrice: number,
    minimumPrice: number
  ): PricingAlert[] {
    const alerts: PricingAlert[] = [];
    const { customer, product } = context;

    // Alert de margem baixa
    const minMargin = PricingService.calculateMargin(product, 'B2B') * 0.6; // 60% da margem padrão
    if (margin < minMargin) {
      alerts.push({
        type: 'WARNING',
        message: `Margem baixa: ${margin.toFixed(1)}% (mínimo recomendado: ${minMargin.toFixed(1)}%)`,
        severity: 'MEDIUM'
      });
    }

    // Alert de preço mínimo
    if (finalPrice <= minimumPrice) {
      alerts.push({
        type: 'WARNING',
        message: 'Preço próximo ao mínimo permitido',
        severity: 'HIGH'
      });
    }

    // Alert de limite de crédito
    if (customer.creditLimit > 0 && finalPrice > customer.creditLimit * 0.1) {
      alerts.push({
        type: 'INFO',
        message: 'Verificar limite de crédito do cliente',
        severity: 'LOW'
      });
    }

    return alerts;
  }

  private static requiresApproval(
    context: PricingContext,
    margin: number,
    totalDiscount: number,
    basePrice: number
  ): boolean {
    const { product } = context;
    
    // Margem muito baixa
    const minMargin = PricingService.calculateMargin(product, 'B2B') * 0.5;
    if (margin < minMargin) return true;
    
    // Desconto muito alto
    const discountPercentage = (totalDiscount / basePrice) * 100;
    const maxDiscount = PricingService.getMaxDiscount(product, 'B2B');
    if (discountPercentage > maxDiscount) return true;
    
    // Valor alto da cotação
    if (basePrice > 50000) return true;
    
    return false;
  }

  private static getActiveCampaign(
    code: string,
    productId: string,
    customerId: string
  ): Campaign | null {
    // Mock de campanhas ativas
    const campaigns: Campaign[] = [
      {
        id: '1',
        code: 'BLACKFRIDAY2024',
        name: 'Black Friday 2024',
        description: 'Desconto especial Black Friday',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        products: [productId],
        customers: [],
        validFrom: new Date('2024-11-01'),
        validTo: new Date('2024-11-30'),
        isActive: true
      }
    ];
    
    const now = new Date();
    return campaigns.find(c => 
      c.code === code &&
      c.isActive &&
      now >= new Date(c.validFrom) &&
      now <= new Date(c.validTo) &&
      (c.products.length === 0 || c.products.includes(productId)) &&
      (c.customers.length === 0 || c.customers.includes(customerId))
    ) || null;
  }

  static simulateScenario(
    context: PricingContext,
    scenarios: { margin?: number; discount?: number; quantity?: number }[]
  ): PricingResult[] {
    return scenarios.map(scenario => {
      const modifiedContext = {
        ...context,
        quantity: scenario.quantity || context.quantity
      };
      
      const result = this.calculateAdvancedPrice(modifiedContext);
      
      // Aplicar ajustes do cenário
      if (scenario.margin) {
        const newPrice = context.product.baseCost * (1 + scenario.margin / 100);
        result.finalPrice = newPrice + result.taxes.total + (result.freight / context.quantity);
        result.margin = scenario.margin;
      }
      
      if (scenario.discount) {
        const discountAmount = (result.basePrice * scenario.discount) / 100;
        result.discounts.push({
          type: 'MANUAL',
          description: 'Desconto simulado',
          percentage: scenario.discount,
          amount: discountAmount,
          priority: 0
        });
        result.finalPrice -= discountAmount;
      }
      
      return result;
    });
  }
}
