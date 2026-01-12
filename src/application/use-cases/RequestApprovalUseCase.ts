import { IQuoteRepository } from '@/domain/quote/repositories/IQuoteRepository';
import { EdgeFunctionClient } from '@/infrastructure/services/EdgeFunctionClient';
import { NotFoundError, BusinessRuleError } from '@/domain/shared/DomainError';

export interface RequestApprovalInput {
  quoteId: string;
  reason?: string;
}

export interface RequestApprovalOutput {
  success: boolean;
  approvalRequestId?: string;
  requiredRole?: string;
  expiresAt?: string;
}

export class RequestApprovalUseCase {
  constructor(
    private quoteRepository: IQuoteRepository,
    private edgeFunctionClient: EdgeFunctionClient
  ) {}

  async execute(input: RequestApprovalInput, userId: string): Promise<RequestApprovalOutput> {
    // 1. Find quote
    const quote = await this.quoteRepository.findById(input.quoteId);
    if (!quote) {
      throw new NotFoundError('Cotação', input.quoteId);
    }

    // 2. Validate quote can request approval
    if (quote.createdBy !== userId) {
      throw new BusinessRuleError('Apenas o criador pode solicitar aprovação');
    }

    // 3. Calculate totals
    const totals = quote.calculateTotals();

    // 4. Create approval request via Edge Function
    const result = await this.edgeFunctionClient.createApprovalRequest(
      quote.id,
      totals.totalMarginPercent,
      totals.totalOffered.amount,
      input.reason
    );

    if (!result.success) {
      throw new BusinessRuleError('Falha ao criar solicitação de aprovação');
    }

    // 5. Update quote status
    quote.requestApproval();
    await this.quoteRepository.save(quote);

    return {
      success: true,
      approvalRequestId: result.approvalRequest?.id,
      requiredRole: result.requiredRole,
      expiresAt: result.expiresAt
    };
  }
}
