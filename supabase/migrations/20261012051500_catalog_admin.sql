-- =====================================================================
-- 20261012051500_catalog_admin.sql : T-1.19 Catalog admin support
-- Scenario S26: Category/product flags, image path pattern check,
-- safe delete functions (ADM-004, ADM-005), active storefront policies.
-- =====================================================================

-- 1. Add category and product flags
alter table public.categories
  add column if not exists is_active boolean not null default true,
  add column if not exists show_on_home boolean not null default false;

alter table public.products
  add column if not exists is_featured boolean not null default false;

-- 2. Image path validation function & check constraints
create or replace function public.is_valid_extra_images(p_paths text[])
returns boolean
language sql
immutable
as $$
  select p_paths is null or not exists (
    select 1 from unnest(p_paths) as p
     where p is null or p !~ '^(products|categories|settings)/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$'
  );
$$;

alter table public.categories
  add constraint categories_image_url_path
  check (image_url is null or image_url ~ '^(products|categories|settings)/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$');

alter table public.products
  add constraint products_image_url_path
  check (image_url is null or image_url ~ '^(products|categories|settings)/[A-Za-z0-9/_-]+\.(webp|jpg|jpeg|png)$'),
  add constraint products_extra_images_paths
  check (public.is_valid_extra_images(extra_images));

-- 3. Storefront policies: visitors and customers see active items only, admins see everything
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories
  for select to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "read active products" on public.products;
create policy "read active products" on public.products
  for select to anon, authenticated
  using (
    (is_active and exists (
      select 1 from public.categories c
       where c.id = products.category_id and c.is_active
    ))
    or public.is_admin()
  );

-- 4. admin_delete_product RPC function
create or replace function public.admin_delete_product(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  perform public.require_admin();

  select exists(select 1 from public.products where id = p_id) into v_exists;
  if not v_exists then
    raise exception 'Product not found'
      using errcode = 'P0002', hint = 'ORD-008';
  end if;

  if exists (select 1 from public.order_items where product_id = p_id) then
    raise exception 'Cannot delete ordered product'
      using errcode = '22023', hint = 'ADM-004';
  end if;

  delete from public.products where id = p_id;
end;
$$;

revoke all on function public.admin_delete_product(bigint) from public, anon;
grant execute on function public.admin_delete_product(bigint) to authenticated;

-- 5. admin_delete_category RPC function
create or replace function public.admin_delete_category(
  p_id      bigint,
  p_move_to bigint default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prod_count integer;
  v_exists boolean;
begin
  perform public.require_admin();

  select exists(select 1 from public.categories where id = p_id) into v_exists;
  if not v_exists then
    raise exception 'Category not found'
      using errcode = 'P0002', hint = 'ADM-007';
  end if;

  select count(*) into v_prod_count
    from public.products
   where category_id = p_id;

  if v_prod_count > 0 then
    if p_move_to is null then
      raise exception 'Cannot delete non-empty category without target'
        using errcode = '22023', hint = 'ADM-005';
    end if;

    if p_move_to = p_id then
      raise exception 'Target category cannot be the same as deleted category'
        using errcode = '22023', hint = 'ADM-005';
    end if;

    if not exists (select 1 from public.categories where id = p_move_to) then
      raise exception 'Target category does not exist'
        using errcode = '22023', hint = 'ADM-005';
    end if;

    update public.products
       set category_id = p_move_to
     where category_id = p_id;
  end if;

  delete from public.categories where id = p_id;
end;
$$;

revoke all on function public.admin_delete_category(bigint, bigint) from public, anon;
grant execute on function public.admin_delete_category(bigint, bigint) to authenticated;
