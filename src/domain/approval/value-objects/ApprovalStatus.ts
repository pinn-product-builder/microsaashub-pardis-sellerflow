import { ValueObject } from '@/domain/shared/ValueObject';
import { DomainError } from '@/domain/shared/DomainError';
import { ApprovalStatusExtended } from '@/types/domain';

// Re-export para uso externo
export type { ApprovalStatusExtended as ApprovalStatusType };

const VALID_STATUSES: ApprovalStatusExtended[] = [
  'pending', 'approved', 'rejected', 'expired', 'escalated'
];

const STATUS_TRANSITIONS: Record<ApprovalStatusExtended, ApprovalStatusExtended[]> = {
  pending: ['approved', 'rejected', 'expired', 'escalated'],
  escalated: ['approved', 'rejected', 'expired'],
  approved: [],
  rejected: [],
  expired: []
};

interface ApprovalStatusProps {
  value: ApprovalStatusExtended;
}

export class ApprovalStatus extends ValueObject<ApprovalStatusProps> {
  private constructor(props: ApprovalStatusProps) {
    super(props);
  }

  get value(): ApprovalStatusExtended {
    return this.props.value;
  }

  static create(status: string): ApprovalStatus {
    const normalized = status.toLowerCase() as ApprovalStatusExtended;
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
