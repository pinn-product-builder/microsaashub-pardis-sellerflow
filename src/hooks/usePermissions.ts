import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { LogService } from '@/services/logService';

export function usePermissions() {
  const { user, role, isLoading: authLoading } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs para controle de execução
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const lastRoleRef = useRef<string | null>(null);

  // Extrair valores primitivos para dependências estáveis
  const userId = user?.id ?? null;
  const userRole = role ?? null;

  const fetchPermissions = useCallback(async () => {
    // Não buscar se auth ainda está carregando
    if (authLoading) {
      LogService.debug('usePermissions', 'Aguardando auth carregar');
      return;
    }

    // Se não há usuário, limpar permissões
    if (!userId) {
      LogService.debug('usePermissions', 'Sem usuário - limpando permissões');
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    // Evitar fetch duplicado para o mesmo usuário/role
    if (lastUserIdRef.current === userId && lastRoleRef.current === userRole) {
      LogService.debug('usePermissions', 'Dados já carregados para este usuário/role');
      return;
    }

    // Prevenir chamadas simultâneas
    if (fetchingRef.current) {
      LogService.debug('usePermissions', 'Fetch já em andamento');
      return;
    }

    fetchingRef.current = true;
    LogService.info('usePermissions', 'Buscando permissões', { userId, role: userRole });

    try {
      let perms: string[] = [];
      
      // Admin tem todas as permissões
      if (userRole === 'admin') {
        LogService.debug('usePermissions', 'Usuário admin - buscando todas as permissões');
        const { data: allPerms, error } = await supabase
          .from('permissions')
          .select('code')
          .eq('is_active', true);
        
        if (error) {
          LogService.error('usePermissions', 'Erro ao buscar permissões admin', error);
        } else {
          perms = allPerms?.map(p => p.code) ?? [];
        }
      } else {
        // Buscar permissões via função RPC
        const { data, error } = await supabase.rpc('get_user_permissions', {
          _user_id: userId
        });

        if (error) {
          LogService.error('usePermissions', 'Erro ao buscar permissões via RPC', error);
        } else {
          perms = data?.map((p: { permission_code: string }) => p.permission_code) ?? [];
        }
      }

      // Atualizar refs de controle
      lastUserIdRef.current = userId;
      lastRoleRef.current = userRole;
      
      setPermissions(perms);
      LogService.info('usePermissions', 'Permissões carregadas', { count: perms.length });
    } catch (error) {
      LogService.error('usePermissions', 'Erro ao buscar permissões', error);
      setPermissions([]);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [userId, userRole, authLoading]); // Dependências primitivas apenas

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // Reset quando userId muda
  useEffect(() => {
    if (userId !== lastUserIdRef.current) {
      setIsLoading(true);
      lastUserIdRef.current = null;
      lastRoleRef.current = null;
    }
  }, [userId]);

  const hasPermission = useCallback((permissionCode: string): boolean => {
    // Admin sempre tem todas as permissões
    if (userRole === 'admin') return true;
    return permissions.includes(permissionCode);
  }, [permissions, userRole]);

  const hasAnyPermission = useCallback((permissionCodes: string[]): boolean => {
    if (userRole === 'admin') return true;
    return permissionCodes.some(code => permissions.includes(code));
  }, [permissions, userRole]);

  const hasAllPermissions = useCallback((permissionCodes: string[]): boolean => {
    if (userRole === 'admin') return true;
    return permissionCodes.every(code => permissions.includes(code));
  }, [permissions, userRole]);

  const refetch = useCallback(() => {
    lastUserIdRef.current = null;
    lastRoleRef.current = null;
    setIsLoading(true);
    fetchPermissions();
  }, [fetchPermissions]);

  // Retornar objeto memoizado
  return useMemo(() => ({
    permissions,
    isLoading: isLoading || authLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch,
  }), [permissions, isLoading, authLoading, hasPermission, hasAnyPermission, hasAllPermissions, refetch]);
}
