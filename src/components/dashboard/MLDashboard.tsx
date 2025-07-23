
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Target,
  AlertTriangle,
  Zap,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { advancedMLService } from '@/services/advancedMLService';
import { customerAnalyticsService } from '@/services/customerAnalyticsService';
import { predictiveAnalyticsService } from '@/services/predictiveAnalyticsService';

export default function MLDashboard() {
  const [insights, setInsights] = useState<any>(null);
  const [customerSegments, setCustomerSegments] = useState<any>(null);
  const [churnPredictions, setChurnPredictions] = useState<any>(null);
  const [marketBasket, setMarketBasket] = useState<any>(null);
  const [priceOptimization, setPriceOptimization] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadMLData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setInsights(predictiveAnalyticsService.getPredictiveInsights());
      setCustomerSegments(advancedMLService.segmentCustomers([]));
      setChurnPredictions(advancedMLService.predictChurn());
      setMarketBasket(predictiveAnalyticsService.getMarketBasketAnalysis());
      setPriceOptimization(predictiveAnalyticsService.getPriceOptimization());
      setIsLoading(false);
    }, 800);
  };

  useEffect(() => {
    loadMLData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Processando algoritmos de ML...</p>
        </div>
      </div>
    );
  }

  const segmentColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Machine Learning Dashboard</h2>
            <p className="text-muted-foreground">Insights preditivos e análise inteligente</p>
          </div>
        </div>
        <Button variant="outline" onClick={loadMLData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Reprocessar ML
        </Button>
      </div>

      {/* Insights Prioritários */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {insights && insights.slice(0, 3).map((insight: any, index: number) => (
          <Card key={insight.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
                <div className="flex items-center space-x-2">
                  {insight.type === 'opportunity' && <TrendingUp className="h-4 w-4 text-green-600" />}
                  {insight.type === 'risk' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                  {insight.type === 'optimization' && <Zap className="h-4 w-4 text-yellow-600" />}
                  <Badge variant={insight.priority === 'high' ? 'destructive' : 'secondary'}>
                    {insight.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Confiança</span>
                  <span>{(insight.confidence * 100).toFixed(0)}%</span>
                </div>
                <Progress value={insight.confidence * 100} className="h-2" />
                <div className="flex justify-between text-sm">
                  <span>Impacto</span>
                  <span className={insight.expectedImpact > 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(insight.expectedImpact)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="segments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="segments">Segmentação</TabsTrigger>
          <TabsTrigger value="churn">Churn Prediction</TabsTrigger>
          <TabsTrigger value="basket">Market Basket</TabsTrigger>
          <TabsTrigger value="pricing">Price Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="segments">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Segmentação de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={customerSegments}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="customerCount"
                      label={({ name, customerCount }) => `${name}: ${customerCount}`}
                    >
                      {customerSegments && customerSegments.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={segmentColors[index % segmentColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} clientes`, 'Quantidade']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance por Segmento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerSegments && customerSegments.map((segment: any, index: number) => (
                    <div key={segment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: segmentColors[index % segmentColors.length] }}
                        />
                        <div>
                          <p className="font-medium">{segment.name}</p>
                          <p className="text-sm text-muted-foreground">{segment.customerCount} clientes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(segment.avgRevenue)}</p>
                        <p className="text-xs text-red-600">
                          {(segment.churnRate * 100).toFixed(1)}% churn
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="churn">
          <Card>
            <CardHeader>
              <CardTitle>Predição de Churn</CardTitle>
              <p className="text-sm text-muted-foreground">
                Clientes com alta probabilidade de cancelamento
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {churnPredictions && churnPredictions.map((prediction: any) => (
                  <div key={prediction.customerId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{prediction.customerName}</h3>
                        <p className="text-sm text-muted-foreground">ID: {prediction.customerId}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          prediction.riskLevel === 'high' ? 'destructive' : 
                          prediction.riskLevel === 'medium' ? 'default' : 'secondary'
                        }>
                          {prediction.riskLevel === 'high' ? 'Alto Risco' : 
                           prediction.riskLevel === 'medium' ? 'Médio Risco' : 'Baixo Risco'}
                        </Badge>
                        <span className="text-sm font-bold text-red-600">
                          {(prediction.churnProbability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium mb-2">Fatores de Risco:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {prediction.factors.map((factor: string, index: number) => (
                            <li key={index}>• {factor}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Recomendações:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {prediction.recommendations.map((rec: string, index: number) => (
                            <li key={index}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="basket">
          <Card>
            <CardHeader>
              <CardTitle>Market Basket Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Produtos frequentemente comprados juntos
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marketBasket && marketBasket.map((item: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{item.itemA} + {item.itemB}</h3>
                        <p className="text-sm text-muted-foreground">
                          Receita potencial: {formatCurrency(item.expectedRevenue)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        Lift: {item.lift.toFixed(1)}x
                      </Badge>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium">Suporte</p>
                        <p className="text-lg font-bold">{(item.support * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Confiança</p>
                        <p className="text-lg font-bold">{(item.confidence * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Lift</p>
                        <p className="text-lg font-bold">{item.lift.toFixed(1)}x</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Otimização de Preços</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sugestões de preços baseadas em elasticidade
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priceOptimization && priceOptimization.map((item: any) => (
                  <div key={item.productId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{item.productName}</h3>
                        <p className="text-sm text-muted-foreground">ID: {item.productId}</p>
                      </div>
                      <Badge variant={item.revenueImpact > 0 ? 'default' : 'secondary'}>
                        {item.revenueImpact > 0 ? 'Oportunidade' : 'Margem'}
                      </Badge>
                    </div>
                    
                    <div className="grid gap-3 md:grid-cols-4">
                      <div>
                        <p className="text-sm font-medium">Preço Atual</p>
                        <p className="text-lg font-bold">{formatCurrency(item.currentPrice)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Preço Ótimo</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(item.optimalPrice)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Impacto Receita</p>
                        <p className={`text-lg font-bold ${item.revenueImpact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.revenueImpact)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Elasticidade</p>
                        <p className="text-lg font-bold">{item.priceElasticity.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
