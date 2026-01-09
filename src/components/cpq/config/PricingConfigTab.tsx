import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { usePricingConfigs, useUpdatePricingConfig } from '@/hooks/usePricingConfig';
import { PricingConfig } from '@/types/pardis';
import { toast } from 'sonner';

export function PricingConfigTab() {
  const { data: configs, isLoading, refetch } = usePricingConfigs();
  const updateConfig = useUpdatePricingConfig();
  const [editingValues, setEditingValues] = useState<Record<string, Partial<PricingConfig>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const handleValueChange = (id: string, field: keyof PricingConfig, value: number | boolean) => {
    setEditingValues(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const getValue = (config: PricingConfig, field: keyof PricingConfig) => {
    if (editingValues[config.id]?.[field] !== undefined) {
      return editingValues[config.id][field];
    }
    return config[field];
  };

  const handleSave = async (config: PricingConfig) => {
    const updates = editingValues[config.id];
    if (!updates || Object.keys(updates).length === 0) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }

    setSaving(config.id);
    try {
      await updateConfig.mutateAsync({ id: config.id, updates });
      setEditingValues(prev => {
        const newValues = { ...prev };
        delete newValues[config.id];
        return newValues;
      });
    } finally {
      setSaving(null);
    }
  };

  const hasChanges = (id: string) => {
    return editingValues[id] && Object.keys(editingValues[id]).length > 0;
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
          <CardTitle>Configuração de Pricing por Região</CardTitle>
          <CardDescription>
            Defina os percentuais de custo para cálculo de margem em cada região
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Região</TableHead>
              <TableHead className="text-center">Admin %</TableHead>
              <TableHead className="text-center">Logística %</TableHead>
              <TableHead className="text-center">ICMS %</TableHead>
              <TableHead className="text-center">PIS/COFINS %</TableHead>
              <TableHead className="text-center">Desc. L2L %</TableHead>
              <TableHead className="text-center">Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs?.map((config) => (
              <TableRow key={config.id}>
                <TableCell>
                  <Badge variant={config.region === 'MG' ? 'default' : 'secondary'}>
                    {config.region === 'MG' ? 'Minas Gerais' : 'Brasil (outros)'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={getValue(config, 'admin_percent') as number}
                    onChange={(e) => handleValueChange(config.id, 'admin_percent', parseFloat(e.target.value) || 0)}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={getValue(config, 'logistics_percent') as number}
                    onChange={(e) => handleValueChange(config.id, 'logistics_percent', parseFloat(e.target.value) || 0)}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={getValue(config, 'icms_percent') as number}
                    onChange={(e) => handleValueChange(config.id, 'icms_percent', parseFloat(e.target.value) || 0)}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={getValue(config, 'pis_cofins_percent') as number}
                    onChange={(e) => handleValueChange(config.id, 'pis_cofins_percent', parseFloat(e.target.value) || 0)}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={getValue(config, 'lab_to_lab_discount') as number}
                    onChange={(e) => handleValueChange(config.id, 'lab_to_lab_discount', parseFloat(e.target.value) || 0)}
                    className="w-20 text-center"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={getValue(config, 'is_active') as boolean}
                    onCheckedChange={(checked) => handleValueChange(config.id, 'is_active', checked)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => handleSave(config)}
                    disabled={!hasChanges(config.id) || saving === config.id}
                  >
                    {saving === config.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {(!configs || configs.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma configuração encontrada. Entre em contato com o administrador.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
