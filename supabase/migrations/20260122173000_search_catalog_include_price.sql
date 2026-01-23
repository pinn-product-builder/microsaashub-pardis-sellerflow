-- Extender search_catalog para retornar preço (computed policy 1) junto do catálogo.
-- Mantém mesma assinatura de parâmetros, adiciona coluna no retorno.

drop function if exists public.search_catalog(int, int, boolean, text);
create or replace function public.search_catalog(
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
  selling_price numeric
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
  pr.effective_price as selling_price
from base b
left join public.vw_vtex_sku_effective_price_policy1 pr
  on pr.vtex_sku_id = b.vtex_sku_id
order by
  case when b.product_name is null then 1 else 0 end,
  case when b.score is null then 1 else 0 end,
  case when b.product_name like '%' || (select qn from params) || '%' then 0 else 1 end,
  b.score desc nulls last,
  b.product_name asc nulls last,
  b.sku_name asc nulls last
limit greatest(lim,1)
offset greatest(off,0);
$$;

grant execute on function public.search_catalog(int, int, boolean, text) to anon, authenticated;

