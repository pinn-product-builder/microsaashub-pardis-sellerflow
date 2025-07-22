
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { ConversionMetrics } from '@/types/vtex';
import { ConversionService } from '@/services/conversionService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ConversionDashboard() {
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMetrics = () => {
    setIsLoading(true);
    const conversionMetrics = ConversionService.getConversionMetrics();
    setMetrics(conversionMetrics);
    setIsLoading(false);
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Dashboard de Conversão</h2>
            <p className="text-muted-foreground">Monitore o fluxo de cotações para VTEX</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadMetrics} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <div className="mt-2">
              <Progress value={metrics.conversionRate} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.convertedQuotes} de {metrics.totalQuotes} cotações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageConversionTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Tempo de conversão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Convertida</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Total de pedidos enviados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovações Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status das Integrações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Sucessos</span>
                </div>
                <Badge className="bg-green-100 text-green-800">
                  {metrics.successfulIntegrations}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Falhas</span>
                </div>
                <Badge variant="destructive">
                  {metrics.failedIntegrations}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">Pendentes</span>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {metrics.pendingApprovals}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Taxa de Sucesso</span>
                  <span>
                    {metrics.successfulIntegrations > 0 
                      ? ((metrics.successfulIntegrations / (metrics.successfulIntegrations + metrics.failedIntegrations)) * 100).toFixed(1)
                      : 0
                    }%
                  </span>
                </div>
                <Progress 
                  value={
                    metrics.successfulIntegrations > 0 
                      ? (metrics.successfulIntegrations / (metrics.successfulIntegrations + metrics.failedIntegrations)) * 100
                      : 0
                  } 
                  className="h-2" 
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Automação</span>
                  <span>
                    {metrics.totalQuotes > 0 
                      ? (((metrics.totalQuotes - metrics.pendingApprovals) / metrics.totalQuotes) * 100).toFixed(1)
                      : 0
                    }%
                  </span>
                </div>
                <Progress 
                  value={
                    metrics.totalQuotes > 0 
                      ? ((metrics.totalQuotes - metrics.pendingApprovals) / metrics.totalQuotes) * 100
                      : 0
                  } 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar Pendentes ({metrics.pendingApprovals})
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reprocessar Falhas
            </Button>
            <Button variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Ver Detalhes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
