// =============================================================================
// TIPOS DE DOMÍNIO UNIFICADOS
// Arquivo consolidado de tipos para o Pardis Seller Flow
// =============================================================================

// -----------------------------------------------------------------------------
// ENUMS E TIPOS BASE
// -----------------------------------------------------------------------------

export type AppRole = 'vendedor' | 'coordenador' | 'gerente' | 'diretor' | 'admin';
export type RegionType = 'MG' | 'BR';
export type QuoteStatusType = 'draft' | 'calculated' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'expired' | 'converted';
/** Status de aprovação no banco de dados (enum Supabase) */
export type ApprovalStatusType = 'pending' | 'approved' | 'rejected' | 'expired';
/** Status de aprovação estendido no domínio (inclui escalated) */
export type ApprovalStatusExtended = ApprovalStatusType | 'escalated';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type TaxRegime = 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
export type ProductStatus = 'active' | 'blocked' | 'obsolete';
export type ProductOrigin = 'NACIONAL' | 'IMPORTADO';
export type TaxCategory = 'NORMAL' | 'SUBSTITUTO' | 'ISENTO';

// -----------------------------------------------------------------------------
// ENTIDADES DE USUÁRIO
// -----------------------------------------------------------------------------

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  region: RegionType;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

// -----------------------------------------------------------------------------
// ENTIDADES DE CLIENTE
// -----------------------------------------------------------------------------

/** Cliente - modelo de banco (snake_case) */
export interface Customer {
  id: string;
  external_id?: string;
  cnpj: string;
  company_name: string;
  trade_name?: string;
  uf: string;
  city: string;
  address?: string;
  is_lab_to_lab: boolean;
  credit_limit: number;
  tax_regime?: string;
  state_registration?: string;
  available_payment_terms: string[];
  price_table_type: RegionType;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

/** Cliente - modelo legado UI (camelCase) - para compatibilidade */
export interface CustomerLegacy {
  id: string;
  cnpj: string;
  companyName: string;
  uf: string;
  city: string;
  priceTableId?: string;
  creditLimit: number;
  paymentTerms: string[];
  taxRegime?: TaxRegime;
  stateRegistration?: string;
  taxExemptions?: string[];
}

// -----------------------------------------------------------------------------
// ENTIDADES DE PRODUTO
// -----------------------------------------------------------------------------

/** Produto - modelo de banco (snake_case) */
export interface Product {
  id: string;
  external_id?: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  base_cost: number;
  price_mg?: number;
  price_br?: number;
  price_minimum?: number;
  stock_quantity: number;
  stock_min_expiry?: string;
  campaign_name?: string;
  campaign_discount: number;
  responsible_user_id?: string;
  status: ProductStatus;
  ncm?: string;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

/** Produto - modelo legado UI (camelCase) - para compatibilidade */
export interface ProductLegacy {
  id: string;
  sku: string;
  name: string;
  category: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  baseCost: number;
  description?: string;
  ncm?: string;
  cest?: string;
  origin?: ProductOrigin;
  taxCategory?: TaxCategory;
}

// -----------------------------------------------------------------------------
// ENTIDADES DE COTAÇÃO
// -----------------------------------------------------------------------------

/** Cotação - modelo de banco (snake_case) */
export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  customer?: Customer;
  created_by: string;
  status: QuoteStatusType;
  subtotal: number;
  total_discount: number;
  total_offered: number;
  total_margin_value: number;
  total_margin_percent: number;
  coupon_value: number;
  payment_condition_id?: string;
  payment_condition?: PaymentCondition;
  valid_until: string;
  notes?: string;
  is_authorized: boolean;
  requires_approval: boolean;
  vtex_order_id?: string;
  created_at: string;
  updated_at: string;
  items?: QuoteItem[];
}

/** Cotação - modelo legado UI (camelCase) - para compatibilidade */
export interface QuoteLegacy {
  id: string;
  number: string;
  customer: CustomerLegacy;
  destinationUF: string;
  items: QuoteItemLegacy[];
  subtotal: number;
  totalTaxes: number;
  totalFreight: number;
  discount: number;
  discountReason?: string;
  total: number;
  status: 'draft' | 'calculated' | 'approved' | 'sent' | 'expired' | 'pending' | 'processing';
  paymentConditions: string;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  notes?: string;
}

/** Item de Cotação - modelo de banco (snake_case) */
export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  list_price: number;
  cluster_price?: number;
  minimum_price?: number;
  offered_price: number;
  total_list: number;
  total_offered: number;
  margin_value: number;
  margin_percent: number;
  is_authorized: boolean;
  stock_available: number;
  stock_min_expiry?: string;
  campaign_name?: string;
  campaign_discount: number;
  created_at: string;
  updated_at: string;
}

/** Item de Cotação - modelo legado UI (camelCase) - para compatibilidade */
export interface QuoteItemLegacy {
  id: string;
  product: ProductLegacy;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxes: TaxBreakdown;
  freight: number;
  margin: number;
  discounts?: ItemDiscount[];
  alerts?: ItemAlert[];
  approvalRequired?: boolean;
  minimumPrice?: number;
  taxAlerts?: TaxAlert[];
  /** Para itens VTEX: policy efetivamente usada para precificar este item (auditoria) */
  vtexTradePolicyId?: string;
  /** Modo manual: vendedor alterou o preço unitário */
  manualUnitPrice?: boolean;
  /** Preço original antes do override manual (para voltar ao modo percentual) */
  originalUnitPrice?: number;
}

// -----------------------------------------------------------------------------
// TIPOS DE IMPOSTOS E FRETE
// -----------------------------------------------------------------------------

export interface TaxBreakdown {
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  total: number;
  icmsSt?: number;
  difal?: number;
  fcp?: number;
  taxBasis: number;
  effectiveRate: number;
}

export interface TaxRule {
  uf: string;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  icmsSt?: number;
  difal?: number;
  fcp?: number;
  regime?: TaxRegime;
  category?: string;
  ncmExceptions?: Array<{
    ncm: string;
    icms: number;
    ipi: number;
  }>;
}

export interface TaxBenefit {
  id: string;
  name: string;
  description: string;
  type: 'REDUCTION' | 'EXEMPTION' | 'DEFERRAL';
  scope: 'UF' | 'MUNICIPALITY' | 'NATIONAL';
  location: string;
  category?: string;
  ncm?: string;
  reduction: number;
  validFrom: Date;
  validUntil?: Date;
  conditions: string[];
}

export interface TaxSubstitution {
  id: string;
  category: string;
  ncm: string;
  uf: string;
  marginSt: number;
  aliquotaInterna: number;
  aliquotaInterestadual: number;
  isActive: boolean;
}

export interface TaxCalculationContext {
  product: ProductLegacy;
  customer: CustomerLegacy;
  quantity: number;
  unitPrice: number;
  originUF: string;
  destinationUF: string;
  operationType: 'VENDA' | 'TRANSFERENCIA' | 'DEMONSTRACAO';
  paymentTerm: string;
}

export interface TaxCalculationResult {
  taxes: TaxBreakdown;
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

export interface FreightRate {
  originUF: string;
  destinationUF: string;
  weightMin: number;
  weightMax: number;
  ratePerKg: number;
  minimumValue: number;
}

// -----------------------------------------------------------------------------
// TIPOS DE DESCONTO E ALERTAS
// -----------------------------------------------------------------------------

export interface ItemDiscount {
  type: 'VOLUME' | 'PROMOTIONAL' | 'CUSTOMER' | 'CAMPAIGN' | 'MANUAL';
  description: string;
  percentage: number;
  amount: number;
  priority: number;
}

export interface ItemAlert {
  type: 'WARNING' | 'ERROR' | 'INFO';
  message: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface TaxAlert {
  type: 'TAX_SUBSTITUTION' | 'TAX_BENEFIT' | 'COMPLIANCE_ISSUE';
  message: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

// -----------------------------------------------------------------------------
// CONFIGURAÇÕES
// -----------------------------------------------------------------------------

export interface PricingConfig {
  id: string;
  region: RegionType;
  admin_percent: number;
  logistics_percent: number;
  icms_percent: number;
  pis_cofins_percent: number;
  lab_to_lab_discount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingEngineConfig {
  id: string;
  default_markup_mg: number;
  default_markup_br: number;
  margin_green_threshold: number;
  margin_yellow_threshold: number;
  margin_orange_threshold: number;
  margin_authorized_threshold: number;
  minimum_price_margin_target: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingRule {
  category: string;
  channel: string;
  minimumMargin: number;
  standardMargin: number;
  maxDiscount: number;
}

export interface PaymentCondition {
  id: string;
  name: string;
  days: number;
  adjustment_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuoteValidityConfig {
  id: string;
  default_days: number;
  expiry_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// APROVAÇÕES
// -----------------------------------------------------------------------------

export interface ApprovalRule {
  id: string;
  name: string;
  margin_min?: number;
  margin_max?: number;
  approver_role: AppRole;
  sla_hours: number;
  priority: PriorityLevel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  quote_id: string;
  quote?: Quote;
  rule_id?: string;
  rule?: ApprovalRule;
  requested_by: string;
  approved_by?: string;
  status: ApprovalStatusType;
  priority: PriorityLevel;
  quote_total?: number;
  quote_margin_percent?: number;
  reason?: string;
  comments?: string;
  requested_at: string;
  decided_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// CÁLCULOS E RESUMOS
// -----------------------------------------------------------------------------

export interface MarginCalculation {
  listPrice: number;
  clusterPrice: number;
  minimumPrice: number;
  offeredPrice: number;
  costs: {
    baseCost: number;
    adminCost: number;
    logisticsCost: number;
    icmsCost: number;
    pisCofins: number;
    total: number;
  };
  marginValue: number;
  /** Margem Líquida % = (PV - Custos) / PV */
  marginPercent: number;
  /** Margem Bruta % = (PV / Custo) - 1 */
  marginBrutaPercent?: number;
  /** Margem Técnica % = (PV / (Custo + Adm + Log)) - 1 */
  marginTecnicaPercent?: number;
  isAuthorized: boolean;
  requiredApproverRole?: AppRole;
  ruleName?: string;
}

export interface QuoteSummary {
  subtotal: number;
  totalOffered: number;
  totalDiscount: number;
  totalMarginValue: number;
  totalMarginPercent: number;
  couponValue: number;
  isAuthorized: boolean;
  requiresApproval: boolean;
  requiredApproverRole?: AppRole;
  itemsCount: number;
  authorizedCount: number;
  unauthorizedCount: number;
}

// -----------------------------------------------------------------------------
// INPUTS E FILTROS
// -----------------------------------------------------------------------------

export interface CreateQuoteInput {
  customer_id: string;
  payment_condition_id?: string;
  valid_until: string;
  notes?: string;
  items: CreateQuoteItemInput[];
}

export interface CreateQuoteItemInput {
  product_id: string;
  quantity: number;
  offered_price: number;
}

export interface QuoteFilters {
  status?: QuoteStatusType[];
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  marginMin?: number;
  marginMax?: number;
  search?: string;
}

export interface CustomerFilters {
  uf?: string;
  isLabToLab?: boolean;
  isActive?: boolean;
  search?: string;
}

export interface ProductFilters {
  category?: string;
  status?: string;
  hasCampaign?: boolean;
  hasStock?: boolean;
  search?: string;
}

// -----------------------------------------------------------------------------
// ALIASES PARA COMPATIBILIDADE (re-exports)
// -----------------------------------------------------------------------------

// Esses aliases mantêm compatibilidade com código legado que usa os nomes antigos
export type QuoteStatus = QuoteStatusType;
export type ApprovalStatus = ApprovalStatusType;
