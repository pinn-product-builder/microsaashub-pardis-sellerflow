-- Adiciona coluna discount_mode na tabela vtex_quotes
alter table public.vtex_quotes 
add column if not exists discount_mode text not null default 'percentage' 
check (discount_mode in ('percentage', 'manual'));

comment on column public.vtex_quotes.discount_mode is 'Define o modo de desconto global: percentage (padrão) ou manual';
