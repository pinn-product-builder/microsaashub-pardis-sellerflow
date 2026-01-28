-- Relaciona uma cotação duplicada à sua cotação de origem (rastreabilidade)
alter table public.vtex_quotes
  add column if not exists duplicated_from_quote_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vtex_quotes_duplicated_from_quote_id_fkey'
  ) then
    alter table public.vtex_quotes
      add constraint vtex_quotes_duplicated_from_quote_id_fkey
      foreign key (duplicated_from_quote_id)
      references public.vtex_quotes(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_vtex_quotes_duplicated_from
  on public.vtex_quotes(duplicated_from_quote_id);

