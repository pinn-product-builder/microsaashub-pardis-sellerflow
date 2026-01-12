
-- 1. Criar tabela de permissões
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    module TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Criar tabela de grupos de usuários
CREATE TABLE public.user_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Criar tabela de permissões por grupo
CREATE TABLE public.group_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(group_id, permission_id)
);

-- 4. Criar tabela de membros do grupo
CREATE TABLE public.user_group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, group_id)
);

-- 5. Criar tabela de permissões individuais do usuário (override)
CREATE TABLE public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, permission_id)
);

-- Habilitar RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies para permissions (leitura para todos autenticados)
CREATE POLICY "Authenticated users can view permissions"
ON public.permissions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage permissions"
ON public.permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policies para user_groups
CREATE POLICY "Authenticated users can view groups"
ON public.user_groups FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage groups"
ON public.user_groups FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policies para group_permissions
CREATE POLICY "Authenticated users can view group permissions"
ON public.group_permissions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage group permissions"
ON public.group_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policies para user_group_memberships
CREATE POLICY "Users can view their own memberships"
ON public.user_group_memberships FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage memberships"
ON public.user_group_memberships FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Policies para user_permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage user permissions"
ON public.user_permissions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at em user_groups
CREATE TRIGGER update_user_groups_updated_at
BEFORE UPDATE ON public.user_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar se usuário tem permissão
CREATE OR REPLACE FUNCTION public.user_has_permission(_user_id uuid, _permission_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Admin sempre tem todas as permissões
    SELECT CASE 
        WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin') THEN true
        -- Verifica permissão individual negada
        WHEN EXISTS (
            SELECT 1 FROM public.user_permissions up
            JOIN public.permissions p ON p.id = up.permission_id
            WHERE up.user_id = _user_id AND p.code = _permission_code AND up.granted = false
        ) THEN false
        -- Verifica permissão individual concedida
        WHEN EXISTS (
            SELECT 1 FROM public.user_permissions up
            JOIN public.permissions p ON p.id = up.permission_id
            WHERE up.user_id = _user_id AND p.code = _permission_code AND up.granted = true
        ) THEN true
        -- Verifica permissão via grupo
        WHEN EXISTS (
            SELECT 1 FROM public.user_group_memberships ugm
            JOIN public.group_permissions gp ON gp.group_id = ugm.group_id
            JOIN public.permissions p ON p.id = gp.permission_id
            WHERE ugm.user_id = _user_id AND p.code = _permission_code
        ) THEN true
        ELSE false
    END
$$;

-- Função para obter todas as permissões do usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(permission_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    -- Se for admin, retorna todas as permissões
    SELECT p.code
    FROM public.permissions p
    WHERE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
    
    UNION
    
    -- Permissões via grupo
    SELECT p.code
    FROM public.user_group_memberships ugm
    JOIN public.group_permissions gp ON gp.group_id = ugm.group_id
    JOIN public.permissions p ON p.id = gp.permission_id
    WHERE ugm.user_id = _user_id
    AND NOT EXISTS (
        SELECT 1 FROM public.user_permissions up
        WHERE up.user_id = _user_id AND up.permission_id = p.id AND up.granted = false
    )
    
    UNION
    
    -- Permissões individuais concedidas
    SELECT p.code
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id AND up.granted = true
$$;

-- Popular permissões padrão
INSERT INTO public.permissions (code, name, description, module) VALUES
-- Auth/Usuários
('auth.login', 'Fazer Login', 'Permissão para fazer login no sistema', 'auth'),
('users.view', 'Visualizar Usuários', 'Visualizar lista de usuários', 'users'),
('users.manage', 'Gerenciar Usuários', 'Criar, editar e desativar usuários', 'users'),
('groups.view', 'Visualizar Grupos', 'Visualizar grupos de usuários', 'users'),
('groups.manage', 'Gerenciar Grupos', 'Criar, editar grupos e atribuir permissões', 'users'),
-- Cotações
('quotes.view', 'Visualizar Cotações', 'Visualizar cotações próprias', 'quotes'),
('quotes.view_all', 'Visualizar Todas Cotações', 'Visualizar cotações de todos os vendedores', 'quotes'),
('quotes.create', 'Criar Cotações', 'Criar novas cotações', 'quotes'),
('quotes.edit', 'Editar Cotações', 'Editar cotações existentes', 'quotes'),
('quotes.delete', 'Excluir Cotações', 'Excluir cotações', 'quotes'),
('quotes.approve', 'Aprovar Cotações', 'Aprovar ou rejeitar cotações', 'quotes'),
('quotes.export', 'Exportar Cotações', 'Exportar cotações para PDF/Excel', 'quotes'),
-- Clientes
('customers.view', 'Visualizar Clientes', 'Visualizar lista de clientes', 'customers'),
('customers.manage', 'Gerenciar Clientes', 'Criar, editar e excluir clientes', 'customers'),
-- Produtos
('products.view', 'Visualizar Produtos', 'Visualizar lista de produtos', 'products'),
('products.manage', 'Gerenciar Produtos', 'Criar, editar e excluir produtos', 'products'),
-- Configurações
('config.view', 'Visualizar Configurações', 'Visualizar configurações do sistema', 'config'),
('config.manage', 'Gerenciar Configurações', 'Alterar configurações do sistema', 'config');

-- Popular grupos padrão
INSERT INTO public.user_groups (name, description, is_system) VALUES
('Administradores', 'Acesso total ao sistema', true),
('Diretores', 'Acesso gerencial completo com aprovações de alto nível', true),
('Gerentes', 'Gestão de equipes e aprovações intermediárias', true),
('Coordenadores', 'Supervisão de vendedores e aprovações básicas', true),
('Vendedores', 'Acesso às funcionalidades de vendas', true);

-- Atribuir permissões aos grupos
-- Administradores: todas as permissões (serão verificadas via role admin, mas adicionamos para consistência)
INSERT INTO public.group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM public.user_groups g
CROSS JOIN public.permissions p
WHERE g.name = 'Administradores';

-- Diretores: quase todas, exceto gerenciar usuários/grupos
INSERT INTO public.group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM public.user_groups g
CROSS JOIN public.permissions p
WHERE g.name = 'Diretores'
AND p.code NOT IN ('users.manage', 'groups.manage');

-- Gerentes: cotações completas, visualizar tudo
INSERT INTO public.group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM public.user_groups g
CROSS JOIN public.permissions p
WHERE g.name = 'Gerentes'
AND p.code IN ('auth.login', 'quotes.view', 'quotes.view_all', 'quotes.create', 'quotes.edit', 'quotes.approve', 'quotes.export', 'customers.view', 'customers.manage', 'products.view', 'config.view', 'users.view', 'groups.view');

-- Coordenadores: cotações básicas, visualizar clientes/produtos
INSERT INTO public.group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM public.user_groups g
CROSS JOIN public.permissions p
WHERE g.name = 'Coordenadores'
AND p.code IN ('auth.login', 'quotes.view', 'quotes.view_all', 'quotes.create', 'quotes.edit', 'quotes.export', 'customers.view', 'products.view', 'config.view');

-- Vendedores: operações básicas de vendas
INSERT INTO public.group_permissions (group_id, permission_id)
SELECT g.id, p.id
FROM public.user_groups g
CROSS JOIN public.permissions p
WHERE g.name = 'Vendedores'
AND p.code IN ('auth.login', 'quotes.view', 'quotes.create', 'quotes.edit', 'quotes.export', 'customers.view', 'products.view');

-- Migrar usuários existentes para grupos baseado na role atual
INSERT INTO public.user_group_memberships (user_id, group_id)
SELECT ur.user_id, ug.id
FROM public.user_roles ur
JOIN public.user_groups ug ON (
    (ur.role = 'admin' AND ug.name = 'Administradores') OR
    (ur.role = 'diretor' AND ug.name = 'Diretores') OR
    (ur.role = 'gerente' AND ug.name = 'Gerentes') OR
    (ur.role = 'coordenador' AND ug.name = 'Coordenadores') OR
    (ur.role = 'vendedor' AND ug.name = 'Vendedores')
)
ON CONFLICT (user_id, group_id) DO NOTHING;
