import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CustomerSelector } from '@/components/seller-flow/forms/CustomerSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer } from '@/types/seller-flow';

interface NovaQuotacaoStep1Props {
    selectedCustomer: Customer | null;
    destinationUF: string;
    onCustomerSelect: (customer: Customer) => void;
    onUFChange: (uf: string) => void;
}

/**
 * Passo 1 da Nova Cotação: Seleção do Cliente e UF de destino.
 */
export function NovaQuotacaoStep1({
    selectedCustomer,
    destinationUF,
    onCustomerSelect,
    onUFChange
}: NovaQuotacaoStep1Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>1. Seleção do Cliente</CardTitle>
            </CardHeader>
            <CardContent>
                <CustomerSelector
                    selectedCustomer={selectedCustomer}
                    onCustomerSelect={onCustomerSelect}
                />

                {selectedCustomer && (
                    <div className="mt-4 space-y-4">
                        <div className="space-y-2">
                            <div className="text-sm font-medium">UF de destino *</div>
                            <Select value={destinationUF || ''} onValueChange={onUFChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a UF" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
                                        "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
                                        "RS", "RO", "RR", "SC", "SP", "SE", "TO",
                                    ].map((uf) => (
                                        <SelectItem key={uf} value={uf}>
                                            {uf}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!destinationUF && (
                                <div className="text-xs text-muted-foreground">
                                    O cliente selecionado não possui UF cadastrada; selecione a UF para liberar o passo de produtos.
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t">
                            <div className="text-sm font-medium text-muted-foreground">Política comercial: <span className="text-primary">Principal (1)</span></div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
