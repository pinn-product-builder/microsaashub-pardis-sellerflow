## Edge Functions (Supabase)

As Edge Functions ficam em `supabase/functions/*` e são a “camada de integração”:
- chamam VTEX com AppKey/AppToken (segredos ficam no Supabase Cloud)
- fazem ingestão/sync para as tabelas `vtex_*`
- executam operações que **não podem** ficar no frontend (ex.: usar service role, chamar APIs privadas, jobs)

---

## Segurança (importante)
As funções de sync VTEX **não são públicas**.

Para executar `vtex-sync-*`, é necessário:
- usuário autenticado com role **admin** (JWT no header `Authorization`) **ou**
- header `x-vtex-sync-secret` igual ao secret `VTEX_SYNC_SECRET` (para cron/automação)

Isso evita que qualquer pessoa dispare sync e gere custo/abuso.

---

## Lista de funções (o que faz cada uma)

### `vtex-sync-skus`
- **Objetivo**: formar o universo de SKUs e persistir detalhe básico em `vtex_skus`
- **Observação**: serve como “base” para o sync de produtos e para o catálogo

### `vtex-sync-products`
- **Objetivo**: hidratar produtos do escopo e upsert em `vtex_products`
- **Importante**: ao final pode refrescar `mv_vtex_catalog` (direto ou via helper)

### `vtex-sync-prices`
- **Objetivo**: buscar preços por `trade_policy_id` e persistir em `vtex_sku_prices`
- **Comportamento esperado**: 404 na Pricing API = “SKU sem preço” → contabiliza como `missing`, não quebra o lote
- **Normalização**: valores monetários vêm em centavos na VTEX e devem ser normalizados para BRL

### `vtex-sync-clients`
- **Objetivo**: sync de clientes (Master Data CL) e enrichment opcional (AD para city/UF)
- **Modo recomendado**: `all=true` (scroll) para bases grandes

### `vtex-sync-inventory`
- **Objetivo**: sync de estoque por SKU (Logistics API) → `vtex_sku_inventory`
- **Uso no app**: validação de carrinho e exibição de disponibilidade via view agregada

### `vtex-cron-clients`
- **Objetivo**: rodar sync incremental/periódico de clientes (pensado para cron a cada 20 min)

### `calculate-pricing`
- **Objetivo**: cálculo server-side (quando precisar blindar lógica/inputs)

### `process-approval`
- **Objetivo**: workflow de aprovação legado (create/approve/reject)
- **Nota**: o Seller Flow VTEX usa `vtex_approval_requests` e RLS; este endpoint fica para compatibilidade/rotas antigas

### `vtex-create-orderform`
- **Objetivo**: iniciar o fluxo “cotação aprovada → carrinho na VTEX” via criação de `orderForm`

### Configuração
As chaves VTEX ficam como Secrets no Supabase Cloud:
- `VTEX_ACCOUNT`, `VTEX_ENV`, `VTEX_APP_KEY`, `VTEX_APP_TOKEN`

Opcional:
- `VTEX_SYNC_SECRET` (para cron/automação)
