-- Migração para suporte a múltiplos níveis de aprovação (Alçadas)
-- Cliente: Hermes Pardini / Fleury

-- 1. Tabela de Passos (Steps) de Aprovação por Regra
CREATE TABLE IF NOT EXISTS public.approval_rule_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.approval_rules(id) ON DELETE CASCADE NOT NULL,
    approver_role public.app_role NOT NULL,
    step_order INT NOT NULL, -- 1, 2, 3...
    sla_hours INT DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(rule_id, step_order)
);

-- 2. Ajustes na tabela de solicitações para rastrear o fluxo
ALTER TABLE public.vtex_approval_requests 
ADD COLUMN IF NOT EXISTS current_step_order INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_steps INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_request_id UUID REFERENCES public.vtex_approval_requests(id);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_vtex_approval_rule_steps_rule_id ON public.approval_rule_steps(rule_id);
CREATE INDEX IF NOT EXISTS idx_vtex_approval_requests_parent_id ON public.vtex_approval_requests(parent_request_id);

-- 4. Permissões
GRANT ALL ON public.approval_rule_steps TO authenticated;
GRANT SELECT ON public.approval_rule_steps TO anon;
GRANT ALL ON public.approval_rule_steps TO service_role;

-- 5. Seed de exemplo para a regra crítica (Diretor)
-- Vamos fazer com que a regra de Diretor (< -10%) agora precise de 3 níveis: Coordenador -> Gerente -> Diretor
DO $$
DECLARE
    diretor_rule_id UUID;
    gerente_rule_id UUID;
    coordenador_rule_id UUID;
BEGIN
    SELECT id INTO diretor_rule_id FROM public.approval_rules WHERE approver_role = 'diretor' LIMIT 1;
    SELECT id INTO gerente_rule_id FROM public.approval_rules WHERE approver_role = 'gerente' LIMIT 1;
    SELECT id INTO coordenador_rule_id FROM public.approval_rules WHERE approver_role = 'coordenador' LIMIT 1;

    -- Regra Diretor: 3 níveis
    IF diretor_rule_id IS NOT NULL THEN
        INSERT INTO public.approval_rule_steps (rule_id, approver_role, step_order, sla_hours) VALUES
        (diretor_rule_id, 'coordenador', 1, 24),
        (diretor_rule_id, 'gerente', 2, 48),
        (diretor_rule_id, 'diretor', 3, 72)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Regra Gerente: 2 níveis
    IF gerente_rule_id IS NOT NULL THEN
        INSERT INTO public.approval_rule_steps (rule_id, approver_role, step_order, sla_hours) VALUES
        (gerente_rule_id, 'coordenador', 1, 24),
        (gerente_rule_id, 'gerente', 2, 48)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Regra Coordenador: 1 nível
    IF coordenador_rule_id IS NOT NULL THEN
        INSERT INTO public.approval_rule_steps (rule_id, approver_role, step_order, sla_hours) VALUES
        (coordenador_rule_id, 'coordenador', 1, 24)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
