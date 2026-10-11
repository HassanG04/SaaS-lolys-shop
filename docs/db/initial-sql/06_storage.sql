-- =====================================================================
-- 06_storage.sql : product image bucket (Supabase only)
-- Everyone can view the images; only admins can add, replace or delete.
-- Set a file-size limit and image-only types on the bucket in the dashboard.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "admin list product images" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

create policy "admin upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "admin replace product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "admin delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

