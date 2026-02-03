import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MarginIndicator } from '@/components/seller-flow/display/MarginIndicator';

interface ApprovalCardItemProps {
    approval: any;
    formatCurrency: (val: number) => string;
    onApprove: (req: any) => void;
    onReject: (req: any) => void;
}

/**
 * IDENTIFICAÇÃO: Card de Solicitação de Aprovação
 * Exibe os detalhes de uma cotação pendente e botões de ação rápida.
 */
export function ApprovalCardItem({ approval, formatCurrency, onApprove, onReject }: ApprovalCardItemProps) {
    const getPriorityBadge = (priority: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            critical: 'destructive',
            high: 'destructive',
            medium: 'secondary',
            low: 'outline'
        };
        const labels: Record<string, string> = {
            critical: 'Crítica',
            high: 'Alta',
            medium: 'Média',
            low: 'Baixa'
        };
        return (
            <Badge variant={variants[priority] || 'secondary'} className="font-bold uppercase text-[10px]">
                {labels[priority] || priority}
            </Badge>
        );
    };

    return (
        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Link
                                to={`/seller-flow/cotacao/${approval.quote_id}`}
                                className="font-black text-primary hover:underline text-lg underline-offset-4"
                            >
                                Cotação #{approval.quote_number || approval.quote_id.substring(0, 8)}
                            </Link>
                            {getPriorityBadge(approval.priority || 'medium')}

                            {approval.total_steps > 1 && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
                                    Nível {approval.current_step_order} / {approval.total_steps}
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-6 text-sm">
                            <span className="font-bold text-gray-700">
                                Total: <span className="text-primary">{formatCurrency(approval.quote_total || 0)}</span>
                            </span>
                            <span className="flex items-center gap-2 font-bold text-gray-700">
                                Margem:
                                <MarginIndicator marginPercent={approval.quote_margin_percent || 0} showValue={true} />
                            </span>
                        </div>

                        {approval.reason && (
                            <div className="text-sm bg-muted/30 p-2 rounded border border-muted-foreground/10 italic text-muted-foreground">
                                <strong>Motivo da Alçada:</strong> {approval.reason}
                            </div>
                        )}

                        {approval.items && approval.items.length > 0 && (
                            <div className="mt-4 space-y-1.5 pt-3 border-t">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Composição do Carrinho</p>
                                {approval.items.slice(0, 3).map((it: any, idx: number) => (
                                    <div key={idx} className="text-xs flex justify-between items-center text-gray-600 bg-muted/10 p-1.5 rounded">
                                        <span><span className="font-bold text-primary">{it.quantity}x</span> {it.product_name || it.name}</span>
                                        <span className="font-mono">{formatCurrency(it.total_price || it.total || 0)}</span>
                                    </div>
                                ))}
                                {approval.items.length > 3 && (
                                    <p className="text-[10px] text-muted-foreground italic mt-1 ml-1">
                                        + {approval.items.length - 3} outros itens na cotação...
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter pt-2">
                            Solicitado em {format(new Date(approval.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {approval.expires_at && (
                                <span className="text-red-500 ml-2"> • Expira em {format(new Date(approval.expires_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="font-bold text-gray-700"
                            asChild
                        >
                            <Link to={`/seller-flow/cotacao/${approval.quote_id}`} target="_blank">
                                <Eye className="h-4 w-4 mr-1" />
                                VER DETALHES
                            </Link>
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700 hover:bg-red-50 font-bold"
                            onClick={() => onReject(approval)}
                        >
                            <X className="h-4 w-4 mr-1" />
                            REJEITAR
                        </Button>
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 font-bold shadow-lg shadow-green-200"
                            onClick={() => onApprove(approval)}
                        >
                            <Check className="h-4 w-4 mr-1" />
                            APROVAR
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
