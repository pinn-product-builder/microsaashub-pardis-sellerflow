-- Segurança: vtex_clients contém dados sensíveis (PII). Restringe alterações.
-- - SELECT: qualquer usuário autenticado (necessário para Seller Flow)
-- - UPDATE: apenas admin
-- Obs.: Edge Functions (service_role) continuam podendo upsert (bypass RLS).

alter table public.vtex_clients enable row level security;

drop policy if exists "vtex_clients_read_auth" on public.vtex_clients;
create policy "vtex_clients_read_auth"
on public.vtex_clients
for select
to authenticated
using (true);

drop policy if exists "vtex_clients_update_admin" on public.vtex_clients;
create policy "vtex_clients_update_admin"
on public.vtex_clients
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'::public.app_role))
with check (public.has_role(auth.uid(), 'admin'::public.app_role));

