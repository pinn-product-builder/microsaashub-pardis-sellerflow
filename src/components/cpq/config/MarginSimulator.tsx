import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { PricingConfig, RegionType } from '@/types/pardis';

interface MarginSimulatorProps {
  configs?: PricingConfig[];
}

export function MarginSimulator({ configs }: MarginSimulatorProps) {
  const [baseCost, setBaseCost] = useState<number>(100);
  const [offeredPrice, setOfferedPrice] = useState<number>(150);
  const [region, setRegion] = useState<RegionType>('MG');

  const selectedConfig = useMemo(() => {
    return configs?.find(c => c.region === region);
  }, [configs, region]);

  const calculation = useMemo(() => {
    if (!selectedConfig || baseCost <= 0 || offeredPrice <= 0) {
      return null;
    }

    const adminCost = baseCost * (selectedConfig.admin_percent / 100);
    const logisticsCost = baseCost * (selectedConfig.logistics_percent / 100);
    const icmsCost = offeredPrice * (selectedConfig.icms_percent / 100);
    const pisCofins = offeredPrice * (selectedConfig.pis_cofins_percent / 100);
    
    const totalCosts = baseCost + adminCost + logisticsCost + icmsCost + pisCofins;
    const marginValue = offeredPrice - totalCosts;
    const marginPercent = ((offeredPrice - totalCosts) / offeredPrice) * 100;
    
    const totalOverhead = selectedConfig.admin_percent + selectedConfig.logistics_percent + 
                          selectedConfig.icms_percent + selectedConfig.pis_cofins_percent;
    const minimumPrice = baseCost / (1 - totalOverhead / 100);
    const discount = ((minimumPrice - offeredPrice) / minimumPrice) * 100;

    // Determinar aprovador necessário
    let authorization: { status: string; approver?: string; color: string };
    if (marginPercent >= 0) {
      authorization = { status: 'Autorizado', color: 'green' };
    } else if (marginPercent >= -5) {
      authorization = { status: 'Requer Aprovação', approver: 'Coordenador', color: 'yellow' };
    } else if (marginPercent >= -10) {
      authorization = { status: 'Requer Aprovação', approver: 'Gerente', color: 'orange' };
    } else {
      authorization = { status: 'Requer Aprovação', approver: 'Diretor', color: 'red' };
    }

    return {
      adminCost,
      logisticsCost,
      icmsCost,
      pisCofins,
      totalCosts,
      marginValue,
      marginPercent,
      minimumPrice,
      discount: discount > 0 ? discount : 0,
      authorization,
    };
  }, [baseCost, offeredPrice, selectedConfig]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getMarginIcon = () => {
    if (!calculation) return <Minus className="h-5 w-5" />;
    if (calculation.marginPercent > 0) return <TrendingUp className="h-5 w-5 text-green-500" />;
    if (calculation.marginPercent < 0) return <TrendingDown className="h-5 w-5 text-red-500" />;
    return <Minus className="h-5 w-5 text-yellow-500" />;
  };

  const getMarginColor = () => {
    if (!calculation) return 'text-muted-foreground';
    if (calculation.marginPercent >= 10) return 'text-green-600';
    if (calculation.marginPercent >= 0) return 'text-green-500';
    if (calculation.marginPercent >= -5) return 'text-yellow-500';
    if (calculation.marginPercent >= -10) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Simulador de Margem
        </CardTitle>
        <CardDescription>
          Teste diferentes cenários de preço e veja o impacto na margem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="region">Região</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as RegionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MG">Minas Gerais</SelectItem>
                <SelectItem value="BR">Brasil (outros)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseCost">Custo Base (R$)</Label>
            <Input
              id="baseCost"
              type="number"
              min="0"
              step="0.01"
              value={baseCost}
              onChange={(e) => setBaseCost(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offeredPrice">Preço Ofertado (R$)</Label>
            <Input
              id="offeredPrice"
              type="number"
              min="0"
              step="0.01"
              value={offeredPrice}
              onChange={(e) => setOfferedPrice(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Resultados */}
        {calculation && (
          <div className="space-y-4">
            {/* Margem Principal */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getMarginIcon()}
                  <div>
                    <p className="text-sm text-muted-foreground">Margem Calculada</p>
                    <p className={`text-2xl font-bold ${getMarginColor()}`}>
                      {calculation.marginPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor da Margem</p>
                  <p className={`text-xl font-semibold ${getMarginColor()}`}>
                    {formatCurrency(calculation.marginValue)}
                  </p>
                </div>
              </div>
            </div>

            {/* Status de Autorização */}
            <div className={`p-4 rounded-lg border-2 ${
              calculation.authorization.color === 'green' ? 'border-green-500 bg-green-50' :
              calculation.authorization.color === 'yellow' ? 'border-yellow-500 bg-yellow-50' :
              calculation.authorization.color === 'orange' ? 'border-orange-500 bg-orange-50' :
              'border-red-500 bg-red-50'
            }`}>
              <div className="flex items-center gap-3">
                {calculation.authorization.color === 'green' ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Shield className="h-6 w-6 text-amber-600" />
                )}
                <div>
                  <p className="font-semibold">{calculation.authorization.status}</p>
                  {calculation.authorization.approver && (
                    <p className="text-sm text-muted-foreground">
                      Aprovador necessário: <strong>{calculation.authorization.approver}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Detalhamento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-background rounded border">
                <p className="text-xs text-muted-foreground">Custo Admin</p>
                <p className="font-medium">{formatCurrency(calculation.adminCost)}</p>
              </div>
              <div className="p-3 bg-background rounded border">
                <p className="text-xs text-muted-foreground">Custo Logística</p>
                <p className="font-medium">{formatCurrency(calculation.logisticsCost)}</p>
              </div>
              <div className="p-3 bg-background rounded border">
                <p className="text-xs text-muted-foreground">ICMS</p>
                <p className="font-medium">{formatCurrency(calculation.icmsCost)}</p>
              </div>
              <div className="p-3 bg-background rounded border">
                <p className="text-xs text-muted-foreground">PIS/COFINS</p>
                <p className="font-medium">{formatCurrency(calculation.pisCofins)}</p>
              </div>
            </div>

            {/* Preço Mínimo */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                Preço mínimo para margem 0%: <strong>{formatCurrency(calculation.minimumPrice)}</strong>
                {calculation.discount > 0 && (
                  <span className="text-red-500 ml-2">
                    (desconto de {calculation.discount.toFixed(1)}% sobre o mínimo)
                  </span>
                )}
              </p>
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
