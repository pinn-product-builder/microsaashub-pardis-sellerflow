import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Check, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePendingApprovals, useApproveRequest, useRejectRequest, useApprovalStats } from '@/hooks/useApprovals';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import { useToast } from '@/hooks/use-toast';

// Sub-componentes Modularizados
import { ApprovalStatsCards } from '@/components/seller-flow/approvals/ApprovalStatsCards';
import { ApprovalCardItem } from '@/components/seller-flow/approvals/ApprovalCardItem';
import { ApprovalActionDialog } from '@/components/seller-flow/approvals/ApprovalActionDialog';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

/**
 * PÁGINA: Gerenciamento de Aprovações
 * Centraliza as solicitações de alçada comercial, permitindo aprovação ou rejeição com justificativa.
 */
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
  const queryClient = useQueryClient();

  // IDENTIFICAÇÃO: Auto-Refresh com Realtime
  useEffect(() => {
    console.log('⚡ Iniciando subscription de Aprovações');
    const channel = supabase
      .channel('approval-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'vtex_approval_requests'
        },
        (payload) => {
          console.log('🔄 Mudança detectada em aprovações:', payload);
          // Invalida cache para forçar recarregamento
          queryClient.invalidateQueries({ queryKey: ['approvals'] });
          queryClient.invalidateQueries({ queryKey: ['approval-stats'] });

          toast({
            title: "Lista Atualizada",
            description: "Novas informações de aprovação recebidas.",
            duration: 3000
          });
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Desconectando subscription de Aprovações');
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  // IDENTIFICAÇÃO: Lógica de Filtragem
  const filteredApprovals = pendingApprovals.filter(approval => {
    if (!searchTerm) return true;
    const searchLow = searchTerm.toLowerCase();
    return (
      approval.quote_id.toLowerCase().includes(searchLow) ||
      (approval.quote_number?.toLowerCase() || "").includes(searchLow)
    );
  });

  // IDENTIFICAÇÃO: Handlers de Decisão
  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      if (actionType === 'approve') {
        await approveRequest.mutateAsync({ id: selectedRequest.id, comments });
        toast({ title: "Sucesso!", description: "Cotação aprovada e disponível para faturamento." });
      } else {
        await rejectRequest.mutateAsync({ id: selectedRequest.id, comments });
        toast({ title: "Rejeitada", description: "O vendedor foi notificado sobre a rejeição.", variant: "destructive" });
      }
      handleCloseDialog();
    } catch (error) {
      toast({ title: "Erro na Operação", description: "Não foi possível registrar sua decisão.", variant: "destructive" });
    }
  };

  const handleCloseDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setComments('');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <PageContainer>
      <PageHeader
        title="Gestão de Alçadas"
        description="Aprove ou rejeite propostas comerciais baseadas em margem e política."
      >
        <Button variant="outline" asChild className="font-bold border-primary/20">
          <Link to="/seller-flow/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            VOTAR AO DASHBOARD
          </Link>
        </Button>
      </PageHeader>

      <PageContent>
        {/* 1. Painel de Estatísticas */}
        <ApprovalStatsCards stats={stats} />

        {/* 2. Filtros e Lista de Solicitações */}
        <Card className="shadow-xl border-t-4 border-t-primary">
          <CardHeader className="bg-muted/5 border-b">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                Solicitações na Fila
                {pendingApprovals.length > 0 && (
                  <Badge className="bg-primary">{pendingApprovals.length}</Badge>
                )}
              </CardTitle>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ID ou Número da Cotação..."
                  className="pl-10 shadow-inner border-muted-foreground/20"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
              </div>
            ) : filteredApprovals.length === 0 ? (
              <div className="text-center py-16 bg-muted/5 rounded-xl border border-dashed">
                <Check className="h-16 w-16 text-green-500/20 mx-auto mb-4" />
                <h3 className="text-xl font-black text-gray-400">FILA VAZIA</h3>
                <p className="text-muted-foreground font-medium">Não há solicitações aguardando ação no momento.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredApprovals.map((approval) => (
                  <ApprovalCardItem
                    key={approval.id}
                    approval={approval}
                    formatCurrency={formatCurrency}
                    onApprove={(req) => { setSelectedRequest(req); setActionType('approve'); }}
                    onReject={(req) => { setSelectedRequest(req); setActionType('reject'); }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* 3. Modal de Ação (Aprovar/Rejeitar) */}
      <ApprovalActionDialog
        actionType={actionType}
        selectedRequest={selectedRequest}
        comments={comments}
        onCommentsChange={setComments}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmAction}
        formatCurrency={formatCurrency}
      />
    </PageContainer>
  );
}
