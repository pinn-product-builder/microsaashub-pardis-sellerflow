-- Tornar idempotente: só faz rename se a coluna antiga existir.
-- Em ambientes onde o schema já foi ajustado manualmente (ou migrations anteriores),
-- esta migration não deve quebrar o reset.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vtex_clients'
      and column_name = 'firstname'
  ) then
    -- Se company_name ainda não existir, renomeia.
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'vtex_clients'
        and column_name = 'company_name'
    ) then
      execute 'alter table public.vtex_clients rename column firstname to company_name';
    end if;
  end if;
end $$;
