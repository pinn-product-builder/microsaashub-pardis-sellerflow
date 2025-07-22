
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Users, 
  Target,
  RefreshCw,
  Brain
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { forecastService, type ForecastMetrics, type SalesForecast } from '@/services/forecastService';

export default function ForecastDashboard() {
  const [forecast, setForecast] = useState<SalesForecast | null>(null);
  const [metrics, setMetrics] = useState<ForecastMetrics | null>(null);
  const [historical, setHistorical] = useState<any>(null);
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

  if (isLoading || !forecast || !metrics || !historical) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Gerando previsões...</p>
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
    ...forecast.revenue.map(item => ({
      month: item.period,
      value: null,
      predicted: item.predicted,
      type: 'forecast',
      confidence: item.confidence
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
            <h2 className="text-2xl font-bold">Sistema de Forecast</h2>
            <p className="text-muted-foreground">Previsão inteligente de vendas e análise preditiva</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadForecastData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar Previsões
        </Button>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                {metrics.revenueGrowth.toFixed(1)}% vs mês atual
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confiança da Previsão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(metrics.confidence * 100).toFixed(0)}%</div>
            <div className="flex items-center text-xs mt-2">
              <Activity className="h-3 w-3 text-blue-600 mr-1" />
              <span className="text-muted-foreground">
                Precisão histórica: {(metrics.accuracy * 100).toFixed(0)}%
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
              <span className="text-muted-foreground">Previsão de volume</span>
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
              <span className="text-muted-foreground">Taxa de conversão</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Análises */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Receita</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="conversion">Conversão</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Previsão de Receita</CardTitle>
              <p className="text-sm text-muted-foreground">
                Histórico dos últimos 6 meses e previsão para os próximos 6 meses
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={combinedRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value, name) => [
                      value ? formatCurrency(Number(value)) : 'N/A', 
                      name === 'value' ? 'Realizado' : 'Previsão'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Histórico"
                    connectNulls={false}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Previsão"
                    connectNulls={false}
                  />
                </LineChart>
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
                Previsão da performance de conversão
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={forecast.conversion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Taxa de Conversão']} />
                  <Line 
                    type="monotone" 
                    dataKey="predicted" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={2}
                    name="Conversão %"
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
                <CardTitle>Insights de Tendência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {forecast.revenue.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(item.predicted)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        item.trend === 'up' ? 'default' : 
                        item.trend === 'down' ? 'destructive' : 'secondary'
                      }>
                        {item.trend === 'up' ? '↗️ Crescimento' : 
                         item.trend === 'down' ? '↘️ Declínio' : '➡️ Estável'}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(item.confidence * 100).toFixed(0)}% confiança
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-sm font-medium text-green-800">Oportunidade</p>
                  <p className="text-xs text-green-600">
                    Previsão de crescimento de {metrics.revenueGrowth.toFixed(1)}% no próximo mês
                  </p>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm font-medium text-blue-800">Ação Recomendada</p>
                  <p className="text-xs text-blue-600">
                    Aumentar esforços de vendas para maximizar o período de alta
                  </p>
                </div>
                
                <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
                  <p className="text-sm font-medium text-yellow-800">Atenção</p>
                  <p className="text-xs text-yellow-600">
                    Monitorar conversão - tendência de {metrics.conversionTrend.toFixed(1)}%
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
