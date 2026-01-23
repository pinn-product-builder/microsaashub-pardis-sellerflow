-- Permissões para o Seller Flow (VTEX) no Supabase Cloud
-- As tabelas vtex_* do fluxo têm RLS, mas ainda precisam de GRANT para o role authenticated.

grant usage on schema public to authenticated;

grant select, insert, update on public.vtex_quotes to authenticated;
grant select, insert, update on public.vtex_quote_items to authenticated;
grant select, insert on public.vtex_quote_events to authenticated;
grant select, insert, update on public.vtex_approval_requests to authenticated;

