-- vtex_quotes: campos usados pelo frontend
alter table if exists public.vtex_quotes
  add column if not exists notes text;

