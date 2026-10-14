-- Novos clientes podem comprar após confirmar o e-mail e entrar na conta.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_name text;
begin
  customer_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'responsavel'), ''), 'Cliente');
  insert into public.profiles (
    id, role, nome, empresa, responsavel, telefone, whatsapp, email, status
  ) values (
    new.id,
    'cliente',
    customer_name,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'empresa'), ''), customer_name),
    customer_name,
    nullif(trim(new.raw_user_meta_data ->> 'telefone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'telefone'), ''),
    new.email,
    'ativo'
  ) on conflict (id) do nothing;
  return new;
end;
$$;

-- O nome de acesso do administrador é público; a senha fica apenas no Supabase Auth.
insert into public.settings (key, value)
values ('admin_username', 'brunoblanco')
on conflict (key) do nothing;

drop policy if exists settings_public_admin_username_read on public.settings;
create policy settings_public_admin_username_read on public.settings
  for select to anon, authenticated
  using (key = 'admin_username');

create or replace function public.update_admin_username(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Acesso de administrador necessário.' using errcode = '42501';
  end if;
  if p_username is null or p_username !~ '^[a-z][a-z0-9._-]{2,31}$' then
    raise exception 'Use de 3 a 32 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.'
      using errcode = '22023';
  end if;
  update public.settings set value = p_username, updated_at = now()
  where key = 'admin_username';
end;
$$;

revoke all on function public.update_admin_username(text) from public;
revoke all on function public.update_admin_username(text) from anon;
grant execute on function public.update_admin_username(text) to authenticated;
