import { useState } from 'react';
import { ArrowDown, Package, CheckCircle } from 'lucide-react';
import { StockMovementForm } from '@/components/inventory/StockMovementForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function EstoqueEntrada() {
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSuccess = () => {
    setShowSuccess(true);
    // Hide success message after 5 seconds
    setTimeout(() => setShowSuccess(false), 5000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <ArrowDown className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Entrada de Estoque</h1>
          <p className="text-muted-foreground">
            Registre entradas de mercadorias, devoluções e recebimentos
          </p>
        </div>
      </div>

      {showSuccess && (
        <Alert className="border-primary/20 bg-primary/5">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-primary">
            Entrada registrada com sucesso! O estoque foi atualizado automaticamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Como registrar uma entrada
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                1
              </div>
              <div>
                <p className="font-medium">Selecione o produto</p>
                <p className="text-muted-foreground">
                  Escolha o SKU do produto que está sendo recebido
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                2
              </div>
              <div>
                <p className="font-medium">Informe a quantidade</p>
                <p className="text-muted-foreground">
                  Digite a quantidade recebida na unidade de medida do produto
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                3
              </div>
              <div>
                <p className="font-medium">Escolha o depósito de destino</p>
                <p className="text-muted-foreground">
                  Selecione onde o produto será armazenado
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                4
              </div>
              <div>
                <p className="font-medium">Defina o motivo e custo</p>
                <p className="text-muted-foreground">
                  Especifique o motivo da entrada e o custo unitário (opcional)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement Form */}
      <StockMovementForm
        defaultType="in"
        onSuccess={handleSuccess}
      />

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Entrada Comuns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-primary">Compra</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Recebimento de mercadorias adquiridas de fornecedores
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-primary">Devolução</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Retorno de produtos vendidos por defeito ou troca
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-primary">Produção</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Produtos finalizados vindos da linha de produção
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium text-primary">Outros</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Doações, brindes ou outras formas de entrada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}