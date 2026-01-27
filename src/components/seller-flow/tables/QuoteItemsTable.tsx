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
import { useEffect, useMemo, useState } from 'react';

interface QuoteItemsTableProps {
  items: QuoteItem[];
  customer?: Customer | null;
  showPardisIndicators?: boolean;
  tradePolicyId?: string; // legado (não usado com auto-policy)
}

const POLICY_LABELS = [
  { id: '1', label: 'Principal' },
  { id: '2', label: 'B2C' },
  { id: 'mgpmgclustera', label: 'MGP MG Cluster A' },
  { id: 'mgpbrclustera', label: 'MGP BR Cluster A' },
];

export function QuoteItemsTable({ 
  items, 
  customer,
  showPardisIndicators = true,
  tradePolicyId,
}: QuoteItemsTableProps) {
  const { removeItem, updateItem, selectedCustomer } = useSellerFlowStore();
  const { toast } = useToast();
  const [repricingIds, setRepricingIds] = useState<Record<string, boolean>>({});
  const [policyMatrix, setPolicyMatrix] = useState<Record<number, any[]>>({});
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(tradePolicyId || '1');
  
  // Use customer from props or from store
  const effectiveCustomer = customer || selectedCustomer;
  
  // Calculate Pardis margins
  const { itemCalculations } = usePardisQuote(items, effectiveCustomer);

  const getPolicyEffective = (skuId: number, policyId: string) => {
    const rows = policyMatrix[skuId] ?? [];
    const row = rows.find((p: any) => String(p.tradePolicyId) === policyId);
    return typeof row?.effectivePrice === 'number' ? row.effectivePrice : null;
  };

  const loadPolicyMatrix = async (skuIds: number[]) => {
    if (!skuIds.length) {
      setPolicyMatrix({});
      return;
    }
    try {
      const { data } = await (supabase as any).rpc('get_vtex_prices_matrix', { sku_ids: skuIds });
      const map: Record<number, any[]> = {};
      for (const row of (data ?? [])) {
        map[Number(row.vtex_sku_id)] = (row.prices ?? []) as any[];
      }
      setPolicyMatrix(map);
    } catch {
      setPolicyMatrix({});
    }
  };

  // Carrega preços por policy para itens VTEX da cotação
  // (apenas para exibição; não altera precificação do item)
  const vtexSkuIds = useMemo(
    () =>
      items
        .filter((item) => String(item.product?.id || '').startsWith('vtex:'))
        .map((item) => Number(item.product?.sku))
        .filter((skuId) => Number.isFinite(skuId)),
    [items],
  );

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity >= 1) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        // Itens VTEX: recalcular preço efetivo usando quantidade real (embalagem * qtd).
        // Isso evita preço incorreto em tiers (fixed/min_quantity) e mantém o preço cheio por embalagem.
        const isVtex = String(item.product?.id || '').startsWith('vtex:');
        if (isVtex) {
          const skuId = Number(item.product.sku);
          const embalagemQty = Number((item as any).vtexEmbalagemQty || 1);
          const qtyUnits = Math.max(1, newQuantity * embalagemQty);
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
            const pickRow = async () => {
              if (tradePolicyId) {
                const { data, error } = await (supabase as any).rpc('get_vtex_effective_prices', {
                  sku_ids: [skuId],
                  quantities: [qtyUnits],
                  trade_policy_id: String(tradePolicyId),
                });
                if (error) throw error;
                const row = (data ?? [])[0] as { effective_price?: number | null; trade_policy_id?: string | null } | undefined;
                return { row, policyId: String(tradePolicyId) };
              }

              const results = await Promise.all(
                POLICY_LABELS.map(async (p) => {
                  const { data, error } = await (supabase as any).rpc('get_vtex_effective_prices', {
                    sku_ids: [skuId],
                    quantities: [qtyUnits],
                    trade_policy_id: p.id,
                  });
                  if (error) throw error;
                  const row = (data ?? [])[0] as { effective_price?: number | null; trade_policy_id?: string | null } | undefined;
                  return { row, policyId: p.id };
                })
              );

              for (const r of results) {
                if (r.row?.effective_price && r.row.effective_price > 0) return r;
              }
              return results[0];
            };

            const picked = await pickRow();
            const unit = picked?.row?.effective_price ?? null;

            if (!unit || unit <= 0) {
              toast({
                title: 'SKU sem preço',
                description: `Não encontramos preço para o SKU ${skuId} na quantidade ${qtyUnits} (nenhuma policy).`,
                variant: 'destructive',
              });
              return;
            }
            const unitPrice = unit * embalagemQty;

            updateItem(itemId, {
              ...item,
              quantity: newQuantity,
              unitPrice,
              totalPrice: unitPrice * newQuantity,
              vtexTradePolicyId: picked?.policyId ?? (item as any).vtexTradePolicyId,
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

  useEffect(() => {
    loadPolicyMatrix(vtexSkuIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vtexSkuIds.join(',')]);

  useEffect(() => {
    if (tradePolicyId) setSelectedPolicyId(String(tradePolicyId));
  }, [tradePolicyId]);

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
            <TableHead>
              <div className="flex items-center gap-2">
                <span>Policy</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={selectedPolicyId}
                  onChange={(e) => setSelectedPolicyId(e.target.value)}
                >
                  {POLICY_LABELS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </TableHead>
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
                <TableCell className="text-xs">
                  {(() => {
                    const skuId = Number(item.product?.sku);
                    if (!Number.isFinite(skuId)) return <span className="text-muted-foreground">-</span>;
                    const embalagemQty = Number((item as any).vtexEmbalagemQty || 0);
                    const effective = getPolicyEffective(skuId, selectedPolicyId);
                    const totalValue =
                      embalagemQty && typeof effective === 'number'
                        ? effective * embalagemQty
                        : typeof effective === 'number'
                          ? effective
                          : null;
                    return (
                      <div className="font-mono text-right">
                        {typeof effective === 'number' ? formatCurrency(effective) : '-'}
                        {typeof totalValue === 'number' ? (
                          <div className="text-[10px] text-muted-foreground">
                            emb {embalagemQty || 1}: {formatCurrency(totalValue)}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
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
