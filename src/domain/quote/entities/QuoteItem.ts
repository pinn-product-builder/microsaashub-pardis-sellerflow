import { Entity } from '@/domain/shared/Entity';
import { DomainError } from '@/domain/shared/DomainError';
import { Money } from '../value-objects/Money';
import { Margin } from '../value-objects/Margin';

export interface QuoteItemProps {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  listPrice: Money;
  offeredPrice: Money;
  minimumPrice?: Money;
  clusterPrice?: Money;
  margin: Margin;
  isAuthorized: boolean;
  stockAvailable: number;
  stockMinExpiry?: Date;
  campaignName?: string;
  campaignDiscount: number;
}

export interface CreateQuoteItemProps {
  id?: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  listPrice: number;
  offeredPrice: number;
  minimumPrice?: number;
  clusterPrice?: number;
  baseCost: number;
  stockAvailable?: number;
  stockMinExpiry?: Date;
  campaignName?: string;
  campaignDiscount?: number;
}

export class QuoteItem extends Entity<QuoteItemProps> {
  private constructor(id: string, props: QuoteItemProps) {
    super(id, props);
  }

  static create(props: CreateQuoteItemProps): QuoteItem {
    // Validações de domínio
    if (props.quantity <= 0) {
      throw new DomainError('Quantidade deve ser maior que zero');
    }
    if (props.offeredPrice <= 0) {
      throw new DomainError('Preço oferecido deve ser maior que zero');
    }
    if (props.listPrice <= 0) {
      throw new DomainError('Preço de lista deve ser maior que zero');
    }

    const listPrice = Money.create(props.listPrice);
    const offeredPrice = Money.create(props.offeredPrice);
    const minimumPrice = props.minimumPrice ? Money.create(props.minimumPrice) : undefined;
    const clusterPrice = props.clusterPrice ? Money.create(props.clusterPrice) : undefined;
    
    // Calcular margem
    const margin = Margin.fromPrices(props.offeredPrice, props.baseCost);
    
    // Verificar se está autorizado (margem >= 0)
    const isAuthorized = margin.percent >= 0;

    const id = props.id || crypto.randomUUID();

    return new QuoteItem(id, {
      productId: props.productId,
      productName: props.productName,
      productSku: props.productSku,
      quantity: props.quantity,
      listPrice,
      offeredPrice,
      minimumPrice,
      clusterPrice,
      margin,
      isAuthorized,
      stockAvailable: props.stockAvailable || 0,
      stockMinExpiry: props.stockMinExpiry,
      campaignName: props.campaignName,
      campaignDiscount: props.campaignDiscount || 0
    });
  }

  // Getters
  get productId(): string {
    return this.props.productId;
  }

  get productName(): string {
    return this.props.productName;
  }

  get productSku(): string {
    return this.props.productSku;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get listPrice(): Money {
    return this.props.listPrice;
  }

  get offeredPrice(): Money {
    return this.props.offeredPrice;
  }

  get minimumPrice(): Money | undefined {
    return this.props.minimumPrice;
  }

  get margin(): Margin {
    return this.props.margin;
  }

  get isAuthorized(): boolean {
    return this.props.isAuthorized;
  }

  get stockAvailable(): number {
    return this.props.stockAvailable;
  }

  get campaignDiscount(): number {
    return this.props.campaignDiscount;
  }

  // Calculated properties
  get totalList(): Money {
    return this.props.listPrice.multiply(this.props.quantity);
  }

  get totalOffered(): Money {
    return this.props.offeredPrice.multiply(this.props.quantity);
  }

  get totalMarginValue(): number {
    return this.props.margin.value * this.props.quantity;
  }

  // Business methods
  updateQuantity(newQuantity: number): QuoteItem {
    if (newQuantity <= 0) {
      throw new DomainError('Quantidade deve ser maior que zero');
    }
    return new QuoteItem(this.id, {
      ...this.props,
      quantity: newQuantity
    });
  }

  updatePrice(newOfferedPrice: number, baseCost: number): QuoteItem {
    if (newOfferedPrice <= 0) {
      throw new DomainError('Preço deve ser maior que zero');
    }
    
    const offeredPrice = Money.create(newOfferedPrice);
    const margin = Margin.fromPrices(newOfferedPrice, baseCost);
    const isAuthorized = margin.percent >= 0;

    return new QuoteItem(this.id, {
      ...this.props,
      offeredPrice,
      margin,
      isAuthorized
    });
  }

  hasStock(): boolean {
    return this.props.stockAvailable >= this.props.quantity;
  }

  isBelowMinimum(): boolean {
    if (!this.props.minimumPrice) return false;
    return this.props.offeredPrice.isLessThan(this.props.minimumPrice);
  }

  toJSON() {
    return {
      id: this.id,
      productId: this.props.productId,
      productName: this.props.productName,
      productSku: this.props.productSku,
      quantity: this.props.quantity,
      listPrice: this.props.listPrice.amount,
      offeredPrice: this.props.offeredPrice.amount,
      minimumPrice: this.props.minimumPrice?.amount,
      clusterPrice: this.props.clusterPrice?.amount,
      marginValue: this.props.margin.value,
      marginPercent: this.props.margin.percent,
      isAuthorized: this.props.isAuthorized,
      totalList: this.totalList.amount,
      totalOffered: this.totalOffered.amount,
      stockAvailable: this.props.stockAvailable,
      campaignName: this.props.campaignName,
      campaignDiscount: this.props.campaignDiscount
    };
  }
}
