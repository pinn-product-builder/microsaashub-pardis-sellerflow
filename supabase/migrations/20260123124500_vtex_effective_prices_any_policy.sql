-- Preço efetivo VTEX sem seleção manual de policy:
-- escolhe automaticamente uma policy com preço disponível por SKU e quantidade
-- prioridade: policy '1' -> '2' -> demais (ordem alfabética), e preferindo computed > fixed > list > base

drop function if exists public.get_vtex_effective_prices_any_policy(bigint[], int[]);
create or replace function public.get_vtex_effective_prices_any_policy(
  sku_ids bigint[],
  quantities int[] default null
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
    coalesce(quantities[i], 1) as quantity
  from generate_subscripts(sku_ids, 1) as s(i)
),
base_price as (
  select
    inp.vtex_sku_id,
    b.base_price,
    b.list_price as base_list_price,
    b.cost_price as base_cost_price
  from input inp
  left join lateral (
    select base_price, list_price, cost_price
    from public.vtex_sku_prices
    where vtex_sku_id = inp.vtex_sku_id
      and price_type = 'base'
      and trade_policy_id = 'base'
    limit 1
  ) b on true
),
best as (
  select
    inp.vtex_sku_id,
    inp.quantity,
    chosen.trade_policy_id,
    chosen.effective_price,
    chosen.price_source,
    chosen.selling_price,
    chosen.fixed_value,
    chosen.list_price,
    chosen.base_price,
    chosen.cost_price,
    chosen.price_valid_until
  from input inp
  left join lateral (
    with policies as (
      select distinct trade_policy_id
      from public.vtex_sku_prices
      where vtex_sku_id = inp.vtex_sku_id
        and trade_policy_id is not null
        and btrim(trade_policy_id) <> ''
        and trade_policy_id <> 'base'
    ),
    per_policy as (
      select
        p.trade_policy_id,
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
        c.price_valid_until::text as price_valid_until
      from policies p
      left join lateral (
        select selling_price, list_price, cost_price, price_valid_until
        from public.vtex_sku_prices
        where vtex_sku_id = inp.vtex_sku_id
          and price_type = 'computed'
          and trade_policy_id = p.trade_policy_id
        limit 1
      ) c on true
      left join lateral (
        select fixed_value, list_price
        from public.vtex_sku_prices
        where vtex_sku_id = inp.vtex_sku_id
          and price_type = 'fixed'
          and trade_policy_id = p.trade_policy_id
          and coalesce(min_quantity, 0) <= inp.quantity
        order by coalesce(min_quantity, 0) desc
        limit 1
      ) f on true
      left join lateral (
        select base_price, list_price, cost_price
        from public.vtex_sku_prices
        where vtex_sku_id = inp.vtex_sku_id
          and price_type = 'base'
          and trade_policy_id = 'base'
        limit 1
      ) b on true
    )
    select
      pp.trade_policy_id,
      pp.effective_price,
      pp.price_source,
      pp.selling_price,
      pp.fixed_value,
      pp.list_price,
      pp.base_price,
      pp.cost_price,
      pp.price_valid_until
    from per_policy pp
    where coalesce(pp.effective_price, 0) > 0
    order by
      case pp.trade_policy_id when '1' then 0 when '2' then 1 else 2 end,
      case pp.price_source when 'computed' then 0 when 'fixed' then 1 when 'list' then 2 when 'base' then 3 else 9 end,
      pp.trade_policy_id asc
    limit 1
  ) chosen on true
)
select
  inp.vtex_sku_id,
  inp.quantity,
  coalesce(best.trade_policy_id, 'base') as trade_policy_id,
  coalesce(
    best.effective_price,
    bp.base_price,
    bp.base_list_price
  ) as effective_price,
  coalesce(best.price_source, case when bp.base_price is not null then 'base' when bp.base_list_price is not null then 'list_base' else 'missing' end) as price_source,
  best.selling_price,
  best.fixed_value,
  coalesce(best.list_price, bp.base_list_price) as list_price,
  bp.base_price,
  coalesce(best.cost_price, bp.base_cost_price) as cost_price,
  best.price_valid_until
from input inp
left join best on best.vtex_sku_id = inp.vtex_sku_id and best.quantity = inp.quantity
left join base_price bp on bp.vtex_sku_id = inp.vtex_sku_id;
$$;

grant execute on function public.get_vtex_effective_prices_any_policy(bigint[], int[]) to anon, authenticated;

drop function if exists public.vtex_validate_cart_any_policy(bigint[], int[]);
create or replace function public.vtex_validate_cart_any_policy(
  sku_ids bigint[],
  quantities int[] default null
)
returns table (
  vtex_sku_id bigint,
  quantity int,
  trade_policy_id text,
  effective_price numeric,
  price_source text,
  available_quantity numeric,
  in_stock boolean,
  ok boolean,
  reason text
)
language sql
stable
as $$
with p as (
  select *
  from public.get_vtex_effective_prices_any_policy(sku_ids, quantities)
),
i as (
  select vtex_sku_id, available_quantity
  from public.vw_vtex_sku_inventory_agg
  where vtex_sku_id = any(sku_ids)
)
select
  p.vtex_sku_id,
  p.quantity,
  p.trade_policy_id,
  p.effective_price,
  p.price_source,
  coalesce(i.available_quantity, 0) as available_quantity,
  (coalesce(i.available_quantity, 0) >= p.quantity) as in_stock,
  (
    coalesce(p.effective_price, 0) > 0
    and coalesce(i.available_quantity, 0) >= p.quantity
  ) as ok,
  case
    when coalesce(p.effective_price, 0) <= 0 then 'missing_price'
    when coalesce(i.available_quantity, 0) < p.quantity then 'insufficient_stock'
    else null
  end as reason
from p
left join i on i.vtex_sku_id = p.vtex_sku_id;
$$;

grant execute on function public.vtex_validate_cart_any_policy(bigint[], int[]) to anon, authenticated;

