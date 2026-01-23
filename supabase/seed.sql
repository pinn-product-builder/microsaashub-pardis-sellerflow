-- settings mínimas do motor (simples, mas já operacional)
insert into public.app_settings(key, value)
values
  ('quote_defaults', jsonb_build_object('validity_days', 7, 'currency', 'BRL')),
  ('approval_rules', jsonb_build_object(
      'min_margin_pct', 0.10,
      'roles', jsonb_build_array(
        jsonb_build_object('role','coordinator','max_discount_pct',0.05),
        jsonb_build_object('role','manager','max_discount_pct',0.10),
        jsonb_build_object('role','director','max_discount_pct',0.20),
        jsonb_build_object('role','admin','max_discount_pct',1.00)
      )
  )),
  ('payment_terms', jsonb_build_array('PIX', 'boleto 7d', 'cartao', '30/60/90'))
on conflict (key) do update set value = excluded.value, updated_at = now();

-- um cliente exemplo
insert into public.clients(name, document, is_active, is_l2l, credit_limit, pricing_table_code, notes)
values ('cliente demo', '00000000000000', true, false, 50000, 'TABELA_PADRAO', 'seed')
on conflict do nothing;
