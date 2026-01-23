-- Tabela de preços VTEX por SKU e trade policy (política comercial)
-- Fonte: Pricing API (/api/pricing/prices/{skuId} e /computed)

create table if not exists public.vtex_sku_prices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  vtex_sku_id bigint not null,

  -- tradePolicyId retornado pela VTEX (ou "base" para o payload base do /prices/{skuId})
  trade_policy_id text not null,

  -- base | fixed | computed
  price_type text not null check (price_type in ('base','fixed','computed')),

  -- para preços fixos por quantidade mínima; para base/computed fica 0
  min_quantity int not null default 0,

  -- campos comuns
  list_price numeric(14,2) null,
  cost_price numeric(14,2) null,
  selling_price numeric(14,2) null,
  base_price numeric(14,2) null,
  markup numeric(14,6) null,

  -- valor do fixedPrice (quando price_type='fixed')
  fixed_value numeric(14,2) null,

  price_valid_until timestamptz null,

  raw jsonb not null default '{}'::jsonb,

  constraint uq_vtex_sku_prices unique (vtex_sku_id, trade_policy_id, price_type, min_quantity)
);

create index if not exists idx_vtex_sku_prices_sku on public.vtex_sku_prices(vtex_sku_id);
create index if not exists idx_vtex_sku_prices_trade_policy on public.vtex_sku_prices(trade_policy_id);
create index if not exists idx_vtex_sku_prices_type on public.vtex_sku_prices(price_type);

-- updated_at trigger (idempotente)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_vtex_sku_prices_updated_at on public.vtex_sku_prices;
create trigger trg_vtex_sku_prices_updated_at
before update on public.vtex_sku_prices
for each row execute function public.set_updated_at();

