import { Percent, DollarSign, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface DiscountModeSelectorProps {
    mode: 'percentage' | 'manual';
    onModeChange: (mode: 'percentage' | 'manual') => void;
    disabled?: boolean;
}

/**
 * COMPONENTE: Seletor de Modo de Desconto
 * Permite alternar entre desconto percentual (padrão) e preço manual por item.
 */
export function DiscountModeSelector({ mode, onModeChange, disabled = false }: DiscountModeSelectorProps) {
    return (
        <div className="flex items-center gap-3">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                Modo de Precificação
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-3 w-3 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p className="text-xs font-medium">
                                <strong>Percentual:</strong> Aplica desconto % sobre o preço base<br />
                                <strong>Manual:</strong> Permite editar o preço final diretamente
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </Label>

            <ToggleGroup
                type="single"
                value={mode}
                onValueChange={(value) => {
                    if (value) onModeChange(value as 'percentage' | 'manual');
                }}
                disabled={disabled}
                className="bg-muted/20 p-1 rounded-lg border border-muted-foreground/10"
            >
                <ToggleGroupItem
                    value="percentage"
                    aria-label="Modo Percentual"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground font-bold text-xs px-4 h-8"
                >
                    <Percent className="h-3.5 w-3.5 mr-1.5" />
                    PERCENTUAL
                </ToggleGroupItem>
                <ToggleGroupItem
                    value="manual"
                    aria-label="Modo Manual"
                    className="data-[state=on]:bg-amber-600 data-[state=on]:text-white font-bold text-xs px-4 h-8"
                >
                    <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                    MANUAL
                </ToggleGroupItem>
            </ToggleGroup>

            {mode === 'manual' && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 animate-in fade-in slide-in-from-left-2 duration-300">
                    <Info className="h-3 w-3" />
                    <span>Modo manual ativo - edite os preços diretamente na tabela</span>
                </div>
            )}
        </div>
    );
}
