-- ===========================================
-- FASE 1: TIPOS E ENUMS
-- ===========================================

-- Enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('vendedor', 'coordenador', 'gerente', 'diretor', 'admin');

-- Enum para região
CREATE TYPE public.region_type AS ENUM ('MG', 'BR');

-- Enum para status de cotação
CREATE TYPE public.quote_status AS ENUM ('draft', 'calculated', 'pending_approval', 'approved', 'rejected', 'sent', 'expired', 'converted');

-- Enum para status de aprovação
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Enum para prioridade
CREATE TYPE public.priority_level AS ENUM ('low', 'medium', 'high', 'critical');

-- ===========================================
-- FASE 2: TABELA DE PERFIS E ROLES
-- ===========================================

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    region region_type DEFAULT 'MG',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de roles de usuário (separada para segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'vendedor',
    UNIQUE (user_id, role)
);

-- ===========================================
-- FASE 3: TABELAS DE CADASTRO
-- ===========================================

-- Tabela de clientes
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT, -- ID do sistema externo (VTEX/Datasul)
    cnpj TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    trade_name TEXT,
    uf TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    is_lab_to_lab BOOLEAN DEFAULT false,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    tax_regime TEXT,
    state_registration TEXT,
    available_payment_terms TEXT[] DEFAULT ARRAY['À vista'],
    price_table_type TEXT DEFAULT 'BR', -- 'MG' ou 'BR'
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT, -- ID do sistema externo
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit TEXT DEFAULT 'UN',
    base_cost DECIMAL(15,4) NOT NULL,
    price_mg DECIMAL(15,4), -- Preço tabela MG
    price_br DECIMAL(15,4), -- Preço tabela BR
    price_minimum DECIMAL(15,4), -- Preço mínimo
    stock_quantity INTEGER DEFAULT 0,
    stock_min_expiry DATE, -- Menor validade (MIN)
    campaign_name TEXT, -- Nome da campanha ativa
    campaign_discount DECIMAL(5,2) DEFAULT 0, -- Desconto campanha %
    responsible_user_id UUID,
    status TEXT DEFAULT 'active', -- active, blocked, obsolete
    ncm TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- FASE 4: TABELAS DE CONFIGURAÇÃO
-- ===========================================

-- Configuração de pricing por região
CREATE TABLE public.pricing_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region region_type NOT NULL UNIQUE,
    admin_percent DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    logistics_percent DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    icms_percent DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    pis_cofins_percent DECIMAL(5,2) NOT NULL DEFAULT 3.65,
    lab_to_lab_discount DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configurações padrão
INSERT INTO public.pricing_config (region, admin_percent, logistics_percent, icms_percent, pis_cofins_percent) VALUES
    ('MG', 8.00, 5.00, 18.00, 3.65),
    ('BR', 8.00, 12.00, 20.00, 3.65);

-- Regras de aprovação
CREATE TABLE public.approval_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    margin_min DECIMAL(5,2), -- Margem mínima (null = sem limite)
    margin_max DECIMAL(5,2), -- Margem máxima (null = sem limite)
    approver_role app_role NOT NULL,
    sla_hours INTEGER DEFAULT 24,
    priority priority_level DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir regras padrão
INSERT INTO public.approval_rules (name, margin_min, margin_max, approver_role, sla_hours, priority) VALUES
    ('Margem >= 0% - Automático', 0, null, 'vendedor', 0, 'low'),
    ('Margem -5% a 0% - Coordenador', -5, 0, 'coordenador', 24, 'medium'),
    ('Margem -10% a -5% - Gerente', -10, -5, 'gerente', 48, 'high'),
    ('Margem < -10% - Diretor', null, -10, 'diretor', 72, 'critical');

-- Condições de pagamento
CREATE TABLE public.payment_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    days INTEGER NOT NULL DEFAULT 0,
    adjustment_percent DECIMAL(5,2) DEFAULT 0, -- positivo = acréscimo, negativo = desconto
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir condições padrão
INSERT INTO public.payment_conditions (name, days, adjustment_percent) VALUES
    ('À vista', 0, 0),
    ('7 dias', 7, 0),
    ('14 dias', 14, 0.5),
    ('21 dias', 21, 1.0),
    ('28 dias', 28, 1.5),
    ('30 dias', 30, 2.0),
    ('45 dias', 45, 3.0),
    ('60 dias', 60, 4.0);

-- Configuração de validade de proposta
CREATE TABLE public.quote_validity_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_days INTEGER NOT NULL DEFAULT 7,
    expiry_message TEXT DEFAULT 'Esta proposta é válida até a data especificada.',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.quote_validity_config (default_days, expiry_message) VALUES
    (7, 'Esta proposta é válida por 7 dias a partir da data de emissão.');

-- ===========================================
-- FASE 5: TABELAS DE COTAÇÃO
-- ===========================================

-- Tabela principal de cotações
CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number TEXT NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    status quote_status NOT NULL DEFAULT 'draft',
    
    -- Totais
    subtotal DECIMAL(15,2) DEFAULT 0,
    total_discount DECIMAL(15,2) DEFAULT 0,
    total_offered DECIMAL(15,2) DEFAULT 0,
    total_margin_value DECIMAL(15,2) DEFAULT 0,
    total_margin_percent DECIMAL(5,2) DEFAULT 0,
    coupon_value DECIMAL(15,2) DEFAULT 0, -- Valor do cupom VTEX
    
    -- Condições
    payment_condition_id UUID REFERENCES public.payment_conditions(id),
    valid_until DATE NOT NULL,
    notes TEXT,
    
    -- Status de autorização
    is_authorized BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false,
    
    -- Metadados
    vtex_order_id TEXT, -- ID do pedido na VTEX quando convertido
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens da cotação
CREATE TABLE public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) NOT NULL,
    
    -- Quantidades e preços
    quantity INTEGER NOT NULL DEFAULT 1,
    list_price DECIMAL(15,4) NOT NULL, -- Preço de tabela
    cluster_price DECIMAL(15,4), -- Preço cluster (-1% L2L)
    minimum_price DECIMAL(15,4), -- Preço mínimo
    offered_price DECIMAL(15,4) NOT NULL, -- Preço ofertado
    
    -- Totais do item
    total_list DECIMAL(15,2) NOT NULL,
    total_offered DECIMAL(15,2) NOT NULL,
    
    -- Margem
    margin_value DECIMAL(15,2) DEFAULT 0,
    margin_percent DECIMAL(5,2) DEFAULT 0,
    is_authorized BOOLEAN DEFAULT false,
    
    -- Estoque
    stock_available INTEGER DEFAULT 0,
    stock_min_expiry DATE,
    
    -- Campanha
    campaign_name TEXT,
    campaign_discount DECIMAL(5,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- FASE 6: TABELA DE APROVAÇÕES
-- ===========================================

CREATE TABLE public.approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
    rule_id UUID REFERENCES public.approval_rules(id),
    
    requested_by UUID REFERENCES auth.users(id) NOT NULL,
    approved_by UUID REFERENCES auth.users(id),
    
    status approval_status NOT NULL DEFAULT 'pending',
    priority priority_level DEFAULT 'medium',
    
    -- Valores no momento da solicitação
    quote_total DECIMAL(15,2),
    quote_margin_percent DECIMAL(5,2),
    
    reason TEXT,
    comments TEXT,
    
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- FASE 7: TABELAS DE AUDITORIA E LOGS
-- ===========================================

-- Trilha de auditoria
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Log de sincronização de integrações
CREATE TABLE public.integration_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_type TEXT NOT NULL, -- 'vtex', 'datasul'
    entity_type TEXT NOT NULL, -- 'products', 'customers', 'stock', 'prices'
    status TEXT NOT NULL, -- 'success', 'error', 'partial'
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===========================================
-- FASE 8: FUNÇÕES DE SEGURANÇA
-- ===========================================

-- Função para verificar se usuário tem role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Função para obter a role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1
$$;

-- Função para verificar se usuário pode aprovar (hierarquia)
CREATE OR REPLACE FUNCTION public.can_approve(_user_id UUID, _required_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND (
            ur.role = 'admin'
            OR ur.role = 'diretor'
            OR (ur.role = 'gerente' AND _required_role IN ('gerente', 'coordenador', 'vendedor'))
            OR (ur.role = 'coordenador' AND _required_role IN ('coordenador', 'vendedor'))
          )
    )
$$;

-- ===========================================
-- FASE 9: TRIGGERS
-- ===========================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pricing_config_updated_at BEFORE UPDATE ON public.pricing_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_approval_rules_updated_at BEFORE UPDATE ON public.approval_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_conditions_updated_at BEFORE UPDATE ON public.payment_conditions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON public.approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
    
    -- Criar role padrão de vendedor
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'vendedor');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para gerar número da cotação
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    year_prefix TEXT;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 6) AS INTEGER)), 0) + 1
    INTO next_number
    FROM public.quotes
    WHERE quote_number LIKE year_prefix || '-%';
    
    NEW.quote_number := year_prefix || '-' || LPAD(next_number::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_quote_number_trigger
    BEFORE INSERT ON public.quotes
    FOR EACH ROW
    WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
    EXECUTE FUNCTION public.generate_quote_number();

-- ===========================================
-- FASE 10: RLS POLICIES
-- ===========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_validity_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_log ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES (somente admin pode gerenciar)
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- CUSTOMERS (todos autenticados podem ver)
CREATE POLICY "Authenticated can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update L2L flag" ON public.customers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- PRODUCTS (todos autenticados podem ver)
CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update campaign fields" ON public.products FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- PRICING_CONFIG (todos podem ver, admin pode editar)
CREATE POLICY "Authenticated can view pricing config" ON public.pricing_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage pricing config" ON public.pricing_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- APPROVAL_RULES (todos podem ver, admin pode editar)
CREATE POLICY "Authenticated can view approval rules" ON public.approval_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage approval rules" ON public.approval_rules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PAYMENT_CONDITIONS (todos podem ver, admin pode editar)
CREATE POLICY "Authenticated can view payment conditions" ON public.payment_conditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage payment conditions" ON public.payment_conditions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- QUOTE_VALIDITY_CONFIG
CREATE POLICY "Authenticated can view validity config" ON public.quote_validity_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage validity config" ON public.quote_validity_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- QUOTES (vendedor vê próprias, aprovadores veem pendentes, admin vê tudo)
CREATE POLICY "Users can view own quotes" ON public.quotes FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can create quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own quotes" ON public.quotes FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Admins can view all quotes" ON public.quotes FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Managers can view pending quotes" ON public.quotes FOR SELECT USING (
    status = 'pending_approval' AND (
        public.has_role(auth.uid(), 'coordenador') OR
        public.has_role(auth.uid(), 'gerente') OR
        public.has_role(auth.uid(), 'diretor')
    )
);

-- QUOTE_ITEMS (segue a mesma lógica da quote)
CREATE POLICY "Users can manage own quote items" ON public.quote_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.quotes WHERE quotes.id = quote_items.quote_id AND quotes.created_by = auth.uid())
);
CREATE POLICY "Admins can manage all quote items" ON public.quote_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- APPROVAL_REQUESTS
CREATE POLICY "Users can view own approval requests" ON public.approval_requests FOR SELECT USING (auth.uid() = requested_by);
CREATE POLICY "Users can create approval requests" ON public.approval_requests FOR INSERT WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "Approvers can view pending requests" ON public.approval_requests FOR SELECT USING (
    status = 'pending' AND (
        public.has_role(auth.uid(), 'coordenador') OR
        public.has_role(auth.uid(), 'gerente') OR
        public.has_role(auth.uid(), 'diretor') OR
        public.has_role(auth.uid(), 'admin')
    )
);
CREATE POLICY "Approvers can update pending requests" ON public.approval_requests FOR UPDATE USING (
    status = 'pending' AND (
        public.has_role(auth.uid(), 'coordenador') OR
        public.has_role(auth.uid(), 'gerente') OR
        public.has_role(auth.uid(), 'diretor') OR
        public.has_role(auth.uid(), 'admin')
    )
);

-- AUDIT_LOGS (somente admin pode ver)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- INTEGRATION_SYNC_LOG (somente admin pode ver)
CREATE POLICY "Admins can view sync logs" ON public.integration_sync_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert sync logs" ON public.integration_sync_log FOR INSERT TO authenticated WITH CHECK (true);

-- ===========================================
-- FASE 11: ÍNDICES PARA PERFORMANCE
-- ===========================================

CREATE INDEX idx_customers_cnpj ON public.customers(cnpj);
CREATE INDEX idx_customers_uf ON public.customers(uf);
CREATE INDEX idx_customers_is_lab_to_lab ON public.customers(is_lab_to_lab);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_created_by ON public.quotes(created_by);
CREATE INDEX idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX idx_quotes_created_at ON public.quotes(created_at);
CREATE INDEX idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_approval_requests_quote_id ON public.approval_requests(quote_id);