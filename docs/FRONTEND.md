## Frontend

### Stack
- React + Vite + TypeScript
- shadcn-ui + Tailwind
- Supabase JS (`src/integrations/supabase/client.ts`)

### Integração com Supabase
O client usa:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (anon/public key)

### Páginas principais
- `src/pages/cadastros/Clientes.tsx`: lista clientes em `vtex_clients` (UI usa `id` mapeado para `md_id`).
- `src/pages/cadastros/Produtos.tsx`: busca via `search_catalog_any_policy` e exibe preço/estoque.
- Seller Flow:
  - `NovaQuotacao`, `Historico`, `VisualizarCotacao`, `Aprovacoes`, `Dashboard`

