import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Profile, UserRole, AppRole } from '@/types/pardis';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Buscar perfil e role do usuário
  const fetchUserData = useCallback(async (userId: string) => {
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

      return {
        profile: profile as Profile | null,
        role: (roleData?.role as AppRole) ?? 'vendedor'
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return { profile: null, role: 'vendedor' as AppRole };
    }
  }, []);

  // Inicializar autenticação
  useEffect(() => {
    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { profile, role } = await fetchUserData(session.user.id);
          setState({
            user: session.user,
            session,
            profile,
            role,
            isLoading: false,
            isAuthenticated: true,
          });
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
      if (session?.user) {
        const { profile, role } = await fetchUserData(session.user.id);
        setState({
          user: session.user,
          session,
          profile,
          role,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  // Login
  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  };

  // Registro
  const register = async (email: string, password: string, fullName: string) => {
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

    if (error) throw error;
    return data;
  };

  // Logout
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    navigate('/login');
  };

  // Verificar se usuário tem determinada role
  const hasRole = (requiredRole: AppRole): boolean => {
    if (!state.role) return false;
    
    const roleHierarchy: Record<AppRole, number> = {
      vendedor: 1,
      coordenador: 2,
      gerente: 3,
      diretor: 4,
      admin: 5,
    };

    return roleHierarchy[state.role] >= roleHierarchy[requiredRole];
  };

  // Verificar se pode aprovar
  const canApprove = (requiredRole: AppRole): boolean => {
    return hasRole(requiredRole);
  };

  return {
    ...state,
    login,
    register,
    logout,
    hasRole,
    canApprove,
  };
}
