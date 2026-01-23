## Documentação — Pardis SellerFlow

Esta pasta é a documentação “de time” do Pardis SellerFlow: como o sistema está montado hoje, como operar o ambiente (local e cloud), e onde mexer quando algo quebra.

O stack atual é:
- **Frontend**: Vite + React + TypeScript (shadcn/tailwind), publicado no **Vercel**
- **Backend**: **Supabase Cloud** (Postgres + Auth + Edge Functions)
- **Integração**: **VTEX** (Catálogo, Pricing, Master Data, Logistics)

---

## Quickstart (para dev)

### Rodar o frontend local

1) Criar `./.env.local`:

```env
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
```

2) Rodar:

```bash
npm install
npm run dev
```

> Regra de ouro: `service_role` nunca entra no frontend.

### Subir Supabase local (opcional)
Se você estiver desenvolvendo com Supabase local:

```bash
supabase start
supabase migration up --local
```

---

## Como o sistema “funciona” (fluxo de negócio)

### 1) Sync VTEX → Supabase (dados base)
Os dados vindos da VTEX são persistidos em tabelas `vtex_*`:
- `vtex_clients` (clientes; PK = `md_id`)
- `vtex_skus`, `vtex_products` (catálogo)
- `vtex_sku_prices` (preços por trade policy)
- `vtex_sku_inventory` (estoque por warehouse)

O catálogo de busca usa `mv_vtex_catalog` (materialized view) e RPCs para busca/precificação.

### 2) Seller Flow (cotação → aprovação → VTEX)
O fluxo de cotação opera nas tabelas:
- `vtex_quotes`, `vtex_quote_items`
- `vtex_quote_events` (linha do tempo)
- `vtex_approval_requests`

Hoje o app cobre:
- montar carrinho (itens/quantidades) com validação preço/estoque
- solicitar aprovação quando necessário
- aprovar/rejeitar e refletir status em histórico/dashboard
- iniciar o caminho de envio para VTEX via `orderForm` (Edge Function dedicada)

---

## Onde procurar cada coisa

### Código (frontend)
- Páginas: `src/pages/**`
- Seller Flow: `src/pages/seller-flow/**`
- Integração Supabase: `src/integrations/supabase/client.ts`
- Serviços: `src/services/**`

### Banco (Supabase)
- Migrations: `supabase/migrations/**`
- Tabelas e RPCs: ver `docs/DATABASE.md`

### Edge Functions
- Código: `supabase/functions/**`
- Contratos YAML (VTEX): `contracts/**`

---

## Operação e troubleshooting
Para sync, refresh de catálogo, cron e problemas comuns:
- `docs/OPERATIONS.md`

---

## Índice (documentos desta pasta)
- **Arquitetura e fluxo de dados**: `docs/ARCHITECTURE.md`
- **Deploy (Vercel + Supabase Cloud + GitHub Actions)**: `docs/DEPLOYMENT.md`
- **Variáveis e secrets**: `docs/ENVIRONMENT.md`
- **Operação (sync VTEX, refresh, cron, troubleshooting)**: `docs/OPERATIONS.md`
- **Banco (tabelas, views, RPCs e RLS)**: `docs/DATABASE.md`
- **Edge Functions (o que faz cada uma + segurança)**: `docs/EDGE_FUNCTIONS.md`
- **Frontend (rotas, stores, integrações)**: `docs/FRONTEND.md`
- **Segurança (ameaças reais e mitigação)**: `docs/SECURITY.md`

