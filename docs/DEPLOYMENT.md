## Deploy / Ambientes

Este projeto tem 2 peças que precisam estar alinhadas no deploy:
- **Frontend** (Vercel)
- **Backend** (Supabase Cloud: DB + Edge Functions + Auth)

---

## 1) Frontend (Vercel)

### Build
O Vercel detecta Vite e roda (por padrão):
- `npm install`
- `npm run build`

### SPA routing (React Router)
O app usa React Router, então rotas como `/login` não são arquivos estáticos.
Para evitar 404 no Vercel, existe um `vercel.json` com rewrite para `index.html`.

### Variáveis de ambiente (Vercel)
Em Vercel → Project → Settings → Environment Variables:
- `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = `<anon/public key do Supabase Cloud>`

> Não colocar `service_role` no frontend.

---

## 2) Backend (Supabase Cloud)

### Banco (migrations)
O schema é aplicado via migrations em `supabase/migrations/*`.

### Edge Functions
As funções ficam em `supabase/functions/*` e são implantadas no Supabase Cloud.

### Deploy automático (GitHub Actions)
Workflow: `.github/workflows/supabase-cloud-deploy.yml`

Para habilitar, configure no GitHub (repo → Settings → Secrets and variables → Actions):
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF` (ex.: `qhijoyrcbtnqfybuynzy`)

Em cada push na `main`, o workflow executa:
- `supabase db push --yes`
- deploy das Edge Functions listadas no workflow

---

## 3) Supabase Auth (URLs)

No Supabase Cloud → Authentication → URL Configuration:
- **Site URL**: `https://<seu-dominio-vercel>`
- **Redirect URLs**: inclua:
  - `https://<seu-dominio-vercel>`
  - `https://<seu-dominio-vercel>/*`
  - (opcional) domínios de preview do Vercel, se vocês usam preview

---

## 4) Checklist de deploy (o que checar quando “não funciona”)

- **Vercel 404 em /login**: confirmar que `vercel.json` está no root e que o deploy pegou a mudança
- **Login redireciona errado**: conferir Site URL / Redirect URLs no Supabase Auth
- **Tela vazia (clientes/produtos)**:
  - confirmar `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` no Vercel
  - confirmar que as migrations aplicaram (tabelas/views/RPCs existem)
  - confirmar que o sync VTEX rodou e que a MV (`mv_vtex_catalog`) foi refrescada

