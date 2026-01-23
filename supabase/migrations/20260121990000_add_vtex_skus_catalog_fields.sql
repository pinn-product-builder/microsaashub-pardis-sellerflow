-- Compat: campos usados pela busca de catálogo (mv_vtex_catalog / search_catalog)
-- Em ambientes novos (Supabase Cloud), a tabela public.vtex_skus (init) não tinha esses campos.

alter table if exists public.vtex_skus
  add column if not exists embalagem text,
  add column if not exists gramatura text;

