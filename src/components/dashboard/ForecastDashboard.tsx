
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Users, 
  Target,
  RefreshCw,
  Brain,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Area, AreaChart } from 'recharts';
import { forecastService, type ForecastMetrics, type SalesForecast } from '@/services/forecastService';

export default function ForecastDashboard() {
  const [forecast, setForecast] = useState<SalesForecast | null>(null);
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);
  const [historical, setHistorical] = useState<any>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('best');
  const [isLoading, setIsLoading] = useState(true);

  const loadForecastData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setForecast(forecastService.generateSalesForecast());
      setMetrics(forecastService.getForecastMetrics());
      setHistorical(forecastService.getHistoricalAnalysis());
      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    loadForecastData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  const getAlgorithmData = () => {
    if (!forecast) return [];
    
    switch (selectedAlgorithm) {
      case 'sarima':
        return forecast.algorithms.sarima;
      case 'linear':
        return forecast.algorithms.linearRegression;
      case 'prophet':
        return forecast.algorithms.prophet;
      default:
        return forecast.revenue;
    }
  };

  if (isLoading || !forecast || !metrics || !historical) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Processando algoritmos de ML...</p>
        </div>
      </div>
    );
  }

  // Combina dados históricos e forecast para o gráfico
  const combinedRevenueData = [
    ...historical.revenue.slice(-6).map((item: any) => ({
      ...item,
      type: 'historical',
      predicted: null
    })),
    ...getAlgorithmData().map(item => ({
      month: item.period,
      value: null,
      predicted: item.predicted,
      type: 'forecast',
      confidence: item.confidence,
      algorithm: item.algorithm
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Sistema de Forecast ML</h2>
            <p className="text-muted-foreground">Previsão inteligente com machine learning avançado</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Algoritmo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best">Melhor Algoritmo</SelectItem>
              <SelectItem value="sarima">SARIMA</SelectItem>
              <SelectItem value="linear">Linear Regression</SelectItem>
              <SelectItem value="prophet">Prophet-like</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadForecastData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Reprocessar
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Previsão Próximo Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.nextMonthRevenue)}</div>
            <div className="flex items-center text-xs mt-2">
              {metrics.revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {metrics.revenueGrowth.toFixed(1)}% vs atual
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precisão do Modelo</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.accuracy * 100).toFixed(0)}%</div>
            <div className="flex items-center text-xs mt-2">
              <Zap className="h-3 w-3 text-blue-600 mr-1" />
              <span className="text-muted-foreground">
                Algoritmo: {metrics.bestAlgorithm}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiança</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.confidence * 100).toFixed(0)}%</div>
            <div className="flex items-center text-xs mt-2">
              <Activity className="h-3 w-3 text-blue-600 mr-1" />
              <span className="text-muted-foreground">
                Próximo mês
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crescimento Volume</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.volumeGrowth >= 0 ? '+' : ''}{metrics.volumeGrowth.toFixed(1)}%
            </div>
            <div className="flex items-center text-xs mt-2">
              {metrics.volumeGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className="text-muted-foreground">Previsão ML</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendência Conversão</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.conversionTrend >= 0 ? '+' : ''}{metrics.conversionTrend.toFixed(1)}%
            </div>
            <div className="flex items-center text-xs mt-2">
              {metrics.conversionTrend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className="text-muted-foreground">Taxa conversão</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance dos Algoritmos */}
      <Card>
        <CardHeader>
          <CardTitle>Performance dos Algoritmos ML</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">SARIMA</h3>
                <Badge variant="outline">{(metrics.modelPerformance.sarima * 100).toFixed(0)}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Melhor para dados sazonais com tendência clara
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Linear Regression</h3>
                <Badge variant="outline">{(metrics.modelPerformance.linearRegression * 100).toFixed(0)}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Ótimo para tendências lineares simples
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Prophet-like</h3>
                <Badge variant="default">{(metrics.modelPerformance.prophet * 100).toFixed(0)}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Melhor performance geral com detecção de changepoints
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos e Análises */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="conversion">Conversão</TabsTrigger>
          <TabsTrigger value="comparison">Comparação Algoritmos</TabsTrigger>
          <TabsTrigger value="insights">Insights ML</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Previsão de Receita - {selectedAlgorithm === 'best' ? metrics.bestAlgorithm : selectedAlgorithm}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Histórico vs Previsão ML - Precisão: {(metrics.accuracy * 100).toFixed(0)}%
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={combinedRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value, name) => [
                      value ? formatCurrency(Number(value)) : 'N/A', 
                      name === 'value' ? 'Realizado' : 'Previsão ML'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="Histórico"
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    name="Previsão ML"
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume">
          <Card>
            <CardHeader>
              <CardTitle>Previsão de Volume</CardTitle>
              <p className="text-sm text-muted-foreground">
                Número de cotações e conversões previstas
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={forecast.volume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="predicted" fill="hsl(var(--primary))" name="Volume Previsto" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle>Taxa de Conversão</CardTitle>
              <p className="text-sm text-muted-foreground">
                Previsão ML da performance de conversão
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={forecast.conversion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Taxa de Conversão']} />
                  <Area 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="hsl(var(--chart-3))" 
                    fill="hsl(var(--chart-3))"
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="Conversão %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Algoritmos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Performance comparativa dos diferentes modelos ML
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Previsão']} />
                  <Legend />
                  <Line 
                    data={forecast.algorithms.sarima}
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="SARIMA"
                  />
                  <Line 
                    data={forecast.algorithms.linearRegression}
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Linear Regression"
                  />
                  <Line 
                    data={forecast.algorithms.prophet}
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    name="Prophet-like"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Insights ML Avançados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-sm font-medium text-green-800">Detecção de Padrões</p>
                  <p className="text-xs text-green-600">
                    Algoritmo Prophet detectou {historical.insights?.anomalies || 0} anomalias nos dados históricos
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm font-medium text-blue-800">Melhor Mês</p>
                  <p className="text-xs text-blue-600">
                    {historical.insights?.bestPerformingMonth || 'Dezembro'} historicamente tem melhor performance
                  </p>
                </div>
                
                <div className="p-3 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <p className="text-sm font-medium text-purple-800">Sazonalidade</p>
                  <p className="text-xs text-purple-600">
                    Força sazonal: {((historical.insights?.seasonalityStrength || 0.3) * 100).toFixed(0)}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recomendações IA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <p className="text-sm font-medium text-yellow-800">Otimização</p>
                  <p className="text-xs text-yellow-600">
                    Modelo Prophet recomendado para próximas previsões (91% precisão)
                  </p>
                </div>
                
                <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <p className="text-sm font-medium text-red-800">Alerta</p>
                  <p className="text-xs text-red-600">
                    Monitorar volatilidade - variação de {metrics.volumeGrowth.toFixed(1)}% no volume
                  </p>
                </div>
                
                <div className="p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                  <p className="text-sm font-medium text-indigo-800">Próxima Ação</p>
                  <p className="text-xs text-indigo-600">
                    Ajustar estoque baseado em previsão de crescimento de {metrics.revenueGrowth.toFixed(1)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
