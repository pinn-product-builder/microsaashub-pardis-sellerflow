-- VTEX clients staging table (Master Data CL)
create table if not exists public.vtex_clients (
  md_id              text primary key,     -- id do documento no Master Data (CL)
  email              text null,
  user_id            text null,            -- em muitos casos é o email/login (varia por conta)
  first_name         text null,
  last_name          text null,
  full_name          text null,
  document           text null,            -- CPF/CNPJ (pode vir vazio dependendo das regras/PII)
  phone              text null,
  is_corporate       boolean null,
  corporate_name     text null,
  trade_name         text null,
  state_registration text null,
  created_in         timestamptz null,
  updated_in         timestamptz null,
  raw                jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_vtex_clients_email on public.vtex_clients (email);
create index if not exists idx_vtex_clients_document on public.vtex_clients (document);

-- updated_at trigger (idempotente)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_vtex_clients_updated_at on public.vtex_clients;
create trigger trg_vtex_clients_updated_at
before update on public.vtex_clients
for each row execute function public.set_updated_at();

