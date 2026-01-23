## Banco de dados (Supabase / Postgres)

### Tabelas VTEX (staging)
- `public.vtex_skus`
- `public.vtex_products`
- `public.vtex_sku_prices`
- `public.vtex_clients`
- `public.vtex_sku_inventory` (estoque)

### Catálogo / busca
- `public.mv_vtex_catalog` (materialized view)
- RPCs:
  - `public.search_catalog(...)`
  - `public.search_catalog_policy(..., trade_policy_id)`
  - `public.search_catalog_any_policy(...)` (seleção automática)

### Preços
- View:
  - `public.vw_vtex_sku_effective_price_policy1`
- RPCs:
  - `public.get_vtex_effective_prices(...)`
  - `public.get_vtex_effective_prices_any_policy(...)`
  - `public.get_vtex_prices_matrix(...)` (matriz por policy)

### Fluxo de cotação (Seller Flow)
- `public.vtex_quotes`
- `public.vtex_quote_items`
- `public.vtex_quote_events`
- `public.vtex_approval_requests`

### Refresh helper
- `public.refresh_mv_vtex_catalog()` (security definer; disponível para `service_role`)

