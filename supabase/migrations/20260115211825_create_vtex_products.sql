create table if not exists public.vtex_products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  vtex_product_id bigint not null unique,
  name text,
  brand_id bigint,
  brand_name text,
  category_id bigint,
  is_active boolean,
  link_id text,

  raw jsonb
);

create index if not exists vtex_products_category_id_idx
  on public.vtex_products(category_id);

create index if not exists vtex_products_brand_id_idx
  on public.vtex_products(brand_id);

drop trigger if exists trg_vtex_products_updated_at on public.vtex_products;
create trigger trg_vtex_products_updated_at
before update on public.vtex_products
for each row execute function public.set_updated_at();
