## Pardis SellerFlow (VTEX → Supabase → Frontend)

Portal de **cotações B2B** com:
- **Catálogo/Preço/Estoque/Clientes** sincronizados da **VTEX**
- **Banco + Auth + Edge Functions** no **Supabase Cloud**
- **Frontend** em **Vercel** (Vite + React + TypeScript + shadcn/tailwind)

### Links
- **Lovable (builder / histórico do projeto)**: [`lovable.dev/projects/be1ca57f-8a0e-46c7-8606-dd61457efafa`](https://lovable.dev/projects/be1ca57f-8a0e-46c7-8606-dd61457efafa)
- **Frontend (Vercel)**: `https://microsaashub-pardis-sellerflow.vercel.app`
- **Backend**: Supabase Cloud (Postgres + Auth + Edge Functions)

---

## Fluxo do sistema (até o ponto atual)

### 1) Sync VTEX → Supabase (tabelas `vtex_*`)
- **Clientes**: `public.vtex_clients` (PK = `md_id`)
- **Produtos/SKUs**: `public.vtex_products`, `public.vtex_skus`
- **Preços por policy**: `public.vtex_sku_prices`
- **Estoque**: `public.vtex_sku_inventory` (+ agregação em `vw_vtex_sku_inventory_agg`)
- **Busca**: materialized view `public.mv_vtex_catalog` + RPCs de busca/preço

### 2) Seller Flow (cotações / aprovações)
O fluxo de cotação opera nas tabelas:
- `public.vtex_quotes`
- `public.vtex_quote_items`
- `public.vtex_quote_events` (histórico/auditoria do fluxo)
- `public.vtex_approval_requests`

As telas **Nova Cotação / Aprovações / Histórico / Dashboard** estão alinhadas para ler/escrever em `vtex_*`.

---

## Rodar local (frontend)

### Pré-requisitos
- Node.js 18+ (recomendado)

### Instalar e rodar

```bash
npm install
npm run dev
```

### `.env.local` (frontend)
Crie `./.env.local` (não commitado) com:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon/public key)

Exemplo (Supabase Cloud):

```env
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
```

> Importante: **nunca** usar `service_role` no frontend.

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
- **Site URL**: domínio do Vercel (ex.: `https://microsaashub-pardis-sellerflow.vercel.app`)
- **Redirect URLs**: incluir o domínio do Vercel e qualquer preview necessário

---

## Configuração do backend (Supabase Cloud)

### Secrets das Edge Functions (VTEX)
No Supabase Cloud → Project Settings → Functions → Secrets:
- `VTEX_ACCOUNT`
- `VTEX_ENV` (ex.: `vtexcommercestable.com.br`)
- `VTEX_APP_KEY`
- `VTEX_APP_TOKEN`

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
