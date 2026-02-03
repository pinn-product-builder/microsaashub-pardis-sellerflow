
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Check,
  X,
  Clock,
  AlertTriangle,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePendingApprovals, useApproveRequest, useRejectRequest, useApprovalStats } from '@/hooks/useApprovals';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import { MarginIndicator } from '@/components/seller-flow/display/MarginIndicator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Aprovacoes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');

  const { data: pendingApprovals = [], isLoading } = usePendingApprovals();
  const { data: stats } = useApprovalStats();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();
  const { toast } = useToast();

  const filteredApprovals = pendingApprovals.filter(approval => {
    if (!searchTerm) return true;
    const quoteId = approval.quote_id.toLowerCase();
    return quoteId.includes(searchTerm.toLowerCase());
  });

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      if (actionType === 'approve') {
        await approveRequest.mutateAsync({
          id: selectedRequest.id,
          comments
        });
        toast({
          title: "Aprovada",
          description: "A cotação foi aprovada com sucesso."
        });
      } else {
        await rejectRequest.mutateAsync({
          id: selectedRequest.id,
          comments
        });
        toast({
          title: "Rejeitada",
          description: "A cotação foi rejeitada."
        });
      }
      setSelectedRequest(null);
      setActionType(null);
      setComments('');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível processar a ação.",
        variant: "destructive"
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

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
      <Badge variant={variants[priority] || 'secondary'}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Aprovações Pendentes"
        description="Gerencie as solicitações de aprovação de cotações"
      >
        <Button variant="outline" asChild>
          <Link to="/seller-flow/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </PageHeader>

      <PageContent>
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {stats?.pending || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Check className="h-4 w-4 mr-2" />
                Aprovadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.approved || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <X className="h-4 w-4 mr-2" />
                Rejeitadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.rejected || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats as any)?.avgTimeHours?.toFixed(1) || '0'}h
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Solicitações de Aprovação</CardTitle>
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID da cotação..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredApprovals.length === 0 ? (
              <div className="text-center py-12">
                <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Tudo em dia!</h3>
                <p className="text-muted-foreground">
                  Não há aprovações pendentes no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApprovals.map((approval) => (
                  <Card key={approval.id} className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <Link
                              to={`/seller-flow/cotacao/${approval.quote_id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              Ver Cotação
                            </Link>
                            {getPriorityBadge(approval.priority || 'medium')}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              Valor: {formatCurrency(approval.quote_total || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              Margem:
                              <MarginIndicator marginPercent={approval.quote_margin_percent || 0} showValue={false} />
                            </span>
                          </div>

                          {approval.reason && (
                            <p className="text-sm text-muted-foreground">
                              <strong>Motivo:</strong> {approval.reason}
                            </p>
                          )}

                          {approval.items && approval.items.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produtos</p>
                              {approval.items.slice(0, 3).map((it: any, idx: number) => (
                                <div key={idx} className="text-sm border-l-2 border-muted pl-2 py-0.5">
                                  <span className="font-medium">{it.quantity}x</span> {it.product_name || it.name}
                                  <span className="text-muted-foreground ml-2">({formatCurrency(it.total_price || it.total || 0)})</span>
                                </div>
                              ))}
                              {approval.items.length > 3 && (
                                <p className="text-xs text-muted-foreground italic pl-2">
                                  + {approval.items.length - 3} outros itens...
                                </p>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">
                            Solicitado em {format(new Date(approval.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            {approval.expires_at && (
                              <> • Expira em {format(new Date(approval.expires_at), "dd/MM/yyyy", { locale: ptBR })}</>
                            )}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedRequest(approval);
                              setActionType('reject');
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedRequest(approval);
                              setActionType('approve');
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* Action Dialog */}
      <Dialog open={!!actionType} onOpenChange={() => {
        setActionType(null);
        setSelectedRequest(null);
        setComments('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Aprovar Cotação' : 'Rejeitar Cotação'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'Informe a justificativa da aprovação. O vendedor será notificado.'
                : 'Informe o motivo da rejeição. O vendedor será notificado.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedRequest && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor:</span>
                  <span className="font-medium">{formatCurrency(selectedRequest.quote_total || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Margem:</span>
                  <MarginIndicator marginPercent={selectedRequest.quote_margin_percent || 0} showValue={false} />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">
                Justificativa <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder={actionType === 'approve'
                  ? 'Informe o motivo da aprovação...'
                  : 'Informe o motivo da rejeição...'}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setActionType(null);
              setSelectedRequest(null);
              setComments('');
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={!comments.trim()}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {actionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
