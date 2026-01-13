import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Profile, AppRole } from '@/types/pardis';

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
  const authCallbackRef = useRef<((success: boolean) => void) | null>(null);

  // Buscar perfil e role do usuário
  const fetchUserData = useCallback(async (userId: string) => {
    // Prevenir chamadas duplicadas
    if (fetchingRef.current) {
      return null;
    }
    
    fetchingRef.current = true;
    
    try {
      // Buscar perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Buscar role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      const result = {
        profile: profile as Profile | null,
        role: (roleData?.role as AppRole) ?? 'vendedor'
      };
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return { profile: null, role: 'vendedor' as AppRole };
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Inicializar autenticação - APENAS UMA VEZ
  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    
    initializedRef.current = true;
    mountedRef.current = true;

    // Listener de mudanças de auth - ÚNICO para toda a aplicação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        
        if (session?.user) {
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
              
              // Notificar callback pendente de login
              if (authCallbackRef.current) {
                authCallbackRef.current(true);
                authCallbackRef.current = null;
              }
            }
          }, 0);
        } else {
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
      
      if (session?.user) {
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
    };
  }, [fetchUserData]);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
    
    // Aguardar o estado ser atualizado pelo onAuthStateChange
    return new Promise<typeof data>((resolve, reject) => {
      const timeout = setTimeout(() => {
        authCallbackRef.current = null;
        reject(new Error('Timeout ao aguardar autenticação'));
      }, 10000); // 10s timeout de segurança
      
      authCallbackRef.current = (success) => {
        clearTimeout(timeout);
        if (success) {
          resolve(data);
        } else {
          reject(new Error('Falha na autenticação'));
        }
      };
    });
  }, []);

  // Registro
  const register = useCallback(async (email: string, password: string, fullName: string) => {
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
      throw error;
    }
    
    return data;
  }, []);

  // Logout - SEM navegação automática
  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
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