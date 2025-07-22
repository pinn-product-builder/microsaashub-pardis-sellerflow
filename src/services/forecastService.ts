
import { Quote } from '@/types/cpq';

export interface ForecastData {
  period: string;
  predicted: number;
  actual?: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export interface SalesForecast {
  revenue: ForecastData[];
  volume: ForecastData[];
  conversion: ForecastData[];
  avgTicket: ForecastData[];
}

export interface ForecastMetrics {
  nextMonthRevenue: number;
  revenueGrowth: number;
  volumeGrowth: number;
  conversionTrend: number;
  confidence: number;
  accuracy: number;
}

class ForecastService {
  // Algoritmo simples de média móvel exponencial
  private calculateEMA(data: number[], period: number = 3): number {
    if (data.length === 0) return 0;
    if (data.length === 1) return data[0];
    
    const alpha = 2 / (period + 1);
    let ema = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema = alpha * data[i] + (1 - alpha) * ema;
    }
    
    return ema;
  }

  // Calcula tendência baseada nos últimos pontos
  private calculateTrend(data: number[]): 'up' | 'down' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-3);
    const older = data.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'up';
    if (change < -0.05) return 'down';
    return 'stable';
  }

  // Gera dados históricos simulados baseados em padrões reais
  private generateHistoricalData(): {
    revenue: number[];
    volume: number[];
    conversion: number[];
  } {
    const months = 12;
    const revenue: number[] = [];
    const volume: number[] = [];
    const conversion: number[] = [];
    
    // Base values
    let baseRevenue = 450000;
    let baseVolume = 120;
    let baseConversion = 0.68;
    
    for (let i = 0; i < months; i++) {
      // Adiciona sazonalidade e tendência
      const seasonality = Math.sin((i / 12) * 2 * Math.PI) * 0.15 + 1;
      const trend = 1 + (i * 0.02); // 2% de crescimento mensal
      const noise = (Math.random() - 0.5) * 0.1 + 1; // ±10% de variação
      
      revenue.push(baseRevenue * seasonality * trend * noise);
      volume.push(Math.round(baseVolume * seasonality * trend * noise));
      conversion.push(Math.max(0.4, Math.min(0.9, baseConversion * seasonality * noise)));
    }
    
    return { revenue, volume, conversion };
  }

  // Calcula previsão para os próximos períodos
  private predictNextPeriods(historical: number[], periods: number = 6): ForecastData[] {
    const predictions: ForecastData[] = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentMonth = new Date().getMonth();
    
    for (let i = 0; i < periods; i++) {
      const monthIndex = (currentMonth + i + 1) % 12;
      const ema = this.calculateEMA(historical);
      const seasonality = Math.sin(((monthIndex) / 12) * 2 * Math.PI) * 0.15 + 1;
      const predicted = ema * seasonality;
      
      // Confidence decreases with distance
      const confidence = Math.max(0.6, 0.95 - (i * 0.05));
      
      predictions.push({
        period: monthNames[monthIndex],
        predicted: Math.round(predicted),
        confidence: confidence,
        trend: this.calculateTrend(historical)
      });
    }
    
    return predictions;
  }

  // Gera forecast completo
  generateSalesForecast(): SalesForecast {
    const historical = this.generateHistoricalData();
    
    return {
      revenue: this.predictNextPeriods(historical.revenue, 6),
      volume: this.predictNextPeriods(historical.volume, 6),
      conversion: this.predictNextPeriods(historical.conversion.map(c => c * 100), 6),
      avgTicket: this.predictNextPeriods(
        historical.revenue.map((r, i) => r / historical.volume[i]), 
        6
      )
    };
  }

  // Calcula métricas do forecast
  getForecastMetrics(): ForecastMetrics {
    const forecast = this.generateSalesForecast();
    const historical = this.generateHistoricalData();
    
    const nextMonthRevenue = forecast.revenue[0]?.predicted || 0;
    const currentRevenue = historical.revenue[historical.revenue.length - 1];
    const revenueGrowth = ((nextMonthRevenue - currentRevenue) / currentRevenue) * 100;
    
    const nextMonthVolume = forecast.volume[0]?.predicted || 0;
    const currentVolume = historical.volume[historical.volume.length - 1];
    const volumeGrowth = ((nextMonthVolume - currentVolume) / currentVolume) * 100;
    
    const nextMonthConversion = forecast.conversion[0]?.predicted || 0;
    const currentConversion = historical.conversion[historical.conversion.length - 1] * 100;
    const conversionTrend = nextMonthConversion - currentConversion;
    
    return {
      nextMonthRevenue,
      revenueGrowth,
      volumeGrowth,
      conversionTrend,
      confidence: forecast.revenue[0]?.confidence || 0,
      accuracy: 0.78 // Simulado - em produção seria calculado comparando previsões passadas com resultados reais
    };
  }

  // Analisa historical performance
  getHistoricalAnalysis() {
    const historical = this.generateHistoricalData();
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return {
      revenue: historical.revenue.map((value, index) => ({
        month: months[index],
        value: Math.round(value),
        growth: index > 0 ? ((value - historical.revenue[index - 1]) / historical.revenue[index - 1]) * 100 : 0
      })),
      volume: historical.volume.map((value, index) => ({
        month: months[index],
        value,
        growth: index > 0 ? ((value - historical.volume[index - 1]) / historical.volume[index - 1]) * 100 : 0
      })),
      conversion: historical.conversion.map((value, index) => ({
        month: months[index],
        value: Math.round(value * 100),
        growth: index > 0 ? ((value - historical.conversion[index - 1]) / historical.conversion[index - 1]) * 100 : 0
      }))
    };
  }
}

export const forecastService = new ForecastService();
