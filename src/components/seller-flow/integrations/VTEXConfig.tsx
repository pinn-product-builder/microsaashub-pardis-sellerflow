
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  TestTube, 
  Save, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ShoppingCart
} from 'lucide-react';
import { VTEXConfig as VTEXConfigType, VTEXIntegrationSettings } from '@/types/vtex';
import { VTEXService } from '@/services/vtexService';
import { useToast } from '@/hooks/use-toast';

export function VTEXConfig() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<VTEXIntegrationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [formData, setFormData] = useState<VTEXConfigType>({
    accountName: '',
    environment: 'stable',
    appKey: '',
    appToken: '',
    baseUrl: ''
  });

  const [integrationData, setIntegrationData] = useState({
    isEnabled: false,
    defaultSalesChannel: '1',
    defaultAffiliate: 'CPQ',
    defaultSeller: '1'
  });

  useEffect(() => {
    const currentSettings = VTEXService.getCurrentSettings();
    if (currentSettings) {
      setSettings(currentSettings);
      setFormData(currentSettings.config);
      setIntegrationData({
        isEnabled: currentSettings.isEnabled,
        defaultSalesChannel: currentSettings.defaultSalesChannel,
        defaultAffiliate: currentSettings.defaultAffiliate,
        defaultSeller: currentSettings.defaultSeller
      });
    }
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await VTEXService.testConnection(formData);
      setTestResult(result);

      if (result.success) {
        toast({
          title: "Conexão Testada",
          description: result.message
        });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Erro inesperado' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      if (settings) {
        // Atualizar configurações existentes
        const updated = VTEXService.updateSettings({
          config: formData,
          isEnabled: integrationData.isEnabled,
          defaultSalesChannel: integrationData.defaultSalesChannel,
          defaultAffiliate: integrationData.defaultAffiliate,
          defaultSeller: integrationData.defaultSeller
        });
        setSettings(updated);
      } else {
        // Criar novas configurações
        const newSettings = VTEXService.createSettings(formData, {
          isEnabled: integrationData.isEnabled,
          defaultSalesChannel: integrationData.defaultSalesChannel,
          defaultAffiliate: integrationData.defaultAffiliate,
          defaultSeller: integrationData.defaultSeller
        });
        setSettings(newSettings);
      }

      toast({
        title: "Configurações Salvas",
        description: "Integração VTEX configurada com sucesso!"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <ShoppingCart className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Integração VTEX</h2>
            <p className="text-muted-foreground">Configure a integração com a plataforma VTEX</p>
          </div>
        </div>
        {settings && (
          <Badge variant={settings.isEnabled ? "default" : "secondary"}>
            {settings.isEnabled ? "Ativo" : "Inativo"}
          </Badge>
        )}
      </div>

      {/* Status da Integração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Status da Integração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                checked={integrationData.isEnabled}
                onCheckedChange={(checked) => 
                  setIntegrationData(prev => ({ ...prev, isEnabled: checked }))
                }
              />
              <Label>Habilitar integração VTEX</Label>
            </div>
            {testResult && (
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.message}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Conexão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Nome da Conta VTEX</Label>
              <Input
                id="accountName"
                value={formData.accountName}
                onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                placeholder="minha-loja"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="environment">Ambiente</Label>
              <select
                id="environment"
                value={formData.environment}
                onChange={(e) => setFormData(prev => ({ ...prev, environment: e.target.value as 'stable' | 'beta' }))}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                <option value="stable">Stable</option>
                <option value="beta">Beta</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="appKey">App Key</Label>
            <Input
              id="appKey"
              type="password"
              value={formData.appKey}
              onChange={(e) => setFormData(prev => ({ ...prev, appKey: e.target.value }))}
              placeholder="vtexappkey-appname-XXXXXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appToken">App Token</Label>
            <Input
              id="appToken"
              type="password"
              value={formData.appToken}
              onChange={(e) => setFormData(prev => ({ ...prev, appToken: e.target.value }))}
              placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">URL Base (opcional)</Label>
            <Input
              id="baseUrl"
              value={formData.baseUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="https://minha-loja.vtexcommercestable.com.br"
            />
          </div>

          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={isTesting || !formData.accountName || !formData.appKey || !formData.appToken}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTesting ? 'Testando...' : 'Testar Conexão'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Padrão */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Padrão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salesChannel">Canal de Vendas</Label>
              <Input
                id="salesChannel"
                value={integrationData.defaultSalesChannel}
                onChange={(e) => setIntegrationData(prev => ({ ...prev, defaultSalesChannel: e.target.value }))}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="affiliate">Afiliado</Label>
              <Input
                id="affiliate"
                value={integrationData.defaultAffiliate}
                onChange={(e) => setIntegrationData(prev => ({ ...prev, defaultAffiliate: e.target.value }))}
                placeholder="CPQ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller">Seller</Label>
              <Input
                id="seller"
                value={integrationData.defaultSeller}
                onChange={(e) => setIntegrationData(prev => ({ ...prev, defaultSeller: e.target.value }))}
                placeholder="1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> As credenciais VTEX são sensíveis. Certifique-se de que apenas usuários autorizados tenham acesso a esta configuração.
        </AlertDescription>
      </Alert>

      {/* Botões de Ação */}
      <div className="flex justify-end space-x-2">
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
