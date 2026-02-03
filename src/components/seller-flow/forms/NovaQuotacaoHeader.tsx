import { Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthorizationBadge } from '@/components/seller-flow/display/AuthorizationBadge';
import { getApproverLabel } from '@/hooks/usePardisQuote';

interface NovaQuotacaoHeaderProps {
    isEditing: boolean;
    isPardisLoading: boolean;
    isLoading: boolean;
    isSendingToVTEX: boolean;
    hasItems: boolean;
    canProceedToStep3: boolean;
    pardisSummary: any;
    handleSaveDraft: () => void;
    handleFinalize: () => void;
    handleSendToVTEX: () => void;
}

export function NovaQuotacaoHeader({
    isEditing,
    isPardisLoading,
    isLoading,
    isSendingToVTEX,
    hasItems,
    canProceedToStep3,
    pardisSummary,
    handleSaveDraft,
    handleFinalize,
    handleSendToVTEX
}: NovaQuotacaoHeaderProps) {
    return (
        <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link to="/seller-flow">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar ao Seller Flow
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {isEditing ? 'Editar Cotação' : 'Nova Cotação'}
                        {hasItems && !isPardisLoading && (
                            <AuthorizationBadge
                                isAuthorized={pardisSummary.isAuthorized}
                                requiresApproval={pardisSummary.requiresApproval}
                                requiredRole={pardisSummary.requiredApproverRole}
                                size="sm"
                            />
                        )}
                    </h1>
                    <p className="text-muted-foreground">
                        {isEditing ? 'Edite os dados da cotação' : 'Crie uma nova cotação para seu cliente'}
                    </p>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading || !canProceedToStep3}>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? 'Salvar Alterações' : 'Salvar Rascunho'}
                </Button>
                <Button
                    onClick={handleFinalize}
                    disabled={isLoading || !canProceedToStep3}
                    variant={pardisSummary.requiresApproval ? "outline" : "default"}
                >
                    {pardisSummary.requiresApproval ? (
                        <>
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Enviar para Aprovação
                        </>
                    ) : (
                        <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Finalizar Cotação
                        </>
                    )}
                </Button>
                <Button
                    onClick={handleSendToVTEX}
                    disabled={isSendingToVTEX || !canProceedToStep3 || pardisSummary.requiresApproval}
                    className="bg-orange-600 hover:bg-orange-700"
                    title={pardisSummary.requiresApproval ? "Requer aprovação antes de enviar para VTEX" : undefined}
                >
                    {isSendingToVTEX ? 'Enviando...' : 'Enviar para VTEX'}
                </Button>
            </div>
        </div>
    );
}
