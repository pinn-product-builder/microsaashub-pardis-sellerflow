// =============================================================================
// ARQUIVO DE COMPATIBILIDADE - LEGADO
// Este arquivo re-exporta tipos do domain.ts para manter compatibilidade
// com código existente. Novos arquivos devem importar de @/types/domain
// =============================================================================

export {
  // Enums e tipos base
  type AppRole,
  type RegionType,
  type QuoteStatusType as QuoteStatus,
  type ApprovalStatusType as ApprovalStatus,
  type PriorityLevel,
  
  // Entidades de usuário
  type Profile,
  type UserRole,
  
  // Entidades principais (snake_case - modelo de banco)
  type Customer,
  type Product,
  type Quote,
  type QuoteItem,
  
  // Configurações
  type PricingConfig,
  type PricingEngineConfig,
  type PaymentCondition,
  type QuoteValidityConfig,
  type ApprovalRule,
  
  // Aprovações
  type ApprovalRequest,
  
  // Cálculos
  type MarginCalculation,
  type QuoteSummary,
  
  // Inputs e filtros
  type CreateQuoteInput,
  type CreateQuoteItemInput,
  type QuoteFilters,
  type CustomerFilters,
  type ProductFilters,
} from './domain';
