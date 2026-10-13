-- Public readers must not evaluate staff-only SECURITY DEFINER functions.
-- Keep the staff branch in policies addressed only to authenticated sessions.
drop policy if exists categories_read_active on public.categories;
create policy categories_read_active on public.categories
  for select to anon using (active);
create policy categories_authenticated_read on public.categories
  for select to authenticated
  using (active or (select public.is_staff_or_admin()));

drop policy if exists products_read_available on public.products;
create policy products_read_available on public.products
  for select to anon using (active);
create policy products_authenticated_read on public.products
  for select to authenticated
  using (active or (select public.is_staff_or_admin()));

drop policy if exists product_images_read_available on public.product_images;
create policy product_images_read_available on public.product_images
  for select to anon
  using (exists (
    select 1 from public.products p
    where p.id = product_images.product_id and p.active
  ));
create policy product_images_authenticated_read on public.product_images
  for select to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_images.product_id
      and (p.active or (select public.is_staff_or_admin()))
  ));
