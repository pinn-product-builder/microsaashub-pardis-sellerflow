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
  // Novas propriedades fiscais
  ncm?: string;
  cest?: string;
  origin?: 'NACIONAL' | 'IMPORTADO';
  taxCategory?: 'NORMAL' | 'SUBSTITUTO' | 'ISENTO';
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
  // Novas propriedades fiscais
  taxRegime?: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  stateRegistration?: string;
  taxExemptions?: string[];
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
    // Novos campos fiscais
    icmsSt?: number;
    difal?: number;
    fcp?: number;
    taxBasis: number;
    effectiveRate: number;
  };
  freight: number;
  margin: number;
  // Novas propriedades do motor avançado
  discounts?: Array<{
    type: 'VOLUME' | 'PROMOTIONAL' | 'CUSTOMER' | 'CAMPAIGN' | 'MANUAL';
    description: string;
    percentage: number;
    amount: number;
    priority: number;
  }>;
  alerts?: Array<{
    type: 'WARNING' | 'ERROR' | 'INFO';
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  approvalRequired?: boolean;
  minimumPrice?: number;
  // Alertas fiscais
  taxAlerts?: Array<{
    type: 'TAX_SUBSTITUTION' | 'TAX_BENEFIT' | 'COMPLIANCE_ISSUE';
    message: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  }>;
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
  status: 'draft' | 'calculated' | 'approved' | 'sent' | 'expired' | 'pending' | 'processing';
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
  // Novos campos fiscais
  icmsSt?: number;
  difal?: number;
  fcp?: number;
  regime?: 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
  category?: string;
  ncmExceptions?: Array<{
    ncm: string;
    icms: number;
    ipi: number;
  }>;
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

// Novas interfaces para sistema fiscal avançado
export interface TaxBenefit {
  id: string;
  name: string;
  description: string;
  type: 'REDUCTION' | 'EXEMPTION' | 'DEFERRAL';
  scope: 'UF' | 'MUNICIPALITY' | 'NATIONAL';
  location: string;
  category?: string;
  ncm?: string;
  reduction: number; // percentual de redução
  validFrom: Date;
  validUntil?: Date;
  conditions: string[];
}

export interface TaxSubstitution {
  id: string;
  category: string;
  ncm: string;
  uf: string;
  marginSt: number; // margem de valor agregado
  aliquotaInterna: number;
  aliquotaInterestadual: number;
  isActive: boolean;
}

export interface TaxCalculationContext {
  product: Product;
  customer: Customer;
  quantity: number;
  unitPrice: number;
  originUF: string;
  destinationUF: string;
  operationType: 'VENDA' | 'TRANSFERENCIA' | 'DEMONSTRACAO';
  paymentTerm: string;
}

export interface TaxCalculationResult {
  taxes: {
    icms: number;
    ipi: number;
    pis: number;
    cofins: number;
    icmsSt?: number;
    difal?: number;
    fcp?: number;
    total: number;
    taxBasis: number;
    effectiveRate: number;
  };
  benefits: TaxBenefit[];
  substitution?: TaxSubstitution;
  compliance: {
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  };
  optimization: {
    potentialSavings: number;
    suggestions: string[];
  };
}

export interface TaxSimulationScenario {
  name: string;
  changes: {
    destinationUF?: string;
    customerRegime?: string;
    productCategory?: string;
    operationType?: string;
  };
  result?: TaxCalculationResult;
}
