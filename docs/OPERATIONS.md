## Operação (VTEX sync, refresh, cron)

### Objetivo
Manter o banco do Supabase Cloud atualizado com dados VTEX para:
- busca de produtos
- precificação por SKU/policy
- clientes e limites
- estoque (quando habilitado no fluxo)

### Sync manual (via Edge Functions)
Os endpoints estão em:
`https://<project-ref>.supabase.co/functions/v1/<function-name>`

Principais:
- `vtex-sync-skus`
- `vtex-sync-products`
- `vtex-sync-prices`
- `vtex-sync-clients`
- `vtex-sync-inventory`

### Refresh do catálogo (materialized view)
O catálogo usa `public.mv_vtex_catalog`.

Opções:
- Manual (SQL Editor):
  - `refresh materialized view public.mv_vtex_catalog;`
- Automatizado:
  - a Edge Function `vtex-sync-products` chama `public.refresh_mv_vtex_catalog()` quando finaliza o escopo.

### Cron (20/20 min)
Recomendado no Supabase Cloud:
- Scheduled Trigger: `*/20 * * * *`
- Target: `vtex-cron-clients` (principalmente clientes)

Opcional:
- Jobs diários/horários para `prices/products/inventory` conforme volume.

### Troubleshooting rápido
- **Tela de produtos “zerada”**:
  - refrescar `mv_vtex_catalog`
  - confirmar grants/policies no cloud
- **Tela de clientes “zerada”**:
  - conferir permissão `select` em `public.vtex_clients`
  - validar se a PK é `md_id` (frontend mapeia `id` ⇢ `md_id`)
- **Prices com muitos “faltando”**:
  - é esperado ter SKUs sem preço na VTEX (404); isso vira “missing”, não erro.

