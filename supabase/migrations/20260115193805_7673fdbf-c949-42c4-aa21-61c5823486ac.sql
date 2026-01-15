-- Criar tabela de regras fiscais
CREATE TABLE public.tax_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uf VARCHAR(2) NOT NULL UNIQUE,
  uf_name VARCHAR(50) NOT NULL,
  region VARCHAR(20) NOT NULL DEFAULT 'BR',
  icms DECIMAL(5,2) NOT NULL DEFAULT 18,
  ipi DECIMAL(5,2) NOT NULL DEFAULT 5,
  pis DECIMAL(5,2) NOT NULL DEFAULT 1.65,
  cofins DECIMAL(5,2) NOT NULL DEFAULT 7.6,
  icms_st_margin DECIMAL(5,2) DEFAULT NULL,
  fcp DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos podem ler, apenas admins podem modificar
CREATE POLICY "Todos podem visualizar regras fiscais"
  ON public.tax_rules FOR SELECT
  USING (true);

CREATE POLICY "Admins podem inserir regras fiscais"
  ON public.tax_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'diretor')
    )
  );

CREATE POLICY "Admins podem atualizar regras fiscais"
  ON public.tax_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'diretor')
    )
  );

CREATE POLICY "Admins podem deletar regras fiscais"
  ON public.tax_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'diretor')
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_tax_rules_updated_at
  BEFORE UPDATE ON public.tax_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais de todos os estados brasileiros
INSERT INTO public.tax_rules (uf, uf_name, region, icms, ipi, pis, cofins, fcp) VALUES
  -- Sudeste
  ('SP', 'São Paulo', 'Sudeste', 18, 5, 1.65, 7.6, 0),
  ('RJ', 'Rio de Janeiro', 'Sudeste', 20, 5, 1.65, 7.6, 2),
  ('MG', 'Minas Gerais', 'Sudeste', 18, 5, 1.65, 7.6, 2),
  ('ES', 'Espírito Santo', 'Sudeste', 17, 5, 1.65, 7.6, 2),
  -- Sul
  ('RS', 'Rio Grande do Sul', 'Sul', 17, 5, 1.65, 7.6, 0),
  ('SC', 'Santa Catarina', 'Sul', 17, 5, 1.65, 7.6, 0),
  ('PR', 'Paraná', 'Sul', 19, 5, 1.65, 7.6, 0),
  -- Nordeste
  ('BA', 'Bahia', 'Nordeste', 19, 5, 1.65, 7.6, 2),
  ('PE', 'Pernambuco', 'Nordeste', 18, 5, 1.65, 7.6, 2),
  ('CE', 'Ceará', 'Nordeste', 18, 5, 1.65, 7.6, 2),
  ('MA', 'Maranhão', 'Nordeste', 18, 5, 1.65, 7.6, 2),
  ('PB', 'Paraíba', 'Nordeste', 18, 5, 1.65, 7.6, 2),
  ('RN', 'Rio Grande do Norte', 'Nordeste', 18, 5, 1.65, 7.6, 2),
  ('PI', 'Piauí', 'Nordeste', 18, 5, 1.65, 7.6, 2),
  ('AL', 'Alagoas', 'Nordeste', 18, 5, 1.65, 7.6, 2),
  ('SE', 'Sergipe', 'Nordeste', 18, 5, 1.65, 7.6, 2),
  -- Centro-Oeste
  ('GO', 'Goiás', 'Centro-Oeste', 17, 5, 1.65, 7.6, 2),
  ('DF', 'Distrito Federal', 'Centro-Oeste', 18, 5, 1.65, 7.6, 2),
  ('MT', 'Mato Grosso', 'Centro-Oeste', 17, 5, 1.65, 7.6, 2),
  ('MS', 'Mato Grosso do Sul', 'Centro-Oeste', 17, 5, 1.65, 7.6, 2),
  -- Norte
  ('AM', 'Amazonas', 'Norte', 18, 5, 1.65, 7.6, 2),
  ('PA', 'Pará', 'Norte', 17, 5, 1.65, 7.6, 2),
  ('RO', 'Rondônia', 'Norte', 17.5, 5, 1.65, 7.6, 2),
  ('AC', 'Acre', 'Norte', 17, 5, 1.65, 7.6, 2),
  ('RR', 'Roraima', 'Norte', 17, 5, 1.65, 7.6, 2),
  ('AP', 'Amapá', 'Norte', 18, 5, 1.65, 7.6, 2),
  ('TO', 'Tocantins', 'Norte', 18, 5, 1.65, 7.6, 2);