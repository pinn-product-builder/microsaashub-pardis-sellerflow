## Banco de dados (Supabase / Postgres)

Este documento é uma visão prática do schema: quais tabelas existem, para que servem, e quais RPCs o frontend usa.

> Fonte da verdade: migrations em `supabase/migrations/**`.

---

## 1) Tabelas VTEX (staging)
Estas tabelas guardam dados “brutos” e normalizados vindos da VTEX. Elas existem para:
- evitar chamadas diretas e repetidas na VTEX
- permitir busca rápida e preço/estoque consistentes
- auditar o payload via coluna `raw`

### `public.vtex_skus`
SKU é o item vendável.
Campos relevantes (alto nível):
- `vtex_sku_id` (bigint)
- `vtex_product_id` (bigint)
- `name` (nome do SKU)
- `ean`, `ref_id`
- campos de catálogo: `embalagem`, `gramatura` (quando disponíveis)
- `raw` (jsonb)

### `public.vtex_products`
Produto “pai” do catálogo.
Campos relevantes:
- `vtex_product_id`
- `name`, `brand_id`, `brand_name`, `category_id`, `is_active`
- `raw`

### `public.vtex_sku_prices`
Preços por SKU e por `trade_policy_id`.
Campos relevantes:
- `vtex_sku_id`
- `trade_policy_id`
- `price_type` (computed/fixed/list/base)
- `selling_price`, `list_price`, `cost_price`
- `price_valid_until`
- `raw`

### `public.vtex_clients`
Clientes (Master Data). PK = `md_id`.
Campos relevantes:
- `md_id`
- `company_name`, `trade_name`, `corporate_name`
- `cnpj` (digits only), `state_registration`
- `city`, `uf`
- flags de app: `is_active`, `is_lab_to_lab`, `credit_limit`, `price_table_type`
- `raw`

### `public.vtex_sku_inventory`
Estoque por SKU/warehouse.
Campos relevantes:
- `vtex_sku_id`
- `warehouse_id`, `warehouse_name`
- `total_quantity`, `reserved_quantity`, `available_quantity`
- `updated_at`, `raw`

Derivado:
- `public.vw_vtex_sku_inventory_agg` (agrega disponibilidade por SKU)

---

## 2) Catálogo / Busca

### Materialized view
- `public.mv_vtex_catalog` é a base de busca (performance).

### RPCs principais
- `public.search_catalog(...)`
- `public.search_catalog_policy(..., trade_policy_id)`
- `public.search_catalog_any_policy(...)` (seleção automática de policy)

Observação: o frontend tende a usar a versão “any_policy” para reduzir fricção.

---

## 3) Preço efetivo e “matriz de policies”

### Fallback de preço
O preço efetivo segue a ideia:
`computed → fixed → list → base`

### Views/RPCs
- view: `public.vw_vtex_sku_effective_price_policy1` (policy 1)
- RPCs:
  - `public.get_vtex_effective_prices(...)`
  - `public.get_vtex_effective_prices_any_policy(...)`
  - `public.get_vtex_prices_matrix(...)` (todos os preços por policy para um SKU)

---

## 4) Seller Flow (cotações / aprovações)

### Tabelas
- `public.vtex_quotes`
- `public.vtex_quote_items`
- `public.vtex_quote_events`
- `public.vtex_approval_requests`

### Notas de segurança
- essas tabelas usam RLS
- aprovação não é “update livre”: depende de role/hierarquia

---

## 5) Refresh helper
- `public.refresh_mv_vtex_catalog()` (security definer; disponível para `service_role`)

Uso típico:
- após terminar um sync grande de catálogo, para garantir que a busca esteja atualizada.
