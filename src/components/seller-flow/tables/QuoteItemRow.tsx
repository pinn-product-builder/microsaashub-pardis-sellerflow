import { Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QuoteItem } from '@/types/seller-flow';
import { MarginIndicator } from '@/components/seller-flow/display/MarginIndicator';
import { AuthorizationBadge } from '@/components/seller-flow/display/AuthorizationBadge';
import { getEmbalagemQty } from "@/utils/vtexUtils";

interface QuoteItemRowProps {
    item: QuoteItem;
    pardisCalc: any;
    showPardisIndicators: boolean;
    repricingIds: Record<string, boolean>;
    selectedPolicyId: string;
    policyMatrix: Record<number, any[]>;
    onQuantityChange: (id: string, qty: number) => void;
    onDiscountChange: (id: string, percent: number) => void;
    onNotesClick: (item: QuoteItem) => void;
    onRemove: (id: string) => void;
    formatCurrency: (val: number) => string;
}

/**
 * IDENTIFICAÇÃO: Linha de Item na Tabela de Cotação
 * Encapsula a lógica de exibição de um único produto, incluindo controles de Qtd, Desconto e Notas.
 */
export function QuoteItemRow({
    item,
    pardisCalc,
    showPardisIndicators,
    repricingIds,
    selectedPolicyId,
    policyMatrix,
    onQuantityChange,
    onDiscountChange,
    onNotesClick,
    onRemove,
    formatCurrency
}: QuoteItemRowProps) {

    const skuId = Number(item.product?.sku);
    const embalagemQty = Number((item as any).vtexEmbalagemQty || 1);
    const isRepricing = !!repricingIds[item.id];

    // Desconto Atual
    const manualDiscount = item.discounts?.find(d => d.type === 'MANUAL')?.percentage || 0;

    // Preços Calculados
    const displayUnitPrice = item.unitPrice * (1 - manualDiscount / 100);

    // Policy Helper
    const getPolicyPrice = (id: string) => {
        const rows = policyMatrix[skuId] ?? [];
        const row = rows.find((p: any) => String(p.tradePolicyId) === id);
        return typeof row?.effectivePrice === 'number' ? row.effectivePrice : null;
    };

    const policyPrice = getPolicyPrice(selectedPolicyId);

    return (
        <TableRow className="group hover:bg-muted/30 transition-colors">
            <TableCell className="max-w-[300px]">
                <div className="flex flex-col gap-1">
                    <span className="font-black text-gray-800 line-clamp-2">{item.product.name}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase">SKU {item.product.sku}</span>
                        {item.product.category && (
                            <Badge variant="secondary" className="text-[9px] font-black uppercase px-1 h-4">{item.product.category}</Badge>
                        )}
                        {item.itemNotes && (
                            <Badge variant="outline" className="text-[9px] font-black uppercase px-1 h-4 border-primary text-primary">
                                📝 Notas
                            </Badge>
                        )}
                    </div>
                </div>
            </TableCell>

            <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2 bg-muted/20 p-1 rounded-lg border border-muted-foreground/10">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-white hover:shadow-sm"
                        onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || isRepricing}
                    >
                        -
                    </Button>
                    <span className="w-8 font-black text-sm">{item.quantity}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-white hover:shadow-sm"
                        onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                        disabled={isRepricing}
                    >
                        +
                    </Button>
                </div>
            </TableCell>

            <TableCell className="text-right">
                <div className="flex flex-col items-end">
                    <span className={`font-mono text-xs ${manualDiscount > 0 ? "text-muted-foreground line-through opacity-50" : "font-bold"}`}>
                        {formatCurrency(item.unitPrice)}
                    </span>
                    {manualDiscount > 0 && (
                        <span className="font-black text-primary text-sm">
                            {formatCurrency(displayUnitPrice)}
                        </span>
                    )}
                </div>
            </TableCell>

            <TableCell className="hidden md:table-cell text-right">
                <div className="flex flex-col items-end opacity-60 group-hover:opacity-100 transition-opacity">
                    <span className="font-mono text-[11px]">
                        {policyPrice ? formatCurrency(policyPrice) : "-"}
                    </span>
                    {policyPrice && embalagemQty > 1 && (
                        <span className="text-[9px] text-muted-foreground font-bold">
                            Total {embalagemQty}un: {formatCurrency(policyPrice * embalagemQty)}
                        </span>
                    )}
                </div>
            </TableCell>

            {showPardisIndicators && (
                <>
                    <TableCell className="text-right">
                        {pardisCalc ? (
                            <div className="flex flex-col items-end">
                                <span className={`font-mono text-xs ${item.unitPrice < pardisCalc.minimumPrice ? 'text-destructive font-black' : 'text-gray-500 font-bold'}`}>
                                    {formatCurrency(pardisCalc.minimumPrice)}
                                </span>
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Limite Alçada</span>
                            </div>
                        ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center">
                        {pardisCalc ? (
                            <AuthorizationBadge
                                isAuthorized={pardisCalc.isAuthorized}
                                requiredRole={pardisCalc.requiredApproverRole}
                                size="sm"
                            />
                        ) : <Badge variant="outline" className="text-[10px]">-</Badge>}
                    </TableCell>
                </>
            )}

            <TableCell className="text-right">
                <span className="font-black text-sm text-gray-900">
                    {formatCurrency(item.totalPrice)}
                </span>
            </TableCell>

            <TableCell>
                <div className="flex items-center justify-end gap-1">
                    <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        className="h-8 w-16 text-right font-black border-primary/20 text-primary focus-visible:ring-primary/20"
                        value={manualDiscount}
                        onChange={(e) => onDiscountChange(item.id, parseFloat(e.target.value) || 0)}
                    />
                    <span className="text-[10px] font-black text-primary">%</span>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNotesClick(item)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Adicionar observações"
                    >
                        <MessageSquare className={`h-4 w-4 ${item.itemNotes ? 'fill-primary text-primary' : ''}`} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(item.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}
