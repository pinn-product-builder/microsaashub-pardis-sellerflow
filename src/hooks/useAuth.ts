import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Profile, AppRole } from '@/types/pardis';
import { LogService } from '@/services/logService';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
};

export function useAuth() {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>(initialState);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Buscar perfil e role do usuário
  const fetchUserData = useCallback(async (userId: string) => {
    // Prevenir chamadas duplicadas
    if (fetchingRef.current) {
      LogService.debug('useAuth', 'fetchUserData ignorado - já em execução');
      return null;
    }
    
    fetchingRef.current = true;
    LogService.info('useAuth', 'Buscando dados do usuário', { userId });
    
    try {
      // Buscar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        LogService.error('useAuth', 'Erro ao buscar perfil', profileError);
      }

      // Buscar role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        LogService.error('useAuth', 'Erro ao buscar role', roleError);
      }

      const result = {
        profile: profile as Profile | null,
        role: (roleData?.role as AppRole) ?? 'vendedor'
      };
      
      LogService.info('useAuth', 'Dados do usuário carregados', { 
        hasProfile: !!result.profile, 
        role: result.role 
      });
      
      return result;
    } catch (error) {
      LogService.error('useAuth', 'Erro ao buscar dados do usuário', error);
      return { profile: null, role: 'vendedor' as AppRole };
    } finally {
      fetchingRef.current = false;
    }
  }, []); // Sem dependências - função estável

  // Inicializar autenticação
  useEffect(() => {
    mountedRef.current = true;
    LogService.info('useAuth', 'Inicializando autenticação');

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        
        LogService.info('useAuth', 'Auth state change', { event, hasSession: !!session });
        
        if (session?.user) {
          // Atualizar userId no LogService
          LogService.setUserId(session.user.id);
          
          const userData = await fetchUserData(session.user.id);
          
          if (!mountedRef.current) return;
          
          if (userData) {
            setState({
              user: session.user,
              session,
              profile: userData.profile,
              role: userData.role,
              isLoading: false,
              isAuthenticated: true,
            });
          }
        } else {
          LogService.setUserId(undefined);
          setState({
            user: null,
            session: null,
            profile: null,
            role: null,
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    );

    // Verificar sessão existente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mountedRef.current) return;
      
      LogService.info('useAuth', 'Sessão existente verificada', { hasSession: !!session });
      
      if (session?.user) {
        LogService.setUserId(session.user.id);
        const userData = await fetchUserData(session.user.id);
        
        if (!mountedRef.current) return;
        
        if (userData) {
          setState({
            user: session.user,
            session,
            profile: userData.profile,
            role: userData.role,
            isLoading: false,
            isAuthenticated: true,
          });
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      LogService.debug('useAuth', 'Cleanup executado');
    };
  }, [fetchUserData]);

  // Login - memoizado
  const login = useCallback(async (email: string, password: string) => {
    LogService.info('useAuth', 'Tentativa de login', { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      LogService.error('useAuth', 'Erro no login', { error: error.message });
      throw error;
    }
    
    LogService.info('useAuth', 'Login bem-sucedido', { userId: data.user?.id });
    return data;
  }, []);

  // Registro - memoizado
  const register = useCallback(async (email: string, password: string, fullName: string) => {
    LogService.info('useAuth', 'Tentativa de registro', { email, fullName });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      LogService.error('useAuth', 'Erro no registro', { error: error.message });
      throw error;
    }
    
    LogService.info('useAuth', 'Registro bem-sucedido', { userId: data.user?.id });
    return data;
  }, []);

  // Logout - memoizado
  const logout = useCallback(async () => {
    LogService.info('useAuth', 'Logout iniciado');
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      LogService.error('useAuth', 'Erro no logout', { error: error.message });
      throw error;
    }
    
    LogService.info('useAuth', 'Logout bem-sucedido');
    navigate('/login');
  }, [navigate]);

  // Verificar se usuário tem determinada role - memoizado
  const hasRole = useCallback((requiredRole: AppRole): boolean => {
    if (!state.role) return false;
    
    const roleHierarchy: Record<AppRole, number> = {
      vendedor: 1,
      coordenador: 2,
      gerente: 3,
      diretor: 4,
      admin: 5,
    };

    return roleHierarchy[state.role] >= roleHierarchy[requiredRole];
  }, [state.role]);

  // Verificar se pode aprovar - memoizado
  const canApprove = useCallback((requiredRole: AppRole): boolean => {
    return hasRole(requiredRole);
  }, [hasRole]);

  // Retornar objeto memoizado para evitar re-renders desnecessários
  return useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    hasRole,
    canApprove,
  }), [state, login, register, logout, hasRole, canApprove]);
}
