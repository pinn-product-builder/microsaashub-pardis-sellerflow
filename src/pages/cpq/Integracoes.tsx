
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Activity, 
  ExternalLink, 
  ShoppingCart,
  Database,
  TrendingUp,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { VTEXConfig } from '@/components/cpq/integrations/VTEXConfig';
import { VTEXMonitor } from '@/components/cpq/integrations/VTEXMonitor';
import { VTEXService } from '@/services/vtexService';

export default function Integracoes() {
  const [activeTab, setActiveTab] = useState('overview');
  const vtexSettings = VTEXService.getCurrentSettings();

  const integrations = [
    {
      id: 'vtex',
      name: 'VTEX',
      description: 'Envie cotações aprovadas diretamente para sua loja VTEX',
      icon: ShoppingCart,
      color: 'orange',
      status: vtexSettings?.isEnabled ? 'active' : 'inactive',
      features: ['Criação automática de pedidos', 'Sincronização de produtos', 'Gestão de preços']
    },
    {
      id: 'datasul',
      name: 'ERP Datasul',
      description: 'Integração com ERP Datasul para sincronização completa',
      icon: Database,
      color: 'blue',
      status: 'coming-soon',
      features: ['Sincronização de clientes', 'Gestão de estoque', 'Controle financeiro']
    },
    {
      id: 'market-research',
      name: 'Pesquisa de Mercado',
      description: 'Análise competitiva e monitoramento de preços',
      icon: TrendingUp,
      color: 'green',
      status: 'coming-soon',
      features: ['Comparação de preços', 'Alertas de mercado', 'Relatórios de competitividade']
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'coming-soon':
        return <Badge variant="outline">Em Breve</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'orange':
        return 'bg-orange-100 text-orange-600';
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/cpq">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao CPQ
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Integrações</h1>
            <p className="text-muted-foreground">
              Configure e monitore as integrações do sistema CPQ
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="vtex">VTEX</TabsTrigger>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Integrations Overview */}
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
            {integrations.map((integration) => {
              const IconComponent = integration.icon;
              return (
                <Card key={integration.id} className="relative">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getColorClasses(integration.color)}`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          {getStatusBadge(integration.status)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recursos:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {integration.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <div className="w-1 h-1 bg-current rounded-full mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      {integration.id === 'vtex' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('vtex')}
                          className="w-full"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          {integration.status === 'active' ? 'Gerenciar' : 'Configurar'}
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" disabled className="w-full">
                          Em Desenvolvimento
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Integração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Integrações Ativas</p>
                  <p className="text-2xl font-bold">
                    {integrations.filter(i => i.status === 'active').length}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total de Integrações</p>
                  <p className="text-2xl font-bold">{integrations.length}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Pedidos Enviados (VTEX)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {VTEXService.getIntegrationLogs().filter(log => log.status === 'success').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vtex">
          <VTEXConfig />
        </TabsContent>

        <TabsContent value="monitor">
          <VTEXMonitor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
