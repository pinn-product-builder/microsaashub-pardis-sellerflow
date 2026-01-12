import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { GroupWithPermissions, Permission, PERMISSION_MODULES } from '@/types/permissions';

interface GroupManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupWithPermissions | null;
  permissions: Permission[];
  isCreating: boolean;
  onSave: () => void;
}

export function GroupManagementDialog({
  open,
  onOpenChange,
  group,
  permissions,
  isCreating,
  onSave,
}: GroupManagementDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    permission_ids: [] as string[],
  });

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        description: group.description || '',
        is_active: group.is_active,
        permission_ids: group.permissions.map(p => p.id),
      });
    } else if (isCreating) {
      setFormData({
        name: '',
        description: '',
        is_active: true,
        permission_ids: [],
      });
    }
  }, [group, isCreating]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome do grupo é obrigatório');
      return;
    }

    try {
      setIsLoading(true);

      if (isCreating) {
        // Criar novo grupo
        const { data: newGroup, error: createError } = await supabase
          .from('user_groups')
          .insert({
            name: formData.name,
            description: formData.description || null,
            is_active: formData.is_active,
            is_system: false,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Adicionar permissões
        if (formData.permission_ids.length > 0) {
          const groupPerms = formData.permission_ids.map(permId => ({
            group_id: newGroup.id,
            permission_id: permId,
          }));

          const { error: permsError } = await supabase
            .from('group_permissions')
            .insert(groupPerms);

          if (permsError) throw permsError;
        }

        toast.success('Grupo criado com sucesso');
      } else if (group) {
        // Atualizar grupo existente
        const { error: updateError } = await supabase
          .from('user_groups')
          .update({
            name: formData.name,
            description: formData.description || null,
            is_active: formData.is_active,
          })
          .eq('id', group.id);

        if (updateError) throw updateError;

        // Atualizar permissões - remover todas e adicionar novamente
        const { error: deleteError } = await supabase
          .from('group_permissions')
          .delete()
          .eq('group_id', group.id);

        if (deleteError) throw deleteError;

        if (formData.permission_ids.length > 0) {
          const groupPerms = formData.permission_ids.map(permId => ({
            group_id: group.id,
            permission_id: permId,
          }));

          const { error: permsError } = await supabase
            .from('group_permissions')
            .insert(groupPerms);

          if (permsError) throw permsError;
        }

        toast.success('Grupo atualizado com sucesso');
      }

      onSave();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Erro ao salvar grupo');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permissionId)
        ? prev.permission_ids.filter(id => id !== permissionId)
        : [...prev.permission_ids, permissionId],
    }));
  };

  const handleSelectAllModule = (module: string, select: boolean) => {
    const modulePermIds = permissions
      .filter(p => p.module === module)
      .map(p => p.id);

    setFormData(prev => ({
      ...prev,
      permission_ids: select
        ? [...new Set([...prev.permission_ids, ...modulePermIds])]
        : prev.permission_ids.filter(id => !modulePermIds.includes(id)),
    }));
  };

  // Agrupar permissões por módulo
  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? 'Novo Grupo' : `Editar Grupo: ${group?.name}`}
          </DialogTitle>
          <DialogDescription>
            {isCreating 
              ? 'Crie um novo grupo de usuários com permissões específicas'
              : 'Edite as informações e permissões do grupo'
            }
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Grupo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  placeholder="Ex: Supervisores"
                  disabled={group?.is_system}
                />
                {group?.is_system && (
                  <p className="text-sm text-muted-foreground">
                    Grupos do sistema não podem ter o nome alterado
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                  placeholder="Descreva o propósito deste grupo..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Grupos inativos não concedem permissões aos membros
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    is_active: checked 
                  }))}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="flex-1 overflow-hidden mt-4">
            <div className="space-y-4 h-full overflow-y-auto pr-2">
              {Object.entries(permissionsByModule).map(([module, modulePerms]) => {
                const allSelected = modulePerms.every(p => 
                  formData.permission_ids.includes(p.id)
                );
                const someSelected = modulePerms.some(p => 
                  formData.permission_ids.includes(p.id)
                );

                return (
                  <div key={module} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allSelected}
                          // @ts-ignore - indeterminate is a valid prop
                          indeterminate={someSelected && !allSelected}
                          onCheckedChange={(checked) => 
                            handleSelectAllModule(module, checked as boolean)
                          }
                        />
                        <Label className="text-base font-semibold">
                          {PERMISSION_MODULES[module as keyof typeof PERMISSION_MODULES] || module}
                        </Label>
                        <Badge variant="secondary">
                          {modulePerms.filter(p => formData.permission_ids.includes(p.id)).length} / {modulePerms.length}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-2 ml-6">
                      {modulePerms.map((perm) => (
                        <div 
                          key={perm.id} 
                          className="flex items-start space-x-2 p-2 hover:bg-muted rounded-md"
                        >
                          <Checkbox
                            id={`perm-${perm.id}`}
                            checked={formData.permission_ids.includes(perm.id)}
                            onCheckedChange={() => handlePermissionToggle(perm.id)}
                          />
                          <div className="flex-1">
                            <Label 
                              htmlFor={`perm-${perm.id}`} 
                              className="font-medium cursor-pointer"
                            >
                              {perm.name}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {perm.description}
                            </p>
                            <code className="text-xs text-muted-foreground">
                              {perm.code}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : isCreating ? 'Criar Grupo' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
