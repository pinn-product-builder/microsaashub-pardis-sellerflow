-- Migração para suporte a aprovadores suplentes e detecção de ausência
-- Data: 2026-02-10

-- 1. Adicionar colunas de aprovador primário e suplente à tabela de passos
ALTER TABLE public.approval_rule_steps 
ADD COLUMN IF NOT EXISTS primary_approver_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS substitute_approver_id UUID REFERENCES auth.users(id);

-- 2. Tabela de ausências/férias
CREATE TABLE IF NOT EXISTS public.user_absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    reason TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- 3. Ajustes na tabela de solicitações para rastreabilidade de redirecionamento
ALTER TABLE public.vtex_approval_requests 
ADD COLUMN IF NOT EXISTS is_redirected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS redirected_from_user_id UUID REFERENCES auth.users(id);

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_absences_user_id ON public.user_absences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_absences_dates ON public.user_absences(start_date, end_date);

-- 5. Permissões RLS para user_absences
ALTER TABLE public.user_absences ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias ausências
CREATE POLICY "Users can view own absences" 
ON public.user_absences FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Usuários podem gerenciar suas próprias ausências
CREATE POLICY "Users can manage own absences" 
ON public.user_absences FOR ALL 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins podem ver tudo
CREATE POLICY "Admins can view all absences" 
ON public.user_absences FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- 6. Garantir permissões de acesso
GRANT ALL ON public.user_absences TO authenticated;
GRANT ALL ON public.user_absences TO service_role;
