-- Preço efetivo VTEX para o módulo de cotação:
-- prioridade: computed(selling_price) -> fixed(min_quantity<=qty) -> list_price -> base_price
-- policy padrão: 1 (trade_policy_id = '1')

-- View: preço efetivo para quantidade = 1 (bom para catálogo/busca)
create or replace view public.vw_vtex_sku_effective_price_policy1 as
select
  s.vtex_sku_id,
  '1'::text as trade_policy_id,
  1::int as quantity,
  coalesce(
    c.selling_price,
    f.fixed_value,
    c.list_price,
    f.list_price,
    b.base_price,
    b.list_price
  ) as effective_price,
  case
    when c.selling_price is not null then 'computed'
    when f.fixed_value is not null then 'fixed'
    when c.list_price is not null or f.list_price is not null then 'list'
    when b.base_price is not null then 'base'
    when b.list_price is not null then 'list_base'
    else 'missing'
  end as price_source,
  c.selling_price,
  f.fixed_value,
  coalesce(c.list_price, f.list_price, b.list_price) as list_price,
  b.base_price,
  coalesce(c.cost_price, b.cost_price) as cost_price,
  c.price_valid_until
from (
  select distinct vtex_sku_id
  from public.vtex_sku_prices
  where vtex_sku_id is not null
) s
left join lateral (
  select
    selling_price,
    list_price,
    cost_price,
    price_valid_until
  from public.vtex_sku_prices
  where vtex_sku_id = s.vtex_sku_id
    and price_type = 'computed'
    and trade_policy_id = '1'
  limit 1
) c on true
left join lateral (
  select
    fixed_value,
    list_price
  from public.vtex_sku_prices
  where vtex_sku_id = s.vtex_sku_id
    and price_type = 'fixed'
    and trade_policy_id = '1'
    and coalesce(min_quantity, 0) <= 1
  order by coalesce(min_quantity, 0) desc
  limit 1
) f on true
left join lateral (
  select
    base_price,
    list_price,
    cost_price
  from public.vtex_sku_prices
  where vtex_sku_id = s.vtex_sku_id
    and price_type = 'base'
    and trade_policy_id = 'base'
  limit 1
) b on true;

grant select on public.vw_vtex_sku_effective_price_policy1 to anon, authenticated;

-- RPC: retorna preço efetivo por SKU e quantidade (mantém cotação sempre com preço quando existir qualquer fallback)
create or replace function public.get_vtex_effective_prices(
  sku_ids bigint[],
  quantities int[] default null,
  trade_policy_id text default '1'
)
returns table (
  vtex_sku_id bigint,
  quantity int,
  trade_policy_id text,
  effective_price numeric,
  price_source text,
  selling_price numeric,
  fixed_value numeric,
  list_price numeric,
  base_price numeric,
  cost_price numeric,
  price_valid_until text
)
language sql
stable
as $$
with input as (
  select
    sku_ids[i] as vtex_sku_id,
    coalesce(quantities[i], 1) as quantity,
    trade_policy_id as trade_policy_id
  from generate_subscripts(sku_ids, 1) as s(i)
)
select
  inp.vtex_sku_id,
  inp.quantity,
  inp.trade_policy_id,
  coalesce(
    c.selling_price,
    f.fixed_value,
    c.list_price,
    f.list_price,
    b.base_price,
    b.list_price
  ) as effective_price,
  case
    when c.selling_price is not null then 'computed'
    when f.fixed_value is not null then 'fixed'
    when c.list_price is not null or f.list_price is not null then 'list'
    when b.base_price is not null then 'base'
    when b.list_price is not null then 'list_base'
    else 'missing'
  end as price_source,
  c.selling_price,
  f.fixed_value,
  coalesce(c.list_price, f.list_price, b.list_price) as list_price,
  b.base_price,
  coalesce(c.cost_price, b.cost_price) as cost_price,
  c.price_valid_until::text
from input inp
left join lateral (
  select
    selling_price,
    list_price,
    cost_price,
    price_valid_until
  from public.vtex_sku_prices
  where vtex_sku_id = inp.vtex_sku_id
    and price_type = 'computed'
    and trade_policy_id = inp.trade_policy_id
  limit 1
) c on true
left join lateral (
  select
    fixed_value,
    list_price
  from public.vtex_sku_prices
  where vtex_sku_id = inp.vtex_sku_id
    and price_type = 'fixed'
    and trade_policy_id = inp.trade_policy_id
    and coalesce(min_quantity, 0) <= inp.quantity
  order by coalesce(min_quantity, 0) desc
  limit 1
) f on true
left join lateral (
  select
    base_price,
    list_price,
    cost_price
  from public.vtex_sku_prices
  where vtex_sku_id = inp.vtex_sku_id
    and price_type = 'base'
    and trade_policy_id = 'base'
  limit 1
) b on true;
$$;

grant execute on function public.get_vtex_effective_prices(bigint[], int[], text) to anon, authenticated;

