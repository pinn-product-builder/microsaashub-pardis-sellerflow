import { ValueObject } from '@/domain/shared/ValueObject';
import { DomainError } from '@/domain/shared/DomainError';

export type QuoteStatusType = 
  | 'draft' 
  | 'calculated' 
  | 'pending_approval' 
  | 'approved' 
  | 'rejected' 
  | 'sent' 
  | 'expired' 
  | 'converted';

const VALID_STATUSES: QuoteStatusType[] = [
  'draft', 'calculated', 'pending_approval', 'approved', 
  'rejected', 'sent', 'expired', 'converted'
];

const STATUS_TRANSITIONS: Record<QuoteStatusType, QuoteStatusType[]> = {
  draft: ['calculated', 'expired'],
  calculated: ['pending_approval', 'approved', 'sent', 'expired'],
  pending_approval: ['approved', 'rejected', 'expired'],
  approved: ['sent', 'expired'],
  rejected: ['draft'],
  sent: ['converted', 'expired'],
  expired: ['draft'],
  converted: []
};

interface QuoteStatusProps {
  value: QuoteStatusType;
}

export class QuoteStatus extends ValueObject<QuoteStatusProps> {
  private constructor(props: QuoteStatusProps) {
    super(props);
  }

  get value(): QuoteStatusType {
    return this.props.value;
  }

  static create(status: string): QuoteStatus {
    if (!VALID_STATUSES.includes(status as QuoteStatusType)) {
      throw new DomainError(`Status inválido: ${status}`);
    }
    return new QuoteStatus({ value: status as QuoteStatusType });
  }

  static draft(): QuoteStatus {
    return new QuoteStatus({ value: 'draft' });
  }

  canTransitionTo(newStatus: QuoteStatus): boolean {
    const allowedTransitions = STATUS_TRANSITIONS[this.props.value];
    return allowedTransitions.includes(newStatus.value);
  }

  isDraft(): boolean {
    return this.props.value === 'draft';
  }

  isPendingApproval(): boolean {
    return this.props.value === 'pending_approval';
  }

  isApproved(): boolean {
    return this.props.value === 'approved';
  }

  canBeSent(): boolean {
    return this.props.value === 'approved';
  }

  canBeEdited(): boolean {
    return this.props.value === 'draft' || this.props.value === 'calculated';
  }
}
