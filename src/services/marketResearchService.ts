
export interface CompetitorPrice {
  competitor: string;
  price: number;
  marketShare: number;
  lastUpdated: Date;
  url?: string;
}

export interface MarketAnalysis {
  productId: string;
  ourPrice: number;
  averageMarketPrice: number;
  lowestPrice: number;
  highestPrice: number;
  competitorPrices: CompetitorPrice[];
  recommendation: string;
  pricePosition: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PriceAlert {
  id: string;
  productId: string;
  competitor: string;
  oldPrice: number;
  newPrice: number;
  changePercentage: number;
  alertType: 'PRICE_DROP' | 'PRICE_INCREASE' | 'NEW_COMPETITOR';
  createdAt: Date;
}

export interface MarketResearchSettings {
  enabled: boolean;
  monitoringFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  alertThreshold: number; // Percentage change to trigger alert
  competitors: string[];
  categories: string[];
}

export class MarketResearchService {
  private static settings: MarketResearchSettings = {
    enabled: false,
    monitoringFrequency: 'DAILY',
    alertThreshold: 5,
    competitors: ['Concorrente A', 'Concorrente B', 'Concorrente C'],
    categories: ['Eletrônicos', 'Casa e Jardim', 'Ferramentas']
  };

  private static alerts: PriceAlert[] = [];

  // Mock data para demonstração
  private static mockCompetitorData: Record<string, CompetitorPrice[]> = {
    'prod-001': [
      { competitor: 'Concorrente A', price: 1250, marketShare: 25, lastUpdated: new Date() },
      { competitor: 'Concorrente B', price: 1180, marketShare: 15, lastUpdated: new Date() },
      { competitor: 'Concorrente C', price: 1320, marketShare: 30, lastUpdated: new Date() }
    ],
    'prod-002': [
      { competitor: 'Concorrente A', price: 850, marketShare: 20, lastUpdated: new Date() },
      { competitor: 'Concorrente B', price: 920, marketShare: 18, lastUpdated: new Date() },
      { competitor: 'Concorrente C', price: 780, marketShare: 25, lastUpdated: new Date() }
    ]
  };

  static getSettings(): MarketResearchSettings {
    const stored = localStorage.getItem('market_research_settings');
    return stored ? JSON.parse(stored) : this.settings;
  }

  static updateSettings(settings: Partial<MarketResearchSettings>): void {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem('market_research_settings', JSON.stringify(this.settings));
  }

  static getMarketAnalysis(productId: string, ourPrice: number): MarketAnalysis {
    const competitorPrices = this.mockCompetitorData[productId] || [];
    
    if (competitorPrices.length === 0) {
      return {
        productId,
        ourPrice,
        averageMarketPrice: ourPrice,
        lowestPrice: ourPrice,
        highestPrice: ourPrice,
        competitorPrices: [],
        recommendation: 'Dados insuficientes para análise',
        pricePosition: 'AVERAGE',
        riskLevel: 'LOW'
      };
    }

    const prices = competitorPrices.map(c => c.price);
    const averageMarketPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);

    let pricePosition: 'ABOVE_AVERAGE' | 'AVERAGE' | 'BELOW_AVERAGE';
    let recommendation: string;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

    if (ourPrice > averageMarketPrice * 1.1) {
      pricePosition = 'ABOVE_AVERAGE';
      recommendation = 'Preço acima da média - considere redução para manter competitividade';
      riskLevel = 'HIGH';
    } else if (ourPrice < averageMarketPrice * 0.9) {
      pricePosition = 'BELOW_AVERAGE';
      recommendation = 'Preço competitivo - oportunidade para aumento de margem';
      riskLevel = 'LOW';
    } else {
      pricePosition = 'AVERAGE';
      recommendation = 'Preço alinhado com o mercado';
      riskLevel = 'MEDIUM';
    }

    return {
      productId,
      ourPrice,
      averageMarketPrice,
      lowestPrice,
      highestPrice,
      competitorPrices,
      recommendation,
      pricePosition,
      riskLevel
    };
  }

  static getPriceAlerts(): PriceAlert[] {
    const stored = localStorage.getItem('price_alerts');
    return stored ? JSON.parse(stored) : this.alerts;
  }

  static clearAlerts(): void {
    this.alerts = [];
    localStorage.removeItem('price_alerts');
  }

  static simulateMarketChange(productId: string): void {
    // Simula mudanças no mercado para demonstração
    const competitors = this.mockCompetitorData[productId] || [];
    
    competitors.forEach(competitor => {
      const oldPrice = competitor.price;
      const changePercent = (Math.random() - 0.5) * 20; // -10% a +10%
      const newPrice = oldPrice * (1 + changePercent / 100);
      
      if (Math.abs(changePercent) > this.settings.alertThreshold) {
        const alert: PriceAlert = {
          id: crypto.randomUUID(),
          productId,
          competitor: competitor.competitor,
          oldPrice,
          newPrice,
          changePercentage: changePercent,
          alertType: changePercent < 0 ? 'PRICE_DROP' : 'PRICE_INCREASE',
          createdAt: new Date()
        };
        
        this.alerts.push(alert);
        localStorage.setItem('price_alerts', JSON.stringify(this.alerts));
      }
      
      competitor.price = newPrice;
      competitor.lastUpdated = new Date();
    });
  }

  static getCompetitivePosition(productId: string, ourPrice: number): {
    rank: number;
    totalCompetitors: number;
    priceAdvantage: number;
  } {
    const analysis = this.getMarketAnalysis(productId, ourPrice);
    const allPrices = [ourPrice, ...analysis.competitorPrices.map(c => c.price)];
    allPrices.sort((a, b) => a - b);
    
    const rank = allPrices.indexOf(ourPrice) + 1;
    const totalCompetitors = allPrices.length;
    const priceAdvantage = ((analysis.averageMarketPrice - ourPrice) / analysis.averageMarketPrice) * 100;
    
    return { rank, totalCompetitors, priceAdvantage };
  }
}
