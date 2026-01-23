-- RPC alternativa para testar catálogo com qualquer trade_policy_id (ex.: '2')
-- Usa get_vtex_effective_prices (qty=1) em join lateral, mantendo paginação e ranking.

drop function if exists public.search_catalog_policy(int, int, boolean, text, text);
create or replace function public.search_catalog_policy(
  lim int default 50,
  off int default 0,
  only_active boolean default true,
  q text default '',
  trade_policy_id text default '1'
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
  price_available boolean
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
)
select
  b.*,
  pr.effective_price as selling_price,
  pr.price_source,
  (pr.effective_price is not null and pr.effective_price > 0) as price_available
from base b
left join lateral (
  select
    effective_price,
    price_source
  from public.get_vtex_effective_prices(
    array[b.vtex_sku_id::bigint],
    array[1],
    trade_policy_id
  )
  limit 1
) pr on true
order by
  (pr.effective_price is not null and pr.effective_price > 0) desc,
  case when b.product_name is null then 1 else 0 end,
  case when b.score is null then 1 else 0 end,
  case when b.product_name like '%' || (select qn from params) || '%' then 0 else 1 end,
  b.score desc nulls last,
  b.product_name asc nulls last,
  b.sku_name asc nulls last
limit greatest(lim,1)
offset greatest(off,0);
$$;

grant execute on function public.search_catalog_policy(int, int, boolean, text, text) to anon, authenticated;

