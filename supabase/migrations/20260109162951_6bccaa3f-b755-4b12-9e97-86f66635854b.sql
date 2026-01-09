-- Corrigir policies de INSERT com WITH CHECK (true)
-- Estas tabelas devem permitir INSERT apenas para usuários autenticados

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert sync logs" ON public.integration_sync_log;

-- Recriar com autenticação verificada
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can insert sync logs" ON public.integration_sync_log 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);