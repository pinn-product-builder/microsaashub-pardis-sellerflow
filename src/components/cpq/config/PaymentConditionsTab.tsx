import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react';
import { usePaymentConditions, useUpdatePaymentCondition } from '@/hooks/usePricingConfig';
import { PaymentCondition } from '@/types/pardis';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface ConditionFormData {
  name: string;
  days: number;
  adjustment_percent: number;
  is_active: boolean;
}

const defaultFormData: ConditionFormData = {
  name: '',
  days: 0,
  adjustment_percent: 0,
  is_active: true,
};

export function PaymentConditionsTab() {
  const { data: conditions, isLoading, refetch } = usePaymentConditions();
  const updateCondition = useUpdatePaymentCondition();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<PaymentCondition | null>(null);
  const [formData, setFormData] = useState<ConditionFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  const handleEdit = (condition: PaymentCondition) => {
    setEditingCondition(condition);
    setFormData({
      name: condition.name,
      days: condition.days,
      adjustment_percent: condition.adjustment_percent,
      is_active: condition.is_active,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCondition(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (editingCondition) {
        await updateCondition.mutateAsync({
          id: editingCondition.id,
          updates: formData,
        });
      } else {
        const { error } = await supabase.from('payment_conditions').insert({
          name: formData.name,
          days: formData.days,
          adjustment_percent: formData.adjustment_percent,
          is_active: formData.is_active,
        });
        if (error) throw error;
        toast.success('Condição criada com sucesso');
        queryClient.invalidateQueries({ queryKey: ['payment-conditions'] });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (condition: PaymentCondition) => {
    if (!confirm(`Deseja realmente excluir "${condition.name}"?`)) return;
    
    try {
      const { error } = await supabase.from('payment_conditions').delete().eq('id', condition.id);
      if (error) throw error;
      toast.success('Condição excluída');
      queryClient.invalidateQueries({ queryKey: ['payment-conditions'] });
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleToggleActive = async (condition: PaymentCondition) => {
    await updateCondition.mutateAsync({
      id: condition.id,
      updates: { is_active: !condition.is_active },
    });
  };

  const formatAdjustment = (value: number) => {
    if (value === 0) return '—';
    return value > 0 ? `+${value}%` : `${value}%`;
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Condições de Pagamento</CardTitle>
            <CardDescription>
              Configure os prazos e ajustes de preço para cada condição de pagamento
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Condição
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Prazo (dias)</TableHead>
                <TableHead className="text-center">Ajuste no Preço</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conditions?.map((condition) => (
                <TableRow key={condition.id}>
                  <TableCell className="font-medium">{condition.name}</TableCell>
                  <TableCell className="text-center">{condition.days}</TableCell>
                  <TableCell className="text-center">
                    <span className={condition.adjustment_percent > 0 ? 'text-red-600' : condition.adjustment_percent < 0 ? 'text-green-600' : ''}>
                      {formatAdjustment(condition.adjustment_percent)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={condition.is_active}
                      onCheckedChange={() => handleToggleActive(condition)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(condition)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(condition)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!conditions || conditions.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma condição de pagamento configurada.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCondition ? 'Editar Condição' : 'Nova Condição de Pagamento'}</DialogTitle>
            <DialogDescription>
              Configure os parâmetros da condição de pagamento
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: 30/60/90 dias"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="days">Prazo (dias)</Label>
                <Input
                  id="days"
                  type="number"
                  min="0"
                  value={formData.days}
                  onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adjustment_percent">Ajuste no Preço (%)</Label>
                <Input
                  id="adjustment_percent"
                  type="number"
                  step="0.01"
                  value={formData.adjustment_percent}
                  onChange={(e) => setFormData({ ...formData, adjustment_percent: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 2.5 (acréscimo) ou -3 (desconto)"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Condição ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCondition ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
