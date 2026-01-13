import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { PricingConfig, RegionType } from '@/types/pardis';
import { PardisMarginEngine } from '@/services/pardisMarginEngine';
import { usePricingEngineConfig, useActiveApprovalRulesForEngine } from '@/hooks/usePricingEngineConfig';

interface MarginSimulatorProps {
  configs?: PricingConfig[];
}

export function MarginSimulator({ configs }: MarginSimulatorProps) {
  const [baseCost, setBaseCost] = useState<number>(100);
  const [offeredPrice, setOfferedPrice] = useState<number>(150);
  const [region, setRegion] = useState<RegionType>('MG');

  const { data: engineConfig } = usePricingEngineConfig();
  const { data: approvalRules } = useActiveApprovalRulesForEngine();

  const selectedConfig = useMemo(() => configs?.find(c => c.region === region), [configs, region]);

  const calculation = useMemo(() => {
    if (!selectedConfig || baseCost <= 0 || offeredPrice <= 0) return null;

    // Custos baseados no preço ofertado (conforme JSON Pardis)
    const adminCost = offeredPrice * (selectedConfig.admin_percent / 100);
    const logisticsCost = offeredPrice * (selectedConfig.logistics_percent / 100);
    const icmsCost = offeredPrice * (selectedConfig.icms_percent / 100);
    const pisCofins = offeredPrice * (selectedConfig.pis_cofins_percent / 100);
    
    const totalCosts = baseCost + adminCost + logisticsCost + icmsCost + pisCofins;
    
    // Margem Bruta = (PV / Custo) - 1 (conforme JSON)
    const marginBrutaPercent = baseCost > 0 ? ((offeredPrice / baseCost) - 1) * 100 : 0;
    
    // Margem Técnica = (PV / (Custo + Adm + Log)) - 1 (conforme JSON)
    const techCosts = baseCost + adminCost + logisticsCost;
    const marginTecnicaPercent = techCosts > 0 ? ((offeredPrice / techCosts) - 1) * 100 : 0;
    
    // Margem Líquida = (PV - Custos) / PV (conforme JSON)
    const marginLiquidaValue = offeredPrice - totalCosts;
    const marginLiquidaPercent = offeredPrice > 0 ? ((offeredPrice - totalCosts) / offeredPrice) * 100 : 0;
    
    const totalOverhead = selectedConfig.admin_percent + selectedConfig.logistics_percent + 
                          selectedConfig.icms_percent + selectedConfig.pis_cofins_percent;
    const minimumPrice = baseCost / (1 - totalOverhead / 100);
    const discount = ((minimumPrice - offeredPrice) / minimumPrice) * 100;

    const authThreshold = engineConfig?.margin_authorized_threshold ?? 0;
    const authResult = approvalRules && approvalRules.length > 0
      ? PardisMarginEngine.determineAuthorizationDynamic(marginLiquidaPercent, approvalRules, authThreshold)
      : PardisMarginEngine.determineAuthorizationWithThreshold(marginLiquidaPercent, authThreshold);

    const marginColor = engineConfig
      ? PardisMarginEngine.getMarginColorDynamic(marginLiquidaPercent, {
          green: engineConfig.margin_green_threshold,
          yellow: engineConfig.margin_yellow_threshold,
          orange: engineConfig.margin_orange_threshold,
        })
      : (marginLiquidaPercent > 0 ? 'green' : marginLiquidaPercent === 0 ? 'yellow' : 'red');

    const approverLabels: Record<string, string> = {
      vendedor: 'Vendedor', coordenador: 'Coordenador', gerente: 'Gerente', diretor: 'Diretor', admin: 'Administrador',
    };

    const ruleName = 'ruleName' in authResult ? authResult.ruleName : undefined;

    return {
      adminCost, 
      logisticsCost, 
      icmsCost, 
      pisCofins, 
      totalCosts,
      // 3 tipos de margem
      marginBrutaPercent,
      marginTecnicaPercent,
      marginLiquidaPercent,
      marginLiquidaValue,
      minimumPrice,
      discount: discount > 0 ? discount : 0,
      authorization: {
        status: authResult.isAuthorized ? 'Autorizado' : 'Requer Aprovação',
        approver: authResult.requiredApproverRole ? approverLabels[authResult.requiredApproverRole] : undefined,
        ruleName,
        color: marginColor,
      },
    };
  }, [baseCost, offeredPrice, selectedConfig, engineConfig, approvalRules]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getMarginColor = (marginPercent: number) => {
    const thresholds = engineConfig || { margin_green_threshold: 10, margin_yellow_threshold: 0, margin_orange_threshold: -5 };
    if (marginPercent >= thresholds.margin_green_threshold) return 'text-green-600';
    if (marginPercent >= thresholds.margin_yellow_threshold) return 'text-green-500';
    if (marginPercent >= thresholds.margin_orange_threshold) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getMarginBgColor = (marginPercent: number) => {
    const thresholds = engineConfig || { margin_green_threshold: 10, margin_yellow_threshold: 0, margin_orange_threshold: -5 };
    if (marginPercent >= thresholds.margin_green_threshold) return 'bg-green-500/10 border-green-500/30';
    if (marginPercent >= thresholds.margin_yellow_threshold) return 'bg-green-500/5 border-green-500/20';
    if (marginPercent >= thresholds.margin_orange_threshold) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Simulador de Margem</CardTitle>
        <CardDescription>Teste diferentes cenários de preço com os 3 tipos de margem</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Região</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as RegionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MG">Minas Gerais</SelectItem>
                <SelectItem value="BR">Brasil (outros)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Custo Base (R$)</Label>
            <Input type="number" min="0" step="0.01" value={baseCost} onChange={(e) => setBaseCost(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label>Preço Ofertado (R$)</Label>
            <Input type="number" min="0" step="0.01" value={offeredPrice} onChange={(e) => setOfferedPrice(parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        {calculation && (
          <div className="space-y-4">
            {/* 3 Tipos de Margem */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Margem Bruta */}
              <div className={`p-4 rounded-lg border ${getMarginBgColor(calculation.marginBrutaPercent)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Margem Bruta</p>
                </div>
                <p className={`text-2xl font-bold ${getMarginColor(calculation.marginBrutaPercent)}`}>
                  {calculation.marginBrutaPercent >= 0 ? '+' : ''}{calculation.marginBrutaPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (PV ÷ Custo) - 1
                </p>
              </div>

              {/* Margem Técnica */}
              <div className={`p-4 rounded-lg border ${getMarginBgColor(calculation.marginTecnicaPercent)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Margem Técnica</p>
                </div>
                <p className={`text-2xl font-bold ${getMarginColor(calculation.marginTecnicaPercent)}`}>
                  {calculation.marginTecnicaPercent >= 0 ? '+' : ''}{calculation.marginTecnicaPercent.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (PV ÷ (Custo+Adm+Log)) - 1
                </p>
              </div>

              {/* Margem Líquida */}
              <div className={`p-4 rounded-lg border-2 ${getMarginBgColor(calculation.marginLiquidaPercent)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <p className="text-xs font-medium text-primary uppercase tracking-wide">Margem Líquida</p>
                </div>
                <p className={`text-2xl font-bold ${getMarginColor(calculation.marginLiquidaPercent)}`}>
                  {calculation.marginLiquidaPercent >= 0 ? '+' : ''}{calculation.marginLiquidaPercent.toFixed(2)}%
                </p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">(PV - Custos) ÷ PV</p>
                  <p className={`text-sm font-semibold ${getMarginColor(calculation.marginLiquidaPercent)}`}>
                    {formatCurrency(calculation.marginLiquidaValue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Status de Autorização */}
            <div className={`p-4 rounded-lg border-2 ${
              calculation.authorization.color === 'green' ? 'border-green-500 bg-green-50 dark:bg-green-950/30' :
              calculation.authorization.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30' :
              calculation.authorization.color === 'orange' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' :
              'border-red-500 bg-red-50 dark:bg-red-950/30'
            }`}>
              <div className="flex items-center gap-3">
                {calculation.authorization.color === 'green' ? <CheckCircle className="h-6 w-6 text-green-600" /> : <Shield className="h-6 w-6 text-amber-600" />}
                <div>
                  <p className="font-semibold">{calculation.authorization.status}</p>
                  {calculation.authorization.approver && <p className="text-sm text-muted-foreground">Aprovador: <strong>{calculation.authorization.approver}</strong></p>}
                  {calculation.authorization.ruleName && <p className="text-xs text-muted-foreground mt-1">Regra: {String(calculation.authorization.ruleName)}</p>}
                </div>
              </div>
            </div>

            {/* Breakdown de Custos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-background rounded border"><p className="text-xs text-muted-foreground">Custo Admin</p><p className="font-medium">{formatCurrency(calculation.adminCost)}</p></div>
              <div className="p-3 bg-background rounded border"><p className="text-xs text-muted-foreground">Custo Logística</p><p className="font-medium">{formatCurrency(calculation.logisticsCost)}</p></div>
              <div className="p-3 bg-background rounded border"><p className="text-xs text-muted-foreground">ICMS</p><p className="font-medium">{formatCurrency(calculation.icmsCost)}</p></div>
              <div className="p-3 bg-background rounded border"><p className="text-xs text-muted-foreground">PIS/COFINS</p><p className="font-medium">{formatCurrency(calculation.pisCofins)}</p></div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">Preço mínimo: <strong>{formatCurrency(calculation.minimumPrice)}</strong></p>
            </div>
          </div>
        )}

        {!selectedConfig && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Configure os parâmetros de pricing para usar o simulador.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
