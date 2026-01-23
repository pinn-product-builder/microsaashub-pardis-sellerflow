-- Fluxo VTEX: Cotações -> Validação (preço/estoque) -> Aprovação -> Envio VTEX
-- Observação: Mantém o schema legado (quotes/customers/products) intacto.

-- =========================================
-- 1) Tabelas: vtex_quotes / vtex_quote_items
-- =========================================

create table if not exists public.vtex_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number bigint generated always as identity,

  -- vtex_clients usa md_id (Master Data CL) como PK (text)
  vtex_client_id text not null references public.vtex_clients(md_id),
  destination_uf text,
  trade_policy_id text not null default '1',

  status public.quote_status not null default 'draft',

  subtotal numeric(14,2) not null default 0,
  total_discount numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  total_margin_percent numeric(7,4),

  requires_approval boolean not null default false,
  is_authorized boolean not null default false,

  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),

  vtex_order_form_id text,
  vtex_order_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vtex_quotes_client on public.vtex_quotes(vtex_client_id);
create index if not exists idx_vtex_quotes_status on public.vtex_quotes(status);
create index if not exists idx_vtex_quotes_created_at on public.vtex_quotes(created_at desc);

create table if not exists public.vtex_quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.vtex_quotes(id) on delete cascade,

  vtex_sku_id bigint not null,
  quantity int not null check (quantity > 0),

  unit_price numeric(14,2),
  price_source text,

  available_quantity numeric,
  in_stock boolean,

  line_total numeric(14,2),

  -- snapshot do catálogo no momento da cotação (nome, ean, etc)
  snapshot jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_vtex_quote_items_quote_sku unique (quote_id, vtex_sku_id)
);

create index if not exists idx_vtex_quote_items_quote on public.vtex_quote_items(quote_id);
create index if not exists idx_vtex_quote_items_sku on public.vtex_quote_items(vtex_sku_id);

-- updated_at helper (reusa o existente se já houver)
do $$
begin
  if not exists (
    select 1
    from pg_proc
    where proname = 'set_updated_at'
      and pg_function_is_visible(oid)
  ) then
    create or replace function public.set_updated_at()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end $$;

drop trigger if exists trg_vtex_quotes_updated_at on public.vtex_quotes;
create trigger trg_vtex_quotes_updated_at
before update on public.vtex_quotes
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_vtex_quote_items_updated_at on public.vtex_quote_items;
create trigger trg_vtex_quote_items_updated_at
before update on public.vtex_quote_items
for each row execute procedure public.set_updated_at();

-- =========================================
-- 2) Histórico/status: vtex_quote_events
-- =========================================

create table if not exists public.vtex_quote_events (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.vtex_quotes(id) on delete cascade,

  event_type text not null, -- status_change | validation | approval | vtex_send | note
  from_status public.quote_status,
  to_status public.quote_status,
  message text,
  payload jsonb not null default '{}'::jsonb,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_vtex_quote_events_quote on public.vtex_quote_events(quote_id, created_at desc);

-- =========================================
-- 3) Aprovações VTEX: vtex_approval_requests
-- =========================================

create table if not exists public.vtex_approval_requests (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.vtex_quotes(id) on delete cascade,

  rule_id uuid references public.approval_rules(id),
  requested_by uuid references auth.users(id) not null,
  approved_by uuid references auth.users(id),

  status public.approval_status not null default 'pending',
  priority public.priority_level default 'medium',

  quote_total numeric(15,2),
  quote_margin_percent numeric(7,4),

  reason text,
  comments text,

  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vtex_approval_requests_status on public.vtex_approval_requests(status, requested_at desc);
create index if not exists idx_vtex_approval_requests_quote on public.vtex_approval_requests(quote_id);

drop trigger if exists trg_vtex_approval_requests_updated_at on public.vtex_approval_requests;
create trigger trg_vtex_approval_requests_updated_at
before update on public.vtex_approval_requests
for each row execute procedure public.set_updated_at();

-- =========================================
-- 4) RPC: valida carrinho (preço efetivo + estoque)
-- =========================================

create or replace function public.vtex_validate_cart(
  sku_ids bigint[],
  quantities int[] default null,
  trade_policy_id text default '1'
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
  from public.get_vtex_effective_prices(sku_ids, quantities, trade_policy_id)
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

grant execute on function public.vtex_validate_cart(bigint[], int[], text) to anon, authenticated;

-- =========================================
-- 5) RLS (simples): leitura autenticada, escrita do dono
-- =========================================

alter table public.vtex_quotes enable row level security;
alter table public.vtex_quote_items enable row level security;
alter table public.vtex_quote_events enable row level security;
alter table public.vtex_approval_requests enable row level security;

drop policy if exists "vtex_quotes_read_auth" on public.vtex_quotes;
create policy "vtex_quotes_read_auth"
on public.vtex_quotes for select
using (auth.role() = 'authenticated');

drop policy if exists "vtex_quotes_write_own" on public.vtex_quotes;
create policy "vtex_quotes_write_own"
on public.vtex_quotes for insert
with check (created_by = auth.uid());

drop policy if exists "vtex_quotes_update_own" on public.vtex_quotes;
create policy "vtex_quotes_update_own"
on public.vtex_quotes for update
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "vtex_quote_items_read_auth" on public.vtex_quote_items;
create policy "vtex_quote_items_read_auth"
on public.vtex_quote_items for select
using (auth.role() = 'authenticated');

drop policy if exists "vtex_quote_items_write_own" on public.vtex_quote_items;
create policy "vtex_quote_items_write_own"
on public.vtex_quote_items for insert
with check (exists (select 1 from public.vtex_quotes q where q.id = quote_id and q.created_by = auth.uid()));

drop policy if exists "vtex_quote_items_update_own" on public.vtex_quote_items;
create policy "vtex_quote_items_update_own"
on public.vtex_quote_items for update
using (exists (select 1 from public.vtex_quotes q where q.id = quote_id and q.created_by = auth.uid()))
with check (exists (select 1 from public.vtex_quotes q where q.id = quote_id and q.created_by = auth.uid()));

drop policy if exists "vtex_quote_events_read_auth" on public.vtex_quote_events;
create policy "vtex_quote_events_read_auth"
on public.vtex_quote_events for select
using (auth.role() = 'authenticated');

drop policy if exists "vtex_quote_events_write_auth" on public.vtex_quote_events;
create policy "vtex_quote_events_write_auth"
on public.vtex_quote_events for insert
with check (auth.role() = 'authenticated');

drop policy if exists "vtex_approval_requests_read_auth" on public.vtex_approval_requests;
create policy "vtex_approval_requests_read_auth"
on public.vtex_approval_requests for select
using (auth.role() = 'authenticated');

drop policy if exists "vtex_approval_requests_write_auth" on public.vtex_approval_requests;
create policy "vtex_approval_requests_write_auth"
on public.vtex_approval_requests for insert
with check (auth.role() = 'authenticated');

drop policy if exists "vtex_approval_requests_update_auth" on public.vtex_approval_requests;
create policy "vtex_approval_requests_update_auth"
on public.vtex_approval_requests for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

