## Segurança

### Regras principais
- **Nunca** usar `service_role` no frontend.
- O frontend usa apenas a **anon/public key** do Supabase Cloud.
- Secrets VTEX ficam somente no Supabase (Project Settings → Functions → Secrets).

### GitHub Actions
O workflow de deploy do Supabase usa secrets do GitHub:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

Não exponha esses secrets em logs ou commits.

### Banco (RLS/GRANT)
- Tabelas do fluxo de cotação (`vtex_quotes` etc.) usam RLS.
- Tabelas VTEX (`vtex_clients`, `vtex_skus`, `vtex_products`, `vtex_sku_prices`) são “staging” e dependem de **GRANT SELECT** para `authenticated` (sem expor para `anon`).

