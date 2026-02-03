import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentConditions } from '@/components/seller-flow/forms/PaymentConditions';
import { CompetitivePricingUpload } from '@/components/seller-flow/forms/CompetitivePricingUpload';
import { Customer } from '@/types/seller-flow';
import type { QuoteAttachment } from '@/types/attachments';

interface NovaQuotacaoStep3Props {
    selectedCustomer: Customer | null;
    paymentConditions: string;
    onPaymentChange: (value: string) => void;
    discount: number;
    onDiscountChange: (value: number) => void;
    discountReason: string;
    onDiscountReasonChange: (value: string) => void;
    notes: string;
    onNotesChange: (value: string) => void;
    quoteId?: string;
    attachments?: QuoteAttachment[];
    onAttachmentsChange?: () => void;
}

/**
 * Passo 3 da Nova Cotação: Condições de Pagamento, Observações e Documentos Comprobatórios.
 */
export function NovaQuotacaoStep3({
    selectedCustomer,
    paymentConditions,
    onPaymentChange,
    discount,
    onDiscountChange,
    discountReason,
    onDiscountReasonChange,
    notes,
    onNotesChange,
    quoteId,
    attachments = [],
    onAttachmentsChange = () => { }
}: NovaQuotacaoStep3Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>3. Condições de Pagamento e Documentação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <PaymentConditions
                    paymentConditions={paymentConditions}
                    onPaymentChange={onPaymentChange}
                    discount={discount}
                    onDiscountChange={onDiscountChange}
                    discountReason={discountReason}
                    onDiscountReasonChange={onDiscountReasonChange}
                    notes={notes}
                    onNotesChange={onNotesChange}
                    customerPaymentTerms={selectedCustomer?.paymentTerms || []}
                />

                {/* IDENTIFICAÇÃO: Upload de Documentos Comprobatórios */}
                {quoteId && (
                    <CompetitivePricingUpload
                        quoteId={quoteId}
                        attachments={attachments}
                        onAttachmentsChange={onAttachmentsChange}
                    />
                )}
            </CardContent>
        </Card>
    );
}
