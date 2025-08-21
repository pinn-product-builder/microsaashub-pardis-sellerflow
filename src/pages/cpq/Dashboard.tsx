
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, FileText, Users, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QuoteService } from '@/services/quoteService';
import { useMemo } from 'react';
import { PageContainer, PageHeader, PageContent } from '@/components/layout/Page';

export default function CPQDashboard() {
  const quotes = QuoteService.getAllQuotes();

  const stats = useMemo(() => {
    const total = quotes.length;
    const totalValue = quotes.reduce((sum, quote) => sum + quote.total, 0);
    const pendingQuotes = quotes.filter(q => q.status === 'calculated' || q.status === 'sent').length;
    const thisMonthQuotes = quotes.filter(q => {
      const quoteDate = new Date(q.createdAt);
      const now = new Date();
      return quoteDate.getMonth() === now.getMonth() && quoteDate.getFullYear() === now.getFullYear();
    }).length;

    return {
      total,
      totalValue,
      pendingQuotes,
      thisMonthQuotes
    };
  }, [quotes]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Dashboard Cotações"
        description="Visão geral das cotações do sistema"
      >
        <Button asChild>
          <Link to="/cpq/nova-cotacao">
            <Plus className="h-4 w-4 mr-2" />
            Nova Cotação
          </Link>
        </Button>
      </PageHeader>

      <PageContent>
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover-scale transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Cotações
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                Todas as cotações criadas
              </p>
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
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                Soma de todas as cotações
              </p>
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
              <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
              <p className="text-xs text-muted-foreground">
                Cotações enviadas pendentes
              </p>
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
              <div className="text-2xl font-bold">{stats.thisMonthQuotes}</div>
              <p className="text-xs text-muted-foreground">
                Cotações criadas no mês
              </p>
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
              <div className="space-y-4">
                {quotes.slice(0, 5).map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <Link 
                        to={`/cpq/cotacao/${quote.id}`}
                        className="font-medium text-primary hover:underline block"
                      >
                        {quote.number}
                      </Link>
                      <p className="text-sm text-muted-foreground truncate">
                        {quote.customer.companyName}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-medium">{formatCurrency(quote.total)}</p>
                      <p className="text-sm text-muted-foreground">
                        {quote.status === 'draft' && 'Rascunho'}
                        {quote.status === 'calculated' && 'Calculada'}
                        {quote.status === 'approved' && 'Aprovada'}
                        {quote.status === 'sent' && 'Enviada'}
                        {quote.status === 'expired' && 'Expirada'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start">
                <Link to="/cpq/nova-cotacao">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Cotação
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/cpq/historico">
                  <FileText className="mr-2 h-4 w-4" />
                  Ver Todas as Cotações
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  );
}
