import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MarginIndicator } from '@/components/seller-flow/display/MarginIndicator';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface ApprovalActionDialogProps {
    actionType: 'approve' | 'reject' | null;
    selectedRequest: any;
    comments: string;
    onCommentsChange: (val: string) => void;
    onClose: () => void;
    onConfirm: () => void;
    formatCurrency: (val: number) => string;
}

/**
 * IDENTIFICAÇÃO: Modal de Ação do Aprovador
 * Interface para inserir justificativa e confirmar decisão.
 */
export function ApprovalActionDialog({
    actionType,
    selectedRequest,
    comments,
    onCommentsChange,
    onClose,
    onConfirm,
    formatCurrency
}: ApprovalActionDialogProps) {
    return (
        <Dialog open={!!actionType} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">
                        {actionType === 'approve' ? '✨ Aprovar Cotação' : '❌ Rejeitar Cotação'}
                    </DialogTitle>
                    <DialogDescription className="font-medium">
                        {actionType === 'approve'
                            ? 'Sua aprovação será registrada no fluxo de alçada. Deseja adicionar uma nota?'
                            : 'Informe obrigatoriamente o motivo da rejeição para que o vendedor possa ajustar.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    {selectedRequest && (
                        <div className="p-4 bg-muted/20 rounded-xl border border-dashed border-muted-foreground/30 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-muted-foreground uppercase text-gray-500">Valor da Proposta</span>
                                <span className="font-black text-primary text-lg">{formatCurrency(selectedRequest.quote_total || 0)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-muted-foreground uppercase text-gray-500 tracking-tighter">Margem Projetada</span>
                                <MarginIndicator marginPercent={selectedRequest.quote_margin_percent || 0} showValue={true} />
                            </div>
                            {selectedRequest.total_steps > 1 && (
                                <div className="flex justify-between items-center text-[10px] mt-1 border-t border-muted pt-2 font-black uppercase tracking-widest text-blue-600">
                                    <span>Fluxo Multinível</span>
                                    <span>Passo {selectedRequest.current_step_order} de {selectedRequest.total_steps}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-500 tracking-wider">
                            Justificativa / Comentários <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                            placeholder={actionType === 'approve'
                                ? 'Ex: "Preço condizente com o volume", "Cliente estratégico"...'
                                : 'Ex: "Margem muito baixa", "Negociar frete"...'}
                            value={comments}
                            onChange={(e) => onCommentsChange(e.target.value)}
                            className="mt-2 min-h-[120px] shadow-inner focus-visible:ring-primary/20"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} className="font-bold">
                        CANCELAR
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={!comments.trim()}
                        className={`${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'} font-black px-8 shadow-xl`}
                    >
                        {actionType === 'approve' ? 'CONFIRMAR APROVAÇÃO' : 'CONFIRMAR REJEIÇÃO'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
