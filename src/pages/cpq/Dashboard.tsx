
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, FileText, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Quote } from '@/types/cpq';
import { QuoteService } from '@/services/quoteService';

export default function CPQDashboard() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState({
    totalQuotes: 0,
    pendingQuotes: 0,
    totalValue: 0,
    avgValue: 0
  });

  useEffect(() => {
    const allQuotes = QuoteService.getAllQuotes();
    setQuotes(allQuotes.slice(0, 5)); // Últimas 5 cotações

    // Calcular estatísticas
    const totalQuotes = allQuotes.length;
    const pendingQuotes = allQuotes.filter(q => 
      ['draft', 'calculated'].includes(q.status)
    ).length;
    const totalValue = allQuotes.reduce((sum, q) => sum + q.total, 0);
    const avgValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

    setStats({
      totalQuotes,
      pendingQuotes,
      totalValue,
      avgValue
    });
  }, []);

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'draft': return 'text-muted-foreground';
      case 'calculated': return 'text-blue-600';
      case 'approved': return 'text-green-600';
      case 'sent': return 'text-purple-600';
      case 'expired': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusLabel = (status: Quote['status']) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'calculated': return 'Calculado';
      case 'approved': return 'Aprovado';
      case 'sent': return 'Enviado';
      case 'expired': return 'Expirado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard CPQ</h1>
          <p className="text-muted-foreground">
            Gerencie suas cotações e acompanhe o desempenho comercial
          </p>
        </div>
        <Button asChild>
          <Link to="/cpq/nova-cotacao">
            <Plus className="mr-2 h-4 w-4" />
            Nova Cotação
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cotações</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuotes}</div>
            <p className="text-xs text-muted-foreground">
              Todas as cotações criadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingQuotes}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando finalização
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stats.totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Soma de todas as cotações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(stats.avgValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio por cotação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card>
        <CardHeader>
          <CardTitle>Cotações Recentes</CardTitle>
          <CardDescription>
            Últimas cotações criadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                Nenhuma cotação encontrada
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece criando sua primeira cotação.
              </p>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/cpq/nova-cotacao">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Cotação
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {quote.number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {quote.customer.companyName}
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-sm text-muted-foreground">
                          {quote.items.length} {quote.items.length === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                      <div className="hidden lg:block">
                        <p className="text-sm font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(quote.total)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`text-sm font-medium ${getStatusColor(quote.status)}`}>
                      {getStatusLabel(quote.status)}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/cpq/cotacao/${quote.id}`}>
                        Ver
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              <div className="text-center pt-4">
                <Button variant="outline" asChild>
                  <Link to="/cpq/historico">
                    Ver todas as cotações
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
