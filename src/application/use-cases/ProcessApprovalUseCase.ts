import { IQuoteRepository } from '@/domain/quote/repositories/IQuoteRepository';
import { EdgeFunctionClient } from '@/infrastructure/services/EdgeFunctionClient';
import { NotFoundError, BusinessRuleError, UnauthorizedError } from '@/domain/shared/DomainError';

export interface ProcessApprovalInput {
  requestId: string;
  action: 'approve' | 'reject';
  comments?: string;
}

export interface ProcessApprovalOutput {
  success: boolean;
  quoteId?: string;
  newStatus?: string;
}

export class ProcessApprovalUseCase {
  constructor(
    private quoteRepository: IQuoteRepository,
    private edgeFunctionClient: EdgeFunctionClient
  ) {}

  async execute(input: ProcessApprovalInput, userId: string): Promise<ProcessApprovalOutput> {
    // 1. Process approval via Edge Function (validates permissions on server)
    let result;
    
    if (input.action === 'approve') {
      result = await this.edgeFunctionClient.approveRequest(
        input.requestId,
        input.comments
      );
    } else {
      if (!input.comments) {
        throw new BusinessRuleError('Comentário é obrigatório para rejeição');
      }
      result = await this.edgeFunctionClient.rejectRequest(
        input.requestId,
        input.comments
      );
    }

    if (!result.success) {
      throw new BusinessRuleError(`Falha ao ${input.action === 'approve' ? 'aprovar' : 'rejeitar'} solicitação`);
    }

    // 2. Update quote status locally
    if (result.quoteId) {
      const quote = await this.quoteRepository.findById(result.quoteId);
      if (quote) {
        if (input.action === 'approve') {
          quote.approve();
        } else {
          quote.reject();
        }
        await this.quoteRepository.save(quote);
      }
    }

    return {
      success: true,
      quoteId: result.quoteId,
      newStatus: result.status
    };
  }
}
