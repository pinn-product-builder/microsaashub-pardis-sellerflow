create table if not exists public.vtex_skus (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  vtex_sku_id bigint not null unique,
  vtex_product_id bigint,
  name text,
  is_active boolean,
  ean text,
  ref_id text,

  raw jsonb
);

create index if not exists vtex_skus_vtex_product_id_idx on public.vtex_skus(vtex_product_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_vtex_skus_updated_at on public.vtex_skus;
create trigger trg_vtex_skus_updated_at
before update on public.vtex_skus
for each row execute function public.set_updated_at();
