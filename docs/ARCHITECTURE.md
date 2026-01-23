## Arquitetura

### Componentes
- **Frontend**: Vite + React + TypeScript (UI shadcn/tailwind), hospedado/publicado via Lovable.
- **Backend**: Supabase Cloud
  - **Auth** (login email/senha)
  - **Postgres** (schema via migrations em `supabase/migrations/`)
  - **PostgREST** (REST `/rest/v1`)
  - **RPCs** (funções SQL chamadas pelo frontend)
  - **Edge Functions** (Deno, integração VTEX + automações)
- **Integração**: VTEX (Catálogo, Pricing, Master Data, Logistics)

### Fluxo de dados (alto nível)
1) **VTEX → Edge Functions**: ingestão (SKUs/Produtos/Preços/Clientes/Estoque)
2) **Edge Functions → Postgres**: persistência em tabelas `vtex_*`
3) **Postgres → Views/RPCs**: normalização para busca e precificação
4) **Frontend → Supabase**:
   - leitura: RPCs (ex.: `search_catalog_any_policy`)
   - escrita: tabelas do fluxo de cotação (`vtex_quotes`, `vtex_quote_items`, `vtex_approval_requests`, etc.)

### Materialized View
O catálogo usa `public.mv_vtex_catalog` para busca rápida. Sempre que o sync de produtos/SKUs terminar, a MV precisa estar **refrescada** (manual ou automatizada).

### Padrões importantes
- **PK de clientes VTEX**: `public.vtex_clients.md_id` (Master Data id). O frontend usa `id` como alias mapeando para `md_id`.
- **Preços**: a VTEX pode não ter preço para todos os SKUs (404). Isso vira “missing”, não erro do sync.

