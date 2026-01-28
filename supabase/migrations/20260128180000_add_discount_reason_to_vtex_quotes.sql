-- Justificativa obrigatória do desconto
alter table public.vtex_quotes
  add column if not exists discount_reason text;
