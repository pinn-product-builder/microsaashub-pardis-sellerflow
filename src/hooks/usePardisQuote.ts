// Hook para cálculos Pardis em tempo real na cotação
import { useMemo } from 'react';
import { QuoteItem } from '@/types/seller-flow';
import { Customer as PardisCustomer, PricingConfig, MarginCalculation, QuoteSummary, AppRole, PricingEngineConfig, ApprovalRule } from '@/types/pardis';
import { PardisMarginEngine } from '@/services/pardisMarginEngine';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { usePricingEngineConfig, useActiveApprovalRulesForEngine } from '@/hooks/usePricingEngineConfig';

interface PardisItemCalculation extends MarginCalculation {
  itemId: string;
  productName: string;
  quantity: number;
}

interface UsePardisQuoteResult {
  itemCalculations: PardisItemCalculation[];
  summary: QuoteSummary;
  isLoading: boolean;
  pricingConfig: PricingConfig | undefined;
  engineConfig: PricingEngineConfig | undefined;
  approvalRules: ApprovalRule[] | undefined;
}

// Default pricing config when loading or unavailable
const DEFAULT_PRICING_CONFIG: PricingConfig = {
  id: 'default',
  region: 'BR',
  admin_percent: 3,
  logistics_percent: 4,
  icms_percent: 12,
  pis_cofins_percent: 9.25,
  lab_to_lab_discount: 1,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Converter Customer do tipo cpq para Pardis
function convertToPardisCustomer(customer: { 
  id: string; 
  companyName: string; 
  uf: string;
  cnpj?: string;
  city?: string;
  creditLimit?: number;
  paymentTerms?: string[];
  taxRegime?: string;
  stateRegistration?: string;
  isLabToLab?: boolean;
  priceTableType?: 'MG' | 'BR';
} | null): PardisCustomer | null {
  if (!customer) return null;
  
  return {
    id: customer.id,
    cnpj: customer.cnpj || '',
    company_name: customer.companyName,
    uf: customer.uf,
    city: customer.city || '',
    is_lab_to_lab: customer.isLabToLab || false,
    credit_limit: customer.creditLimit || 0,
    available_payment_terms: customer.paymentTerms || [],
    price_table_type: customer.priceTableType || (customer.uf === 'MG' ? 'MG' : 'BR'),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function usePardisQuote(
  items: QuoteItem[],
  customer: { 
    id: string; 
    companyName: string; 
    uf: string;
    cnpj?: string;
    city?: string;
    creditLimit?: number;
    paymentTerms?: string[];
    isLabToLab?: boolean;
    priceTableType?: 'MG' | 'BR';
  } | null,
  discountPercent: number = 0
): UsePardisQuoteResult {
  const region = customer?.uf === 'MG' ? 'MG' : 'BR';
  const { data: pricingConfigData, isLoading: isLoadingPricing } = usePricingConfig(region as 'MG' | 'BR');
  const { data: engineConfigData, isLoading: isLoadingEngine } = usePricingEngineConfig();
  const { data: approvalRulesData, isLoading: isLoadingRules } = useActiveApprovalRulesForEngine();
  
  const isLoading = isLoadingPricing || isLoadingEngine || isLoadingRules;
  const pricingConfig = pricingConfigData || DEFAULT_PRICING_CONFIG;
  const pardisCustomer = convertToPardisCustomer(customer);

  const itemCalculations = useMemo((): PardisItemCalculation[] => {
    if (!pardisCustomer || items.length === 0) return [];

    return items.map(item => {
      // Converter produto do tipo cpq para pardis - usando markups dinâmicos
      const defaultMarkupMg = engineConfigData?.default_markup_mg ?? 1.5;
      const defaultMarkupBr = engineConfigData?.default_markup_br ?? 1.6;
      
      const pardisProduct = {
        id: item.product.id,
        sku: item.product.sku,
        name: item.product.name,
        base_cost: item.product.baseCost,
        price_mg: item.product.baseCost * defaultMarkupMg,
        price_br: item.product.baseCost * defaultMarkupBr,
        price_minimum: item.minimumPrice,
        stock_quantity: 100,
        campaign_discount: 0,
        status: 'active' as const,
        unit: 'UN',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        external_id: undefined,
        description: item.product.description,
        category: item.product.category,
        ncm: item.product.ncm,
        stock_min_expiry: undefined,
        campaign_name: undefined,
        responsible_user_id: undefined,
        last_sync_at: undefined,
      };

      const calculation = PardisMarginEngine.calculateItemMargin(
        pardisProduct,
        item.quantity,
        // Desconto global (%): aplicamos sobre o preço ofertado para cálculo de margem.
        // Descontos unitários já refletidos em `item.unitPrice` continuam funcionando.
        item.unitPrice * (1 - Math.min(100, Math.max(0, Number(discountPercent) || 0)) / 100),
        pardisCustomer,
        pricingConfig,
        engineConfigData,
        approvalRulesData
      );

      return {
        ...calculation,
        itemId: item.id,
        productName: item.product.name,
        quantity: item.quantity,
      };
    });
  }, [items, pardisCustomer, pricingConfig, engineConfigData, approvalRulesData, discountPercent]);

  const summary = useMemo((): QuoteSummary => {
    if (itemCalculations.length === 0) {
      return {
        subtotal: 0,
        totalOffered: 0,
        totalDiscount: 0,
        totalMarginValue: 0,
        totalMarginPercent: 0,
        couponValue: 0,
        isAuthorized: true,
        requiresApproval: false,
        itemsCount: 0,
        authorizedCount: 0,
        unauthorizedCount: 0,
      };
    }

    const quantities = itemCalculations.map(c => c.quantity);
    const pardisCalcs = itemCalculations as MarginCalculation[];
    
    const baseResult = PardisMarginEngine.calculateQuoteSummary(
      pardisCalcs, 
      quantities,
      engineConfigData,
      approvalRulesData
    );
    
    const authorizedCount = itemCalculations.filter(c => c.isAuthorized).length;
    const unauthorizedCount = itemCalculations.filter(c => !c.isAuthorized).length;

    return {
      ...baseResult,
      itemsCount: itemCalculations.length,
      authorizedCount,
      unauthorizedCount,
    };
  }, [itemCalculations, engineConfigData, approvalRulesData]);

  return {
    itemCalculations,
    summary,
    isLoading,
    pricingConfig,
    engineConfig: engineConfigData,
    approvalRules: approvalRulesData,
  };
}

export function getApproverLabel(role: AppRole): string {
  const labels: Record<AppRole, string> = {
    vendedor: 'Vendedor',
    coordenador: 'Coordenador',
    gerente: 'Gerente',
    diretor: 'Diretor',
    admin: 'Administrador',
  };
  return labels[role] || role;
}
