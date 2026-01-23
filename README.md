## Pardis SellerFlow (VTEX → Supabase → Frontend)

Portal de **cotações B2B** com sincronização de dados da **VTEX** e backend no **Supabase**.

Stack:
- Frontend: Vite + React + TypeScript (shadcn/tailwind)
- Backend: Supabase (Postgres + Auth + Edge Functions)
- Integração: VTEX (Catálogo, Pricing, Master Data, Logistics)

---

## Visão geral

### Sync VTEX → Supabase (tabelas `vtex_*`)
- **Clientes**: `public.vtex_clients` (PK = `md_id`)
- **Produtos/SKUs**: `public.vtex_products`, `public.vtex_skus`
- **Preços por policy**: `public.vtex_sku_prices`
- **Estoque**: `public.vtex_sku_inventory` (+ agregação em `vw_vtex_sku_inventory_agg`)
- **Busca**: materialized view `public.mv_vtex_catalog` + RPCs de busca/preço

### Seller Flow (cotações / aprovações)
O fluxo de cotação opera nas tabelas:
- `public.vtex_quotes`
- `public.vtex_quote_items`
- `public.vtex_quote_events` (histórico/auditoria do fluxo)
- `public.vtex_approval_requests`

As telas **Nova Cotação / Aprovações / Histórico / Dashboard** estão alinhadas para ler/escrever em `vtex_*`.

---

## Rodar local (frontend)

### Pré-requisitos
- Node.js 18+

### Instalar e rodar

```bash
npm install
npm run dev
```

### `.env.local`
Crie `./.env.local` (não commitar) com:
- `VITE_SUPABASE_URL` (URL do projeto)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon/public key)

```env
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
```

Regras básicas:
- **Não** colocar chaves/segredos no repositório.
- **Não** usar `service_role` no frontend.

---

## Deploy (Vercel) e rotas (SPA)

### Requisito
Este projeto usa React Router. Para evitar **404 em rotas como `/login`**, o repo inclui `vercel.json` com rewrite para SPA.

### Variáveis no Vercel
Em Vercel → Project → Settings → Environment Variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### Supabase Auth (Redirect URLs)
No Supabase Cloud → Authentication → URL Configuration:
- **Site URL**: domínio do Vercel (prod)
- **Redirect URLs**: incluir o domínio do Vercel e qualquer preview necessário

---

## Configuração do backend (Supabase Cloud)

### Secrets das Edge Functions (VTEX)
No Supabase Cloud → Project Settings → Functions → Secrets:
- `VTEX_ACCOUNT`
- `VTEX_ENV` (ex.: `vtexcommercestable.com.br`)
- `VTEX_APP_KEY`
- `VTEX_APP_TOKEN`

> Segredos ficam **somente** no Supabase (Functions → Secrets). Não versionar.

### Deploy automático (DB + Edge Functions)
Workflow: `.github/workflows/supabase-cloud-deploy.yml`

Em cada push na `main`, o workflow executa:
- `supabase db push --yes`
- deploy das Edge Functions

Secrets exigidos no GitHub:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` (ex.: `qhijoyrcbtnqfybuynzy`)

---

## Operação (sync VTEX)

### Sync de clientes pelo próprio frontend
Na tela **Cadastros → Clientes**, quando `Total de Clientes = 0`, existe o botão **Sincronizar VTEX** para executar `vtex-sync-clients` em lotes.

### Edge Functions principais
- `vtex-sync-clients`
- `vtex-sync-products`
- `vtex-sync-skus`
- `vtex-sync-prices`
- `vtex-sync-inventory`
- `vtex-cron-clients` (sync periódico de clientes)

---

## Documentação detalhada

Veja `docs/README.md` (índice) e, em especial:
- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/ENVIRONMENT.md`
- `docs/OPERATIONS.md`
- `docs/DATABASE.md`
- `docs/EDGE_FUNCTIONS.md`
