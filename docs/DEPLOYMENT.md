## Deploy / Ambientes

### Frontend (Lovable)
- Builder: [`lovable.dev/projects/be1ca57f-8a0e-46c7-8606-dd61457efafa`](https://lovable.dev/projects/be1ca57f-8a0e-46c7-8606-dd61457efafa)
- Publicado: [`microsaashub-pardis-sellerflow.lovable.app`](https://microsaashub-pardis-sellerflow.lovable.app)

#### Variáveis do frontend (Lovable)
Configure no Lovable (env vars do projeto):
- `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY=<anon/public key do Supabase Cloud>`

### Supabase Cloud (backend)
O schema é aplicado via migrations (`supabase/migrations/*`).

#### GitHub Actions (deploy automático)
Workflow: `.github/workflows/supabase-cloud-deploy.yml`

Para habilitar, crie secrets no GitHub:
- `SUPABASE_ACCESS_TOKEN` (PAT do Supabase)
- `SUPABASE_PROJECT_REF` (ex.: `qhijoyrcbtnqfybuynzy`)

Em cada push na `main`, o workflow executa:
- `supabase db push --yes`
- deploy de Edge Functions listadas no workflow

### Auth (URLs)
No Supabase Cloud → Authentication → URL Configuration:
- **Site URL**: `https://microsaashub-pardis-sellerflow.lovable.app`
- **Redirect URLs**: incluir o domínio publicado do Lovable

### Usuário admin (teste)
Criar no Supabase Cloud → Authentication → Users:
- email: `admin@pardis.com`
- senha: `123456`
- email confirmado

