export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  module: string;
  is_active: boolean;
  created_at: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupPermission {
  id: string;
  group_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserGroupMembership {
  id: string;
  user_id: string;
  group_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface UserPermission {
  id: string;
  user_id: string;
  permission_id: string;
  granted: boolean;
  created_at: string;
}

export interface UserWithDetails {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  region: string | null;
  is_active: boolean;
  created_at: string;
  groups: UserGroup[];
  role: string | null;
}

export interface GroupWithPermissions extends UserGroup {
  permissions: Permission[];
  member_count: number;
}

export const PERMISSION_MODULES = {
  auth: 'Autenticação',
  users: 'Usuários',
  quotes: 'Cotações',
  customers: 'Clientes',
  products: 'Produtos',
  config: 'Configurações',
} as const;

export type PermissionModule = keyof typeof PERMISSION_MODULES;
