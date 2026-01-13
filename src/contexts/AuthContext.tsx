import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
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

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, password: string, fullName: string) => Promise<any>;
  logout: () => Promise<void>;
  hasRole: (requiredRole: AppRole) => boolean;
  canApprove: (requiredRole: AppRole) => boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  profile: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);

  // Buscar perfil e role do usuário
  const fetchUserData = useCallback(async (userId: string) => {
    // Prevenir chamadas duplicadas
    if (fetchingRef.current) {
      LogService.debug('AuthContext', 'fetchUserData ignorado - já em execução');
      return null;
    }
    
    fetchingRef.current = true;
    LogService.info('AuthContext', 'Buscando dados do usuário', { userId });
    
    try {
      // Buscar perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        LogService.error('AuthContext', 'Erro ao buscar perfil', profileError);
      }

      // Buscar role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        LogService.error('AuthContext', 'Erro ao buscar role', roleError);
      }

      const result = {
        profile: profile as Profile | null,
        role: (roleData?.role as AppRole) ?? 'vendedor'
      };
      
      LogService.info('AuthContext', 'Dados do usuário carregados', { 
        hasProfile: !!result.profile, 
        role: result.role 
      });
      
      return result;
    } catch (error) {
      LogService.error('AuthContext', 'Erro ao buscar dados do usuário', error);
      return { profile: null, role: 'vendedor' as AppRole };
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Inicializar autenticação - APENAS UMA VEZ
  useEffect(() => {
    if (initializedRef.current) {
      LogService.debug('AuthContext', 'Já inicializado, ignorando');
      return;
    }
    
    initializedRef.current = true;
    mountedRef.current = true;
    LogService.info('AuthContext', 'Inicializando autenticação (ÚNICA VEZ)');

    // Listener de mudanças de auth - ÚNICO para toda a aplicação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        
        LogService.info('AuthContext', 'Auth state change', { event, hasSession: !!session });
        
        if (session?.user) {
          // Atualizar userId no LogService
          LogService.setUserId(session.user.id);
          
          // Usar setTimeout para evitar deadlock com Supabase
          setTimeout(async () => {
            if (!mountedRef.current) return;
            
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
          }, 0);
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
      
      LogService.info('AuthContext', 'Sessão existente verificada', { hasSession: !!session });
      
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
      LogService.debug('AuthContext', 'Cleanup executado');
    };
  }, [fetchUserData]);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    LogService.info('AuthContext', 'Tentativa de login', { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      LogService.error('AuthContext', 'Erro no login', { error: error.message });
      throw error;
    }
    
    LogService.info('AuthContext', 'Login bem-sucedido', { userId: data.user?.id });
    return data;
  }, []);

  // Registro
  const register = useCallback(async (email: string, password: string, fullName: string) => {
    LogService.info('AuthContext', 'Tentativa de registro', { email, fullName });
    
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
      LogService.error('AuthContext', 'Erro no registro', { error: error.message });
      throw error;
    }
    
    LogService.info('AuthContext', 'Registro bem-sucedido', { userId: data.user?.id });
    return data;
  }, []);

  // Logout - SEM navegação automática
  const logout = useCallback(async () => {
    LogService.info('AuthContext', 'Logout iniciado');
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      LogService.error('AuthContext', 'Erro no logout', { error: error.message });
      throw error;
    }
    
    LogService.info('AuthContext', 'Logout bem-sucedido');
    // Navegação será feita pelo componente que chama logout
  }, []);

  // Verificar se usuário tem determinada role
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

  // Verificar se pode aprovar
  const canApprove = useCallback((requiredRole: AppRole): boolean => {
    return hasRole(requiredRole);
  }, [hasRole]);

  // Valor do contexto memoizado
  const value = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    hasRole,
    canApprove,
  }), [state, login, register, logout, hasRole, canApprove]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
