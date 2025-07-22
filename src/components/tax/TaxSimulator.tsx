
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Play, BarChart3 } from 'lucide-react';
import { TaxService } from '@/services/taxService';
import { TaxCalculationContext, TaxSimulationScenario } from '@/types/cpq';
import { mockProducts, mockCustomers } from '@/data/mockData';

export function TaxSimulator() {
  const [baseContext, setBaseContext] = useState<Partial<TaxCalculationContext>>({
    operationType: 'VENDA',
    quantity: 1,
    unitPrice: 1000,
    originUF: 'SP'
  });
  
  const [scenarios, setScenarios] = useState<TaxSimulationScenario[]>([
    {
      name: 'Cenário Base',
      changes: {}
    },
    {
      name: 'Venda para RJ',
      changes: { destinationUF: 'RJ' }
    },
    {
      name: 'Cliente Simples Nacional',
      changes: { customerRegime: 'SIMPLES_NACIONAL' }
    }
  ]);

  const [results, setResults] = useState<TaxSimulationScenario[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  const ufs = ['SP', 'RJ', 'MG', 'RS', 'SC', 'PR', 'BA', 'PE', 'GO', 'DF', 'AM'];
  const taxRegimes = ['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'];

  const addScenario = () => {
    setScenarios([
      ...scenarios,
      {
        name: `Cenário ${scenarios.length + 1}`,
        changes: {}
      }
    ]);
  };

  const removeScenario = (index: number) => {
    if (scenarios.length > 1) {
      setScenarios(scenarios.filter((_, i) => i !== index));
    }
  };

  const updateScenario = (index: number, field: string, value: string) => {
    const updated = [...scenarios];
    updated[index].changes = {
      ...updated[index].changes,
      [field]: value
    };
    setScenarios(updated);
  };

  const updateScenarioName = (index: number, name: string) => {
    const updated = [...scenarios];
    updated[index].name = name;
    setScenarios(updated);
  };

  const runSimulation = async () => {
    if (!baseContext.product || !baseContext.customer || !baseContext.destinationUF) {
      return;
    }

    setIsSimulating(true);

    try {
      const context = baseContext as TaxCalculationContext;
      const simulationResults = TaxService.simulateScenarios(context, scenarios);
      setResults(simulationResults);
    } catch (error) {
      console.error('Erro na simulação:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getVariationColor = (current: number, base: number) => {
    if (current < base) return 'text-green-600';
    if (current > base) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getVariationText = (current: number, base: number) => {
    const diff = current - base;
    const percentage = base > 0 ? (diff / base) * 100 : 0;
    
    if (Math.abs(percentage) < 0.1) return '—';
    
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Configuração do cenário base */}
      <Card>
        <CardHeader>
          <CardTitle>Cenário Base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select 
                value={baseContext.product?.id || ''} 
                onValueChange={(value) => {
                  const product = mockProducts.find(p => p.id === value);
                  setBaseContext({...baseContext, product});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  {mockProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select 
                value={baseContext.customer?.id || ''} 
                onValueChange={(value) => {
                  const customer = mockCustomers.find(c => c.id === value);
                  setBaseContext({...baseContext, customer});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {mockCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>UF de Destino</Label>
              <Select 
                value={baseContext.destinationUF || ''} 
                onValueChange={(value) => setBaseContext({...baseContext, destinationUF: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a UF" />
                </SelectTrigger>
                <SelectContent>
                  {ufs.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={baseContext.quantity || 1}
                onChange={(e) => setBaseContext({
                  ...baseContext, 
                  quantity: parseInt(e.target.value) || 1
                })}
              />
            </div>

            <div className="space-y-2">
              <Label>Preço Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={baseContext.unitPrice || 0}
                onChange={(e) => setBaseContext({
                  ...baseContext, 
                  unitPrice: parseFloat(e.target.value) || 0
                })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuração dos cenários */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Cenários de Simulação</CardTitle>
          <Button onClick={addScenario} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Cenário
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {scenarios.map((scenario, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Input
                  value={scenario.name}
                  onChange={(e) => updateScenarioName(index, e.target.value)}
                  className="font-medium"
                />
                {scenarios.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeScenario(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>UF de Destino</Label>
                  <Select 
                    value={scenario.changes.destinationUF || ''} 
                    onValueChange={(value) => updateScenario(index, 'destinationUF', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Manter base" />
                    </SelectTrigger>
                    <SelectContent>
                      {ufs.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Regime Tributário</Label>
                  <Select 
                    value={scenario.changes.customerRegime || ''} 
                    onValueChange={(value) => updateScenario(index, 'customerRegime', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Manter base" />
                    </SelectTrigger>
                    <SelectContent>
                      {taxRegimes.map((regime) => (
                        <SelectItem key={regime} value={regime}>
                          {regime.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoria do Produto</Label>
                  <Select 
                    value={scenario.changes.productCategory || ''} 
                    onValueChange={(value) => updateScenario(index, 'productCategory', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Manter base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                      <SelectItem value="Eletrodomésticos">Eletrodomésticos</SelectItem>
                      <SelectItem value="Ferramentas">Ferramentas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Operação</Label>
                  <Select 
                    value={scenario.changes.operationType || ''} 
                    onValueChange={(value) => updateScenario(index, 'operationType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Manter base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VENDA">Venda</SelectItem>
                      <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                      <SelectItem value="DEMONSTRACAO">Demonstração</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Botão de simulação */}
      <div className="flex justify-center">
        <Button 
          onClick={runSimulation} 
          disabled={!baseContext.product || !baseContext.customer || !baseContext.destinationUF || isSimulating}
          size="lg"
        >
          <Play className="mr-2 h-4 w-4" />
          {isSimulating ? 'Simulando...' : 'Executar Simulação'}
        </Button>
      </div>

      {/* Resultados */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Resultados da Simulação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Cenário</th>
                    <th className="text-right p-2">ICMS</th>
                    <th className="text-right p-2">IPI</th>
                    <th className="text-right p-2">PIS/COFINS</th>
                    <th className="text-right p-2">Total</th>
                    <th className="text-right p-2">Taxa Efetiva</th>
                    <th className="text-right p-2">Variação</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => {
                    const baseTotal = results[0]?.result?.taxes.total || 0;
                    const currentTotal = result.result?.taxes.total || 0;
                    
                    return (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{result.name}</td>
                        <td className="text-right p-2">
                          {result.result ? formatCurrency(result.result.taxes.icms) : '—'}
                        </td>
                        <td className="text-right p-2">
                          {result.result ? formatCurrency(result.result.taxes.ipi) : '—'}
                        </td>
                        <td className="text-right p-2">
                          {result.result ? formatCurrency(result.result.taxes.pis + result.result.taxes.cofins) : '—'}
                        </td>
                        <td className="text-right p-2 font-medium">
                          {result.result ? formatCurrency(result.result.taxes.total) : '—'}
                        </td>
                        <td className="text-right p-2">
                          {result.result ? `${result.result.taxes.effectiveRate.toFixed(2)}%` : '—'}
                        </td>
                        <td className={`text-right p-2 ${getVariationColor(currentTotal, baseTotal)}`}>
                          {index === 0 ? 'Base' : getVariationText(currentTotal, baseTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
