import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user, role } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    try {
      // Admin tem todas as permissões
      if (role === 'admin') {
        const { data: allPerms } = await supabase
          .from('permissions')
          .select('code')
          .eq('is_active', true);
        
        setPermissions(allPerms?.map(p => p.code) ?? []);
      } else {
        // Buscar permissões via função RPC
        const { data, error } = await supabase.rpc('get_user_permissions', {
          _user_id: user.id
        });

        if (error) throw error;
        setPermissions(data?.map((p: { permission_code: string }) => p.permission_code) ?? []);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permissionCode: string): boolean => {
    // Admin sempre tem todas as permissões
    if (role === 'admin') return true;
    return permissions.includes(permissionCode);
  }, [permissions, role]);

  const hasAnyPermission = useCallback((permissionCodes: string[]): boolean => {
    if (role === 'admin') return true;
    return permissionCodes.some(code => permissions.includes(code));
  }, [permissions, role]);

  const hasAllPermissions = useCallback((permissionCodes: string[]): boolean => {
    if (role === 'admin') return true;
    return permissionCodes.every(code => permissions.includes(code));
  }, [permissions, role]);

  return {
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: fetchPermissions,
  };
}
