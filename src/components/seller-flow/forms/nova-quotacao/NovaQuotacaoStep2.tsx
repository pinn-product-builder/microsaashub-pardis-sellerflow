import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { VtexProductSelector } from '@/components/seller-flow/forms/VtexProductSelector';
import { QuoteItemsTable } from '@/components/seller-flow/tables/QuoteItemsTable';
import { Customer, QuoteItem } from '@/types/seller-flow';

interface NovaQuotacaoStep2Props {
    destinationUF: string;
    selectedCustomer: Customer | null;
    policyMode: "auto" | "fixed";
    tradePolicyId: string;
    items: QuoteItem[];
    discount: number;
    currentStep: number;
    addItem: (item: QuoteItem) => void;
    handleProductAdded: () => void;
    setCurrentStep: (step: number) => void;
}

/**
 * Passo 2 da Nova Cotação: Adição e Gerenciamento de Produtos.
 */
export function NovaQuotacaoStep2({
    destinationUF,
    selectedCustomer,
    policyMode,
    tradePolicyId,
    items,
    discount,
    currentStep,
    addItem,
    handleProductAdded,
    setCurrentStep
}: NovaQuotacaoStep2Props) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle>2. Produtos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <VtexProductSelector
                    destinationUF={destinationUF}
                    selectedCustomer={selectedCustomer}
                    policyMode={policyMode}
                    tradePolicyId={tradePolicyId}
                    onAddProduct={(item) => {
                        addItem(item);
                        handleProductAdded();
                    }}
                />
                {items.length > 0 && (
                    <>
                        <Separator />
                        <QuoteItemsTable
                            items={items}
                            discountPercent={discount}
                            enablePriceEdit={false}
                            tradePolicyId={policyMode === "fixed" ? tradePolicyId : undefined}
                        />
                    </>
                )}
                {items.length > 0 && currentStep < 3 && (
                    <div className="flex justify-end pt-4">
                        <Button onClick={() => setCurrentStep(3)}>
                            Continuar para Finalização
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
