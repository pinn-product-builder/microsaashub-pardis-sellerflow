-- Estoque VTEX por SKU (Logistics)
-- Objetivo: expor "estoque disponível" no catálogo e na cotação, e suportar sync incremental.

create table if not exists public.vtex_sku_inventory (
  id bigserial primary key,
  vtex_sku_id bigint not null,
  warehouse_id text not null,
  warehouse_name text null,
  total_quantity numeric null,
  reserved_quantity numeric null,
  available_quantity numeric null,
  updated_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb
);

create unique index if not exists ux_vtex_sku_inventory_sku_wh
  on public.vtex_sku_inventory(vtex_sku_id, warehouse_id);

create index if not exists idx_vtex_sku_inventory_sku
  on public.vtex_sku_inventory(vtex_sku_id);

-- Agregação por SKU (para catálogos/consultas rápidas)
create or replace view public.vw_vtex_sku_inventory_agg as
select
  vtex_sku_id,
  coalesce(sum(total_quantity), 0) as total_quantity,
  coalesce(sum(reserved_quantity), 0) as reserved_quantity,
  coalesce(sum(available_quantity), 0) as available_quantity,
  max(updated_at) as last_sync_at
from public.vtex_sku_inventory
group by vtex_sku_id;

grant select on public.vtex_sku_inventory to anon, authenticated;
grant select on public.vw_vtex_sku_inventory_agg to anon, authenticated;

