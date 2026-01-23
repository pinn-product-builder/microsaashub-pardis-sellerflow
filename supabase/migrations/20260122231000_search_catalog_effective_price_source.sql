-- search_catalog + view de catálogo com preço efetivo (policy 1) e fonte do preço
-- Objetivo: o front nunca “ficar sem preço” quando existir qualquer fallback (computed/fixed/list/base).

-- View consumível (join do catálogo com o preço efetivo qty=1)
create or replace view public.vw_vtex_catalog_policy1 as
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
  p.effective_price as selling_price,
  p.price_source,
  (p.effective_price is not null and p.effective_price > 0) as price_available
from public.mv_vtex_catalog c
left join public.vw_vtex_sku_effective_price_policy1 p
  on p.vtex_sku_id = c.vtex_sku_id;

grant select on public.vw_vtex_catalog_policy1 to anon, authenticated;

-- Atualiza a RPC search_catalog para retornar também price_source/price_available.
-- Mantém assinatura e compatibilidade: adiciona colunas ao retorno (no fim).
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
left join public.vw_vtex_sku_effective_price_policy1 pr
  on pr.vtex_sku_id = b.vtex_sku_id
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

grant execute on function public.search_catalog(int, int, boolean, text) to anon, authenticated;

