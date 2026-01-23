-- Função utilitária para atualizar o materialized view do catálogo após sync
-- (mv_vtex_catalog alimenta search_catalog / search_catalog_any_policy).

create or replace function public.refresh_mv_vtex_catalog()
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view public.mv_vtex_catalog;
end;
$$;

-- Não expor para o público; o refresh pode ser caro.
revoke all on function public.refresh_mv_vtex_catalog() from public;
grant execute on function public.refresh_mv_vtex_catalog() to service_role;

