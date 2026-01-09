import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Info } from 'lucide-react';
import { PricingConfig } from '@/types/pardis';

interface PricingFormulaCardProps {
  config?: PricingConfig;
}

export function PricingFormulaCard({ config }: PricingFormulaCardProps) {
  const adminPercent = config?.admin_percent ?? 8;
  const logisticsPercent = config?.logistics_percent ?? 5;
  const icmsPercent = config?.icms_percent ?? 18;
  const pisCofinsPercent = config?.pis_cofins_percent ?? 3.65;
  
  const totalOverhead = adminPercent + logisticsPercent + icmsPercent + pisCofinsPercent;
  
  // Exemplo de cálculo
  const exampleCost = 100;
  const exampleMinPrice = exampleCost / (1 - totalOverhead / 100);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Fórmula de Cálculo de Margem</CardTitle>
        </div>
        <CardDescription>
          Como o sistema calcula a margem e o preço mínimo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fórmula Principal */}
        <div className="p-4 bg-background rounded-lg border">
          <p className="text-sm font-medium mb-2 text-muted-foreground">Margem (%):</p>
          <code className="text-sm bg-muted p-2 rounded block">
            Margem = ((Preço Ofertado - Custo Base) / Preço Ofertado) × 100
          </code>
        </div>

        {/* Fórmula Preço Mínimo */}
        <div className="p-4 bg-background rounded-lg border">
          <p className="text-sm font-medium mb-2 text-muted-foreground">Preço Mínimo (margem 0%):</p>
          <code className="text-sm bg-muted p-2 rounded block">
            Preço Mínimo = Custo Base ÷ (1 - Overhead%)
          </code>
        </div>

        {/* Composição do Overhead */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Composição do Overhead ({config?.region ?? 'Região'}):</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Admin: {adminPercent}%</Badge>
            <Badge variant="outline">Logística: {logisticsPercent}%</Badge>
            <Badge variant="outline">ICMS: {icmsPercent}%</Badge>
            <Badge variant="outline">PIS/COFINS: {pisCofinsPercent}%</Badge>
            <Badge variant="default">Total: {totalOverhead.toFixed(2)}%</Badge>
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
          <p className="text-sm mt-1">
            Preço Mínimo = {exampleCost} ÷ (1 - {(totalOverhead / 100).toFixed(4)}) = <strong className="text-primary">R$ {exampleMinPrice.toFixed(2)}</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Abaixo deste preço, a margem será negativa e requererá aprovação.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
