import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Page, PageContainer, PageHeader, PageContent } from '@/components/layout/Page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Shield, Users, Plus, Lock, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { GroupManagementDialog } from '@/components/admin/GroupManagementDialog';
import { GroupWithPermissions, Permission } from '@/types/permissions';

export default function Grupos() {
  const [groups, setGroups] = useState<GroupWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithPermissions | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const fetchGroups = async () => {
    try {
      setIsLoading(true);

      // Buscar grupos
      const { data: groupsData, error: groupsError } = await supabase
        .from('user_groups')
        .select('*')
        .order('name');

      if (groupsError) throw groupsError;

      // Buscar permissões dos grupos
      const { data: groupPerms, error: groupPermsError } = await supabase
        .from('group_permissions')
        .select('*, permissions(*)');

      if (groupPermsError) throw groupPermsError;

      // Buscar contagem de membros
      const { data: memberships, error: membershipsError } = await supabase
        .from('user_group_memberships')
        .select('group_id');

      if (membershipsError) throw membershipsError;

      // Combinar dados
      const groupsWithDetails: GroupWithPermissions[] = (groupsData ?? []).map((group: any) => {
        const groupPermissions = groupPerms
          ?.filter((gp: any) => gp.group_id === group.id)
          .map((gp: any) => gp.permissions)
          .filter(Boolean) ?? [];
        
        const memberCount = memberships?.filter((m: any) => m.group_id === group.id).length ?? 0;

        return {
          ...group,
          permissions: groupPermissions,
          member_count: memberCount,
        };
      });

      setGroups(groupsWithDetails);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .eq('is_active', true)
        .order('module', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setPermissions(data ?? []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchPermissions();
  }, []);

  const handleCreateGroup = () => {
    setIsCreating(true);
    setSelectedGroup(null);
    setIsDialogOpen(true);
  };

  const handleEditGroup = (group: GroupWithPermissions) => {
    setIsCreating(false);
    setSelectedGroup(group);
    setIsDialogOpen(true);
  };

  const handleGroupSaved = () => {
    fetchGroups();
    setIsDialogOpen(false);
    setSelectedGroup(null);
    setIsCreating(false);
  };

  return (
    <Page>
      <PageContainer>
        <PageHeader 
          title="Grupos de Usuários" 
          description="Gerencie grupos e suas permissões"
        >
          <Button onClick={handleCreateGroup}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Grupo
          </Button>
        </PageHeader>
        <PageContent>
          {/* Groups Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card key={group.id} className="relative">
                  {group.is_system && (
                    <div className="absolute top-3 right-3">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                    </div>
                    <CardDescription>
                      {group.description || 'Sem descrição'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{group.member_count} membros</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span>{group.permissions.length} permissões</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {group.permissions.slice(0, 3).map((perm) => (
                          <Badge key={perm.id} variant="secondary" className="text-xs">
                            {perm.name}
                          </Badge>
                        ))}
                        {group.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{group.permissions.length - 3} mais
                          </Badge>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <Badge variant={group.is_active ? 'default' : 'secondary'}>
                          {group.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGroup(group)}
                        >
                          <Edit2 className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Permissions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Todas as Permissões</CardTitle>
              <CardDescription>
                Lista completa de permissões disponíveis no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Módulo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissions.map((perm) => (
                    <TableRow key={perm.id}>
                      <TableCell className="font-mono text-sm">
                        {perm.code}
                      </TableCell>
                      <TableCell className="font-medium">{perm.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {perm.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{perm.module}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </PageContent>
      </PageContainer>

      <GroupManagementDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        group={selectedGroup}
        permissions={permissions}
        isCreating={isCreating}
        onSave={handleGroupSaved}
      />
    </Page>
  );
}
