
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, FileText, Users, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuotes, useQuoteStats } from '@/hooks/useQuotes';
import { usePendingApprovals } from '@/hooks/useApprovals';
import { useMemo, useEffect } from 'react';
import { PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function CPQDashboard() {
  const { data: quotes = [], isLoading: quotesLoading } = useQuotes();
  const { data: pendingApprovals = [], isLoading: approvalsLoading } = usePendingApprovals();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-quotes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vtex_quotes'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['quotes'] });
          queryClient.invalidateQueries({ queryKey: ['quote-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const stats = useMemo(() => {
    const total = quotes.length;
    const totalValue = quotes.reduce((sum, quote) => sum + ((quote as any).total || 0), 0);
    const pendingQuotes = quotes.filter(q => q.status === 'calculated' || q.status === 'sent').length;
    const thisMonthQuotes = quotes.filter(q => {
      const quoteDate = new Date(q.created_at);
      const now = new Date();
      return quoteDate.getMonth() === now.getMonth() && quoteDate.getFullYear() === now.getFullYear();
    }).length;
    const avgMargin = quotes.length > 0
      ? quotes.reduce((sum, q) => sum + (q.total_margin_percent || 0), 0) / quotes.length
      : 0;

    return {
      total,
      totalValue,
      pendingQuotes,
      thisMonthQuotes,
      avgMargin,
      pendingApprovals: pendingApprovals.length
    };
  }, [quotes, pendingApprovals]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const recentQuotes = quotes.slice(0, 5);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      calculated: 'Calculada',
      pending_approval: 'Aguardando Aprovação',
      approved: 'Aprovada',
      rejected: 'Rejeitada',
      sent: 'Enviada',
      expired: 'Expirada',
      converted: 'Convertida'
    };
    return labels[status] || status;
  };

  const isLoading = quotesLoading || approvalsLoading;

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard Cotações"
        description="Visão geral das cotações do sistema"
      >
        <Button asChild>
          <Link to="/seller-flow/nova-cotacao">
            <Plus className="h-4 w-4 mr-2" />
            Nova Cotação
          </Link>
        </Button>
      </PageHeader>

      <PageContent>
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="hover-scale transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Cotações
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">
                    Todas as cotações criadas
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="hover-scale transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Valor Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                  <p className="text-xs text-muted-foreground">
                    Soma de todas as cotações
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="hover-scale transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Aguardando Resposta
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
                  <p className="text-xs text-muted-foreground">
                    Cotações enviadas pendentes
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="hover-scale transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Este Mês
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats.thisMonthQuotes}</div>
                  <p className="text-xs text-muted-foreground">
                    Cotações criadas no mês
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* New Pending Approvals Card */}
          <Card className={`hover-scale transition-all duration-200 ${stats.pendingApprovals > 0 ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Aprovações Pendentes
              </CardTitle>
              <AlertTriangle className={`h-4 w-4 ${stats.pendingApprovals > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${stats.pendingApprovals > 0 ? 'text-amber-600' : ''}`}>
                    {stats.pendingApprovals}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.pendingApprovals > 0 ? (
                      <Link to="/seller-flow/aprovacoes" className="text-amber-600 hover:underline">
                        Ver aprovações →
                      </Link>
                    ) : (
                      'Nenhuma pendência'
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Quotes */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Cotações Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentQuotes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma cotação encontrada
                    </p>
                  ) : (
                    recentQuotes.map((quote) => (
                      <div key={quote.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/seller-flow/cotacao/${quote.id}`}
                            className="font-medium text-primary hover:underline block"
                          >
                            {quote.quote_number}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">
                            {(quote as any).client?.company_name || 'Cliente'}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium">{formatCurrency((quote as any).total || 0)}</p>
                          <Badge variant="secondary" className="text-xs">
                            {getStatusLabel(quote.status)}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link to="/seller-flow/nova-cotacao">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Cotação
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/seller-flow/historico">
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Todas as Cotações
                </Link>
              </Button>
              {stats.pendingApprovals > 0 && (
                <Button asChild variant="outline" className="w-full justify-start border-amber-500/50 text-amber-700 hover:bg-amber-50">
                  <Link to="/seller-flow/aprovacoes">
                    <Clock className="mr-2 h-4 w-4" />
                    Ver Aprovações Pendentes ({stats.pendingApprovals})
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  );
}
