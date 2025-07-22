
import { 
  Product, 
  Customer, 
  TaxCalculationContext, 
  TaxCalculationResult, 
  TaxBenefit, 
  TaxSubstitution,
  TaxSimulationScenario,
  TaxRule
} from '@/types/cpq';
import { taxRules } from '@/data/mockData';

export class TaxService {
  // Dados mock para benefícios fiscais
  private static taxBenefits: TaxBenefit[] = [
    {
      id: '1',
      name: 'Zona Franca de Manaus',
      description: 'Isenção de IPI para produtos industrializados',
      type: 'EXEMPTION',
      scope: 'MUNICIPALITY',
      location: 'AM-Manaus',
      category: 'Eletrônicos',
      reduction: 100,
      validFrom: new Date('2020-01-01'),
      conditions: ['Produto industrializado na ZFM', 'Processo Produtivo Básico']
    },
    {
      id: '2',
      name: 'SUFRAMA',
      description: 'Redução de 88% do IPI',
      type: 'REDUCTION',
      scope: 'UF',
      location: 'AM',
      reduction: 88,
      validFrom: new Date('2020-01-01'),
      conditions: ['Empresa inscrita na SUFRAMA']
    }
  ];

  // Dados mock para substituição tributária
  private static taxSubstitutions: TaxSubstitution[] = [
    {
      id: '1',
      category: 'Eletrônicos',
      ncm: '8517.12.00',
      uf: 'SP',
      marginSt: 40,
      aliquotaInterna: 18,
      aliquotaInterestadual: 12,
      isActive: true
    },
    {
      id: '2',
      category: 'Eletrodomésticos',
      ncm: '8516.60.00',
      uf: 'RJ',
      marginSt: 35,
      aliquotaInterna: 20,
      aliquotaInterestadual: 12,
      isActive: true
    }
  ];

  static calculateAdvancedTaxes(context: TaxCalculationContext): TaxCalculationResult {
    console.log('Calculando impostos avançados para:', context);

    // Buscar regra fiscal básica
    const basicRule = this.getBasicTaxRule(context.destinationUF);
    
    // Calcular base de cálculo
    const taxBasis = context.unitPrice * context.quantity;
    
    // Calcular impostos básicos
    let taxes = this.calculateBasicTaxes(basicRule, taxBasis, context);
    
    // Aplicar substituição tributária se aplicável
    const substitution = this.checkTaxSubstitution(context);
    if (substitution) {
      taxes = this.applyTaxSubstitution(taxes, substitution, taxBasis);
    }
    
    // Aplicar benefícios fiscais
    const benefits = this.findApplicableBenefits(context);
    taxes = this.applyTaxBenefits(taxes, benefits);
    
    // Calcular DIFAL (Diferencial de Alíquota) para vendas interestaduais
    if (context.originUF !== context.destinationUF && context.customer.taxRegime !== 'SIMPLES_NACIONAL') {
      const difal = this.calculateDifal(context, basicRule);
      taxes.difal = difal.difal;
      taxes.fcp = difal.fcp;
      taxes.total += difal.difal + difal.fcp;
    }
    
    // Verificar compliance
    const compliance = this.checkCompliance(context, taxes);
    
    // Gerar sugestões de otimização
    const optimization = this.generateOptimizationSuggestions(context, taxes);
    
    // Calcular taxa efetiva
    const effectiveRate = (taxes.total / taxBasis) * 100;

    return {
      taxes: {
        ...taxes,
        taxBasis,
        effectiveRate
      },
      benefits,
      substitution,
      compliance,
      optimization
    };
  }

  private static getBasicTaxRule(uf: string): TaxRule {
    return taxRules.find(rule => rule.uf === uf) || taxRules[0];
  }

  private static calculateBasicTaxes(rule: TaxRule, taxBasis: number, context: TaxCalculationContext) {
    // Ajustar alíquotas baseado no regime tributário do cliente
    let icmsRate = rule.icms;
    let ipiRate = rule.ipi;
    let pisRate = rule.pis;
    let cofinsRate = rule.cofins;

    // Simples Nacional tem tratamento diferenciado
    if (context.customer.taxRegime === 'SIMPLES_NACIONAL') {
      icmsRate = Math.max(icmsRate - 3, 0); // Redução simplificada
      pisRate = 0; // PIS/COFINS incluídos no Simples
      cofinsRate = 0;
    }

    const icms = (taxBasis * icmsRate) / 100;
    const ipi = (taxBasis * ipiRate) / 100;
    const pis = (taxBasis * pisRate) / 100;
    const cofins = (taxBasis * cofinsRate) / 100;

    return {
      icms,
      ipi,
      pis,
      cofins,
      icmsSt: 0,
      difal: 0,
      fcp: 0,
      total: icms + ipi + pis + cofins,
      taxBasis: 0,
      effectiveRate: 0
    };
  }

  private static checkTaxSubstitution(context: TaxCalculationContext): TaxSubstitution | undefined {
    return this.taxSubstitutions.find(st => 
      st.category === context.product.category &&
      st.uf === context.destinationUF &&
      st.isActive &&
      (st.ncm === context.product.ncm || !context.product.ncm)
    );
  }

  private static applyTaxSubstitution(taxes: any, substitution: TaxSubstitution, taxBasis: number) {
    // Cálculo simplificado de ICMS-ST
    const marginValue = (taxBasis * substitution.marginSt) / 100;
    const stBase = taxBasis + marginValue;
    const icmsSt = (stBase * substitution.aliquotaInterna) / 100 - taxes.icms;
    
    return {
      ...taxes,
      icmsSt: Math.max(icmsSt, 0),
      total: taxes.total + Math.max(icmsSt, 0)
    };
  }

  private static findApplicableBenefits(context: TaxCalculationContext): TaxBenefit[] {
    return this.taxBenefits.filter(benefit => {
      // Verificar localização
      if (benefit.scope === 'UF' && !benefit.location.includes(context.destinationUF)) {
        return false;
      }
      
      // Verificar categoria
      if (benefit.category && benefit.category !== context.product.category) {
        return false;
      }
      
      // Verificar NCM
      if (benefit.ncm && benefit.ncm !== context.product.ncm) {
        return false;
      }
      
      // Verificar validade
      const now = new Date();
      if (benefit.validUntil && benefit.validUntil < now) {
        return false;
      }
      
      return true;
    });
  }

  private static applyTaxBenefits(taxes: any, benefits: TaxBenefit[]) {
    let adjustedTaxes = { ...taxes };
    
    benefits.forEach(benefit => {
      if (benefit.type === 'EXEMPTION' || benefit.type === 'REDUCTION') {
        const reduction = benefit.reduction / 100;
        
        // Aplicar principalmente no IPI para ZFM
        if (benefit.name.includes('Zona Franca') || benefit.name.includes('SUFRAMA')) {
          const ipiReduction = adjustedTaxes.ipi * reduction;
          adjustedTaxes.ipi -= ipiReduction;
          adjustedTaxes.total -= ipiReduction;
        }
      }
    });
    
    return adjustedTaxes;
  }

  private static calculateDifal(context: TaxCalculationContext, destinationRule: TaxRule) {
    // DIFAL só se aplica para pessoa jurídica em operações interestaduais
    if (context.customer.taxRegime === 'SIMPLES_NACIONAL') {
      return { difal: 0, fcp: 0 };
    }

    const interestateRate = context.originUF === 'SP' ? 12 : 7; // Simplificação
    const internalRate = destinationRule.icms;
    const difal = ((internalRate - interestateRate) / 100) * context.unitPrice * context.quantity;
    const fcp = (2 / 100) * context.unitPrice * context.quantity; // FCP médio de 2%

    return { difal: Math.max(difal, 0), fcp };
  }

  private static checkCompliance(context: TaxCalculationContext, taxes: any) {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Verificar se cliente tem inscrição estadual para ICMS
    if (!context.customer.stateRegistration && taxes.icms > 0) {
      issues.push('Cliente sem inscrição estadual para operação com ICMS');
    }

    // Verificar NCM do produto
    if (!context.product.ncm) {
      issues.push('Produto sem classificação NCM definida');
      recommendations.push('Definir NCM do produto para cálculo preciso');
    }

    // Verificar se há substituição tributária não aplicada
    const stRule = this.checkTaxSubstitution(context);
    if (stRule && !taxes.icmsSt) {
      recommendations.push('Verificar aplicação de substituição tributária');
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations
    };
  }

  private static generateOptimizationSuggestions(context: TaxCalculationContext, taxes: any) {
    const suggestions: string[] = [];
    let potentialSavings = 0;

    // Sugerir mudança de regime tributário
    if (context.customer.taxRegime !== 'SIMPLES_NACIONAL' && taxes.total > 1000) {
      suggestions.push('Avaliar viabilidade do Simples Nacional para redução da carga tributária');
      potentialSavings += taxes.total * 0.15; // Economia estimada de 15%
    }

    // Sugerir benefícios fiscais não aplicados
    const allBenefits = this.taxBenefits.filter(b => 
      b.location.includes(context.destinationUF) || b.scope === 'NATIONAL'
    );
    
    if (allBenefits.length > 0) {
      suggestions.push('Verificar elegibilidade para benefícios fiscais disponíveis');
    }

    // Sugerir otimização logística
    if (context.originUF !== context.destinationUF && taxes.difal > 0) {
      suggestions.push('Considerar centro de distribuição local para reduzir DIFAL');
      potentialSavings += taxes.difal;
    }

    return {
      potentialSavings,
      suggestions
    };
  }

  static simulateScenarios(
    context: TaxCalculationContext, 
    scenarios: TaxSimulationScenario[]
  ): TaxSimulationScenario[] {
    return scenarios.map(scenario => {
      const modifiedContext = {
        ...context,
        destinationUF: scenario.changes.destinationUF || context.destinationUF,
        customer: {
          ...context.customer,
          taxRegime: scenario.changes.customerRegime as any || context.customer.taxRegime
        },
        product: {
          ...context.product,
          category: scenario.changes.productCategory || context.product.category
        },
        operationType: scenario.changes.operationType as any || context.operationType
      };

      const result = this.calculateAdvancedTaxes(modifiedContext);

      return {
        ...scenario,
        result
      };
    });
  }

  static getTaxBreakdown(taxes: any) {
    const breakdown = [
      { name: 'ICMS', value: taxes.icms, color: 'hsl(var(--chart-1))' },
      { name: 'IPI', value: taxes.ipi, color: 'hsl(var(--chart-2))' },
      { name: 'PIS', value: taxes.pis, color: 'hsl(var(--chart-3))' },
      { name: 'COFINS', value: taxes.cofins, color: 'hsl(var(--chart-4))' }
    ];

    if (taxes.icmsSt > 0) {
      breakdown.push({ name: 'ICMS-ST', value: taxes.icmsSt, color: 'hsl(var(--chart-5))' });
    }

    if (taxes.difal > 0) {
      breakdown.push({ name: 'DIFAL', value: taxes.difal, color: 'hsl(var(--destructive))' });
    }

    if (taxes.fcp > 0) {
      breakdown.push({ name: 'FCP', value: taxes.fcp, color: 'hsl(var(--muted))' });
    }

    return breakdown.filter(item => item.value > 0);
  }

  static exportTaxRules() {
    // Função para exportar regras fiscais
    return {
      taxRules,
      taxBenefits: this.taxBenefits,
      taxSubstitutions: this.taxSubstitutions,
      exportedAt: new Date().toISOString()
    };
  }

  static importTaxRules(data: any) {
    // Função para importar regras fiscais
    console.log('Importando regras fiscais:', data);
    // Implementar validação e importação
    return { success: true, message: 'Regras importadas com sucesso' };
  }
}
