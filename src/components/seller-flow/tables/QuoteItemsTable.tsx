import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QuoteItem, Customer } from '@/types/seller-flow';
import { useSellerFlowStore } from '@/stores/sellerFlowStore';
import { MarginIndicator } from '@/components/seller-flow/display/MarginIndicator';
import { AuthorizationBadge } from '@/components/seller-flow/display/AuthorizationBadge';
import { usePardisQuote } from '@/hooks/usePardisQuote';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface QuoteItemsTableProps {
  items: QuoteItem[];
  customer?: Customer | null;
  showPardisIndicators?: boolean;
  tradePolicyId?: string; // legado (não usado com auto-policy)
}

export function QuoteItemsTable({ 
  items, 
  customer,
  showPardisIndicators = true,
  tradePolicyId,
}: QuoteItemsTableProps) {
  const { removeItem, updateItem, selectedCustomer } = useSellerFlowStore();
  const { toast } = useToast();
  const [repricingIds, setRepricingIds] = useState<Record<string, boolean>>({});
  
  // Use customer from props or from store
  const effectiveCustomer = customer || selectedCustomer;
  
  // Calculate Pardis margins
  const { itemCalculations } = usePardisQuote(items, effectiveCustomer);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        // Itens VTEX: recalcular preço efetivo para a nova quantidade (policy 1) usando RPC.
        // Isso evita ficar com preço incorreto em tiers (fixed/min_quantity) e nunca deixa preço "em branco".
        const isVtex = String(item.product?.id || '').startsWith('vtex:');
        if (isVtex) {
          const skuId = Number(item.product.sku);
          if (!Number.isFinite(skuId)) {
            toast({
              title: 'SKU inválido',
              description: 'Não foi possível recalcular preço VTEX para esse item.',
              variant: 'destructive',
            });
            return;
          }

          setRepricingIds(prev => ({ ...prev, [itemId]: true }));
          try {
            const rpcName = tradePolicyId ? 'get_vtex_effective_prices' : 'get_vtex_effective_prices_any_policy';
            const args: any = { sku_ids: [skuId], quantities: [newQuantity] };
            if (tradePolicyId) args.trade_policy_id = String(tradePolicyId);
            const { data, error } = await (supabase as any).rpc(rpcName, args);
            if (error) throw error;

            const row = (data ?? [])[0] as { effective_price?: number | null; trade_policy_id?: string | null } | undefined;
            const unit = row?.effective_price ?? null;

            if (!unit || unit <= 0) {
              toast({
                title: 'SKU sem preço',
                description: `Não encontramos preço para o SKU ${skuId} na quantidade ${newQuantity} (nenhuma policy).`,
                variant: 'destructive',
              });
              return;
            }

            updateItem(itemId, {
              ...item,
              quantity: newQuantity,
              unitPrice: unit,
              totalPrice: unit * newQuantity,
              vtexTradePolicyId: tradePolicyId ? String(tradePolicyId) : (row?.trade_policy_id ?? (item as any).vtexTradePolicyId),
            });
          } catch (e: any) {
            toast({
              title: 'Erro ao recalcular preço',
              description: e?.message ?? 'Falha ao buscar preço efetivo na VTEX/Supabase.',
              variant: 'destructive',
            });
          } finally {
            setRepricingIds(prev => ({ ...prev, [itemId]: false }));
          }
          return;
        }

        // Itens não-VTEX: mantém unitPrice e apenas ajusta total
        updateItem(itemId, {
          ...item,
          quantity: newQuantity,
          totalPrice: item.unitPrice * newQuantity,
        });
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Get Pardis calculation for an item
  const getItemCalc = (itemId: string) => {
    return itemCalculations.find(c => c.itemId === itemId);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum produto adicionado à cotação
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead className="text-center">Qtd</TableHead>
            <TableHead className="text-right">Preço Unit.</TableHead>
            {showPardisIndicators && (
              <>
                <TableHead className="text-right">Preço Mín.</TableHead>
                <TableHead className="text-center">Margem</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </>
            )}
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const pardisCalc = getItemCalc(item.id);
            
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      SKU: {item.product.sku}
                    </div>
                    {item.product.category && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {item.product.category}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1 || !!repricingIds[item.id]}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      disabled={!!repricingIds[item.id]}
                    >
                      +
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                
                {showPardisIndicators && (
                  <>
                    <TableCell className="text-right text-sm">
                      {pardisCalc ? (
                        <span className={item.unitPrice < pardisCalc.minimumPrice ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                          {formatCurrency(pardisCalc.minimumPrice)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {pardisCalc ? (
                        <MarginIndicator 
                          marginPercent={pardisCalc.marginPercent} 
                          marginValue={pardisCalc.marginValue}
                          showValue={false}
                          size="sm"
                        />
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {item.margin?.toFixed(1) || 0}%
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {pardisCalc ? (
                        <AuthorizationBadge 
                          isAuthorized={pardisCalc.isAuthorized}
                          requiredRole={pardisCalc.requiredApproverRole}
                          size="sm"
                        />
                      ) : (
                        <Badge variant="outline" className="text-xs">-</Badge>
                      )}
                    </TableCell>
                  </>
                )}
                
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.totalPrice)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
