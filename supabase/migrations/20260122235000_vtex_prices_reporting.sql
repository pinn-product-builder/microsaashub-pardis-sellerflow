-- Relatórios de preços VTEX por trade policy (policy)
-- Objetivo: inspecionar rapidamente quais policies existem e extrair todos os preços do banco por policy.

-- 1) Visão de cobertura por policy
create or replace view public.vw_vtex_trade_policy_stats as
select
  trade_policy_id,
  count(*) filter (where price_type = 'computed')::bigint as computed_rows,
  count(*) filter (where price_type = 'fixed')::bigint as fixed_rows,
  count(*) filter (where price_type = 'base')::bigint as base_rows,
  count(distinct vtex_sku_id)::bigint as distinct_skus,
  count(distinct vtex_sku_id) filter (
    where
      (price_type = 'computed' and coalesce(selling_price, 0) > 0)
      or (price_type = 'fixed' and coalesce(fixed_value, 0) > 0)
      or (price_type = 'base' and (coalesce(base_price, 0) > 0 or coalesce(list_price, 0) > 0))
  )::bigint as skus_with_any_price
from public.vtex_sku_prices
where trade_policy_id is not null
  and btrim(trade_policy_id) <> ''
group by trade_policy_id
order by trade_policy_id;

grant select on public.vw_vtex_trade_policy_stats to anon, authenticated;

-- 2) Lista preços por policy (paginado)
create or replace function public.list_vtex_prices_by_policy(
  trade_policy_id text,
  lim int default 200,
  off int default 0
)
returns table (
  vtex_sku_id bigint,
  trade_policy_id text,
  price_type text,
  min_quantity int,
  selling_price numeric,
  fixed_value numeric,
  list_price numeric,
  base_price numeric,
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
  p.price_type,
  p.min_quantity,
  p.selling_price,
  p.fixed_value,
  p.list_price,
  p.base_price,
  p.cost_price,
  p.price_valid_until,
  p.updated_at
from public.vtex_sku_prices p
where p.trade_policy_id = list_vtex_prices_by_policy.trade_policy_id
order by
  p.vtex_sku_id asc,
  case p.price_type when 'computed' then 0 when 'fixed' then 1 else 2 end,
  p.min_quantity asc
limit greatest(lim, 1)
offset greatest(off, 0);
$$;

grant execute on function public.list_vtex_prices_by_policy(text, int, int) to anon, authenticated;

-- 3) Lista policies encontradas para um SKU específico (debug)
create or replace function public.list_vtex_policies_for_sku(
  sku_id bigint
)
returns table (
  trade_policy_id text,
  has_computed boolean,
  has_fixed boolean,
  has_base boolean
)
language sql
stable
as $$
select
  trade_policy_id,
  bool_or(price_type = 'computed') as has_computed,
  bool_or(price_type = 'fixed') as has_fixed,
  bool_or(price_type = 'base') as has_base
from public.vtex_sku_prices
where vtex_sku_id = sku_id
group by trade_policy_id
order by trade_policy_id;
$$;

grant execute on function public.list_vtex_policies_for_sku(bigint) to anon, authenticated;

