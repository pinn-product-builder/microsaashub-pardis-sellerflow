
export interface PredictiveInsight {
  id: string;
  title: string;
  description: string;
  type: 'opportunity' | 'risk' | 'optimization' | 'trend';
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  expectedImpact: number;
  actionable: boolean;
  recommendations: string[];
  data: any;
}

export interface MarketBasketAnalysis {
  itemA: string;
  itemB: string;
  support: number;
  confidence: number;
  lift: number;
  expectedRevenue: number;
}

export interface PriceOptimization {
  productId: string;
  productName: string;
  currentPrice: number;
  optimalPrice: number;
  expectedDemand: number;
  revenueImpact: number;
  marginImpact: number;
  competitorPrice: number;
  priceElasticity: number;
}

export interface SeasonalityInsight {
  period: string;
  seasonalityFactor: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  recommendation: string;
}

class PredictiveAnalyticsService {
  // Análise de Market Basket (produtos frequentemente comprados juntos)
  getMarketBasketAnalysis(): MarketBasketAnalysis[] {
    return [
      {
        itemA: 'Notebook Dell',
        itemB: 'Mouse Logitech',
        support: 0.25,
        confidence: 0.85,
        lift: 2.3,
        expectedRevenue: 35000
      },
      {
        itemA: 'Impressora HP',
        itemB: 'Cartucho HP',
        support: 0.42,
        confidence: 0.92,
        lift: 3.1,
        expectedRevenue: 28000
      },
      {
        itemA: 'Monitor LG',
        itemB: 'Cabo HDMI',
        support: 0.18,
        confidence: 0.78,
        lift: 1.8,
        expectedRevenue: 12000
      },
      {
        itemA: 'Smartphone Samsung',
        itemB: 'Película Protetora',
        support: 0.35,
        confidence: 0.88,
        lift: 2.5,
        expectedRevenue: 18000
      }
    ];
  }

  // Otimização de preços baseada em elasticidade
  getPriceOptimization(): PriceOptimization[] {
    return [
      {
        productId: 'PROD001',
        productName: 'Notebook Dell Inspiron',
        currentPrice: 2500,
        optimalPrice: 2650,
        expectedDemand: 85,
        revenueImpact: 12750,
        marginImpact: 8500,
        competitorPrice: 2700,
        priceElasticity: -1.2
      },
      {
        productId: 'PROD002',
        productName: 'Impressora HP LaserJet',
        currentPrice: 800,
        optimalPrice: 750,
        expectedDemand: 120,
        revenueImpact: -6000,
        marginImpact: 15000,
        competitorPrice: 780,
        priceElasticity: -1.8
      },
      {
        productId: 'PROD003',
        productName: 'Monitor LG 24"',
        currentPrice: 650,
        optimalPrice: 680,
        expectedDemand: 95,
        revenueImpact: 2850,
        marginImpact: 1900,
        competitorPrice: 720,
        priceElasticity: -1.1
      }
    ];
  }

  // Análise de sazonalidade
  getSeasonalityInsights(): SeasonalityInsight[] {
    return [
      {
        period: 'Dezembro',
        seasonalityFactor: 1.45,
        trend: 'increasing',
        confidence: 0.92,
        recommendation: 'Aumentar estoque em 45% e considerar campanhas promocionais'
      },
      {
        period: 'Janeiro',
        seasonalityFactor: 0.75,
        trend: 'decreasing',
        confidence: 0.88,
        recommendation: 'Reduzir estoque e focar em liquidação de produtos'
      },
      {
        period: 'Março',
        seasonalityFactor: 1.15,
        trend: 'increasing',
        confidence: 0.85,
        recommendation: 'Preparar para aumento de demanda empresarial'
      },
      {
        period: 'Julho',
        seasonalityFactor: 0.90,
        trend: 'stable',
        confidence: 0.78,
        recommendation: 'Manter níveis normais de estoque'
      }
    ];
  }

  // Insights preditivos principais
  getPredictiveInsights(): PredictiveInsight[] {
    return [
      {
        id: 'INS001',
        title: 'Oportunidade de Cross-sell',
        description: 'Clientes que compraram notebooks têm 85% de chance de comprar mouse',
        type: 'opportunity',
        priority: 'high',
        confidence: 0.85,
        expectedImpact: 35000,
        actionable: true,
        recommendations: [
          'Criar bundle notebook + mouse com desconto',
          'Implementar sugestão automática no CPQ',
          'Treinar equipe comercial para oferecer combo'
        ],
        data: {
          conversionRate: 0.85,
          averageOrderValue: 2800,
          potentialCustomers: 45
        }
      },
      {
        id: 'INS002',
        title: 'Risco de Perda de Cliente',
        description: 'Empresa Alpha Ltda tem 85% de probabilidade de churn',
        type: 'risk',
        priority: 'high',
        confidence: 0.85,
        expectedImpact: -125000,
        actionable: true,
        recommendations: [
          'Contato imediato do gerente comercial',
          'Oferecer desconto de 15% na próxima compra',
          'Agendar visita para entender problemas'
        ],
        data: {
          churnProbability: 0.85,
          lifetimeValue: 125000,
          daysSinceLastPurchase: 60
        }
      },
      {
        id: 'INS003',
        title: 'Otimização de Preço',
        description: 'Impressora HP pode ter preço reduzido para aumentar volume',
        type: 'optimization',
        priority: 'medium',
        confidence: 0.78,
        expectedImpact: 15000,
        actionable: true,
        recommendations: [
          'Reduzir preço de R$ 800 para R$ 750',
          'Monitorar resposta da concorrência',
          'Acompanhar impacto nas vendas'
        ],
        data: {
          currentPrice: 800,
          optimalPrice: 750,
          expectedVolumeIncrease: 0.5
        }
      },
      {
        id: 'INS004',
        title: 'Tendência de Crescimento',
        description: 'Categoria eletrônicos mostra crescimento de 12% no trimestre',
        type: 'trend',
        priority: 'medium',
        confidence: 0.82,
        expectedImpact: 85000,
        actionable: true,
        recommendations: [
          'Aumentar investimento em marketing para eletrônicos',
          'Expandir catálogo de produtos',
          'Negociar melhores condições com fornecedores'
        ],
        data: {
          growthRate: 0.12,
          categoryRevenue: 450000,
          marketShare: 0.15
        }
      },
      {
        id: 'INS005',
        title: 'Sazonalidade de Dezembro',
        description: 'Dezembro historicamente tem 45% mais vendas que a média',
        type: 'opportunity',
        priority: 'medium',
        confidence: 0.92,
        expectedImpact: 180000,
        actionable: true,
        recommendations: [
          'Aumentar estoque em 45% para dezembro',
          'Preparar campanhas promocionais',
          'Contratar temporários para atendimento'
        ],
        data: {
          seasonalityFactor: 1.45,
          historicalData: [1.2, 1.3, 1.45, 1.4, 1.5],
          expectedRevenue: 180000
        }
      }
    ];
  }

  // Análise de sentiment (simulada)
  getSentimentAnalysis(): any {
    return {
      overallSentiment: 0.72,
      positiveComments: 156,
      negativeComments: 34,
      neutralComments: 89,
      topPositiveTopics: ['Qualidade dos produtos', 'Atendimento', 'Prazo de entrega'],
      topNegativeTopics: ['Preço', 'Disponibilidade', 'Pós-venda'],
      sentimentTrend: 'improving',
      impactOnSales: 0.15
    };
  }

  // Predição de demanda
  predictDemand(productId: string, period: string): any {
    // Simulação de predição de demanda
    const baselineDemand = 100;
    const seasonalityFactor = this.getSeasonalityFactor(period);
    const trendFactor = 1.05; // 5% de crescimento
    const randomFactor = 0.9 + Math.random() * 0.2; // ±10% de variação
    
    const predictedDemand = Math.round(baselineDemand * seasonalityFactor * trendFactor * randomFactor);
    
    return {
      productId,
      period,
      predictedDemand,
      confidence: 0.82,
      factors: {
        baseline: baselineDemand,
        seasonality: seasonalityFactor,
        trend: trendFactor,
        random: randomFactor
      }
    };
  }

  // Análise de elasticidade de preços
  calculatePriceElasticity(productId: string): number {
    // Simulação de cálculo de elasticidade
    const elasticityMap: { [key: string]: number } = {
      'PROD001': -1.2,
      'PROD002': -1.8,
      'PROD003': -1.1,
      'PROD004': -0.8,
      'PROD005': -2.1
    };
    
    return elasticityMap[productId] || -1.0;
  }

  // Métodos auxiliares
  private getSeasonalityFactor(period: string): number {
    const seasonalityMap: { [key: string]: number } = {
      'Janeiro': 0.75,
      'Fevereiro': 0.85,
      'Março': 1.15,
      'Abril': 1.05,
      'Maio': 0.95,
      'Junho': 0.90,
      'Julho': 0.90,
      'Agosto': 1.10,
      'Setembro': 1.20,
      'Outubro': 1.10,
      'Novembro': 1.30,
      'Dezembro': 1.45
    };
    
    return seasonalityMap[period] || 1.0;
  }
}

export const predictiveAnalyticsService = new PredictiveAnalyticsService();
