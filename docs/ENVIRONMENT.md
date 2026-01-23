## Variáveis de ambiente

### Frontend (Vercel / Vite)
Configurar no Vercel (Project → Settings → Environment Variables):
- `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = **anon/public key** do Supabase Cloud (JWT iniciando com `eyJ...`)

> Importante: nunca usar `service_role` no frontend.

### Supabase Cloud (Edge Functions → Secrets)
Configurar no Supabase Cloud (Project Settings → Functions → Secrets):
- `VTEX_ACCOUNT`
- `VTEX_ENV` (ex.: `vtexcommercestable.com.br`)
- `VTEX_APP_KEY`
- `VTEX_APP_TOKEN`
- `VTEX_SYNC_SECRET` (opcional; para automação/cron chamar sync sem depender de usuário)

### GitHub Actions (deploy automático do Supabase)
Secrets do repositório (GitHub → Settings → Secrets and variables → Actions):
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`

