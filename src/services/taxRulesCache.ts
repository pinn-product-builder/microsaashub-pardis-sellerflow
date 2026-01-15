import { supabase } from '@/integrations/supabase/client';

export interface DatabaseTaxRule {
  id: string;
  uf: string;
  uf_name: string;
  region: string;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
  icms_st_margin: number | null;
  fcp: number;
  is_active: boolean;
}

export interface LegacyTaxRule {
  uf: string;
  icms: number;
  ipi: number;
  pis: number;
  cofins: number;
}

class TaxRulesCache {
  private rules: DatabaseTaxRule[] = [];
  private lastFetch: number = 0;
  private cacheDuration = 5 * 60 * 1000; // 5 minutos
  private isLoading = false;
  private loadPromise: Promise<DatabaseTaxRule[]> | null = null;

  async loadRules(): Promise<DatabaseTaxRule[]> {
    const now = Date.now();
    
    // Se o cache ainda é válido, retorna os dados em cache
    if (this.rules.length > 0 && now - this.lastFetch < this.cacheDuration) {
      return this.rules;
    }

    // Se já está carregando, aguarda a promise existente
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this.fetchFromDatabase();
    
    try {
      this.rules = await this.loadPromise;
      this.lastFetch = Date.now();
      return this.rules;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  private async fetchFromDatabase(): Promise<DatabaseTaxRule[]> {
    try {
      const { data, error } = await supabase
        .from('tax_rules')
        .select('*')
        .eq('is_active', true)
        .order('uf');

      if (error) {
        console.error('Erro ao carregar regras fiscais:', error);
        return this.getFallbackRules();
      }

      return (data || []).map(rule => ({
        ...rule,
        icms: Number(rule.icms),
        ipi: Number(rule.ipi),
        pis: Number(rule.pis),
        cofins: Number(rule.cofins),
        fcp: Number(rule.fcp || 0),
        icms_st_margin: rule.icms_st_margin ? Number(rule.icms_st_margin) : null
      }));
    } catch (error) {
      console.error('Erro ao buscar regras fiscais:', error);
      return this.getFallbackRules();
    }
  }

  // Fallback com regras padrão caso o banco não esteja disponível
  private getFallbackRules(): DatabaseTaxRule[] {
    const defaultRules: DatabaseTaxRule[] = [
      { id: 'default-sp', uf: 'SP', uf_name: 'São Paulo', region: 'Sudeste', icms: 18, ipi: 5, pis: 1.65, cofins: 7.6, fcp: 0, icms_st_margin: null, is_active: true },
      { id: 'default-rj', uf: 'RJ', uf_name: 'Rio de Janeiro', region: 'Sudeste', icms: 20, ipi: 5, pis: 1.65, cofins: 7.6, fcp: 2, icms_st_margin: null, is_active: true },
      { id: 'default-mg', uf: 'MG', uf_name: 'Minas Gerais', region: 'Sudeste', icms: 18, ipi: 5, pis: 1.65, cofins: 7.6, fcp: 2, icms_st_margin: null, is_active: true },
    ];
    return defaultRules;
  }

  // Método síncrono que retorna os dados em cache (pode estar vazio)
  getRulesCached(): DatabaseTaxRule[] {
    return this.rules;
  }

  // Busca uma regra específica por UF
  async getRuleByUF(uf: string): Promise<DatabaseTaxRule | undefined> {
    const rules = await this.loadRules();
    return rules.find(r => r.uf === uf);
  }

  // Busca uma regra específica por UF (síncrono, usa cache)
  getRuleByUFSync(uf: string): DatabaseTaxRule | undefined {
    return this.rules.find(r => r.uf === uf);
  }

  // Converte para formato legado
  async getLegacyRules(): Promise<LegacyTaxRule[]> {
    const rules = await this.loadRules();
    return rules.map(r => ({
      uf: r.uf,
      icms: r.icms,
      ipi: r.ipi,
      pis: r.pis,
      cofins: r.cofins
    }));
  }

  // Força refresh do cache
  invalidateCache(): void {
    this.lastFetch = 0;
    this.rules = [];
  }

  // Pré-carrega o cache (útil na inicialização do app)
  async preload(): Promise<void> {
    await this.loadRules();
  }
}

// Exporta instância singleton
export const taxRulesCache = new TaxRulesCache();

// Hook helper para pré-carregar no início do app
export async function initializeTaxRulesCache(): Promise<void> {
  await taxRulesCache.preload();
}
