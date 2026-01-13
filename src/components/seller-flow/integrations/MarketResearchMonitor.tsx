
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MarketResearchService, PriceAlert } from '@/services/marketResearchService';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Eye,
  Trash2
} from 'lucide-react';

export function MarketResearchMonitor() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = () => {
    const currentAlerts = MarketResearchService.getPriceAlerts();
    setAlerts(currentAlerts);
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    
    // Simula refresh dos dados
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    loadAlerts();
    setIsRefreshing(false);
    
    toast({
      title: "Dados atualizados",
      description: "Os dados de monitoramento foram atualizados.",
    });
  };

  const clearAllAlerts = () => {
    MarketResearchService.clearAlerts();
    setAlerts([]);
    toast({
      title: "Alertas limpos",
      description: "Todos os alertas foram removidos.",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getAlertIcon = (type: PriceAlert['alertType']) => {
    switch (type) {
      case 'PRICE_DROP':
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      case 'PRICE_INCREASE':
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getAlertColor = (type: PriceAlert['alertType']) => {
    switch (type) {
      case 'PRICE_DROP':
        return 'bg-green-100 text-green-800';
      case 'PRICE_INCREASE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Monitor de Preços</h2>
          <p className="text-muted-foreground">
            Acompanhe mudanças de preços da concorrência em tempo real
          </p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {alerts.length > 0 && (
            <Button variant="outline" onClick={clearAllAlerts}>
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Alertas
            </Button>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm text-muted-foreground">Total de Alertas</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm text-muted-foreground">Reduções</p>
                <p className="text-2xl font-bold">
                  {alerts.filter(a => a.alertType === 'PRICE_DROP').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <div className="ml-2">
                <p className="text-sm text-muted-foreground">Aumentos</p>
                <p className="text-2xl font-bold">
                  {alerts.filter(a => a.alertType === 'PRICE_INCREASE').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-4 w-4 text-purple-600" />
              <div className="ml-2">
                <p className="text-sm text-muted-foreground">Monitorando</p>
                <p className="text-2xl font-bold">
                  {MarketResearchService.getSettings().competitors.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum alerta no momento</p>
              <p className="text-sm text-muted-foreground">
                Os alertas aparecerão aqui quando houver mudanças significativas nos preços
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getAlertIcon(alert.alertType)}
                      <div>
                        <p className="font-medium">{alert.competitor}</p>
                        <p className="text-sm text-muted-foreground">
                          Produto: {alert.productId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getAlertColor(alert.alertType)}>
                        {alert.alertType === 'PRICE_DROP' ? 'Redução' : 'Aumento'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.createdAt.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Preço Anterior</p>
                      <p className="font-medium">{formatCurrency(alert.oldPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Novo Preço</p>
                      <p className="font-medium">{formatCurrency(alert.newPrice)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Variação</p>
                      <p className={`font-medium ${
                        alert.changePercentage < 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {alert.changePercentage > 0 ? '+' : ''}{alert.changePercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análise Competitiva Rápida */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Competitiva</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Produto Exemplo - prod-001</h4>
              <div className="grid gap-2 md:grid-cols-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nosso Preço:</span>
                  <p className="font-medium">R$ 1.200,00</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Média Mercado:</span>
                  <p className="font-medium">R$ 1.250,00</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Posição:</span>
                  <Badge variant="outline">Abaixo da Média</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Vantagem:</span>
                  <p className="font-medium text-green-600">4% mais barato</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
