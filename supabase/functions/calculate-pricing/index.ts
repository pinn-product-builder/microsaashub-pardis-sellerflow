import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PricingRequest {
  productId: string;
  customerId?: string;
  quantity: number;
  destinationUF: string;
  offeredPrice?: number;
}

interface TaxResult {
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  total: number;
}

interface PricingResult {
  listPrice: number;
  minimumPrice: number;
  offeredPrice: number;
  marginPercent: number;
  marginValue: number;
  taxes: TaxResult;
  freight: number;
  isAuthorized: boolean;
  requiresApproval: boolean;
  approverRole?: string;
  alerts: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: PricingRequest = await req.json();
    const { productId, customerId, quantity, destinationUF, offeredPrice } = body;

    // Validate input
    if (!productId || !quantity || !destinationUF) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: productId, quantity, destinationUF' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch product
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: 'Produto não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch customer if provided
    let customer = null;
    if (customerId) {
      const { data: customerData } = await supabaseClient
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();
      customer = customerData;
    }

    // Fetch pricing config for region
    const region = destinationUF === 'MG' ? 'MG' : 'BR';
    const { data: pricingConfig } = await supabaseClient
      .from('pricing_config')
      .select('*')
      .eq('region', region)
      .eq('is_active', true)
      .single();

    // Fetch engine config
    const { data: engineConfig } = await supabaseClient
      .from('pricing_engine_config')
      .select('*')
      .eq('is_active', true)
      .single();

    // Fetch approval rules
    const { data: approvalRules } = await supabaseClient
      .from('approval_rules')
      .select('*')
      .eq('is_active', true)
      .order('margin_min', { ascending: true });

    // Calculate pricing
    const baseCost = product.base_cost;
    const adminPercent = pricingConfig?.admin_percent ?? 5;
    const logisticsPercent = pricingConfig?.logistics_percent ?? 3;
    const icmsPercent = pricingConfig?.icms_percent ?? 12;
    const pisConfinsPercent = pricingConfig?.pis_cofins_percent ?? 9.25;
    const l2lDiscount = pricingConfig?.lab_to_lab_discount ?? 10;

    // Calculate overhead
    const totalOverhead = adminPercent + logisticsPercent + icmsPercent + pisConfinsPercent;
    
    // Calculate minimum price
    const marginTarget = engineConfig?.minimum_price_margin_target ?? 15;
    const minimumPrice = baseCost * (1 + (totalOverhead + marginTarget) / 100);

    // Determine list price based on region
    const listPrice = region === 'MG' 
      ? product.price_mg ?? product.price_br ?? minimumPrice
      : product.price_br ?? minimumPrice;

    // Apply L2L discount if applicable
    const isL2L = customer?.is_lab_to_lab ?? false;
    const adjustedListPrice = isL2L ? listPrice * (1 - l2lDiscount / 100) : listPrice;

    // Calculate final offered price
    const finalOfferedPrice = offeredPrice ?? adjustedListPrice;

    // Calculate taxes
    const taxes: TaxResult = {
      icms: (finalOfferedPrice * icmsPercent) / 100,
      ipi: (finalOfferedPrice * 4) / 100, // IPI padrão 4%
      pis: (finalOfferedPrice * 1.65) / 100,
      cofins: (finalOfferedPrice * 7.6) / 100,
      total: 0
    };
    taxes.total = taxes.icms + taxes.ipi + taxes.pis + taxes.cofins;

    // Calculate freight (simplified)
    const freight = quantity * 5; // R$5 por unidade (simplificado)

    // Calculate costs
    const totalCost = baseCost * (1 + totalOverhead / 100);
    const adminCost = finalOfferedPrice * (adminPercent / 100);
    const logisticsCostValue = finalOfferedPrice * (logisticsPercent / 100);
    const icmsCostValue = finalOfferedPrice * (icmsPercent / 100);
    const pisCofinsCost = finalOfferedPrice * (pisConfinsPercent / 100);
    const allCosts = baseCost + adminCost + logisticsCostValue + icmsCostValue + pisCofinsCost;
    
    // Calculate margins (aligned with frontend formula)
    const marginValue = finalOfferedPrice - allCosts;
    // Margem Líquida = (PV - Custos) / PV (percentage based on price, not cost)
    const marginPercent = finalOfferedPrice > 0 
      ? ((finalOfferedPrice - allCosts) / finalOfferedPrice) * 100 
      : 0;
    // Margem Bruta = (PV / Custo) - 1
    const marginBrutaPercent = baseCost > 0 ? ((finalOfferedPrice / baseCost) - 1) * 100 : 0;
    // Margem Técnica = (PV / (Custo + Adm + Log)) - 1
    const techCosts = baseCost + adminCost + logisticsCostValue;
    const marginTecnicaPercent = techCosts > 0 ? ((finalOfferedPrice / techCosts) - 1) * 100 : 0;

    // Authorization thresholds
    const greenThreshold = engineConfig?.margin_green_threshold ?? 20;
    const yellowThreshold = engineConfig?.margin_yellow_threshold ?? 15;
    const orangeThreshold = engineConfig?.margin_orange_threshold ?? 10;
    const authorizedThreshold = engineConfig?.margin_authorized_threshold ?? 5;

    // Determine authorization
    const isAuthorized = marginPercent >= authorizedThreshold;
    let requiresApproval = false;
    let approverRole: string | undefined;

    // Check approval rules
    if (marginPercent < greenThreshold && approvalRules) {
      for (const rule of approvalRules) {
        if (marginPercent >= (rule.margin_min ?? 0) && marginPercent <= (rule.margin_max ?? 100)) {
          requiresApproval = true;
          approverRole = rule.approver_role;
          break;
        }
      }
    }

    // Generate alerts
    const alerts: string[] = [];
    if (marginPercent < authorizedThreshold) {
      alerts.push('Margem abaixo do limite autorizado. Cotação não pode ser enviada.');
    } else if (marginPercent < orangeThreshold) {
      alerts.push('Margem crítica. Requer aprovação de Diretor.');
    } else if (marginPercent < yellowThreshold) {
      alerts.push('Margem baixa. Requer aprovação de Gerente.');
    } else if (marginPercent < greenThreshold) {
      alerts.push('Margem abaixo do ideal. Requer aprovação de Coordenador.');
    }

    if (isL2L) {
      alerts.push(`Desconto L2L de ${l2lDiscount}% aplicado.`);
    }

    if (product.campaign_discount && product.campaign_discount > 0) {
      alerts.push(`Campanha ativa: ${product.campaign_name} (${product.campaign_discount}% off)`);
    }

    // Build result
    const result: PricingResult = {
      listPrice: adjustedListPrice,
      minimumPrice,
      offeredPrice: finalOfferedPrice,
      marginPercent: Number(marginPercent.toFixed(2)),
      marginValue: Number(marginValue.toFixed(2)),
      taxes,
      freight,
      isAuthorized,
      requiresApproval,
      approverRole,
      alerts
    };

    // Log audit
    await supabaseClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'CALCULATE_PRICING',
      entity_type: 'product',
      entity_id: productId,
      new_values: {
        productId,
        customerId,
        quantity,
        destinationUF,
        marginPercent: result.marginPercent,
        offeredPrice: result.offeredPrice
      }
    });

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-pricing:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno no servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
