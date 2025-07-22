
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { QuoteItem } from '@/types/cpq';

interface PriceSummaryProps {
  items: QuoteItem[];
  discount: number;
  totals: {
    subtotal: number;
    totalTaxes: number;
    totalFreight: number;
    discount: number;
    total: number;
  };
}

export function PriceSummary({ items, discount, totals }: PriceSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const averageMargin = items.length > 0
    ? items.reduce((sum, item) => sum + item.margin, 0) / items.length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumo da Cotação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Itens:</span>
            <span>{items.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Margem Média:</span>
            <span className={`font-medium ${
              averageMargin >= 20 ? 'text-green-600' : 
              averageMargin >= 10 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {averageMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Impostos:</span>
            <span>{formatCurrency(totals.totalTaxes)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Frete:</span>
            <span>{formatCurrency(totals.totalFreight)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto ({discount}%):</span>
              <span>-{formatCurrency(totals.discount)}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span>{formatCurrency(totals.total)}</span>
        </div>

        {/* Breakdown detalhado dos impostos */}
        {items.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Detalhamento de Impostos</h4>
              {items.reduce((acc, item) => {
                acc.icms += item.taxes.icms * item.quantity;
                acc.ipi += item.taxes.ipi * item.quantity;
                acc.pis += item.taxes.pis * item.quantity;
                acc.cofins += item.taxes.cofins * item.quantity;
                return acc;
              }, { icms: 0, ipi: 0, pis: 0, cofins: 0 })}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span>ICMS:</span>
                  <span>{formatCurrency(items.reduce((sum, item) => sum + (item.taxes.icms * item.quantity), 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>IPI:</span>
                  <span>{formatCurrency(items.reduce((sum, item) => sum + (item.taxes.ipi * item.quantity), 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>PIS:</span>
                  <span>{formatCurrency(items.reduce((sum, item) => sum + (item.taxes.pis * item.quantity), 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>COFINS:</span>
                  <span>{formatCurrency(items.reduce((sum, item) => sum + (item.taxes.cofins * item.quantity), 0))}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
