## Arquitetura

Este documento explica como as peças se conectam (VTEX → Supabase → Frontend) e onde ficam as responsabilidades.

---

## Componentes

### Frontend (Vercel)
- Vite + React + TypeScript
- UI: shadcn/tailwind
- Integração via `@supabase/supabase-js` (anon key)

### Backend (Supabase Cloud)
- **Auth**: login e sessão
- **Postgres**: schema via migrations em `supabase/migrations/`
- **PostgREST**: consultas via `.from(...)` no frontend
- **RPCs**: funções SQL para buscas e validações (melhor performance/segurança)
- **Edge Functions**: Deno (integração com VTEX e tarefas de sync)

### Integração VTEX
- Catálogo: produtos/SKUs
- Pricing: preços por trade policy
- Master Data: clientes (CL) e endereço (AD)
- Logistics: estoque por SKU/warehouse

---

## Fluxos principais

### 1) Ingestão (sync VTEX → Supabase)
**Quem chama**: operação (manual), cron (quando configurado) ou automação.

**O que acontece**:
1. Edge Function chama VTEX (AppKey/AppToken)
2. Normaliza os campos relevantes
3. Faz upsert nas tabelas `vtex_*` (staging)

**Tabelas**:
- `vtex_skus`, `vtex_products`
- `vtex_sku_prices` (por `trade_policy_id`)
- `vtex_clients` (PK = `md_id`)
- `vtex_sku_inventory`

### 2) Busca e precificação (Postgres → Frontend)
Para busca rápida, o catálogo usa:
- `public.mv_vtex_catalog` (materialized view)
- RPCs de busca (ex.: `search_catalog_any_policy`)

Para preço efetivo, o backend usa fallback:
`computed → fixed → list → base`

### 3) Seller Flow (cotação → aprovação → VTEX)
O fluxo de cotação usa tabelas próprias, separadas do legado:
- `vtex_quotes`
- `vtex_quote_items`
- `vtex_quote_events` (timeline/auditoria)
- `vtex_approval_requests`

O objetivo é isolar o “mundo VTEX” e permitir evolução sem quebrar o schema legado.

---

## Decisões e padrões importantes

### PK de clientes VTEX
- `public.vtex_clients.md_id` é a PK (Master Data id).
- No frontend, quando um componente espera `id`, fazemos alias `id := md_id`.

### “SKU sem preço” não é bug
Na Pricing API, 404 pode significar “SKU sem preço naquela policy”. Isso vira **missing** (métrica), não erro fatal do sync.

### Segurança por padrão
- Frontend só usa anon key.
- Decisões de aprovação e alterações sensíveis são protegidas por RLS e/ou Edge Functions.

