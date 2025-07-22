
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarketResearchConfig } from '@/components/cpq/integrations/MarketResearchConfig';
import { MarketResearchMonitor } from '@/components/cpq/integrations/MarketResearchMonitor';
import { CompetitiveAnalysis } from '@/components/cpq/analysis/CompetitiveAnalysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Settings, Activity, BarChart3 } from 'lucide-react';

export default function MarketResearch() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pesquisa de Mercado</h2>
          <p className="text-muted-foreground">
            Monitore preços da concorrência e analise o posicionamento competitivo
          </p>
        </div>
      </div>

      <Tabs defaultValue="monitor" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monitor" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Monitor</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Análise Competitiva</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Monitor de Preços</span>
              </CardTitle>
              <CardDescription>
                Acompanhe mudanças de preços da concorrência em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketResearchMonitor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Análise Competitiva</span>
              </CardTitle>
              <CardDescription>
                Analise o posicionamento dos seus preços em relação à concorrência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompetitiveAnalysis />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Configurações</span>
              </CardTitle>
              <CardDescription>
                Configure fontes de dados e parâmetros de monitoramento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketResearchConfig />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
