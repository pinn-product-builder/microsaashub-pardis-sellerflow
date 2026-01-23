-- Extensões necessárias (local geralmente permite)
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- Normalização (não precisa ser immutable se você indexa a coluna pronta)
create or replace function public.vtex_norm(t text)
returns text
language sql
stable
as $$
  select regexp_replace(
    lower(public.unaccent(coalesce(t,''))::text),
    '\s+',
    ' ',
    'g'
  );
$$;

-- Materialized view para busca rápida
-- Se existir alguma view dependente (ex.: vw_vtex_catalog_policy1), remove antes para permitir recriar o MV.
drop view if exists public.vw_vtex_catalog_policy1;
drop materialized view if exists public.mv_vtex_catalog;

create materialized view public.mv_vtex_catalog as
select
  s.vtex_sku_id,
  s.vtex_product_id,
  p.name as product_name,
  s.name as sku_name,
  s.ean,
  s.ref_id,
  s.embalagem,
  s.gramatura,
  s.is_active,
  p.brand_id,
  p.category_id,
  p.link_id,
  public.vtex_norm(concat_ws(' ',
    coalesce(p.name,''),
    coalesce(s.name,''),
    coalesce(s.ean,''),
    coalesce(s.ref_id,''),
    s.vtex_sku_id::text,
    s.vtex_product_id::text,
    coalesce(s.embalagem,''),
    coalesce(s.gramatura,'')
  )) as search_text
from public.vtex_skus s
join public.vtex_products p
  on p.vtex_product_id = s.vtex_product_id;

create index if not exists idx_mv_vtex_catalog_sku_id on public.mv_vtex_catalog(vtex_sku_id);
create index if not exists idx_mv_vtex_catalog_product_id on public.mv_vtex_catalog(vtex_product_id);

create index if not exists idx_mv_vtex_catalog_search_trgm
on public.mv_vtex_catalog
using gin (search_text gin_trgm_ops);

-- RPC que o front está chamando
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
  score real
)
language sql
stable
as $$
with params as (
  select public.vtex_norm(coalesce(q,'')) as qn
)
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
order by
  case when c.search_text like '%' || p.qn || '%' then 0 else 1 end,
  similarity(c.search_text, p.qn) desc,
  c.product_name asc nulls last,
  c.sku_name asc nulls last
limit greatest(lim,1)
offset greatest(off,0);
$$;

-- Permissões para o front (anon/authenticated)
grant execute on function public.search_catalog(int, int, boolean, text) to anon, authenticated;
grant select on public.mv_vtex_catalog to anon, authenticated;

