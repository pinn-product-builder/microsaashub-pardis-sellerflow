-- Persistir a policy escolhida no item de cotação VTEX (auditoria)
alter table if exists public.vtex_quote_items
  add column if not exists trade_policy_id text;

create index if not exists idx_vtex_quote_items_trade_policy
  on public.vtex_quote_items(trade_policy_id);

