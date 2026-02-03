-- =============================================================================
-- MIGRATION: Quote Attachments Support
-- Criado em: 2026-02-03
-- Descrição: Adiciona suporte para upload de documentos comprobatórios
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CRIAR TABELA DE ANEXOS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vtex_quote_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.vtex_quotes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'xlsx', 'sheets', 'other')),
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 10485760), -- Max 10MB
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  
  CONSTRAINT valid_file_name CHECK (length(file_name) > 0),
  CONSTRAINT valid_file_url CHECK (length(file_url) > 0)
);

-- Índices para performance
CREATE INDEX idx_vtex_quote_attachments_quote_id ON public.vtex_quote_attachments(quote_id);
CREATE INDEX idx_vtex_quote_attachments_uploaded_by ON public.vtex_quote_attachments(uploaded_by);
CREATE INDEX idx_vtex_quote_attachments_uploaded_at ON public.vtex_quote_attachments(uploaded_at DESC);

-- Comentários
COMMENT ON TABLE public.vtex_quote_attachments IS 'Anexos de cotações (documentos comprobatórios de preço da concorrência)';
COMMENT ON COLUMN public.vtex_quote_attachments.file_type IS 'Tipo do arquivo: pdf, xlsx, sheets, other';
COMMENT ON COLUMN public.vtex_quote_attachments.file_size IS 'Tamanho do arquivo em bytes (máx 10MB)';

-- -----------------------------------------------------------------------------
-- 2. RLS (ROW LEVEL SECURITY)
-- -----------------------------------------------------------------------------

ALTER TABLE public.vtex_quote_attachments ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem visualizar anexos de cotações que têm acesso
CREATE POLICY "Authenticated users can view attachments"
  ON public.vtex_quote_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vtex_quotes q
      WHERE q.id = vtex_quote_attachments.quote_id
    )
  );

-- Política: Usuários podem fazer upload de anexos em suas próprias cotações
CREATE POLICY "Users can upload attachments to their quotes"
  ON public.vtex_quote_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vtex_quotes q
      WHERE q.id = vtex_quote_attachments.quote_id
      AND q.created_by = auth.uid()
    )
  );

-- Política: Usuários podem deletar seus próprios anexos
CREATE POLICY "Users can delete their own attachments"
  ON public.vtex_quote_attachments
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- -----------------------------------------------------------------------------
-- 3. GRANTS
-- -----------------------------------------------------------------------------

GRANT SELECT, INSERT, DELETE ON public.vtex_quote_attachments TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. STORAGE BUCKET (via SQL - alternativa ao dashboard)
-- -----------------------------------------------------------------------------

-- Nota: O bucket 'quote-attachments' deve ser criado manualmente no Supabase Dashboard
-- ou via API. Esta migration apenas documenta a configuração esperada:
--
-- Bucket Name: quote-attachments
-- Public: false
-- File Size Limit: 10MB
-- Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
--
-- Políticas de Storage:
-- 1. SELECT: authenticated users
-- 2. INSERT: authenticated users (max 10MB)
-- 3. DELETE: owner only

-- -----------------------------------------------------------------------------
-- 5. FUNÇÃO HELPER PARA LISTAR ANEXOS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_quote_attachments(p_quote_id UUID)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_type TEXT,
  file_url TEXT,
  file_size INTEGER,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ,
  description TEXT,
  uploader_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.file_name,
    a.file_type,
    a.file_url,
    a.file_size,
    a.uploaded_by,
    a.uploaded_at,
    a.description,
    COALESCE(p.full_name, u.email) as uploader_name
  FROM public.vtex_quote_attachments a
  LEFT JOIN auth.users u ON u.id = a.uploaded_by
  LEFT JOIN public.profiles p ON p.user_id = a.uploaded_by
  WHERE a.quote_id = p_quote_id
  ORDER BY a.uploaded_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_quote_attachments(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_quote_attachments IS 'Lista todos os anexos de uma cotação com informações do uploader';
