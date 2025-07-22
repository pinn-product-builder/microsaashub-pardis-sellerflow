
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  Users, 
  DollarSign, 
  BarChart3,
  Zap,
  CheckCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface ConversionMetrics {
  funnelStages: {
    stage: string;
    count: number;
    percentage: number;
    dropRate: number;
  }[];
  avgTimeToConvert: number;
  bestPerformingSegments: {
    segment: string;
    conversionRate: number;
    revenue: number;
  }[];
  realTimeMetrics: {
    activeQuotes: number;
    todayQuotes: number;
    weeklyTrend: number;
    conversionGoal: number;
    currentConversion: number;
  };
}

export default function AdvancedMetrics() {
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulação de dados - em produção viria de uma API
    setTimeout(() => {
      setMetrics({
        funnelStages: [
          { stage: 'Visitantes', count: 1250, percentage: 100, dropRate: 0 },
          { stage: 'Interesse', count: 756, percentage: 60.5, dropRate: 39.5 },
          { stage: 'Cotações', count: 324, percentage: 25.9, dropRate: 34.6 },
          { stage: 'Negociação', count: 189, percentage: 15.1, dropRate: 10.8 },
          { stage: 'Fechamento', count: 142, percentage: 11.4, dropRate: 3.7 }
        ],
        avgTimeToConvert: 3.8,
        bestPerformingSegments: [
          { segment: 'Eletrônicos', conversionRate: 78.5, revenue: 245000 },
          { segment: 'Informática', conversionRate: 72.3, revenue: 189000 },
          { segment: 'Casa & Jardim', conversionRate: 65.8, revenue: 156000 },
          { segment: 'Automotivo', conversionRate: 58.9, revenue: 134000 }
        ],
        realTimeMetrics: {
          activeQuotes: 23,
          todayQuotes: 8,
          weeklyTrend: 12.5,
          conversionGoal: 75,
          currentConversion: 68.2
        }
      });
      setIsLoading(false);
    }, 800);
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
          <p className="mt-2 text-muted-foreground">Carregando métricas avançadas...</p>
        </div>
      </div>
    );
  }

  const funnelColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <BarChart3 className="h-6 w-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Métricas Avançadas</h2>
          <p className="text-muted-foreground">Análise detalhada de conversão e performance</p>
        </div>
      </div>

      {/* Métricas em Tempo Real */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cotações Ativas</CardTitle>
            <Zap className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.realTimeMetrics.activeQuotes}</div>
            <p className="text-xs text-muted-foreground">
              Em negociação agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.realTimeMetrics.todayQuotes}</div>
            <div className="flex items-center text-xs mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600">+{metrics.realTimeMetrics.weeklyTrend}%</span>
              <span className="text-muted-foreground ml-1">vs semana</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta de Conversão</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.realTimeMetrics.currentConversion}%</div>
            <div className="mt-2">
              <Progress 
                value={(metrics.realTimeMetrics.currentConversion / metrics.realTimeMetrics.conversionGoal) * 100} 
                className="h-2" 
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Meta: {metrics.realTimeMetrics.conversionGoal}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgTimeToConvert}d</div>
            <p className="text-xs text-muted-foreground">
              Para conversão
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funil de Conversão */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de Conversão</CardTitle>
            <p className="text-sm text-muted-foreground">
              Análise do fluxo de conversão por etapa
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.funnelStages.map((stage, index) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: funnelColors[index] }}
                      />
                      <span className="font-medium">{stage.stage}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold">{stage.count}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({stage.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="ml-5">
                    <Progress value={stage.percentage} className="h-2" />
                    {stage.dropRate > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        Taxa de abandono: {stage.dropRate.toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance por Segmento */}
        <Card>
          <CardHeader>
            <CardTitle>Performance por Segmento</CardTitle>
            <p className="text-sm text-muted-foreground">
              Conversão e receita por categoria
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.bestPerformingSegments} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="segment" type="category" width={80} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'conversionRate' ? `${value}%` : formatCurrency(Number(value)),
                    name === 'conversionRate' ? 'Conversão' : 'Receita'
                  ]}
                />
                <Bar dataKey="conversionRate" fill="hsl(var(--primary))" name="Conversão %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights e Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Insights e Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-green-800">Boa Performance</h3>
              </div>
              <p className="text-sm text-green-600 mt-2">
                Segmento Eletrônicos está 8% acima da meta de conversão
              </p>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-500">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-800">Atenção</h3>
              </div>
              <p className="text-sm text-yellow-600 mt-2">
                Taxa de abandono alta na etapa de negociação (10.8%)
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-800">Oportunidade</h3>
              </div>
              <p className="text-sm text-blue-600 mt-2">
                23 cotações ativas - potencial para bater meta mensal
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
