import { IQuoteRepository, QuoteFilters } from '@/domain/quote/repositories/IQuoteRepository';
import { Quote } from '@/domain/quote/entities/Quote';
import { NotFoundError } from '@/domain/shared/DomainError';

export interface QuoteDTO {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName?: string;
  createdBy: string;
  status: string;
  subtotal: number;
  totalOffered: number;
  totalDiscount: number;
  totalMarginValue: number;
  totalMarginPercent: number;
  couponValue: number;
  isAuthorized: boolean;
  requiresApproval: boolean;
  paymentConditionId?: string;
  validUntil: string;
  notes?: string;
  itemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteListOutput {
  quotes: QuoteDTO[];
  total: number;
}

export interface QuoteStatsOutput {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  sent: number;
  converted: number;
  totalValue: number;
  avgMargin: number;
}

export class GetQuotesUseCase {
  constructor(private quoteRepository: IQuoteRepository) {}

  async execute(filters?: QuoteFilters): Promise<QuoteListOutput> {
    const quotes = await this.quoteRepository.findAll(filters);
    const total = await this.quoteRepository.count(filters);

    return {
      quotes: quotes.map(this.toDTO),
      total
    };
  }

  async getById(id: string): Promise<Quote> {
    const quote = await this.quoteRepository.findById(id);
    if (!quote) {
      throw new NotFoundError('Cotação', id);
    }
    return quote;
  }

  async getStats(): Promise<QuoteStatsOutput> {
    const allQuotes = await this.quoteRepository.findAll();
    
    const stats: QuoteStatsOutput = {
      total: allQuotes.length,
      draft: 0,
      pending: 0,
      approved: 0,
      sent: 0,
      converted: 0,
      totalValue: 0,
      avgMargin: 0
    };

    let totalMargin = 0;

    for (const quote of allQuotes) {
      const totals = quote.calculateTotals();
      stats.totalValue += totals.totalOffered.amount;
      totalMargin += totals.totalMarginPercent;

      switch (quote.status.value) {
        case 'draft':
          stats.draft++;
          break;
        case 'pending_approval':
          stats.pending++;
          break;
        case 'approved':
          stats.approved++;
          break;
        case 'sent':
          stats.sent++;
          break;
        case 'converted':
          stats.converted++;
          break;
      }
    }

    stats.avgMargin = allQuotes.length > 0 ? totalMargin / allQuotes.length : 0;

    return stats;
  }

  private toDTO(quote: Quote): QuoteDTO {
    const totals = quote.calculateTotals();
    return {
      id: quote.id,
      quoteNumber: quote.quoteNumber,
      customerId: quote.customerId,
      customerName: quote.customerName,
      createdBy: quote.createdBy,
      status: quote.status.value,
      subtotal: totals.subtotal.amount,
      totalOffered: totals.totalOffered.amount,
      totalDiscount: totals.totalDiscount.amount,
      totalMarginValue: totals.totalMarginValue,
      totalMarginPercent: totals.totalMarginPercent,
      couponValue: totals.couponValue.amount,
      isAuthorized: quote.isAuthorized(),
      requiresApproval: quote.requiresApproval(),
      paymentConditionId: quote.paymentConditionId,
      validUntil: quote.validUntil.toISOString(),
      notes: quote.notes,
      itemsCount: totals.itemsCount,
      createdAt: quote.createdAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString()
    };
  }
}
