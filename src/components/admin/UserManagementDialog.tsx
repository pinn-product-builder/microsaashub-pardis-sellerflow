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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { UserWithDetails, UserGroup } from '@/types/permissions';
import { useAuth } from '@/hooks/useAuth';

interface UserManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithDetails | null;
  groups: UserGroup[];
  onSave: () => void;
}

const ROLES = [
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'coordenador', label: 'Coordenador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'admin', label: 'Administrador' },
];

const REGIONS = [
  { value: 'BR', label: 'Brasil' },
  { value: 'MG', label: 'Minas Gerais' },
] as const;

type RegionValue = typeof REGIONS[number]['value'] | '';

export function UserManagementDialog({
  open,
  onOpenChange,
  user,
  groups,
  onSave,
}: UserManagementDialogProps) {
  const { user: currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    region: '',
    is_active: true,
    role: 'vendedor',
    group_ids: [] as string[],
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        region: user.region || '',
        is_active: user.is_active,
        role: user.role || 'vendedor',
        group_ids: user.groups.map(g => g.id),
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setSaveError(null);

      // Atualizar perfil/role/grupos via RPC (bypass RLS com checagem de permissão)
      const regionValue = formData.region === '' ? null : formData.region as "BR" | "MG";
      const { error: updateError } = await (supabase as any).rpc('admin_update_user', {
        _target_user_id: user.id,
        _full_name: formData.full_name,
        _region: regionValue,
        _is_active: formData.is_active,
        _role: formData.role,
        _group_ids: formData.group_ids,
      });

      if (updateError) throw updateError;

      toast.success('Usuário atualizado com sucesso');
      onSave();
    } catch (error) {
      console.error('Error updating user:', error);
      const rawMessage = error instanceof Error ? error.message : String(error);
      let friendly = 'Erro ao atualizar usuário';
      if (rawMessage.toLowerCase().includes('admin_update_user')) {
        friendly = 'Função de administração não encontrada. Precisamos aplicar a migration no Supabase.';
      } else if (rawMessage.toLowerCase().includes('forbidden')) {
        friendly = 'Você não tem permissão para alterar este usuário.';
      }
      setSaveError(friendly);
      toast.error(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      group_ids: prev.group_ids.includes(groupId)
        ? prev.group_ids.filter(id => id !== groupId)
        : [...prev.group_ids, groupId],
    }));
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            {user.email}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="permissions">Grupos e Permissões</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    full_name: e.target.value 
                  }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="region">Região</Label>
                <Select
                  value={formData.region || 'none'}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    region: value === 'none' ? '' : value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a região" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {REGIONS.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="role">Role do Sistema</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    role: value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    is_active: checked as boolean 
                  }))}
                />
                <Label htmlFor="is_active">Usuário ativo</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <Label>Grupos de Usuários</Label>
              <div className="grid gap-2 max-h-[300px] overflow-y-auto border rounded-lg p-4">
                {groups.map((group) => (
                  <div 
                    key={group.id} 
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md"
                  >
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={formData.group_ids.includes(group.id)}
                      onCheckedChange={() => handleGroupToggle(group.id)}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`group-${group.id}`} 
                        className="font-medium cursor-pointer"
                      >
                        {group.name}
                      </Label>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {saveError && (
          <p className="text-sm text-destructive mt-2">{saveError}</p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
