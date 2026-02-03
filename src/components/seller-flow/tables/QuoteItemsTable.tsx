import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { QuoteItem, Customer } from '@/types/seller-flow';
import { useSellerFlowStore } from '@/stores/sellerFlowStore';
import { usePardisQuote } from '@/hooks/usePardisQuote';
import { useToast } from '@/hooks/use-toast';

// Sub-componentes Modularizados
import { QuoteItemRow } from './QuoteItemRow';
import { ItemNotesDialog } from '../forms/ItemNotesDialog';
import { DiscountModeSelector } from '../forms/DiscountModeSelector';

interface QuoteItemsTableProps {
  items: QuoteItem[];
  customer?: Customer | null;
  showPardisIndicators?: boolean;
}

const POLICY_LABELS = [
  { id: '1', label: 'Principal' },
  { id: '2', label: 'B2C' },
  { id: 'mgpmgclustera', label: 'MGP MG Cluster A' },
  { id: 'mgpbrclustera', label: 'MGP BR Cluster A' },
];

/**
 * COMPONENTE: Tabela Principal de Itens da Cotação
 * Responsável por listar os produtos, gerenciar Qtd/Desconto e exibir status de alçada Pardis.
 */
export function QuoteItemsTable({
  items,
  customer,
  showPardisIndicators = true,
}: QuoteItemsTableProps) {
  const { removeItem, updateItem, selectedCustomer } = useSellerFlowStore();
  const { toast } = useToast();

  const [repricingIds, setRepricingIds] = useState<Record<string, boolean>>({});
  const [policyMatrix, setPolicyMatrix] = useState<Record<number, any[]>>({});

  const effectiveCustomer = customer || selectedCustomer;

  // IDENTIFICAÇÃO: Cálculos de Governança Pardis
  const { itemCalculations } = usePardisQuote(items, effectiveCustomer, 0);

  // IDENTIFICAÇÃO: Matriz de Preços VTEX (Visualização)
  const vtexSkuIds = useMemo(() =>
    items
      .filter(it => String(it.product?.id || '').startsWith('vtex:'))
      .map(it => Number(it.product?.sku))
      .filter(sku => Number.isFinite(sku)),
    [items]
  );

  useEffect(() => {
    (async () => {
      if (!vtexSkuIds.length) return;
      try {
        const { data } = await (supabase as any).rpc('get_vtex_prices_matrix', { sku_ids: vtexSkuIds });
        const map: Record<number, any[]> = {};
        for (const row of (data ?? [])) map[Number(row.vtex_sku_id)] = (row.prices ?? []) as any[];
        setPolicyMatrix(map);
      } catch { /* ignore */ }
    })();
  }, [vtexSkuIds]);

  // IDENTIFICAÇÃO: Handlers de Alteração
  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (String(item.product?.id || '').startsWith('vtex:')) {
      setRepricingIds(p => ({ ...p, [itemId]: true }));
      try {
        const skuId = Number(item.product.sku);
        const embalagemQty = Number((item as any).vtexEmbalagemQty || 1);
        const qtyUnits = newQuantity * embalagemQty;

        // Busca preço efetivo dinâmico na VTEX (Simulação de Carrinho)
        const { data } = await (supabase as any).rpc('get_vtex_effective_prices', {
          sku_ids: [skuId],
          quantities: [qtyUnits],
          trade_policy_id: "1" // Policy padrão
        });

        const unit = (data ?? [])[0]?.effective_price;
        if (unit > 0) {
          const unitPrice = unit * embalagemQty;
          const manualDiscount = item.discounts?.find(d => d.type === 'MANUAL')?.percentage || 0;

          updateItem(itemId, {
            ...item,
            quantity: newQuantity,
            unitPrice,
            totalPrice: (unitPrice * (1 - manualDiscount / 100)) * newQuantity
          });
        }
      } catch (e) {
        toast({ title: "Erro de Precificação", description: "Falha ao consultar preço na VTEX.", variant: "destructive" });
      } finally {
        setRepricingIds(p => ({ ...p, [itemId]: false }));
      }
    } else {
      // Itens Manuais / Legado
      const manualDiscount = item.discounts?.find(d => d.type === 'MANUAL')?.percentage || 0;
      updateItem(itemId, {
        ...item,
        quantity: newQuantity,
        totalPrice: (item.unitPrice * (1 - manualDiscount / 100)) * newQuantity
      });
    }
  };

  const handleDiscountChange = (itemId: string, percent: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const safePercent = Math.min(100, Math.max(0, percent));
    const finalUnitPrice = item.unitPrice * (1 - safePercent / 100);

    updateItem(itemId, {
      ...item,
      totalPrice: finalUnitPrice * item.quantity,
      discounts: [{
        type: 'MANUAL',
        description: 'Ajuste comercial',
        percentage: safePercent,
        amount: item.unitPrice * (safePercent / 100),
        priority: 1,
      }]
    });
  };

  // IDENTIFICAÇÃO: Handler de Notas por Item
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<QuoteItem | null>(null);

  const handleNotesClick = (item: QuoteItem) => {
    setSelectedItemForNotes(item);
    setNotesDialogOpen(true);
  };

  const handleNotesSave = (notes: string) => {
    if (selectedItemForNotes) {
      updateItem(selectedItemForNotes.id, {
        ...selectedItemForNotes,
        itemNotes: notes
      });
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/5 rounded-xl border border-dashed border-muted-foreground/20">
        <p className="text-muted-foreground font-medium">Sua cotação está vazia.</p>
        <p className="text-[10px] text-muted-foreground uppercase mt-1">Adicione produtos para começar.</p>
      </div>
    );
  }

  const { discountMode, setDiscountMode } = useSellerFlowStore();

  const handlePriceChange = (itemId: string, newPrice: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Preserva o preço original se ainda não estiver salvo
    const originalPrice = item.originalUnitPrice ?? item.unitPrice;

    updateItem(itemId, {
      ...item,
      unitPrice: newPrice,
      manualUnitPrice: true,
      originalUnitPrice: originalPrice,
      totalPrice: newPrice * item.quantity,
      // Se alterou preço manualmente, remove descontos manuais percentuais para evitar confusão de cálculo
      discounts: []
    });
  };

  return (
    <div className="space-y-4">
      {/* IDENTIFICAÇÃO: Seletor de Modo de Desconto */}
      <DiscountModeSelector
        mode={discountMode}
        onModeChange={setDiscountMode}
        disabled={items.length === 0}
      />

      <div className="w-full bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase tracking-widest">Produto / SKU</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Qtd</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Unitário Base</TableHead>
              <TableHead className="hidden md:table-cell text-right text-[10px] font-black uppercase tracking-widest">Preço Policy</TableHead>
              {showPardisIndicators && (
                <>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Mín. Alçada</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Autorização</TableHead>
                </>
              )}
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Subtotal</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Desconto</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <QuoteItemRow
                key={item.id}
                item={item}
                pardisCalc={itemCalculations.find(c => c.itemId === item.id)}
                showPardisIndicators={showPardisIndicators}
                repricingIds={repricingIds}
                selectedPolicyId="1"
                policyMatrix={policyMatrix}
                onQuantityChange={handleQuantityChange}
                onDiscountChange={handleDiscountChange}
                onNotesClick={handleNotesClick}
                onRemove={removeItem}
                formatCurrency={formatCurrency}
                discountMode={discountMode}
                onPriceChange={handlePriceChange}
              />
            ))}
          </TableBody>
        </Table>

        {/* IDENTIFICAÇÃO: Dialog de Notas por Item */}
        <ItemNotesDialog
          open={notesDialogOpen}
          onOpenChange={setNotesDialogOpen}
          itemName={selectedItemForNotes?.product.name || ''}
          currentNotes={selectedItemForNotes?.itemNotes || ''}
          onSave={handleNotesSave}
        />
      </div>
    </div>
  );
}
