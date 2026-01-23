-- Lista trade_policy_id existentes na tabela de preços VTEX
-- Útil para UI permitir seleção além de "1" e "2" (ex: mgpmgclustere, mgbrclusterb, etc)

create or replace function public.list_vtex_trade_policies()
returns table (
  trade_policy_id text,
  computed_count bigint,
  fixed_count bigint
)
language sql
stable
as $$
select
  p.trade_policy_id,
  count(*) filter (where p.price_type = 'computed')::bigint as computed_count,
  count(*) filter (where p.price_type = 'fixed')::bigint as fixed_count
from public.vtex_sku_prices p
where p.trade_policy_id is not null
  and btrim(p.trade_policy_id) <> ''
  and p.trade_policy_id <> 'base'
group by p.trade_policy_id
order by p.trade_policy_id asc;
$$;

grant execute on function public.list_vtex_trade_policies() to anon, authenticated;

