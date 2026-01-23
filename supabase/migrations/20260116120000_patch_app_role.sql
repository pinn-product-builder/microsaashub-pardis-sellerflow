-- Patch de enum app_role (não referenciar o enum em funções aqui)

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) then
    create type public.app_role as enum (
      'seller',
      'coordinator',
      'manager',
      'director',
      'admin'
    );
  end if;
end $$;

-- Se já existir, só garante que os valores existem
alter type public.app_role add value if not exists 'seller';
alter type public.app_role add value if not exists 'coordinator';
alter type public.app_role add value if not exists 'manager';
alter type public.app_role add value if not exists 'director';
alter type public.app_role add value if not exists 'admin';
