import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { ApprovalService, ApprovalRequest } from '@/services/approvalService';
import { PriceTableService } from '@/services/priceTableService';

export default function PricingDashboard() {
  const [approvalStats, setApprovalStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    expired: 0,
    averageTime: 0
  });
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const priceTables = PriceTableService.getAllTables();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stats, pending] = await Promise.all([
          ApprovalService.getApprovalStats(),
          ApprovalService.getPendingRequests()
        ]);
        setApprovalStats(stats);
        setPendingApprovals(pending);
      } catch (error) {
        console.error('Erro ao carregar dados de aprovação:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const mockKPIs = {
    averageMargin: 23.5,
    marginTrend: 2.1,
    totalQuotes: 156,
    averageTicket: 12500,
    conversionRate: 68.5,
    discountGiven: 8.2
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Precificação</h1>
          <p className="text-muted-foreground">
            Visão geral da performance comercial e aprovações
          </p>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockKPIs.averageMargin}%</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{mockKPIs.marginTrend}% vs mês anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mockKPIs.averageTicket)}</div>
            <div className="text-xs text-muted-foreground">
              {mockKPIs.totalQuotes} cotações este mês
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockKPIs.conversionRate}%</div>
            <div className="text-xs text-muted-foreground">
              Cotações aprovadas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Desconto Médio</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockKPIs.discountGiven}%</div>
            <div className="text-xs text-muted-foreground">
              Aplicado nas vendas
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Aprovações Pendentes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Aprovações Pendentes
              {pendingApprovals.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingApprovals.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingApprovals.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma aprovação pendente
              </p>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.slice(0, 5).map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{approval.quoteNumber}</p>
                      <p className="text-sm text-muted-foreground">{approval.reason}</p>
                      <div className="flex space-x-2">
                        <Badge variant={
                          approval.priority === 'URGENT' ? 'destructive' :
                          approval.priority === 'HIGH' ? 'default' :
                          approval.priority === 'MEDIUM' ? 'secondary' : 'outline'
                        }>
                          {approval.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(approval.value)}</p>
                      <p className="text-sm text-muted-foreground">
                        Margem: {approval.margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Estatísticas de Aprovação */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas de Aprovação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Pendentes:</span>
                    <Badge variant="secondary">{approvalStats.pending}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Aprovadas:</span>
                    <Badge variant="default">{approvalStats.approved}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Rejeitadas:</span>
                    <Badge variant="destructive">{approvalStats.rejected}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Expiradas:</span>
                    <Badge variant="outline">{approvalStats.expired}</Badge>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Tempo Médio de Aprovação</p>
                  <p className="text-2xl font-bold">
                    {approvalStats.averageTime.toFixed(1)}h
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabelas de Preço Ativas */}
      <Card>
        <CardHeader>
          <CardTitle>Tabelas de Preço Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {priceTables.map((table) => (
              <div key={table.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{table.name}</h3>
                  <Badge variant="outline">{table.channel}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {table.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  <p>Clientes: {table.customers.length}</p>
                  <p>Produtos: {table.prices.length}</p>
                  <p>Válida até: {new Date(table.validTo).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
