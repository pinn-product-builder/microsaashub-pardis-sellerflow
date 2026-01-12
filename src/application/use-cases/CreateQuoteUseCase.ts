import { Quote, CreateQuoteProps } from '@/domain/quote/entities/Quote';
import { CreateQuoteItemProps } from '@/domain/quote/entities/QuoteItem';
import { IQuoteRepository } from '@/domain/quote/repositories/IQuoteRepository';
import { NotFoundError, BusinessRuleError } from '@/domain/shared/DomainError';
import { EdgeFunctionClient, PricingResult } from '@/infrastructure/services/EdgeFunctionClient';

export interface CreateQuoteInput {
  customerId: string;
  customerName?: string;
  paymentConditionId?: string;
  validUntil: string;
  notes?: string;
  items: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    baseCost: number;
  }>;
}

export interface CreateQuoteOutput {
  quote: Quote;
  warnings: string[];
}

export class CreateQuoteUseCase {
  constructor(
    private quoteRepository: IQuoteRepository,
    private edgeFunctionClient: EdgeFunctionClient
  ) {}

  async execute(input: CreateQuoteInput, userId: string): Promise<CreateQuoteOutput> {
    const warnings: string[] = [];

    // 1. Create quote aggregate
    const quote = Quote.create({
      customerId: input.customerId,
      customerName: input.customerName,
      createdBy: userId,
      paymentConditionId: input.paymentConditionId,
      validUntil: new Date(input.validUntil),
      notes: input.notes
    });

    // 2. Calculate pricing for each item via Edge Function
    for (const itemInput of input.items) {
      try {
        const pricing = await this.edgeFunctionClient.calculatePricing({
          productId: itemInput.productId,
          customerId: input.customerId,
          quantity: itemInput.quantity,
          destinationUF: 'SP' // Default, can be made dynamic
        });

        const itemProps: CreateQuoteItemProps = {
          productId: itemInput.productId,
          productName: itemInput.productName,
          productSku: itemInput.productSku,
          quantity: itemInput.quantity,
          listPrice: pricing.listPrice,
          offeredPrice: pricing.offeredPrice,
          minimumPrice: pricing.minimumPrice,
          baseCost: itemInput.baseCost,
          stockAvailable: 0 // Can be fetched separately
        };

        quote.addItem(itemProps);

        // Collect warnings from pricing
        if (pricing.alerts && pricing.alerts.length > 0) {
          warnings.push(...pricing.alerts);
        }

        if (pricing.requiresApproval) {
          warnings.push(`Item ${itemInput.productSku} requer aprovação`);
        }
      } catch (error) {
        // Fallback to basic calculation if edge function fails
        console.error(`Pricing calculation failed for ${itemInput.productId}:`, error);
        
        const fallbackPrice = itemInput.baseCost * 1.3; // 30% markup
        quote.addItem({
          productId: itemInput.productId,
          productName: itemInput.productName,
          productSku: itemInput.productSku,
          quantity: itemInput.quantity,
          listPrice: fallbackPrice,
          offeredPrice: fallbackPrice,
          baseCost: itemInput.baseCost,
          stockAvailable: 0
        });
        
        warnings.push(`Precificação automática falhou para ${itemInput.productSku}, usando valor padrão`);
      }
    }

    // 3. Save quote
    await this.quoteRepository.save(quote);

    return { quote, warnings };
  }
}
