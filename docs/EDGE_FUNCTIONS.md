## Edge Functions (Supabase)

### Visão geral
As Edge Functions ficam em `supabase/functions/*` e fazem:
- sync VTEX (catálogo, preços, clientes, estoque)
- cálculo de pricing (server-side)
- workflow de aprovação
- criação de orderForm na VTEX

### Lista (principais)
- **`vtex-sync-skus`**: lista IDs de SKUs e hidrata detalhes; seeda `vtex_products`.
- **`vtex-sync-products`**: hidrata produtos do escopo do banco; no final chama `refresh_mv_vtex_catalog()`.
- **`vtex-sync-prices`**: busca `/prices/{skuId}` + `computed` (com variações de endpoint) e persiste em `vtex_sku_prices`.
  - 404 de preço é tratado como “missing” (não erro).
- **`vtex-sync-clients`**: Master Data (clientes).
- **`vtex-sync-inventory`**: Logistics (estoque).
- **`vtex-cron-clients`**: execução periódica do sync de clientes.
- **`calculate-pricing`**: cálculo server-side para cotação.
- **`process-approval`**: create/approve/reject de solicitações.
- **`vtex-create-orderform`**: cria orderForm na VTEX a partir de uma `vtex_quote`.

### Configuração
As chaves VTEX ficam como Secrets no Supabase Cloud:
- `VTEX_ACCOUNT`, `VTEX_ENV`, `VTEX_APP_KEY`, `VTEX_APP_TOKEN`

