
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';
import { TaxService } from '@/services/taxService';
import { TaxCalculationContext, TaxCalculationResult } from '@/types/seller-flow';
import { mockProducts, mockCustomers } from '@/data/mockData';

export function TaxCalculator() {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [destinationUF, setDestinationUF] = useState('');
  const [result, setResult] = useState<TaxCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const ufs = ['SP', 'RJ', 'MG', 'RS', 'SC', 'PR', 'BA', 'PE', 'GO', 'DF', 'AM'];

  const handleCalculate = async () => {
    if (!selectedProduct || !selectedCustomer || !destinationUF) {
      return;
    }

    setIsCalculating(true);
    
    const product = mockProducts.find(p => p.id === selectedProduct);
    const customer = mockCustomers.find(c => c.id === selectedCustomer);
    
    if (!product || !customer) return;

    const context: TaxCalculationContext = {
      product,
      customer,
      quantity,
      unitPrice: unitPrice || product.baseCost * 1.3, // Preço com margem básica
      originUF: 'SP',
      destinationUF,
      operationType: 'VENDA',
      paymentTerm: 'À vista'
    };

    try {
      const calculationResult = TaxService.calculateAdvancedTaxes(context);
      setResult(calculationResult);
    } catch (error) {
      console.error('Erro no cálculo:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Formulário de entrada */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="product">Produto</Label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um produto" />
            </SelectTrigger>
            <SelectContent>
              {mockProducts.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} - {product.sku}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer">Cliente</Label>
          <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {mockCustomers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.companyName} - {customer.uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="destinationUF">UF de Destino</Label>
          <Select value={destinationUF} onValueChange={setDestinationUF}>
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
          <Label htmlFor="quantity">Quantidade</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unitPrice">Preço Unitário (R$)</Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            placeholder="Deixe vazio para usar preço sugerido"
          />
        </div>

        <div className="flex items-end">
          <Button 
            onClick={handleCalculate} 
            disabled={!selectedProduct || !selectedCustomer || !destinationUF || isCalculating}
            className="w-full"
          >
            <Calculator className="mr-2 h-4 w-4" />
            {isCalculating ? 'Calculando...' : 'Calcular Impostos'}
          </Button>
        </div>
      </div>

      {/* Resultado do cálculo */}
      {result && (
        <div className="space-y-4">
          <Separator />
          
          {/* Resumo dos impostos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Impostos Calculados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>ICMS:</span>
                  <span className="font-medium">{formatCurrency(result.taxes.icms)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IPI:</span>
                  <span className="font-medium">{formatCurrency(result.taxes.ipi)}</span>
                </div>
                <div className="flex justify-between">
                  <span>PIS:</span>
                  <span className="font-medium">{formatCurrency(result.taxes.pis)}</span>
                </div>
                <div className="flex justify-between">
                  <span>COFINS:</span>
                  <span className="font-medium">{formatCurrency(result.taxes.cofins)}</span>
                </div>
                
                {result.taxes.icmsSt && result.taxes.icmsSt > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>ICMS-ST:</span>
                    <span className="font-medium">{formatCurrency(result.taxes.icmsSt)}</span>
                  </div>
                )}
                
                {result.taxes.difal && result.taxes.difal > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>DIFAL:</span>
                    <span className="font-medium">{formatCurrency(result.taxes.difal)}</span>
                  </div>
                )}
                
                {result.taxes.fcp && result.taxes.fcp > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>FCP:</span>
                    <span className="font-medium">{formatCurrency(result.taxes.fcp)}</span>
                  </div>
                )}
                
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(result.taxes.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Taxa Efetiva:</span>
                  <span>{result.taxes.effectiveRate.toFixed(2)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Análise e Otimização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status de compliance */}
                <div className="flex items-center gap-2">
                  {result.compliance.isCompliant ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    {result.compliance.isCompliant ? 'Conforme' : 'Atenção necessária'}
                  </span>
                </div>

                {/* Benefícios aplicados */}
                {result.benefits.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Benefícios Aplicados:</h4>
                    <div className="space-y-1">
                      {result.benefits.map((benefit, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {benefit.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Substituição tributária */}
                {result.substitution && (
                  <div>
                    <Badge variant="outline" className="text-orange-600">
                      Substituição Tributária Aplicada
                    </Badge>
                  </div>
                )}

                {/* Economia potencial */}
                {result.optimization.potentialSavings > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingDown className="h-4 w-4" />
                    <span className="text-sm">
                      Economia potencial: {formatCurrency(result.optimization.potentialSavings)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Issues e recomendações */}
          {(result.compliance.issues.length > 0 || result.optimization.suggestions.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recomendações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.compliance.issues.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-600 mb-2">Questões de Compliance:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {result.compliance.issues.map((issue, index) => (
                        <li key={index} className="text-yellow-600">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {result.optimization.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">Sugestões de Otimização:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {result.optimization.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-blue-600">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
