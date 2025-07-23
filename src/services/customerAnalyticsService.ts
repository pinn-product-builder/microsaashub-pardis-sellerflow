
import { format, subMonths, differenceInDays } from 'date-fns';

export interface RFMScore {
  customerId: string;
  customerName: string;
  recency: number;
  frequency: number;
  monetary: number;
  rfmScore: string;
  segment: string;
  lifetimeValue: number;
  nextBestAction: string;
}

export interface CustomerJourney {
  customerId: string;
  customerName: string;
  stages: JourneyStage[];
  currentStage: string;
  conversionProbability: number;
  timeToConvert: number;
}

export interface JourneyStage {
  stage: string;
  timestamp: string;
  action: string;
  value?: number;
  duration: number;
}

export interface CohortAnalysis {
  cohort: string;
  month0: number;
  month1: number;
  month2: number;
  month3: number;
  month6: number;
  month12: number;
  retention: number;
  churn: number;
}

export interface CustomerInsights {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
  avgLifetimeValue: number;
  avgOrderValue: number;
  avgOrderFrequency: number;
  customerAcquisitionCost: number;
  netPromoterScore: number;
  satisfactionScore: number;
}

class CustomerAnalyticsService {
  // Análise RFM (Recency, Frequency, Monetary)
  calculateRFMAnalysis(): RFMScore[] {
    // Dados simulados baseados em padrões reais
    const customers = [
      {
        customerId: '001',
        customerName: 'Empresa Alpha Ltda',
        lastPurchase: 5,
        totalOrders: 45,
        totalSpent: 450000,
      },
      {
        customerId: '002',
        customerName: 'Beta Comercial S.A.',
        lastPurchase: 15,
        totalOrders: 32,
        totalSpent: 280000,
      },
      {
        customerId: '003',
        customerName: 'Gamma Distribuidora',
        lastPurchase: 8,
        totalOrders: 28,
        totalSpent: 320000,
      },
      {
        customerId: '004',
        customerName: 'Delta Industries',
        lastPurchase: 45,
        totalOrders: 18,
        totalSpent: 180000,
      },
      {
        customerId: '005',
        customerName: 'Epsilon Corp',
        lastPurchase: 90,
        totalOrders: 8,
        totalSpent: 75000,
      }
    ];

    return customers.map(customer => {
      const recencyScore = this.calculateRecencyScore(customer.lastPurchase);
      const frequencyScore = this.calculateFrequencyScore(customer.totalOrders);
      const monetaryScore = this.calculateMonetaryScore(customer.totalSpent);
      
      const rfmScore = `${recencyScore}${frequencyScore}${monetaryScore}`;
      const segment = this.getRFMSegment(rfmScore);
      const lifetimeValue = this.calculateLifetimeValue(customer.totalSpent, customer.totalOrders);
      const nextBestAction = this.getNextBestAction(segment);

      return {
        customerId: customer.customerId,
        customerName: customer.customerName,
        recency: recencyScore,
        frequency: frequencyScore,
        monetary: monetaryScore,
        rfmScore,
        segment,
        lifetimeValue,
        nextBestAction
      };
    });
  }

  // Análise de jornada do cliente
  getCustomerJourney(): CustomerJourney[] {
    return [
      {
        customerId: '001',
        customerName: 'Empresa Alpha Ltda',
        stages: [
          {
            stage: 'Awareness',
            timestamp: '2024-01-15',
            action: 'Primeiro contato via website',
            duration: 2
          },
          {
            stage: 'Interest',
            timestamp: '2024-01-17',
            action: 'Download de catálogo',
            duration: 5
          },
          {
            stage: 'Consideration',
            timestamp: '2024-01-22',
            action: 'Solicitação de cotação',
            value: 25000,
            duration: 3
          },
          {
            stage: 'Purchase',
            timestamp: '2024-01-25',
            action: 'Primeira compra',
            value: 23000,
            duration: 1
          },
          {
            stage: 'Retention',
            timestamp: '2024-02-15',
            action: 'Compra recorrente',
            value: 35000,
            duration: 0
          }
        ],
        currentStage: 'Retention',
        conversionProbability: 0.92,
        timeToConvert: 10
      },
      {
        customerId: '002',
        customerName: 'Beta Comercial S.A.',
        stages: [
          {
            stage: 'Awareness',
            timestamp: '2024-02-01',
            action: 'Indicação de parceiro',
            duration: 1
          },
          {
            stage: 'Interest',
            timestamp: '2024-02-02',
            action: 'Reunião comercial',
            duration: 7
          },
          {
            stage: 'Consideration',
            timestamp: '2024-02-09',
            action: 'Análise de proposta',
            value: 45000,
            duration: 12
          }
        ],
        currentStage: 'Consideration',
        conversionProbability: 0.75,
        timeToConvert: 18
      }
    ];
  }

  // Análise de coorte
  getCohortAnalysis(): CohortAnalysis[] {
    return [
      {
        cohort: 'Jan 2024',
        month0: 100,
        month1: 85,
        month2: 72,
        month3: 65,
        month6: 54,
        month12: 45,
        retention: 0.45,
        churn: 0.55
      },
      {
        cohort: 'Fev 2024',
        month0: 120,
        month1: 98,
        month2: 82,
        month3: 74,
        month6: 61,
        month12: 0, // Ainda não completou 12 meses
        retention: 0.61,
        churn: 0.39
      },
      {
        cohort: 'Mar 2024',
        month0: 95,
        month1: 78,
        month2: 68,
        month3: 62,
        month6: 0, // Ainda não completou 6 meses
        month12: 0,
        retention: 0.65,
        churn: 0.35
      },
      {
        cohort: 'Abr 2024',
        month0: 110,
        month1: 92,
        month2: 81,
        month3: 0, // Ainda não completou 3 meses
        month6: 0,
        month12: 0,
        retention: 0.74,
        churn: 0.26
      }
    ];
  }

  // Insights gerais de clientes
  getCustomerInsights(): CustomerInsights {
    return {
      totalCustomers: 1247,
      activeCustomers: 892,
      newCustomers: 156,
      churnedCustomers: 89,
      avgLifetimeValue: 185000,
      avgOrderValue: 12500,
      avgOrderFrequency: 2.3,
      customerAcquisitionCost: 2800,
      netPromoterScore: 72,
      satisfactionScore: 4.2
    };
  }

  // Predição de Customer Lifetime Value
  predictCustomerLTV(customerId: string): number {
    // Algoritmo simplificado de LTV
    const avgOrderValue = 12500;
    const purchaseFrequency = 2.3;
    const grossMargin = 0.25;
    const retentionRate = 0.78;
    const discountRate = 0.1;
    
    const avgCustomerLifespan = 1 / (1 - retentionRate);
    const clv = (avgOrderValue * purchaseFrequency * grossMargin * avgCustomerLifespan) / (1 + discountRate);
    
    return Math.round(clv);
  }

  // Recomendações de próxima melhor ação
  getNextBestActions(): any[] {
    return [
      {
        customerId: '001',
        customerName: 'Empresa Alpha Ltda',
        segment: 'Champion',
        actions: [
          {
            type: 'Upsell',
            product: 'Produto Premium',
            probability: 0.85,
            expectedValue: 45000
          },
          {
            type: 'Cross-sell',
            product: 'Serviços Complementares',
            probability: 0.65,
            expectedValue: 15000
          }
        ]
      },
      {
        customerId: '004',
        customerName: 'Delta Industries',
        segment: 'At Risk',
        actions: [
          {
            type: 'Retention',
            product: 'Desconto Especial',
            probability: 0.45,
            expectedValue: 25000
          },
          {
            type: 'Winback',
            product: 'Proposta Personalizada',
            probability: 0.30,
            expectedValue: 35000
          }
        ]
      }
    ];
  }

  // Métodos auxiliares
  private calculateRecencyScore(daysSinceLastPurchase: number): number {
    if (daysSinceLastPurchase <= 30) return 5;
    if (daysSinceLastPurchase <= 60) return 4;
    if (daysSinceLastPurchase <= 90) return 3;
    if (daysSinceLastPurchase <= 180) return 2;
    return 1;
  }

  private calculateFrequencyScore(totalOrders: number): number {
    if (totalOrders >= 50) return 5;
    if (totalOrders >= 30) return 4;
    if (totalOrders >= 20) return 3;
    if (totalOrders >= 10) return 2;
    return 1;
  }

  private calculateMonetaryScore(totalSpent: number): number {
    if (totalSpent >= 500000) return 5;
    if (totalSpent >= 300000) return 4;
    if (totalSpent >= 200000) return 3;
    if (totalSpent >= 100000) return 2;
    return 1;
  }

  private getRFMSegment(rfmScore: string): string {
    const segments: { [key: string]: string } = {
      '555': 'Champions',
      '554': 'Champions',
      '544': 'Champions',
      '545': 'Champions',
      '454': 'Loyal Customers',
      '455': 'Loyal Customers',
      '445': 'Loyal Customers',
      '354': 'Potential Loyalists',
      '355': 'Potential Loyalists',
      '344': 'Potential Loyalists',
      '345': 'Potential Loyalists',
      '234': 'New Customers',
      '235': 'New Customers',
      '244': 'New Customers',
      '245': 'New Customers',
      '511': 'At Risk',
      '512': 'At Risk',
      '521': 'At Risk',
      '522': 'At Risk',
      '155': 'Cannot Lose Them',
      '154': 'Cannot Lose Them',
      '144': 'Cannot Lose Them',
      '145': 'Cannot Lose Them',
      '111': 'Lost'
    };

    return segments[rfmScore] || 'Others';
  }

  private calculateLifetimeValue(totalSpent: number, totalOrders: number): number {
    const avgOrderValue = totalSpent / totalOrders;
    const estimatedFutureOrders = totalOrders * 1.5; // Estimativa baseada em histórico
    return Math.round(avgOrderValue * estimatedFutureOrders);
  }

  private getNextBestAction(segment: string): string {
    const actions: { [key: string]: string } = {
      'Champions': 'Programa de fidelidade premium',
      'Loyal Customers': 'Ofertas de upsell',
      'Potential Loyalists': 'Programa de engagement',
      'New Customers': 'Onboarding personalizado',
      'At Risk': 'Campanha de retenção',
      'Cannot Lose Them': 'Contato urgente e proposta especial',
      'Lost': 'Campanha de winback'
    };

    return actions[segment] || 'Análise individual necessária';
  }
}

export const customerAnalyticsService = new CustomerAnalyticsService();
