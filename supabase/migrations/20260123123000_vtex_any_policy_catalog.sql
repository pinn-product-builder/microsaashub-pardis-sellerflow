-- Catálogo/Preço VTEX sem seleção manual de policy:
-- - escolhe automaticamente a "melhor policy disponível" por SKU (prioridade: 1 -> 2 -> demais)
-- - permite também demonstrar todos os preços por policy (matriz de preços)

-- 1) View: preço efetivo por SKU e policy (qty=1)
create or replace view public.vw_vtex_sku_effective_price_all_policies as
with policies as (
  select distinct
    vtex_sku_id,
    trade_policy_id
  from public.vtex_sku_prices
  where trade_policy_id is not null
    and btrim(trade_policy_id) <> ''
    and trade_policy_id <> 'base'
)
select
  p.vtex_sku_id,
  p.trade_policy_id,
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
from policies p
left join lateral (
  select selling_price, list_price, cost_price, price_valid_until
  from public.vtex_sku_prices
  where vtex_sku_id = p.vtex_sku_id
    and price_type = 'computed'
    and trade_policy_id = p.trade_policy_id
  limit 1
) c on true
left join lateral (
  select fixed_value, list_price
  from public.vtex_sku_prices
  where vtex_sku_id = p.vtex_sku_id
    and price_type = 'fixed'
    and trade_policy_id = p.trade_policy_id
    and coalesce(min_quantity, 0) <= 1
  order by coalesce(min_quantity, 0) desc
  limit 1
) f on true
left join lateral (
  select base_price, list_price, cost_price
  from public.vtex_sku_prices
  where vtex_sku_id = p.vtex_sku_id
    and price_type = 'base'
    and trade_policy_id = 'base'
  limit 1
) b on true;

grant select on public.vw_vtex_sku_effective_price_all_policies to anon, authenticated;

-- 2) RPC: busca catálogo SEM policy manual (retorna o melhor preço + policy escolhida)
drop function if exists public.search_catalog_any_policy(int, int, boolean, text);
create or replace function public.search_catalog_any_policy(
  lim int default 50,
  off int default 0,
  only_active boolean default true,
  q text default ''
)
returns table (
  vtex_sku_id int,
  vtex_product_id int,
  product_name text,
  sku_name text,
  ean text,
  ref_id text,
  embalagem text,
  gramatura text,
  is_active boolean,
  score real,
  selling_price numeric,
  price_source text,
  trade_policy_id text,
  price_available boolean,
  available_quantity numeric,
  in_stock boolean
)
language sql
stable
as $$
with params as (
  select public.vtex_norm(coalesce(q,'')) as qn
),
base as (
  select
    c.vtex_sku_id,
    c.vtex_product_id,
    c.product_name,
    c.sku_name,
    c.ean,
    c.ref_id,
    c.embalagem,
    c.gramatura,
    c.is_active,
    similarity(c.search_text, p.qn)::real as score
  from public.mv_vtex_catalog c
  cross join params p
  where
    (not only_active or c.is_active is distinct from false)
    and (
      p.qn = ''
      or c.search_text like '%' || p.qn || '%'
      or c.search_text % p.qn
    )
),
best as (
  select
    b.vtex_sku_id,
    bp.trade_policy_id,
    bp.effective_price,
    bp.price_source
  from base b
  left join lateral (
    select
      trade_policy_id,
      effective_price,
      price_source
    from public.vw_vtex_sku_effective_price_all_policies ap
    where ap.vtex_sku_id = b.vtex_sku_id
      and coalesce(ap.effective_price, 0) > 0
    order by
      case ap.trade_policy_id when '1' then 0 when '2' then 1 else 2 end,
      ap.trade_policy_id asc
    limit 1
  ) bp on true
)
select
  b.*,
  best.effective_price as selling_price,
  best.price_source,
  best.trade_policy_id,
  (best.effective_price is not null and best.effective_price > 0) as price_available,
  inv.available_quantity,
  (coalesce(inv.available_quantity, 0) > 0) as in_stock
from base b
left join best on best.vtex_sku_id = b.vtex_sku_id
left join public.vw_vtex_sku_inventory_agg inv
  on inv.vtex_sku_id = b.vtex_sku_id
order by
  (best.effective_price is not null and best.effective_price > 0) desc,
  case when b.product_name is null then 1 else 0 end,
  case when b.score is null then 1 else 0 end,
  case when b.product_name like '%' || (select qn from params) || '%' then 0 else 1 end,
  b.score desc nulls last,
  b.product_name asc nulls last,
  b.sku_name asc nulls last
limit greatest(lim,1)
offset greatest(off,0);
$$;

grant execute on function public.search_catalog_any_policy(int, int, boolean, text) to anon, authenticated;

-- 3) RPC: matriz de preços por policy para N SKUs (para "demonstrar todos os preços")
drop function if exists public.get_vtex_prices_matrix(bigint[]);
create or replace function public.get_vtex_prices_matrix(
  sku_ids bigint[]
)
returns table (
  vtex_sku_id bigint,
  prices jsonb
)
language sql
stable
as $$
select
  ap.vtex_sku_id,
  jsonb_agg(
    jsonb_build_object(
      'tradePolicyId', ap.trade_policy_id,
      'effectivePrice', ap.effective_price,
      'priceSource', ap.price_source,
      'sellingPrice', ap.selling_price,
      'fixedValue', ap.fixed_value,
      'listPrice', ap.list_price,
      'basePrice', ap.base_price,
      'costPrice', ap.cost_price,
      'priceValidUntil', ap.price_valid_until
    )
    order by case ap.trade_policy_id when '1' then 0 when '2' then 1 else 2 end, ap.trade_policy_id
  ) as prices
from public.vw_vtex_sku_effective_price_all_policies ap
where ap.vtex_sku_id = any(sku_ids)
group by ap.vtex_sku_id;
$$;

grant execute on function public.get_vtex_prices_matrix(bigint[]) to anon, authenticated;

