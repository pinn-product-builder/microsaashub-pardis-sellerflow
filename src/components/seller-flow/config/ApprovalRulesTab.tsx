import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react';
import { useApprovalRules, useUpdateApprovalRule } from '@/hooks/usePricingConfig';
import { ApprovalRule, AppRole, PriorityLevel } from '@/types/pardis';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { ApprovalFlowStepConfig } from './ApprovalFlowStepConfig';

const ROLE_LABELS: Record<AppRole, string> = {
  vendedor: 'Vendedor',
  coordenador: 'Coordenador',
  gerente: 'Gerente',
  diretor: 'Diretor',
  admin: 'Admin',
};

const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const PRIORITY_COLORS: Record<PriorityLevel, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
  critical: 'destructive',
};

interface RuleFormData {
  name: string;
  margin_min: number | null;
  margin_max: number | null;
  approver_role: AppRole;
  sla_hours: number;
  priority: PriorityLevel;
  is_active: boolean;
}

const defaultFormData: RuleFormData = {
  name: '',
  margin_min: null,
  margin_max: null,
  approver_role: 'coordenador',
  sla_hours: 24,
  priority: 'medium',
  is_active: true,
};

export function ApprovalRulesTab() {
  const { data: rules, isLoading, refetch } = useApprovalRules();
  const updateRule = useUpdateApprovalRule();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  const handleEdit = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      margin_min: rule.margin_min ?? null,
      margin_max: rule.margin_max ?? null,
      approver_role: rule.approver_role,
      sla_hours: rule.sla_hours,
      priority: rule.priority,
      is_active: rule.is_active,
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
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
      if (editingRule) {
        await updateRule.mutateAsync({
          id: editingRule.id,
          updates: formData,
        });
      } else {
        const { error } = await supabase.from('approval_rules').insert({
          name: formData.name,
          margin_min: formData.margin_min,
          margin_max: formData.margin_max,
          approver_role: formData.approver_role,
          sla_hours: formData.sla_hours,
          priority: formData.priority,
          is_active: formData.is_active,
        });
        if (error) throw error;
        toast.success('Regra criada com sucesso');
        queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rule: ApprovalRule) => {
    if (!confirm(`Deseja realmente excluir a regra "${rule.name}"?`)) return;

    try {
      const { error } = await supabase.from('approval_rules').delete().eq('id', rule.id);
      if (error) throw error;
      toast.success('Regra excluída');
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleToggleActive = async (rule: ApprovalRule) => {
    await updateRule.mutateAsync({
      id: rule.id,
      updates: { is_active: !rule.is_active },
    });
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
            <CardTitle>Regras de Aprovação</CardTitle>
            <CardDescription>
              Configure as faixas de margem e quem deve aprovar cada nível
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Margem Mín.</TableHead>
                <TableHead className="text-center">Margem Máx.</TableHead>
                <TableHead className="text-center">Aprovador</TableHead>
                <TableHead className="text-center">SLA (horas)</TableHead>
                <TableHead className="text-center">Prioridade</TableHead>
                <TableHead className="text-center">Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell className="text-center">
                    {rule.margin_min !== null ? `${rule.margin_min}%` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {rule.margin_max !== null ? `${rule.margin_max}%` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{ROLE_LABELS[rule.approver_role]}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{rule.sla_hours}h</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={PRIORITY_COLORS[rule.priority]}>
                      {PRIORITY_LABELS[rule.priority]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggleActive(rule)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(rule)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rule)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(!rules || rules.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma regra de aprovação configurada.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Aprovação'}</DialogTitle>
            <DialogDescription>
              Configure os parâmetros da regra de aprovação
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Regra</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Margem Negativa Leve"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="margin_min">Margem Mínima (%)</Label>
                <Input
                  id="margin_min"
                  type="number"
                  step="0.01"
                  value={formData.margin_min ?? ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    margin_min: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  placeholder="Ex: -10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="margin_max">Margem Máxima (%)</Label>
                <Input
                  id="margin_max"
                  type="number"
                  step="0.01"
                  value={formData.margin_max ?? ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    margin_max: e.target.value ? parseFloat(e.target.value) : null
                  })}
                  placeholder="Ex: -5"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="approver_role">Aprovador</Label>
              <Select
                value={formData.approver_role}
                onValueChange={(value: AppRole) => setFormData({ ...formData, approver_role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coordenador">Coordenador</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="diretor">Diretor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="sla_hours">SLA (horas)</Label>
                <Input
                  id="sla_hours"
                  type="number"
                  min="1"
                  value={formData.sla_hours}
                  onChange={(e) => setFormData({ ...formData, sla_hours: parseInt(e.target.value) || 24 })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: PriorityLevel) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Regra ativa</Label>
            </div>

            {editingRule && (
              <div className="mt-2">
                <ApprovalFlowStepConfig ruleId={editingRule.id} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRule ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
