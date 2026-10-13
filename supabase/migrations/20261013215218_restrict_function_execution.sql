-- Supabase may grant EXECUTE to anon directly, in addition to PostgreSQL's
-- PUBLIC default. Both grants must be removed from privileged functions.
revoke execute on function public.is_staff_or_admin() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.create_order(jsonb, text, uuid, text, text, integer) from public, anon;
revoke execute on function public.update_order_status(bigint, public.pedido_status, text) from public, anon;
revoke execute on function public.cancel_my_order(bigint, text) from public, anon;
revoke execute on function public.set_customer_payment_term(uuid, integer, boolean) from public, anon;
revoke execute on function public.mark_payment(bigint, numeric, text, text) from public, anon;
revoke execute on function public.register_stock_movement(bigint, public.movimento_tipo, integer, text) from public, anon;
revoke execute on function public.update_customer_status(uuid, public.cliente_status) from public, anon;
revoke execute on function public.update_commercial_setting(text, text) from public, anon;
revoke execute on function public.refresh_overdue_payments() from public, anon;

-- Trigger functions are not client RPCs.
revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke execute on function public.sync_profile_email() from public, anon, authenticated;
revoke execute on function public.audit_row_change() from public, anon, authenticated;
