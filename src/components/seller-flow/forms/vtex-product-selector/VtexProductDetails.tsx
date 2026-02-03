import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { getEmbalagemQty } from "@/utils/vtexUtils";

interface VtexProductDetailsProps {
    selected: any | null;
    formatCurrency: (val: number) => string;
}

/**
 * IDENTIFICAÇÃO: Card de Detalhes do Produto VTEX
 * Exibe informações técnicas, gramatura, EAN e preço original da VTEX.
 */
export function VtexProductDetails({ selected, formatCurrency }: VtexProductDetailsProps) {
    if (!selected) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                <Package className="h-10 w-10 mb-3 opacity-10" />
                <p className="text-xs text-muted-foreground">Clique em um produto à esquerda para visualizar todos os detalhes técnicos e preços.</p>
            </div>
        );
    }

    const qty = getEmbalagemQty(selected.embalagem, selected.product_name, selected.sku_name);
    const hasPrice = typeof selected.selling_price === "number";
    const totalBase = hasPrice ? selected.selling_price * (qty ?? 1) : 0;

    return (
        <div className="space-y-5">
            <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Identificação</Label>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">SKU {selected.vtex_sku_id}</span>
                    {selected.ref_id && <span className="text-xs text-muted-foreground">Ref: {selected.ref_id}</span>}
                </div>
            </div>

            <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Nome / SKU Name</Label>
                <div className="text-sm font-bold leading-snug">{selected.product_name ?? "-"}</div>
                <div className="text-[11px] text-muted-foreground italic leading-tight">{selected.sku_name ?? ""}</div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
                {selected.ean && <Badge variant="secondary" className="text-[10px] font-normal px-2">EAN: {selected.ean}</Badge>}
                {selected.embalagem && <Badge variant="secondary" className="text-[10px] font-normal px-2 bg-blue-50 text-blue-700 border-blue-100">{selected.embalagem}</Badge>}
                {selected.gramatura && <Badge variant="secondary" className="text-[10px] font-normal px-2">{selected.gramatura}</Badge>}
            </div>

            <div className="space-y-2 pt-4 border-t">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Preço Original (VTEX)</Label>
                {!hasPrice ? (
                    <div className="text-2xl font-black text-primary">-</div>
                ) : (
                    <div className="space-y-0.5">
                        <div className="text-2xl font-black text-primary tracking-tighter">{formatCurrency(totalBase)}</div>
                        {qty && qty > 1 && (
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Pack com {qty} unidades
                            </div>
                        )}
                        <div className="text-[9px] text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded-full inline-block">
                            Origem: <span className="font-mono uppercase">{selected.price_source ?? "computed"}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-1.5 pt-4 border-t">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Disponibilidade</Label>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Estoque Atual:</span>
                    <span className={`text-sm font-bold ${selected.available_quantity && selected.available_quantity > 0 ? "text-green-600" : "text-destructive"}`}>
                        {typeof selected.available_quantity === "number" ? selected.available_quantity.toFixed(0) : "N/I"} un.
                    </span>
                </div>
            </div>
        </div>
    );
}
