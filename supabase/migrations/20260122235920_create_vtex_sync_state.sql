-- Estado de sync incremental (para rotinas agendadas)
create table if not exists public.vtex_sync_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.vtex_sync_state to service_role;
grant select on public.vtex_sync_state to anon, authenticated;

