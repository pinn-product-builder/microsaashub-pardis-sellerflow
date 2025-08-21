import { useState } from 'react';
import { ArrowUp, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import { StockMovementForm } from '@/components/inventory/StockMovementForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EstoqueSaida() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSuccess = () => {
    setShowSuccess(true);
    // Hide success message after 5 seconds
    setTimeout(() => setShowSuccess(false), 5000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-secondary/10">
          <ArrowUp className="h-6 w-6 text-secondary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Saída de Estoque</h1>
          <p className="text-muted-foreground">
            Registre saídas por vendas, devoluções e outras baixas
          </p>
        </div>
      </div>

      {showSuccess && (
        <Alert className="border-primary/20 bg-primary/5">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            Saída registrada com sucesso! O estoque foi atualizado automaticamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Warning Alert */}
      <Alert className="border-destructive/20 bg-destructive/5">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-destructive">
          <strong>Atenção:</strong> Verifique se há estoque suficiente disponível antes de registrar a saída. 
          O sistema impedirá saídas que resultem em estoque negativo.
        </AlertDescription>
      </Alert>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Como registrar uma saída
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Selecione o produto</p>
                <p className="text-muted-foreground">
                  Escolha o SKU do produto que será retirado do estoque
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Verifique a disponibilidade</p>
                <p className="text-muted-foreground">
                  Confira se há quantidade suficiente disponível no depósito
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Informe a quantidade de saída</p>
                <p className="text-muted-foreground">
                  Digite a quantidade que será retirada do estoque
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Especifique o motivo</p>
                <p className="text-muted-foreground">
                  Informe o motivo da saída e adicione referências se necessário
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement Form */}
      <StockMovementForm
        defaultType="out"
        onSuccess={handleSuccess}
      />

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Saída Comuns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-secondary-foreground">Venda</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Saída de produtos vendidos para clientes finais
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-secondary-foreground">Devolução ao Fornecedor</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Retorno de produtos com defeito ou fora da especificação
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-secondary-foreground">Perda</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Produtos danificados, vencidos ou extraviados
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-secondary-foreground">Outros</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Doações, amostras grátis ou outras formas de saída
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas Importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
              <p>
                <strong>Estoque Reservado:</strong> Produtos reservados não podem ser retirados sem antes liberar a reserva.
              </p>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
              <p>
                <strong>Referência de Cotação:</strong> Sempre informe o ID da cotação ou pedido quando a saída for para venda.
              </p>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
              <p>
                <strong>Custo Médio:</strong> O custo unitário é usado para calcular o valor da saída no relatório financeiro.
              </p>
            </div>
            
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
              <p>
                <strong>Auditoria:</strong> Todas as saídas são registradas com data, usuário e motivo para controle interno.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}