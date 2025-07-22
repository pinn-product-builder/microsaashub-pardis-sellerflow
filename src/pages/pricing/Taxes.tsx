
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calculator, Settings, BarChart3, Download, Upload, AlertTriangle } from 'lucide-react';
import { TaxCalculator } from '@/components/tax/TaxCalculator';
import { TaxRulesManager } from '@/components/tax/TaxRulesManager';
import { TaxSimulator } from '@/components/tax/TaxSimulator';
import { TaxBreakdown } from '@/components/tax/TaxBreakdown';

export default function Taxes() {
  const [activeTab, setActiveTab] = useState('calculator');

  // Estatísticas mock do sistema fiscal
  const taxStats = {
    averageTaxRate: 32.5,
    totalTaxesSaved: 125000,
    complianceScore: 98.5,
    activeRules: 27,
    benefitsIdentified: 8,
    optimizationOpportunities: 12
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Impostos</h1>
        <p className="text-muted-foreground">
          Cálculo avançado, gestão de regras e otimização tributária
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Média de Impostos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxStats.averageTaxRate}%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% desde o mês passado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impostos Economizados</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(taxStats.totalTaxesSaved)}
            </div>
            <p className="text-xs text-muted-foreground">
              Através de benefícios fiscais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score de Compliance</CardTitle>
            <Badge variant={taxStats.complianceScore > 95 ? "default" : "secondary"}>
              {taxStats.complianceScore > 95 ? "Excelente" : "Bom"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxStats.complianceScore}%</div>
            <p className="text-xs text-muted-foreground">
              {taxStats.optimizationOpportunities} oportunidades identificadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            Alertas Fiscais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-700">
                Nova alíquota de ICMS em SP - Vigência 01/08/2024
              </span>
              <Badge variant="outline">Atualização Pendente</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-700">
                Benefício ZFM disponível para 3 produtos
              </span>
              <Badge variant="outline">Ação Requerida</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculadora
          </TabsTrigger>
          <TabsTrigger value="simulator" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Simulador
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Impostos</CardTitle>
              <CardDescription>
                Calcule impostos com precisão usando regras avançadas e benefícios fiscais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaxCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulador de Cenários</CardTitle>
              <CardDescription>
                Compare diferentes cenários fiscais e identifique oportunidades de otimização
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaxSimulator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciador de Regras Fiscais</CardTitle>
              <CardDescription>
                Configure e mantenha regras de impostos por UF, categoria e benefícios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaxRulesManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise de Carga Tributária</CardTitle>
              <CardDescription>
                Visualize a composição dos impostos e identifique padrões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaxBreakdown />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
