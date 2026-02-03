-- Tabela para configurar o horário comercial do SLA
CREATE TABLE IF NOT EXISTS public.vtex_business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL DEFAULT '08:00',
    end_time TIME NOT NULL DEFAULT '18:00',
    is_open BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(day_of_week)
);

-- Dados iniciais: Segunda a Sexta, 08:00 às 18:00
INSERT INTO public.vtex_business_hours (day_of_week, start_time, end_time, is_open) VALUES
(1, '08:00', '18:00', true), -- Segunda
(2, '08:00', '18:00', true), -- Terça
(3, '08:00', '18:00', true), -- Quarta
(4, '08:00', '18:00', true), -- Quinta
(5, '08:00', '18:00', true), -- Sexta
(6, '00:00', '00:00', false), -- Sábado
(0, '00:00', '00:00', false) -- Domingo
ON CONFLICT (day_of_week) DO NOTHING;

-- Permissões para o frontend e Edge Functions
GRANT ALL ON public.vtex_business_hours TO authenticated;
GRANT SELECT ON public.vtex_business_hours TO anon;
GRANT ALL ON public.vtex_business_hours TO service_role;
