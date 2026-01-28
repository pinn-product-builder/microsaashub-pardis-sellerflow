## Operação (sync VTEX, refresh, cron e troubleshooting)

Este documento é o “runbook” do sistema: como manter dados atualizados e onde olhar quando algo não bate.

---

## Objetivo (o que precisa estar sincronizado)
O SellerFlow depende de dados VTEX para:
- **Catálogo** (SKUs/produtos) para busca e seleção
- **Preço** por trade policy para montar cotação
- **Cliente** (CNPJ, UF/cidade, flags) para regras comerciais e restrição de cupom
- **Estoque** para validar carrinho e evitar “pedido impossível”

---

## Sync manual (Edge Functions)

Endpoints (cloud):
`https://<project-ref>.supabase.co/functions/v1/<function-name>`

Funções principais:
- `vtex-sync-skus`
- `vtex-sync-products`
- `vtex-sync-prices` (precisa do `sc=<tradePolicyId>`)
- `vtex-sync-clients` (recomendado rodar em modo scroll: `all=true`)
- `vtex-sync-inventory`

### Autorização do sync
Os syncs **não são públicos**. Para executar:
- **admin autenticado** (JWT em `Authorization`) **ou**
- `x-vtex-sync-secret` (quando configurado `VTEX_SYNC_SECRET` no Supabase Cloud)

Isso evita abuso/custo e mantém o ambiente previsível.

---

## Ordem recomendada de execução
Quando o ambiente está “vazio” ou desatualizado:
1) `vtex-sync-skus` (forma o universo de SKUs)
2) `vtex-sync-products` (hidrata produtos do escopo e refresca o catálogo)
3) `vtex-sync-prices?sc=1` (policy padrão)
4) `vtex-sync-prices?sc=2` (se aplicável)
5) `vtex-sync-inventory`
6) `vtex-sync-clients?all=true&withAddress=true`

---

## Refresh do catálogo (materialized view)
O catálogo usa `public.mv_vtex_catalog` para busca rápida.

Opções:
- Manual (SQL Editor):
  - `refresh materialized view public.mv_vtex_catalog;`
- Automatizado:
  - `vtex-sync-products` chama `public.refresh_mv_vtex_catalog()` ao finalizar (quando habilitado).

---

## Cron (a cada 20 minutos)

Recomendado no Supabase Cloud:
- Scheduled Trigger: `*/20 * * * *`
- Target: `vtex-cron-clients` (clientes mudam com frequência)

Opcional (depende de volume/custo):
- `prices` (por policy) algumas vezes por dia
- `inventory` com frequência maior se o estoque precisa ser “quase real-time”

---

## Troubleshooting (checklist curto e honesto)

### Produtos “zerados”
1) Confirmar que `vtex_skus` e `vtex_products` têm dados
2) Confirmar que `mv_vtex_catalog` foi refrescada
3) Confirmar que o frontend está apontando para o projeto Supabase correto (envs no Vercel)

### Clientes “zerados” (Cadastros e Nova Cotação)
1) Confirmar `vtex_clients` com dados (PK = `md_id`)
2) Confirmar que o frontend está buscando em `vtex_clients` (não `customers`)
3) Confirmar que o usuário está autenticado (RLS ativa em cloud)

### Muitos SKUs sem preço
Isso pode ser **normal** (a VTEX responde 404 para SKUs sem preço naquela policy).
O que validar:
- se o `tradePolicyId`/`sc` usado é o correto
- se existe outra policy com preço (matriz de preços por SKU)

### Aprovação “não aparece” / “não muda status”
Checar:
- se a cotação está em `vtex_quotes` com status `pending_approval`
- se existe registro em `vtex_approval_requests`
- se o usuário tem role para aprovar (RLS bloqueia update por usuário comum)

---

## Política de desconto e aprovação (justificativa obrigatória)
Para garantir rastreabilidade completa:
- **Desconto concedido pelo vendedor** exige **justificativa obrigatória**.
- **Aprovação de cotação** exige **justificativa obrigatória** do aprovador.

Onde fica registrado:
- Justificativa de desconto em `vtex_quotes.discount_reason`.
- Aprovações em `vtex_approval_requests.comments`.
- Eventos em `vtex_quote_events` (event_type `discount` e eventos de aprovação).

Observação:
- Sem justificativa, o fluxo bloqueia o avanço (salvar/finalizar/enviar/aprovar).