import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, RotateCcw, TrendingUp, Palette, Shield, Target } from 'lucide-react';
import { usePricingEngineConfig, useUpdatePricingEngineConfig } from '@/hooks/usePricingEngineConfig';
import { toast } from 'sonner';

export function EngineConfigTab() {
  const { data: engineConfig, isLoading } = usePricingEngineConfig();
  const updateConfig = useUpdatePricingEngineConfig();

  // Local state for form
  const [formData, setFormData] = useState({
    default_markup_mg: 1.5,
    default_markup_br: 1.6,
    margin_green_threshold: 10,
    margin_yellow_threshold: 0,
    margin_orange_threshold: -5,
    margin_authorized_threshold: 0,
    minimum_price_margin_target: 1,
  });

  // Update form when data loads
  useEffect(() => {
    if (engineConfig) {
      setFormData({
        default_markup_mg: engineConfig.default_markup_mg,
        default_markup_br: engineConfig.default_markup_br,
        margin_green_threshold: engineConfig.margin_green_threshold,
        margin_yellow_threshold: engineConfig.margin_yellow_threshold,
        margin_orange_threshold: engineConfig.margin_orange_threshold,
        margin_authorized_threshold: engineConfig.margin_authorized_threshold,
        minimum_price_margin_target: engineConfig.minimum_price_margin_target,
      });
    }
  }, [engineConfig]);

  const handleSave = () => {
    if (!engineConfig?.id || engineConfig.id === 'default') {
      toast.error('Configuração não encontrada no banco de dados');
      return;
    }

    updateConfig.mutate({
      id: engineConfig.id,
      updates: formData,
    });
  };

  const handleReset = () => {
    if (engineConfig) {
      setFormData({
        default_markup_mg: engineConfig.default_markup_mg,
        default_markup_br: engineConfig.default_markup_br,
        margin_green_threshold: engineConfig.margin_green_threshold,
        margin_yellow_threshold: engineConfig.margin_yellow_threshold,
        margin_orange_threshold: engineConfig.margin_orange_threshold,
        margin_authorized_threshold: engineConfig.margin_authorized_threshold,
        minimum_price_margin_target: engineConfig.minimum_price_margin_target,
      });
    }
  };

  const updateField = (field: keyof typeof formData, value: number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-muted-foreground">
            Carregando configurações...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Multiplicadores de Markup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Multiplicadores de Markup Padrão
          </CardTitle>
          <CardDescription>
            Quando o produto não tem preço definido, o sistema aplica estes multiplicadores sobre o custo base
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="markup_mg">Markup MG (Minas Gerais)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="markup_mg"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.default_markup_mg}
                  onChange={(e) => updateField('default_markup_mg', parseFloat(e.target.value) || 1)}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  = {((formData.default_markup_mg - 1) * 100).toFixed(0)}% sobre custo
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: Custo R$ 100 × {formData.default_markup_mg} = R$ {(100 * formData.default_markup_mg).toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="markup_br">Markup BR (Outros estados)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="markup_br"
                  type="number"
                  step="0.01"
                  min="1"
                  value={formData.default_markup_br}
                  onChange={(e) => updateField('default_markup_br', parseFloat(e.target.value) || 1)}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  = {((formData.default_markup_br - 1) * 100).toFixed(0)}% sobre custo
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Ex: Custo R$ 100 × {formData.default_markup_br} = R$ {(100 * formData.default_markup_br).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Semáforo de Margem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Semáforo de Margem
          </CardTitle>
          <CardDescription>
            Define os limites de margem para as cores do semáforo visual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="green" className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                Verde (Ótimo)
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-sm">≥</span>
                <Input
                  id="green"
                  type="number"
                  step="0.1"
                  value={formData.margin_green_threshold}
                  onChange={(e) => updateField('margin_green_threshold', parseFloat(e.target.value) || 0)}
                />
                <span className="text-sm">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="yellow" className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                Amarelo (Bom)
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-sm">≥</span>
                <Input
                  id="yellow"
                  type="number"
                  step="0.1"
                  value={formData.margin_yellow_threshold}
                  onChange={(e) => updateField('margin_yellow_threshold', parseFloat(e.target.value) || 0)}
                />
                <span className="text-sm">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orange" className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                Laranja (Atenção)
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-sm">≥</span>
                <Input
                  id="orange"
                  type="number"
                  step="0.1"
                  value={formData.margin_orange_threshold}
                  onChange={(e) => updateField('margin_orange_threshold', parseFloat(e.target.value) || 0)}
                />
                <span className="text-sm">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Vermelho (Crítico)
              </Label>
              <div className="flex items-center gap-1 h-9">
                <span className="text-sm text-muted-foreground">
                  {"<"} {formData.margin_orange_threshold}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autorização e Preço Mínimo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autorização Automática e Preço Mínimo
          </CardTitle>
          <CardDescription>
            Parâmetros que controlam aprovação automática e cálculo de preço mínimo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="auth_threshold" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Margem para Autorização Automática
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-sm">≥</span>
                <Input
                  id="auth_threshold"
                  type="number"
                  step="0.1"
                  value={formData.margin_authorized_threshold}
                  onChange={(e) => updateField('margin_authorized_threshold', parseFloat(e.target.value) || 0)}
                />
                <span className="text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Cotações com margem acima deste valor são autorizadas automaticamente
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_target" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Margem Alvo para Preço Mínimo
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  id="min_target"
                  type="number"
                  step="0.1"
                  value={formData.minimum_price_margin_target}
                  onChange={(e) => updateField('minimum_price_margin_target', parseFloat(e.target.value) || 0)}
                />
                <span className="text-sm">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Preço mínimo é calculado para manter esta margem líquida
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Desfazer Alterações
        </Button>
        <Button onClick={handleSave} disabled={updateConfig.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {updateConfig.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
