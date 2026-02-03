import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getEmbalagemQty } from "@/utils/vtexUtils";

interface VtexProductAddFormProps {
    selected: any | null;
    quantity: number;
    itemDiscount: number;
    destinationUF: string;
    isAdding: boolean;
    onQuantityChange: (val: number) => void;
    onDiscountChange: (val: number) => void;
    onAdd: () => void;
    formatCurrency: (val: number) => string;
}

/**
 * IDENTIFICAÇÃO: Formulário de Adição à Cotação
 * Gerencia a entrada de quantidade e desconto e exibe o total projetado.
 */
export function VtexProductAddForm({
    selected,
    quantity,
    itemDiscount,
    destinationUF,
    isAdding,
    onQuantityChange,
    onDiscountChange,
    onAdd,
    formatCurrency
}: VtexProductAddFormProps) {
    if (!selected) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <div className="bg-muted p-4 rounded-full mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-xs font-medium">Selecione um produto para configurar a inclusão</p>
            </div>
        );
    }

    const embalagemQty = getEmbalagemQty(selected.embalagem, selected.product_name, selected.sku_name) ?? 1;
    const basePrice = (selected.selling_price || 0) * embalagemQty;
    const totalPrice = basePrice * (1 - itemDiscount / 100) * quantity;

    return (
        <div className="space-y-5 flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Quantidade</Label>
                    <Input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => onQuantityChange(Math.max(1, Number(e.target.value || 1)))}
                        className="h-10 font-bold border-muted-foreground/30 focus-visible:ring-primary/20"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-primary tracking-tight">Desconto (%)</Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={itemDiscount}
                        onChange={(e) => onDiscountChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className="h-10 font-black border-primary/30 text-primary focus-visible:ring-primary/20"
                        placeholder="0.0"
                    />
                </div>
            </div>

            <div className="space-y-1.5 bg-muted/20 p-4 rounded-xl border border-muted-foreground/10">
                <Label className="text-[10px] uppercase font-bold text-primary tracking-tight">Preço Base VTEX (Embalagem)</Label>
                <div className="relative">
                    <div className="h-12 flex items-center px-4 text-lg font-black bg-muted/30 border border-primary/10 rounded-md">
                        {formatCurrency(basePrice)}
                    </div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight px-1">
                    O preço base é derivado do catálogo VTEX e não pode ser editado manualmente.
                </p>
            </div>

            <div className="mt-auto space-y-4 pt-4 border-t">
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-widest">Total do Item</span>
                    <span className="text-xl font-black text-primary">
                        {formatCurrency(totalPrice)}
                    </span>
                </div>

                <Button
                    onClick={onAdd}
                    disabled={!selected || isAdding}
                    className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98]"
                >
                    {isAdding ? (
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-4 rounded-full bg-white/20 animate-pulse" />
                            <span>Processando...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Plus className="h-5 w-5" />
                            <span>ADICIONAR NA COTAÇÃO</span>
                        </div>
                    )}
                </Button>

                <div className="text-[9px] text-center text-muted-foreground px-4 leading-normal">
                    Ao adicionar, usaremos o cálculo de margem e impostos baseado no destino:
                    <span className="font-bold text-primary ml-1">{destinationUF}</span>.
                </div>
            </div>
        </div>
    );
}
