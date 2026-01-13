import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, Info, Settings, ExternalLink } from 'lucide-react';
import { PricingConfig, PricingEngineConfig, ApprovalRule } from '@/types/pardis';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PricingFormulaCardProps {
  config?: PricingConfig;
  engineConfig?: PricingEngineConfig;
  approvalRules?: ApprovalRule[];
  onNavigateToTab?: (tab: string) => void;
}

export function PricingFormulaCard({ 
  config, 
  engineConfig,
  approvalRules,
  onNavigateToTab 
}: PricingFormulaCardProps) {
  const adminPercent = config?.admin_percent ?? 8;
  const logisticsPercent = config?.logistics_percent ?? 5;
  const icmsPercent = config?.icms_percent ?? 18;
  const pisCofinsPercent = config?.pis_cofins_percent ?? 3.65;
  const l2lDiscount = config?.lab_to_lab_discount ?? 1;
  
  const markupMG = engineConfig?.default_markup_mg ?? 1.5;
  const markupBR = engineConfig?.default_markup_br ?? 1.6;
  const marginTarget = engineConfig?.minimum_price_margin_target ?? 1;
  const authorizedThreshold = engineConfig?.margin_authorized_threshold ?? 0;
  
  const totalOverhead = adminPercent + logisticsPercent + icmsPercent + pisCofinsPercent;
  
  // Exemplo de cálculo
  const exampleCost = 100;
  const exampleMinPrice = exampleCost / (1 - totalOverhead / 100);

  const EditableBadge = ({ 
    label, 
    value, 
    tab, 
    tooltip 
  }: { 
    label: string; 
    value: string; 
    tab: string;
    tooltip: string;
  }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-primary/10 transition-colors group"
            onClick={() => onNavigateToTab?.(tab)}
          >
            {label}: {value}
            <Settings className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
          <p className="text-xs text-muted-foreground mt-1">Clique para editar</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Fórmulas do Motor de Precificação</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            Parâmetros Editáveis
          </Badge>
        </div>
        <CardDescription>
          Como o sistema calcula preços, margens e autorizações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fórmulas de Preço */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            📊 Cálculo de Preços
          </h4>
          
          <div className="p-3 bg-background rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Preço Lista:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                Custo Base × Markup
              </code>
            </div>
            <div className="flex gap-2 flex-wrap">
              <EditableBadge 
                label="Markup MG" 
                value={`${markupMG}x`} 
                tab="motor"
                tooltip="Multiplicador para calcular preço lista em Minas Gerais"
              />
              <EditableBadge 
                label="Markup BR" 
                value={`${markupBR}x`} 
                tab="motor"
                tooltip="Multiplicador para calcular preço lista para outros estados"
              />
            </div>
          </div>

          <div className="p-3 bg-background rounded-lg border space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Preço Cluster (L2L):</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                Preço Lista × (1 - L2L%)
              </code>
            </div>
            <EditableBadge 
              label="Desconto L2L" 
              value={`${l2lDiscount}%`} 
              tab="pricing"
              tooltip="Desconto para clientes Lab-to-Lab"
            />
          </div>
        </div>

        {/* Fórmulas de Margem */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            📈 Cálculo de Margens
          </h4>

          <div className="p-3 bg-background rounded-lg border space-y-3">
            <div>
              <p className="text-xs font-medium text-green-600 mb-1">Margem Bruta:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                (Preço Ofertado ÷ Custo Base) - 1
              </code>
            </div>
            
            <div>
              <p className="text-xs font-medium text-yellow-600 mb-1">Margem Técnica:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                (Preço Ofertado ÷ (Custo + Adm + Log)) - 1
              </code>
            </div>
            
            <div>
              <p className="text-xs font-medium text-primary mb-1">Margem Líquida:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block">
                (Preço - Custos Totais) ÷ Preço
              </code>
            </div>
          </div>
        </div>

        {/* Overhead */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            💰 Composição do Overhead ({config?.region ?? 'Região'})
          </h4>
          <div className="flex flex-wrap gap-2">
            <EditableBadge 
              label="Adm" 
              value={`${adminPercent}%`} 
              tab="pricing"
              tooltip="Custo administrativo percentual"
            />
            <EditableBadge 
              label="Logística" 
              value={`${logisticsPercent}%`} 
              tab="pricing"
              tooltip="Custo logístico percentual"
            />
            <EditableBadge 
              label="ICMS" 
              value={`${icmsPercent}%`} 
              tab="pricing"
              tooltip="Alíquota de ICMS"
            />
            <EditableBadge 
              label="PIS/COFINS" 
              value={`${pisCofinsPercent}%`} 
              tab="pricing"
              tooltip="Alíquota de PIS/COFINS"
            />
            <Badge variant="default">Total: {totalOverhead.toFixed(2)}%</Badge>
          </div>
        </div>

        {/* Preço Mínimo */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            🎯 Preço Mínimo
          </h4>
          <div className="p-3 bg-background rounded-lg border space-y-2">
            <code className="text-xs bg-muted px-2 py-1 rounded block">
              Cluster × (1 - (MargCluster - Target%))
            </code>
            <p className="text-xs text-muted-foreground">
              O preço mínimo nunca excede o preço lista (cap automático).
            </p>
            <EditableBadge 
              label="Target Margem" 
              value={`${marginTarget}%`} 
              tab="motor"
              tooltip="Margem mínima desejada para cálculo do preço mínimo"
            />
          </div>
        </div>

        {/* Autorização */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            ✅ Regras de Autorização
          </h4>
          <div className="p-3 bg-background rounded-lg border space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300">
                ≥ {authorizedThreshold}%
              </Badge>
              <span className="text-sm">→ AUTORIZADO</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={() => onNavigateToTab?.('motor')}
              >
                <Settings className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </div>
            
            {approvalRules && approvalRules.length > 0 ? (
              <div className="space-y-1 mt-2">
                {approvalRules.slice(0, 4).map((rule) => (
                  <div key={rule.id} className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-300">
                      {rule.margin_min ?? '-∞'}% a {rule.margin_max ?? '∞'}%
                    </Badge>
                    <span>→ {rule.approver_role.charAt(0).toUpperCase() + rule.approver_role.slice(1)}</span>
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs mt-1"
                  onClick={() => onNavigateToTab?.('approval')}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver todas as regras
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Configure regras de aprovação na aba "Aprovação"
              </p>
            )}
          </div>
        </div>

        {/* Exemplo Prático */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Exemplo Prático:</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Para um produto com <strong>Custo Base = R$ {exampleCost.toFixed(2)}</strong>:
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Preço Lista (MG):</p>
              <p className="font-medium text-primary">R$ {(exampleCost * markupMG).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Preço Mínimo:</p>
              <p className="font-medium text-primary">R$ {exampleMinPrice.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Abaixo do preço mínimo, a margem será negativa e requererá aprovação.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
