-- Segurança: impedir que qualquer usuário autenticado "aprove" sozinho.
-- Ajusta RLS de vtex_approval_requests para:
-- - requester vê apenas as próprias solicitações
-- - aprovadores (coordenador/gerente/diretor/admin) veem e podem decidir, conforme regra
-- - spoof de requested_by é bloqueado no INSERT

do $$
begin
  -- garante RLS ligado
  execute 'alter table public.vtex_approval_requests enable row level security';
exception when others then
  -- tabela pode não existir em ambientes parciais
  null;
end $$;

-- Helper: role exigida pela regra (fallback = gerente)
-- Usamos public.can_approve(user, required_role) já existente no schema.

drop policy if exists "vtex_approval_requests_read_auth" on public.vtex_approval_requests;
create policy "vtex_approval_requests_read_auth"
on public.vtex_approval_requests
for select
to authenticated
using (
  requested_by = auth.uid()
  or public.can_approve(
    auth.uid(),
    coalesce((select ar.approver_role from public.approval_rules ar where ar.id = rule_id), 'gerente'::public.app_role)
  )
);

drop policy if exists "vtex_approval_requests_write_auth" on public.vtex_approval_requests;
create policy "vtex_approval_requests_write_auth"
on public.vtex_approval_requests
for insert
to authenticated
with check (
  requested_by = auth.uid()
);

drop policy if exists "vtex_approval_requests_update_auth" on public.vtex_approval_requests;
create policy "vtex_approval_requests_update_auth"
on public.vtex_approval_requests
for update
to authenticated
using (
  status = 'pending'::public.approval_status
  and public.can_approve(
    auth.uid(),
    coalesce((select ar.approver_role from public.approval_rules ar where ar.id = rule_id), 'gerente'::public.app_role)
  )
)
with check (
  public.can_approve(
    auth.uid(),
    coalesce((select ar.approver_role from public.approval_rules ar where ar.id = rule_id), 'gerente'::public.app_role)
  )
  and (
    -- status só pode permanecer pending ou virar approved/rejected
    status in ('pending'::public.approval_status, 'approved'::public.approval_status, 'rejected'::public.approval_status)
  )
);

