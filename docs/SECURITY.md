## Segurança

Este documento descreve as decisões de segurança do projeto e os pontos que merecem atenção no dia a dia.

---

## Princípios
- O frontend usa **somente** a anon key do Supabase (`VITE_SUPABASE_PUBLISHABLE_KEY`).
- Chaves VTEX e `service_role` ficam **somente** no Supabase Cloud (secrets/infra). Não versionar.
- Operações sensíveis (aprovação, sync VTEX, escrita em tabelas de fluxo) são protegidas por **RLS** e/ou **Edge Functions**.

---

## Banco (RLS / GRANT)

### Seller Flow (tabelas `vtex_*` do fluxo)
Tabelas:
- `vtex_quotes`
- `vtex_quote_items`
- `vtex_quote_events`
- `vtex_approval_requests`

Regras gerais:
- leitura para usuários autenticados (conforme políticas)
- escrita controlada por `created_by` e por roles quando necessário

### Aprovações (brecha fechada)
`vtex_approval_requests` é o ponto mais sensível do fluxo.

O que foi aplicado:
- **INSERT** exige `requested_by = auth.uid()` (evita forjar solicitante)
- **UPDATE** só é permitido para quem pode aprovar (hierarquia via `public.can_approve(...)`) e quando o status está `pending`
- **SELECT**: solicitante vê as próprias; aprovadores veem conforme regra

Isso impede “aprovação by SQL” por usuário comum.

### Dados VTEX (staging)
Tabelas como `vtex_clients` têm dados sensíveis (PII). A regra é:
- `SELECT` para autenticado (para o app funcionar)
- `UPDATE` restrito (ex.: admin)
- ingestão via Edge Function usa `service_role` e bypass de RLS (controlado pelo backend)

---

## Edge Functions (sync VTEX)
As funções `vtex-sync-*` foram fechadas para evitar abuso/custo:
- só executam com **admin autenticado** (JWT)
- ou com `x-vtex-sync-secret` (quando `VTEX_SYNC_SECRET` está configurado)

Se você expor isso para anon/public, qualquer pessoa consegue disparar sync em loop.

---

## GitHub Actions (deploy automático)
O deploy automático do Supabase usa secrets do GitHub:
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

Boas práticas:
- não imprimir secrets em logs
- limitar permissões do token ao necessário
- tratar o workflow como “infra” (revisão em PR)

---

## Checklist rápido (antes de liberar para teste externo)
- [ ] URLs de Auth (Site URL / Redirect URLs) configuradas no Supabase
- [ ] anon key configurada no Vercel (env vars) e **sem** service role
- [ ] Edge Functions com secrets VTEX configurados no Supabase
- [ ] RLS aplicada em `vtex_approval_requests`
- [ ] Sync VTEX protegido (admin ou `VTEX_SYNC_SECRET`)

