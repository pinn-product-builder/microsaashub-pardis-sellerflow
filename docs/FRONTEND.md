## Frontend

### Stack
- React + Vite + TypeScript
- shadcn-ui + Tailwind
- Supabase JS (`src/integrations/supabase/client.ts`)

---

## Integração com Supabase
O client usa:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon/public key)

Autenticação:
- sessão fica persistida em `localStorage` (ver `src/integrations/supabase/client.ts`)
- telas protegidas passam por `ProtectedRoute`/gates de permissão (quando aplicável)

### Páginas principais
- `src/pages/cadastros/Clientes.tsx`: lista clientes em `vtex_clients` (UI usa `id` mapeado para `md_id`).
- `src/pages/cadastros/Produtos.tsx`: busca via `search_catalog_any_policy` e exibe preço/estoque.
- Seller Flow:
  - `NovaQuotacao`, `Historico`, `VisualizarCotacao`, `Aprovacoes`, `Dashboard`

---

## Seller Flow (fluxo no frontend)

### Nova Cotação
Arquivo: `src/pages/seller-flow/NovaQuotacao.tsx`

O que acontece:
- seleciona cliente (via `CustomerSelector` → `vtex_clients`)
- adiciona produtos (via `VtexProductSelector` → RPCs de catálogo/preço)
- valida carrinho (preço/estoque) via RPC de validação
- grava cotação em `vtex_quotes` + itens em `vtex_quote_items`
- se precisar de aprovação, cria `vtex_approval_requests` e muda status para `pending_approval`

### Aprovações
Arquivo: `src/pages/seller-flow/Aprovacoes.tsx`

Regras:
- lista pendentes de `vtex_approval_requests`
- aprovar/rejeitar muda status e registra evento (timeline)
- RLS bloqueia aprovação “forjada” (usuário sem role não consegue atualizar)

### Histórico / Visualizar Cotação
Arquivos:
- `src/pages/seller-flow/Historico.tsx`
- `src/pages/seller-flow/VisualizarCotacao.tsx`

Notas:
- histórico lê `vtex_quotes` e mostra status/cliente/valor
- visualizar carrega eventos (`vtex_quote_events`) e permite ações (duplicar, enviar)

---

## Dicas de dev (quando algo quebra)
- **Dropdown de clientes vazio**: conferir se hook está lendo `vtex_clients` e se envs do Supabase estão corretas
- **Produtos não aparecem**: refrescar `mv_vtex_catalog` e checar RPC `search_catalog_any_policy`
- **Rotas 404 no Vercel**: confirmar rewrite do `vercel.json`