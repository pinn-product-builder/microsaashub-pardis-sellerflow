// =============================================================================
// ARQUIVO DE COMPATIBILIDADE - LEGADO
// Este arquivo re-exporta tipos do domain.ts para manter compatibilidade
// com código existente. Novos arquivos devem importar de @/types/domain
// =============================================================================

export {
  // Tipos legados (camelCase)
  type ProductLegacy as Product,
  type CustomerLegacy as Customer,
  type QuoteLegacy as Quote,
  type QuoteItemLegacy as QuoteItem,
  
  // Tipos de impostos
  type TaxRule,
  type TaxBreakdown,
  type TaxBenefit,
  type TaxSubstitution,
  type TaxCalculationContext,
  type TaxCalculationResult,
  type TaxSimulationScenario,
  
  // Tipos de frete e pricing
  type FreightRate,
  type PricingRule,
  
  // Tipos auxiliares
  type ItemDiscount,
  type ItemAlert,
  type TaxAlert,
} from './domain';
