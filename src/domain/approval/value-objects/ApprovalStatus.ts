import { ValueObject } from '@/domain/shared/ValueObject';
import { DomainError } from '@/domain/shared/DomainError';

export type ApprovalStatusType = 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'expired'
  | 'escalated';

const VALID_STATUSES: ApprovalStatusType[] = [
  'pending', 'approved', 'rejected', 'expired', 'escalated'
];

const STATUS_TRANSITIONS: Record<ApprovalStatusType, ApprovalStatusType[]> = {
  pending: ['approved', 'rejected', 'expired', 'escalated'],
  escalated: ['approved', 'rejected', 'expired'],
  approved: [],
  rejected: [],
  expired: []
};

interface ApprovalStatusProps {
  value: ApprovalStatusType;
}

export class ApprovalStatus extends ValueObject<ApprovalStatusProps> {
  private constructor(props: ApprovalStatusProps) {
    super(props);
  }

  get value(): ApprovalStatusType {
    return this.props.value;
  }

  static create(status: string): ApprovalStatus {
    const normalized = status.toLowerCase() as ApprovalStatusType;
    if (!VALID_STATUSES.includes(normalized)) {
      throw new DomainError(`Status de aprovação inválido: ${status}`);
    }
    return new ApprovalStatus({ value: normalized });
  }

  static pending(): ApprovalStatus {
    return new ApprovalStatus({ value: 'pending' });
  }

  static approved(): ApprovalStatus {
    return new ApprovalStatus({ value: 'approved' });
  }

  static rejected(): ApprovalStatus {
    return new ApprovalStatus({ value: 'rejected' });
  }

  static expired(): ApprovalStatus {
    return new ApprovalStatus({ value: 'expired' });
  }

  static escalated(): ApprovalStatus {
    return new ApprovalStatus({ value: 'escalated' });
  }

  canTransitionTo(newStatus: ApprovalStatus): boolean {
    const allowedTransitions = STATUS_TRANSITIONS[this.props.value];
    return allowedTransitions.includes(newStatus.value);
  }

  isPending(): boolean {
    return this.props.value === 'pending';
  }

  isApproved(): boolean {
    return this.props.value === 'approved';
  }

  isRejected(): boolean {
    return this.props.value === 'rejected';
  }

  isExpired(): boolean {
    return this.props.value === 'expired';
  }

  isEscalated(): boolean {
    return this.props.value === 'escalated';
  }

  isFinal(): boolean {
    return ['approved', 'rejected', 'expired'].includes(this.props.value);
  }

  canBeProcessed(): boolean {
    return this.props.value === 'pending' || this.props.value === 'escalated';
  }
}
