import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

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
      return;
    }

    // Se não há usuário, limpar permissões
    if (!userId) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    // Evitar fetch duplicado para o mesmo usuário/role
    if (lastUserIdRef.current === userId && lastRoleRef.current === userRole) {
      return;
    }

    // Prevenir chamadas simultâneas
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;

    try {
      let perms: string[] = [];
      
      // Admin tem todas as permissões
      if (userRole === 'admin') {
        const { data: allPerms, error } = await supabase
          .from('permissions')
          .select('code')
          .eq('is_active', true);
        
        if (!error) {
          perms = allPerms?.map(p => p.code) ?? [];
        }
      } else {
        // Buscar permissões via função RPC
        const { data, error } = await supabase.rpc('get_user_permissions', {
          _user_id: userId
        });

        if (!error) {
          perms = data?.map((p: { permission_code: string }) => p.permission_code) ?? [];
        }
      }

      // Atualizar refs de controle
      lastUserIdRef.current = userId;
      lastRoleRef.current = userRole;
      
      setPermissions(perms);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      setPermissions([]);
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [userId, userRole, authLoading]);

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