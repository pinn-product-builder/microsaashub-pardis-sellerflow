import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { QuoteItem, Customer } from '@/types/seller-flow';
import { MarginIndicator } from '@/components/seller-flow/display/MarginIndicator';
import { AuthorizationBadge } from '@/components/seller-flow/display/AuthorizationBadge';
import { usePardisQuote, getApproverLabel } from '@/hooks/usePardisQuote';
import { useSellerFlowStore } from '@/stores/sellerFlowStore';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

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
  customer?: Customer | null;
}

export function PriceSummary({ items, discount, totals, customer }: PriceSummaryProps) {
  const { selectedCustomer } = useSellerFlowStore();
  const effectiveCustomer = customer || selectedCustomer;
  
  const { summary, isLoading } = usePardisQuote(items, effectiveCustomer, discount);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Resumo da Cotação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contagem de itens e status */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Itens:</span>
            <span>{items.length}</span>
          </div>
          
          {/* Status de Autorização Pardis */}
          {items.length > 0 && !isLoading && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Status:</span>
              <AuthorizationBadge 
                isAuthorized={summary.isAuthorized}
                requiresApproval={summary.requiresApproval}
                requiredRole={summary.requiredApproverRole}
                size="sm"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Métricas de Margem Pardis */}
        {items.length > 0 && !isLoading && (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                Análise de Margem
              </h4>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Margem Total:</span>
                <MarginIndicator 
                  marginPercent={summary.totalMarginPercent}
                  marginValue={summary.totalMarginValue}
                  showValue={true}
                  size="sm"
                />
              </div>

              {/* Itens autorizados vs não autorizados */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{summary.authorizedCount} autorizados</span>
                </div>
                {summary.unauthorizedCount > 0 && (
                  <div className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{summary.unauthorizedCount} pendentes</span>
                  </div>
                )}
              </div>

              {/* Alerta se precisa aprovação */}
              {summary.requiresApproval && summary.requiredApproverRole && (
                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle className="h-3 w-3 inline mr-1" />
                    Requer aprovação de: <strong>{getApproverLabel(summary.requiredApproverRole)}</strong>
                  </p>
                </div>
              )}

              {/* Valor do cupom VTEX */}
              {summary.couponValue > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cupom VTEX:</span>
                  <Badge variant="outline" className="text-xs">
                    {formatCurrency(summary.couponValue)}
                  </Badge>
                </div>
              )}
            </div>

            <Separator />
          </>
        )}

        {/* Valores da cotação */}
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

        {/* Loading state */}
        {isLoading && items.length > 0 && (
          <div className="text-center text-xs text-muted-foreground">
            Calculando margens...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
