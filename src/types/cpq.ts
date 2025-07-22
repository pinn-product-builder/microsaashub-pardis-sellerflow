
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  weight: number; // kg
  dimensions: {
    length: number; // cm
    width: number;
    height: number;
  };
  baseCost: number;
  description?: string;
}

export interface Customer {
  id: string;
  cnpj: string;
  companyName: string;
  uf: string;
  city: string;
  priceTableId?: string;
  creditLimit: number;
  paymentTerms: string[];
}

export interface QuoteItem {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxes: {
    icms: number;
    ipi: number;
    pis: number;
    cofins: number;
    total: number;
  };
  freight: number;
  margin: number;
}

export interface Quote {
  id: string;
  number: string;
  customer: Customer;
  destinationUF: string;
  items: QuoteItem[];
  subtotal: number;
  totalTaxes: number;
  totalFreight: number;
  discount: number;
  total: number;
  status: 'draft' | 'calculated' | 'approved' | 'sent' | 'expired';
  paymentConditions: string;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
}

export interface TaxRule {
  uf: string;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
}

export interface FreightRate {
  originUF: string;
  destinationUF: string;
  weightMin: number;
  weightMax: number;
  ratePerKg: number;
  minimumValue: number;
}

export interface PricingRule {
  category: string;
  channel: string;
  minimumMargin: number;
  standardMargin: number;
  maxDiscount: number;
}
