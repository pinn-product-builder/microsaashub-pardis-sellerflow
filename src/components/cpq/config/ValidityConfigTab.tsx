import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { useQuoteValidityConfig, useUpdateQuoteValidityConfig } from '@/hooks/usePricingConfig';
import { QuoteValidityConfig } from '@/types/pardis';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export function ValidityConfigTab() {
  const { data: config, isLoading, refetch } = useQuoteValidityConfig();
  const updateConfig = useUpdateQuoteValidityConfig();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    default_days: 7,
    expiry_message: 'Esta cotação expira em {days} dias. Após a data de validade, os preços e condições poderão ser alterados.',
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (config) {
      setFormData({
        default_days: config.default_days,
        expiry_message: config.expiry_message || '',
      });
    }
  }, [config]);

  useEffect(() => {
    if (config) {
      const changed = 
        formData.default_days !== config.default_days ||
        formData.expiry_message !== (config.expiry_message || '');
      setHasChanges(changed);
    }
  }, [formData, config]);

  const handleSave = async () => {
    if (formData.default_days < 1) {
      toast.error('O prazo deve ser de pelo menos 1 dia');
      return;
    }

    setSaving(true);
    try {
      if (config?.id) {
        await updateConfig.mutateAsync({
          id: config.id,
          updates: {
            default_days: formData.default_days,
            expiry_message: formData.expiry_message,
          },
        });
      } else {
        // Create new config if none exists
        const { error } = await supabase.from('quote_validity_config').insert({
          default_days: formData.default_days,
          expiry_message: formData.expiry_message,
          is_active: true,
        });
        if (error) throw error;
        toast.success('Configuração criada com sucesso');
        queryClient.invalidateQueries({ queryKey: ['quote-validity-config'] });
      }
      setHasChanges(false);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Validade de Cotações</CardTitle>
          <CardDescription>
            Configure o prazo padrão de validade e a mensagem exibida nas cotações
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2 max-w-md">
          <Label htmlFor="default_days">Prazo Padrão (dias)</Label>
          <Input
            id="default_days"
            type="number"
            min="1"
            max="365"
            value={formData.default_days}
            onChange={(e) => setFormData({ ...formData, default_days: parseInt(e.target.value) || 7 })}
            className="w-32"
          />
          <p className="text-sm text-muted-foreground">
            Número de dias de validade padrão para novas cotações
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="expiry_message">Mensagem de Validade</Label>
          <Textarea
            id="expiry_message"
            value={formData.expiry_message}
            onChange={(e) => setFormData({ ...formData, expiry_message: e.target.value })}
            placeholder="Mensagem exibida sobre a validade da cotação..."
            rows={3}
          />
          <p className="text-sm text-muted-foreground">
            Use <code className="bg-muted px-1 rounded">{'{days}'}</code> para incluir o número de dias dinamicamente
          </p>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t">
          <Button onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
          {hasChanges && (
            <span className="text-sm text-muted-foreground">
              Você tem alterações não salvas
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
