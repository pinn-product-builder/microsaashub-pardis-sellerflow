-- Permite atualizar usuários (perfil, role, grupos) via RPC com checagem de permissão.
create or replace function public.admin_update_user(
  _target_user_id uuid,
  _full_name text,
  _region public.region_type,
  _is_active boolean,
  _role public.app_role,
  _group_ids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.user_has_permission(auth.uid(), 'users.manage') or public.has_role(auth.uid(), 'admin')) then
    raise exception 'forbidden';
  end if;

  update public.profiles
  set
    full_name = _full_name,
    region = _region,
    is_active = _is_active
  where user_id = _target_user_id;

  delete from public.user_roles
  where user_id = _target_user_id;

  insert into public.user_roles (user_id, role)
  values (_target_user_id, _role);

  delete from public.user_group_memberships
  where user_id = _target_user_id;

  if _group_ids is not null and array_length(_group_ids, 1) > 0 then
    insert into public.user_group_memberships (user_id, group_id, assigned_by)
    select _target_user_id, unnest(_group_ids), auth.uid();
  end if;
end;
$$;

grant execute on function public.admin_update_user(uuid, text, public.region_type, boolean, public.app_role, uuid[]) to authenticated;
