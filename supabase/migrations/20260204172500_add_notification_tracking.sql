-- Migração para suporte a notificações e alertas de SLA
-- Cliente: Hermes Pardini / Fleury

-- 1. Adicionar campos de controle de notificação na tabela de solicitações
ALTER TABLE public.vtex_approval_requests 
ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sla_warning_sent BOOLEAN DEFAULT false;

-- 2. Tabela para logs de notificações (opcional, mas recomendado para auditoria)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES public.vtex_approval_requests(id) ON DELETE CASCADE,
    notified_user_id UUID REFERENCES auth.users(id),
    type TEXT NOT NULL, -- 'new_pending', 'sla_warning', 'sla_expired'
    sent_at TIMESTAMPTZ DEFAULT now(),
    recipient_email TEXT NOT NULL,
    status TEXT DEFAULT 'sent'
);

-- 3. Índices para performance no monitoramento de SLA
CREATE INDEX IF NOT EXISTS idx_vtex_approval_requests_expires_at ON public.vtex_approval_requests(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_vtex_approval_requests_sla_warning ON public.vtex_approval_requests(sla_warning_sent) WHERE status = 'pending';

-- 4. Permissões
GRANT ALL ON public.notification_logs TO service_role;
GRANT SELECT ON public.notification_logs TO authenticated;
