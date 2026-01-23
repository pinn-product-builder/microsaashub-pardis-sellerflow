-- Permissões para o frontend (Supabase Cloud)
-- Sem RLS, ainda precisamos de GRANT para authenticated ler/editar.

grant usage on schema public to anon, authenticated;

grant select on public.vtex_clients to authenticated;
grant update on public.vtex_clients to authenticated;

grant select on public.vtex_skus to authenticated;
grant select on public.vtex_products to authenticated;
grant select on public.vtex_sku_prices to authenticated;

-- views já têm grants em migrations anteriores, mas garantimos:
grant select on public.vw_vtex_clients_stats to anon, authenticated;
grant select on public.mv_vtex_catalog to anon, authenticated;

