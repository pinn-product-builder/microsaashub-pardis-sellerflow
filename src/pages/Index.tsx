
import { Link } from 'react-router-dom';
import { Calculator, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Pardis Seller Flow
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Portal de Cotações e Vendas B2B - Sua central de cotações e precificação inteligente
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5 text-primary" />
                Seller Flow
              </CardTitle>
              <CardDescription>
                Configure, precifique e cote produtos com cálculo automático de impostos e frete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>• Simulação de preços em tempo real</li>
                <li>• Cálculo de impostos por UF</li>
                <li>• Integração com tabelas de frete</li>
                <li>• Gestão de margens e descontos</li>
              </ul>
              <Button asChild className="w-full">
                <Link to="/seller-flow">
                  Acessar Seller Flow
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="mr-2 h-5 w-5 bg-muted rounded" />
                Checkout 3P
              </CardTitle>
              <CardDescription>
                Checkout especializado para vendas B2B com split de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>• Pagamento com condições especiais</li>
                <li>• Split entre múltiplos sellers</li>
                <li>• Boleto a prazo e PIX</li>
                <li>• Gestão de crédito</li>
              </ul>
              <Button disabled className="w-full">
                Em desenvolvimento
              </Button>
            </CardContent>
          </Card>

          <Card className="opacity-60">
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className="mr-2 h-5 w-5 bg-muted rounded" />
                Analytics & BI
              </CardTitle>
              <CardDescription>
                Dashboards e relatórios para análise de vendas e margem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2 mb-4">
                <li>• Análise de margem por produto</li>
                <li>• Forecast de vendas</li>
                <li>• Comparativo de concorrência</li>
                <li>• Relatórios fiscais</li>
              </ul>
              <Button disabled className="w-full">
                Em desenvolvimento
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Pardis Seller Flow • Sistema integrado para otimização de vendas B2B • Versão MVP 1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
