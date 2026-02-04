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
    manualPrice: number;
    discountMode: 'percentage' | 'manual';
    destinationUF: string;
    isAdding: boolean;
    onQuantityChange: (val: number) => void;
    onDiscountChange: (val: number) => void;
    onManualPriceChange: (val: number) => void;
    onDiscountModeChange: (val: 'percentage' | 'manual') => void;
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
    manualPrice,
    discountMode,
    destinationUF,
    isAdding,
    onQuantityChange,
    onDiscountChange,
    onManualPriceChange,
    onDiscountModeChange,
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
    // Retomando multiplicação para garantir preço da caixa
    const basePrice = (selected.selling_price || 0) * embalagemQty;
    const totalPrice = manualPrice * quantity;

    const handleDiscountChange = (val: number) => {
        onDiscountChange(val);
        const newManualPrice = basePrice * (1 - val / 100);
        onManualPriceChange(newManualPrice);
    };

    const handleManualPriceChange = (val: number) => {
        onManualPriceChange(val);
        const newDiscount = basePrice > 0 ? ((1 - val / basePrice) * 100) : 0;
        onDiscountChange(Number(newDiscount.toFixed(2)));
    };

    return (
        <div className="space-y-5 flex-1 flex flex-col">
            <div className="flex p-0.5 bg-muted rounded-lg border border-muted-foreground/10">
                <button
                    onClick={() => onDiscountModeChange('percentage')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md transition-all ${discountMode === 'percentage' ? 'bg-white shadow-sm text-primary ring-1 ring-black/5' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Desconto %
                </button>
                <button
                    onClick={() => onDiscountModeChange('manual')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md transition-all ${discountMode === 'manual' ? 'bg-white shadow-sm text-primary ring-1 ring-black/5' : 'text-muted-foreground hover:text-foreground'}`}
                >
                    Preço Manual
                </button>
            </div>

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
                    <Label className={`text-[10px] uppercase font-bold tracking-tight ${discountMode === 'percentage' ? 'text-primary' : 'text-muted-foreground'}`}>
                        {discountMode === 'percentage' ? 'Desconto (%)' : 'Equiv. %'}
                    </Label>
                    <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        disabled={discountMode === 'manual'}
                        value={itemDiscount}
                        onChange={(e) => handleDiscountChange(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                        className={`h-10 font-black focus-visible:ring-primary/20 ${discountMode === 'percentage' ? 'border-primary/30 text-primary bg-primary/5' : 'border-muted-foreground/20 text-muted-foreground bg-muted'}`}
                        placeholder="0.0"
                    />
                </div>
            </div>

            <div className="space-y-1.5 bg-muted/20 p-4 rounded-xl border border-muted-foreground/10">
                <Label className={`text-[10px] uppercase font-bold tracking-tight ${discountMode === 'manual' ? 'text-primary' : 'text-muted-foreground'}`}>
                    {discountMode === 'manual' ? 'Preço Final (Manual)' : 'Preço Calculado'}
                </Label>
                <div className="relative">
                    {discountMode === 'manual' ? (
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">R$</span>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={manualPrice}
                                onChange={(e) => handleManualPriceChange(parseFloat(e.target.value) || 0)}
                                className="h-12 pl-10 text-lg font-black bg-primary/5 border border-primary/30 text-primary focus-visible:ring-primary/20"
                            />
                        </div>
                    ) : (
                        <div className="h-12 flex items-center px-4 text-lg font-black bg-muted/30 border border-primary/10 rounded-md text-muted-foreground">
                            {formatCurrency(manualPrice)}
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight px-1">
                    {discountMode === 'manual'
                        ? "Você está definindo o preço unitário manualmente. O sistema calculará a margem equivalente."
                        : "O preço unitário é calculado a partir do desconto aplicado sobre o preço base."}
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
