import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package } from "lucide-react";
import { getEmbalagemQty } from "@/utils/vtexUtils";

interface VtexProductTableProps {
    loading: boolean;
    rows: any[];
    selectedId: number | null;
    onSelect: (row: any) => void;
    formatCurrency: (val: number) => string;
}

/**
 * IDENTIFICAÇÃO: Tabela de Resultados VTEX
 * Exibe a lista de produtos retornados pela busca RPC.
 */
export function VtexProductTable({ loading, rows, selectedId, onSelect, formatCurrency }: VtexProductTableProps) {
    if (loading) {
        return (
            <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-base">Nenhum produto encontrado</p>
                <p className="text-xs max-w-[200px] mt-1">Tente ajustar os termos da sua busca</p>
            </div>
        );
    }

    return (
        <Table>
            <TableHeader className="bg-muted/5 sticky top-0 z-10">
                <TableRow>
                    <TableHead className="w-[80px] text-xs uppercase font-bold">SKU</TableHead>
                    <TableHead className="text-xs uppercase font-bold">Produto</TableHead>
                    <TableHead className="text-right w-[100px] text-xs uppercase font-bold">Preço (Emb.)</TableHead>
                    <TableHead className="text-right w-[80px] text-xs uppercase font-bold">Estoque</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map((r) => (
                    <TableRow
                        key={r.vtex_sku_id}
                        className={`cursor-pointer transition-colors hover:bg-primary/5 ${selectedId === r.vtex_sku_id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                        onClick={() => onSelect(r)}
                    >
                        <TableCell className="font-mono text-xs align-middle">{r.vtex_sku_id}</TableCell>
                        <TableCell className="align-middle">
                            <div className="font-semibold text-sm line-clamp-1">{r.product_name ?? r.sku_name ?? "-"}</div>
                            {r.sku_name && r.sku_name !== r.product_name && (
                                <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{r.sku_name}</div>
                            )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-sm text-primary align-middle">
                            {(() => {
                                const qty = getEmbalagemQty(r.embalagem, r.product_name, r.sku_name) ?? 1;
                                return typeof r.selling_price === "number" ? formatCurrency(r.selling_price * qty) : "-";
                            })()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs align-middle">
                            {typeof r.available_quantity === "number" ? r.available_quantity.toFixed(0) : "-"}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
