# Pardis SellerFlow (VTEX → Supabase → Lovable)

- **Lovable (builder)**: [`lovable.dev/projects/be1ca57f-8a0e-46c7-8606-dd61457efafa`](https://lovable.dev/projects/be1ca57f-8a0e-46c7-8606-dd61457efafa)
- **Publicado**: [`microsaashub-pardis-sellerflow.lovable.app`](https://microsaashub-pardis-sellerflow.lovable.app)
- **Backend**: Supabase Cloud (Postgres + Auth + Edge Functions)

## Rodar local (frontend)

```bash
npm install
npm run dev
```

## Documentação

Veja `docs/README.md`.

## Deploy automático do Supabase (Cloud)

Este repo tem um workflow que, a cada push na `main`, faz:
- `supabase db push --yes`
- `supabase functions deploy ...`

Configuração e pré-requisitos em `docs/DEPLOYMENT.md`.
