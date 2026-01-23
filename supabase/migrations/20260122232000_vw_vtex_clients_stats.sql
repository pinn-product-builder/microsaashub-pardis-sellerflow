-- Stats globais de clientes VTEX (para UI não depender de carregar todos os registros)

create or replace view public.vw_vtex_clients_stats as
select
  count(*)::bigint as total,
  count(*) filter (where is_active is true)::bigint as active,
  count(*) filter (where is_lab_to_lab is true)::bigint as l2l,
  count(distinct upper(uf)) filter (where uf is not null and btrim(uf) <> '')::bigint as states
from public.vtex_clients;

grant select on public.vw_vtex_clients_stats to anon, authenticated;

