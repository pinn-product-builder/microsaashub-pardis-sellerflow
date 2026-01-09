// Tipos específicos do Sistema Pardis de Cotações

export type AppRole = 'vendedor' | 'coordenador' | 'gerente' | 'diretor' | 'admin';
export type RegionType = 'MG' | 'BR';
export type QuoteStatus = 'draft' | 'calculated' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'expired' | 'converted';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

// Perfil de usuário
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

// Role do usuário
export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

// Cliente
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
  price_table_type: 'MG' | 'BR';
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

// Produto
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
  status: 'active' | 'blocked' | 'obsolete';
  ncm?: string;
  is_active: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at: string;
}

// Configuração de Pricing
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

// Regra de Aprovação
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

// Condição de Pagamento
export interface PaymentCondition {
  id: string;
  name: string;
  days: number;
  adjustment_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Configuração de Validade
export interface QuoteValidityConfig {
  id: string;
  default_days: number;
  expiry_message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Configuração do Motor de Pricing (parâmetros globais dinâmicos)
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

// Cotação
export interface Quote {
  id: string;
  quote_number: string;
  customer_id: string;
  customer?: Customer;
  created_by: string;
  status: QuoteStatus;
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

// Item da Cotação
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

// Solicitação de Aprovação
export interface ApprovalRequest {
  id: string;
  quote_id: string;
  quote?: Quote;
  rule_id?: string;
  rule?: ApprovalRule;
  requested_by: string;
  approved_by?: string;
  status: ApprovalStatus;
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

// Resultado do cálculo de margem
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
  marginPercent: number;
  isAuthorized: boolean;
  requiredApproverRole?: AppRole;
}

// Resumo da cotação
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

// Input para criar cotação
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

// Filtros de listagem
export interface QuoteFilters {
  status?: QuoteStatus[];
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
