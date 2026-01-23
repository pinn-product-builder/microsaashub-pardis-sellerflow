-- View + RPC para consumir preços VTEX (policy 1) de forma simples no app

create or replace view public.vw_vtex_sku_prices_policy1 as
select
  vtex_sku_id,
  trade_policy_id,
  selling_price,
  list_price,
  cost_price,
  price_valid_until,
  updated_at
from public.vtex_sku_prices
where price_type = 'computed'
  and trade_policy_id = '1';

-- Retorna preços (computed) por sku_ids e trade_policy_id (default = '1')
create or replace function public.get_vtex_prices_policy(
  sku_ids bigint[],
  trade_policy_id text default '1'
)
returns table (
  vtex_sku_id bigint,
  trade_policy_id text,
  selling_price numeric,
  list_price numeric,
  cost_price numeric,
  price_valid_until timestamptz,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    p.vtex_sku_id,
    p.trade_policy_id,
    p.selling_price,
    p.list_price,
    p.cost_price,
    p.price_valid_until,
    p.updated_at
  from public.vtex_sku_prices p
  where p.price_type = 'computed'
    and p.trade_policy_id = get_vtex_prices_policy.trade_policy_id
    and p.vtex_sku_id = any(get_vtex_prices_policy.sku_ids);
$$;

grant select on public.vw_vtex_sku_prices_policy1 to anon, authenticated;
grant execute on function public.get_vtex_prices_policy(bigint[], text) to anon, authenticated;

