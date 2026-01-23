-- Compat/stub: garante que vw_vtex_sku_effective_price_policy1 exista ANTES de
-- search_catalog_include_price.sql. A migration "real" (vtex_effective_prices_policy1)
-- irá substituir esta view depois com a lógica completa de fallback.

create or replace view public.vw_vtex_sku_effective_price_policy1 as
select
  s.vtex_sku_id,
  '1'::text as trade_policy_id,
  1::int as quantity,
  coalesce(
    c.selling_price,
    c.list_price,
    c.base_price,
    f.fixed_value
  ) as effective_price,
  case
    when c.selling_price is not null then 'computed'
    when f.fixed_value is not null then 'fixed'
    when c.list_price is not null then 'list'
    when c.base_price is not null then 'base'
    else 'missing'
  end as price_source,
  c.selling_price,
  f.fixed_value,
  c.list_price,
  c.base_price,
  c.cost_price,
  c.price_valid_until
from (
  select distinct vtex_sku_id
  from public.vtex_sku_prices
) s
left join lateral (
  select selling_price, list_price, base_price, cost_price, price_valid_until
  from public.vtex_sku_prices
  where vtex_sku_id = s.vtex_sku_id
    and price_type = 'computed'
    and trade_policy_id = '1'
  limit 1
) c on true
left join lateral (
  select fixed_value
  from public.vtex_sku_prices
  where vtex_sku_id = s.vtex_sku_id
    and price_type = 'fixed'
    and trade_policy_id = '1'
    and coalesce(min_quantity, 0) <= 1
  order by coalesce(min_quantity, 0) desc
  limit 1
) f on true;

grant select on public.vw_vtex_sku_effective_price_policy1 to anon, authenticated;

