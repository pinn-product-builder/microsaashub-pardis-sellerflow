
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MarketResearchService, MarketResearchSettings } from '@/services/marketResearchService';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, X, TrendingUp, AlertTriangle } from 'lucide-react';

export function MarketResearchConfig() {
  const [settings, setSettings] = useState<MarketResearchSettings>(
    MarketResearchService.getSettings()
  );
  const [newCompetitor, setNewCompetitor] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const { toast } = useToast();

  const handleSave = () => {
    MarketResearchService.updateSettings(settings);
    toast({
      title: "Configurações salvas",
      description: "As configurações de pesquisa de mercado foram atualizadas.",
    });
  };

  const addCompetitor = () => {
    if (newCompetitor.trim() && !settings.competitors.includes(newCompetitor.trim())) {
      setSettings({
        ...settings,
        competitors: [...settings.competitors, newCompetitor.trim()]
      });
      setNewCompetitor('');
    }
  };

  const removeCompetitor = (competitor: string) => {
    setSettings({
      ...settings,
      competitors: settings.competitors.filter(c => c !== competitor)
    });
  };

  const addCategory = () => {
    if (newCategory.trim() && !settings.categories.includes(newCategory.trim())) {
      setSettings({
        ...settings,
        categories: [...settings.categories, newCategory.trim()]
      });
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    setSettings({
      ...settings,
      categories: settings.categories.filter(c => c !== category)
    });
  };

  const simulateMarketChange = () => {
    MarketResearchService.simulateMarketChange('prod-001');
    MarketResearchService.simulateMarketChange('prod-002');
    toast({
      title: "Simulação executada",
      description: "Mudanças no mercado foram simuladas. Verifique os alertas no monitor.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <CardTitle>Configuração da Pesquisa de Mercado</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status e Ativação */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Ativar Pesquisa de Mercado</Label>
              <p className="text-sm text-muted-foreground">
                Habilita o monitoramento automático de preços da concorrência
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
            />
          </div>

          <Separator />

          {/* Frequência de Monitoramento */}
          <div className="space-y-3">
            <Label>Frequência de Monitoramento</Label>
            <Select
              value={settings.monitoringFrequency}
              onValueChange={(value: any) => setSettings({ 
                ...settings, 
                monitoringFrequency: value 
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REAL_TIME">Tempo Real</SelectItem>
                <SelectItem value="HOURLY">A cada Hora</SelectItem>
                <SelectItem value="DAILY">Diariamente</SelectItem>
                <SelectItem value="WEEKLY">Semanalmente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Limite de Alerta */}
          <div className="space-y-3">
            <Label>Limite para Alertas (%)</Label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={settings.alertThreshold}
                onChange={(e) => setSettings({
                  ...settings,
                  alertThreshold: Number(e.target.value)
                })}
                min="1"
                max="50"
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                Alertar quando mudança de preço for maior que este valor
              </span>
            </div>
          </div>

          <Separator />

          {/* Concorrentes */}
          <div className="space-y-3">
            <Label>Concorrentes Monitorados</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Nome do concorrente"
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
              />
              <Button onClick={addCompetitor} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.competitors.map((competitor) => (
                <Badge key={competitor} variant="secondary" className="flex items-center gap-1">
                  {competitor}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeCompetitor(competitor)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Categorias */}
          <div className="space-y-3">
            <Label>Categorias Monitoradas</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Nome da categoria"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCategory()}
              />
              <Button onClick={addCategory} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {settings.categories.map((category) => (
                <Badge key={category} variant="outline" className="flex items-center gap-1">
                  {category}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeCategory(category)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex justify-between">
            <Button onClick={handleSave}>
              Salvar Configurações
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={simulateMarketChange}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Simular Mudanças
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status da Integração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Status da Integração</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <Badge variant={settings.enabled ? "default" : "secondary"}>
                {settings.enabled ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Última Atualização</p>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Concorrentes</p>
              <p className="text-sm text-muted-foreground">
                {settings.competitors.length} monitorados
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Categorias</p>
              <p className="text-sm text-muted-foreground">
                {settings.categories.length} monitoradas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
