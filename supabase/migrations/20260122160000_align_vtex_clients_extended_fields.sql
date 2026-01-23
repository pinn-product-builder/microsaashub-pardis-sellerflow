-- Alinhar public.vtex_clients com campos usados pelo UI e scripts (idempotente).
-- Mantém compatibilidade com a tabela staging original e só adiciona colunas/índices.

alter table public.vtex_clients add column if not exists vtex_user_id text;
alter table public.vtex_clients add column if not exists company_name text;
alter table public.vtex_clients add column if not exists cnpj text;
alter table public.vtex_clients add column if not exists uf text;
alter table public.vtex_clients add column if not exists city text;
alter table public.vtex_clients add column if not exists is_lab_to_lab boolean not null default false;
alter table public.vtex_clients add column if not exists credit_limit numeric not null default 0;
alter table public.vtex_clients add column if not exists price_table_type text not null default 'BR';
alter table public.vtex_clients add column if not exists is_active boolean not null default true;
alter table public.vtex_clients add column if not exists last_sync_at timestamptz;

create index if not exists idx_vtex_clients_vtex_user_id on public.vtex_clients (vtex_user_id);
create index if not exists idx_vtex_clients_company_name on public.vtex_clients (company_name);
create index if not exists idx_vtex_clients_cnpj on public.vtex_clients (cnpj);
create index if not exists idx_vtex_clients_uf on public.vtex_clients (uf);
create index if not exists idx_vtex_clients_city on public.vtex_clients (city);

