
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User, RegisterData } from '@/types/auth';

// Mock users for demonstration
const mockUsers = [
  {
    id: '1',
    email: 'admin@pardis.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin' as const,
    permissions: ['cpq', 'checkout', 'analytics', 'admin']
  },
  {
    id: '2',
    email: 'comercial@pardis.com',
    password: 'comercial123',
    name: 'Gerente Comercial',
    role: 'comercial' as const,
    permissions: ['cpq', 'checkout', 'analytics']
  },
  {
    id: '3',
    email: 'vendedor@pardis.com',
    password: 'vendedor123',
    name: 'Vendedor',
    role: 'vendedor' as const,
    permissions: ['cpq']
  }
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser = mockUsers.find(
          u => u.email === email && u.password === password
        );
        
        if (mockUser) {
          const { password: _, ...user } = mockUser;
          set({ 
            user: user as User, 
            isAuthenticated: true, 
            isLoading: false 
          });
          return true;
        }
        
        set({ isLoading: false });
        return false;
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if user already exists
        const existingUser = mockUsers.find(u => u.email === data.email);
        if (existingUser) {
          set({ isLoading: false });
          return false;
        }
        
        // Create new user
        const newUser: User = {
          id: String(mockUsers.length + 1),
          email: data.email,
          name: data.name,
          role: 'vendedor',
          permissions: ['cpq']
        };
        
        set({ 
          user: newUser, 
          isAuthenticated: true, 
          isLoading: false 
        });
        return true;
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false 
        });
      },

      forgotPassword: async (email: string) => {
        set({ isLoading: true });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const userExists = mockUsers.find(u => u.email === email);
        set({ isLoading: false });
        
        return !!userExists;
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        set({ isLoading: false });
        return true;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
);
