create or replace function public.mark_payment(
  p_order_id bigint,
  p_amount numeric default null,
  p_method text default 'manual',
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders%rowtype;
  already_paid numeric(12, 2);
  amount_to_record numeric(12, 2);
begin
  if not (select public.is_staff_or_admin()) then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;

  select * into order_row from public.orders where id = p_order_id for update;
  if not found or order_row.payment_status is null then
    raise exception 'Conta a prazo não encontrada.' using errcode = 'P0002';
  end if;
  if order_row.payment_status in ('cancelado', 'pago') then
    raise exception 'Esta conta não pode receber outro pagamento.' using errcode = '22023';
  end if;

  select coalesce(sum(pr.amount), 0) into already_paid
  from public.payment_records pr
  where pr.order_id = p_order_id;

  amount_to_record := coalesce(p_amount, order_row.total - already_paid);
  if amount_to_record <= 0 or already_paid + amount_to_record > order_row.total then
    raise exception 'Valor de pagamento inválido.' using errcode = '22023';
  end if;

  insert into public.payment_records (order_id, amount, method, recorded_by, note)
  values (p_order_id, amount_to_record, p_method, (select auth.uid()), nullif(trim(p_note), ''));

  if already_paid + amount_to_record = order_row.total then
    update public.orders set payment_status = 'pago' where id = p_order_id;
  end if;
end;
$$;

revoke all on function public.mark_payment(bigint, numeric, text, text)
  from public, anon;
grant execute on function public.mark_payment(bigint, numeric, text, text)
  to authenticated;
