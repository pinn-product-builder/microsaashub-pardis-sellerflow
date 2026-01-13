
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MarketResearchService, MarketAnalysis } from '@/services/marketResearchService';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface CompetitiveAnalysisProps {
  productId: string;
  ourPrice: number;
  onPriceRecommendation?: (recommendedPrice: number) => void;
}

export function CompetitiveAnalysis({ 
  productId, 
  ourPrice, 
  onPriceRecommendation 
}: CompetitiveAnalysisProps) {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadAnalysis = async () => {
    setIsLoading(true);
    
    // Simula carregamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const marketAnalysis = MarketResearchService.getMarketAnalysis(productId, ourPrice);
    setAnalysis(marketAnalysis);
    setIsLoading(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'ABOVE_AVERAGE':
        return 'text-red-600';
      case 'BELOW_AVERAGE':
        return 'text-green-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getCompetitivePosition = () => {
    if (!analysis) return null;
    return MarketResearchService.getCompetitivePosition(productId, ourPrice);
  };

  const position = getCompetitivePosition();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle>Análise Competitiva</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAnalysis}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Analisar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <div className="text-center py-8">
            <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground mb-4">
              Clique em "Analisar" para obter dados competitivos
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Resumo da Posição */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Posição no Mercado</p>
                <div className="flex items-center space-x-2">
                  {analysis.pricePosition === 'BELOW_AVERAGE' ? (
                    <TrendingDown className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`font-medium ${getPositionColor(analysis.pricePosition)}`}>
                    {analysis.pricePosition === 'ABOVE_AVERAGE' ? 'Acima da Média' :
                     analysis.pricePosition === 'BELOW_AVERAGE' ? 'Abaixo da Média' : 'Na Média'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Nível de Risco</p>
                <Badge className={getRiskColor(analysis.riskLevel)}>
                  {analysis.riskLevel === 'HIGH' ? 'Alto' :
                   analysis.riskLevel === 'MEDIUM' ? 'Médio' : 'Baixo'}
                </Badge>
              </div>
            </div>

            {/* Métricas Principais */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Nosso Preço</p>
                <p className="text-lg font-bold">{formatCurrency(analysis.ourPrice)}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Média do Mercado</p>
                <p className="text-lg font-bold">{formatCurrency(analysis.averageMarketPrice)}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Menor Preço</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(analysis.lowestPrice)}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Maior Preço</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(analysis.highestPrice)}</p>
              </div>
            </div>

            {/* Posição Competitiva */}
            {position && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Posição: {position.rank}º de {position.totalCompetitors}
                  </span>
                  <span className={`text-sm font-medium ${
                    position.priceAdvantage > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {position.priceAdvantage > 0 ? 
                      `${position.priceAdvantage.toFixed(1)}% mais barato` :
                      `${Math.abs(position.priceAdvantage).toFixed(1)}% mais caro`
                    }
                  </span>
                </div>
                <Progress 
                  value={(position.rank / position.totalCompetitors) * 100} 
                  className="h-2"
                />
              </div>
            )}

            {/* Recomendação */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Recomendação</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {analysis.recommendation}
                  </p>
                  {onPriceRecommendation && (
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => onPriceRecommendation(analysis.averageMarketPrice)}
                    >
                      Aplicar Preço Médio
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Concorrentes */}
            <div className="space-y-3">
              <p className="font-medium">Preços dos Concorrentes</p>
              {analysis.competitorPrices.map((competitor, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div>
                      <p className="font-medium">{competitor.competitor}</p>
                      <p className="text-sm text-muted-foreground">
                        Market Share: {competitor.marketShare}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(competitor.price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {competitor.lastUpdated.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
