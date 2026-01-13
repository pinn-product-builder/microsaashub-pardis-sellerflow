
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VTEXConfig } from '@/components/cpq/integrations/VTEXConfig';
import { VTEXMonitor } from '@/components/cpq/integrations/VTEXMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NavLink } from 'react-router-dom';
import { 
  Plug, 
  Settings, 
  Activity, 
  Search,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

export default function Integracoes() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Integrações</h2>
          <p className="text-muted-foreground">
            Configure e monitore as integrações com sistemas externos
          </p>
        </div>
      </div>

      {/* Aviso sobre migração da Pesquisa de Mercado */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Pesquisa de Mercado foi movida!</p>
                <p className="text-sm text-blue-700">
                  A funcionalidade de Pesquisa de Mercado agora está disponível no menu Precificação.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <NavLink to="/pricing/market-research">
                Acessar <ExternalLink className="ml-2 h-4 w-4" />
              </NavLink>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="vtex-config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vtex-config" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>VTEX - Configuração</span>
          </TabsTrigger>
          <TabsTrigger value="vtex-monitor" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>VTEX - Monitor</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vtex-config" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Plug className="h-5 w-5" />
                  <CardTitle>Configuração VTEX</CardTitle>
                </div>
                <Badge variant="outline">E-commerce</Badge>
              </div>
              <CardDescription>
                Configure a integração com a plataforma VTEX para sincronização de produtos e preços
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VTEXConfig />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vtex-monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <CardTitle>Monitor VTEX</CardTitle>
              </div>
              <CardDescription>
                Monitore o status da integração e sincronizações em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VTEXMonitor />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
