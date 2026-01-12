import { Entity } from '@/domain/shared/Entity';
import { DomainError, BusinessRuleError } from '@/domain/shared/DomainError';
import { QuoteStatus } from '../value-objects/QuoteStatus';
import { Money } from '../value-objects/Money';
import { Margin } from '../value-objects/Margin';
import { QuoteItem, CreateQuoteItemProps } from './QuoteItem';

export interface QuoteProps {
  quoteNumber: string;
  customerId: string;
  customerName?: string;
  createdBy: string;
  status: QuoteStatus;
  items: QuoteItem[];
  paymentConditionId?: string;
  validUntil: Date;
  notes?: string;
  couponValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuoteProps {
  id?: string;
  quoteNumber?: string;
  customerId: string;
  customerName?: string;
  createdBy: string;
  paymentConditionId?: string;
  validUntil: Date;
  notes?: string;
}

export interface QuoteTotals {
  subtotal: Money;
  totalOffered: Money;
  totalDiscount: Money;
  totalMarginValue: number;
  totalMarginPercent: number;
  couponValue: Money;
  itemsCount: number;
  authorizedCount: number;
  unauthorizedCount: number;
}

export class Quote extends Entity<QuoteProps> {
  private constructor(id: string, props: QuoteProps) {
    super(id, props);
  }

  static create(props: CreateQuoteProps): Quote {
    // Validações de domínio
    if (!props.customerId) {
      throw new DomainError('Cliente é obrigatório');
    }
    if (!props.createdBy) {
      throw new DomainError('Criador é obrigatório');
    }
    if (!props.validUntil) {
      throw new DomainError('Data de validade é obrigatória');
    }
    if (new Date(props.validUntil) < new Date()) {
      throw new DomainError('Data de validade deve ser futura');
    }

    const id = props.id || crypto.randomUUID();
    const now = new Date();

    return new Quote(id, {
      quoteNumber: props.quoteNumber || '',
      customerId: props.customerId,
      customerName: props.customerName,
      createdBy: props.createdBy,
      status: QuoteStatus.draft(),
      items: [],
      paymentConditionId: props.paymentConditionId,
      validUntil: new Date(props.validUntil),
      notes: props.notes,
      couponValue: 0,
      createdAt: now,
      updatedAt: now
    });
  }

  static reconstitute(
    id: string,
    props: Omit<QuoteProps, 'status'> & { status: string }
  ): Quote {
    return new Quote(id, {
      ...props,
      status: QuoteStatus.create(props.status)
    });
  }

  // Getters
  get quoteNumber(): string {
    return this.props.quoteNumber;
  }

  get customerId(): string {
    return this.props.customerId;
  }

  get customerName(): string | undefined {
    return this.props.customerName;
  }

  get createdBy(): string {
    return this.props.createdBy;
  }

  get status(): QuoteStatus {
    return this.props.status;
  }

  get items(): QuoteItem[] {
    return [...this.props.items];
  }

  get paymentConditionId(): string | undefined {
    return this.props.paymentConditionId;
  }

  get validUntil(): Date {
    return this.props.validUntil;
  }

  get notes(): string | undefined {
    return this.props.notes;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // Calculated properties
  calculateTotals(): QuoteTotals {
    const items = this.props.items;
    
    if (items.length === 0) {
      return {
        subtotal: Money.zero(),
        totalOffered: Money.zero(),
        totalDiscount: Money.zero(),
        totalMarginValue: 0,
        totalMarginPercent: 0,
        couponValue: Money.create(this.props.couponValue),
        itemsCount: 0,
        authorizedCount: 0,
        unauthorizedCount: 0
      };
    }

    let subtotal = Money.zero();
    let totalOffered = Money.zero();
    let totalMarginValue = 0;

    for (const item of items) {
      subtotal = subtotal.add(item.totalList);
      totalOffered = totalOffered.add(item.totalOffered);
      totalMarginValue += item.totalMarginValue;
    }

    const totalDiscount = subtotal.amount > totalOffered.amount 
      ? Money.create(subtotal.amount - totalOffered.amount)
      : Money.zero();

    const totalMarginPercent = subtotal.amount > 0 
      ? (totalMarginValue / subtotal.amount) * 100 
      : 0;

    const authorizedCount = items.filter(i => i.isAuthorized).length;

    return {
      subtotal,
      totalOffered,
      totalDiscount,
      totalMarginValue,
      totalMarginPercent,
      couponValue: Money.create(this.props.couponValue),
      itemsCount: items.length,
      authorizedCount,
      unauthorizedCount: items.length - authorizedCount
    };
  }

  isAuthorized(): boolean {
    return this.props.items.every(item => item.isAuthorized);
  }

  requiresApproval(): boolean {
    return !this.isAuthorized() || this.props.items.some(item => item.isBelowMinimum());
  }

  isExpired(): boolean {
    return new Date() > this.props.validUntil;
  }

  // Business methods
  addItem(itemProps: CreateQuoteItemProps): void {
    if (!this.props.status.canBeEdited()) {
      throw new BusinessRuleError('Cotação não pode ser editada neste status');
    }

    // Check if product already exists
    const existingIndex = this.props.items.findIndex(
      i => i.productId === itemProps.productId
    );

    const newItem = QuoteItem.create(itemProps);

    if (existingIndex >= 0) {
      // Update quantity instead of adding duplicate
      const existing = this.props.items[existingIndex];
      this.props.items[existingIndex] = existing.updateQuantity(
        existing.quantity + itemProps.quantity
      );
    } else {
      this.props.items.push(newItem);
    }

    this.props.updatedAt = new Date();
  }

  removeItem(itemId: string): void {
    if (!this.props.status.canBeEdited()) {
      throw new BusinessRuleError('Cotação não pode ser editada neste status');
    }

    const index = this.props.items.findIndex(i => i.id === itemId);
    if (index === -1) {
      throw new DomainError('Item não encontrado');
    }

    this.props.items.splice(index, 1);
    this.props.updatedAt = new Date();
  }

  updateItemQuantity(itemId: string, quantity: number): void {
    if (!this.props.status.canBeEdited()) {
      throw new BusinessRuleError('Cotação não pode ser editada neste status');
    }

    const index = this.props.items.findIndex(i => i.id === itemId);
    if (index === -1) {
      throw new DomainError('Item não encontrado');
    }

    this.props.items[index] = this.props.items[index].updateQuantity(quantity);
    this.props.updatedAt = new Date();
  }

  requestApproval(): void {
    if (!this.props.status.isDraft() && this.props.status.value !== 'calculated') {
      throw new BusinessRuleError('Apenas rascunhos podem solicitar aprovação');
    }

    if (this.props.items.length === 0) {
      throw new BusinessRuleError('Cotação deve ter pelo menos um item');
    }

    const newStatus = QuoteStatus.create('pending_approval');
    if (!this.props.status.canTransitionTo(newStatus)) {
      throw new BusinessRuleError('Transição de status não permitida');
    }

    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  approve(): void {
    if (!this.props.status.isPendingApproval()) {
      throw new BusinessRuleError('Apenas cotações pendentes podem ser aprovadas');
    }

    this.props.status = QuoteStatus.create('approved');
    this.props.updatedAt = new Date();
  }

  reject(): void {
    if (!this.props.status.isPendingApproval()) {
      throw new BusinessRuleError('Apenas cotações pendentes podem ser rejeitadas');
    }

    this.props.status = QuoteStatus.create('rejected');
    this.props.updatedAt = new Date();
  }

  send(): void {
    if (!this.props.status.canBeSent()) {
      throw new BusinessRuleError('Cotação não pode ser enviada neste status');
    }

    if (this.isExpired()) {
      throw new BusinessRuleError('Cotação expirada');
    }

    this.props.status = QuoteStatus.create('sent');
    this.props.updatedAt = new Date();
  }

  convert(): void {
    if (this.props.status.value !== 'sent') {
      throw new BusinessRuleError('Apenas cotações enviadas podem ser convertidas');
    }

    this.props.status = QuoteStatus.create('converted');
    this.props.updatedAt = new Date();
  }

  applyCoupon(value: number): void {
    if (!this.props.status.canBeEdited()) {
      throw new BusinessRuleError('Cotação não pode ser editada neste status');
    }

    if (value < 0) {
      throw new DomainError('Valor do cupom não pode ser negativo');
    }

    this.props.couponValue = value;
    this.props.updatedAt = new Date();
  }

  updateNotes(notes: string): void {
    this.props.notes = notes;
    this.props.updatedAt = new Date();
  }

  toJSON() {
    const totals = this.calculateTotals();
    return {
      id: this.id,
      quoteNumber: this.props.quoteNumber,
      customerId: this.props.customerId,
      customerName: this.props.customerName,
      createdBy: this.props.createdBy,
      status: this.props.status.value,
      items: this.props.items.map(i => i.toJSON()),
      paymentConditionId: this.props.paymentConditionId,
      validUntil: this.props.validUntil.toISOString(),
      notes: this.props.notes,
      subtotal: totals.subtotal.amount,
      totalOffered: totals.totalOffered.amount,
      totalDiscount: totals.totalDiscount.amount,
      totalMarginValue: totals.totalMarginValue,
      totalMarginPercent: totals.totalMarginPercent,
      couponValue: this.props.couponValue,
      isAuthorized: this.isAuthorized(),
      requiresApproval: this.requiresApproval(),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString()
    };
  }
}
