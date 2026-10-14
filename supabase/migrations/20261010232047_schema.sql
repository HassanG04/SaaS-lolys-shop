-- =====================================================================
-- 01_schema.sql : accessories store - types, tables, indexes, triggers
-- Target: PostgreSQL 15+ (Supabase). Run files 01 -> 05 in order, once.
-- =====================================================================

-- ---------- Types ----------
create type public.user_role       as enum ('customer', 'admin');
create type public.order_status    as enum ('pending', 'confirmed', 'shipped',
                                            'delivered', 'cancelled');
create type public.delivery_method as enum ('egypt_post', 'representative');
-- Only cash on delivery for now. Add more later with:
--   alter type public.payment_method add value 'card';
create type public.payment_method  as enum ('cod');

-- ---------- Delivery lookup ----------
create table public.governorates (
  id      smallint primary key,
  name_en text not null unique,
  name_ar text not null
);

-- One row = "this method is available in this governorate for this fee".
-- No row = not available there.
create table public.delivery_fees (
  governorate_id smallint not null references public.governorates (id)
                   on delete cascade,
  method         public.delivery_method not null,
  fee            numeric(10,2) not null check (fee >= 0),
  primary key (governorate_id, method)
);

-- ---------- Users (extends Supabase auth.users) ----------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null default '',
  phone          text,
  governorate_id smallint references public.governorates (id),
  city           text,
  address        text,
  role           public.user_role not null default 'customer',
  created_at     timestamptz not null default now()
);

-- ---------- Catalogue ----------
create table public.categories (
  id         bigint generated always as identity primary key,
  name       text not null,
  name_ar    text,
  slug       text not null unique
               check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  image_url  text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id               bigint generated always as identity primary key,
  category_id      bigint not null references public.categories (id)
                     on delete restrict,
  name             text not null,
  name_ar          text,
  description      text,
  description_ar   text,
  price            numeric(10,2) not null check (price >= 0),
  discount_percent smallint not null default 0
                     check (discount_percent between 0 and 100),
  -- calculated by the database; never send these two from the client
  final_price      numeric(10,2) generated always as
                     (round(price * (100 - discount_percent) / 100.0, 2)) stored,
  stock_quantity   integer not null default 0 check (stock_quantity >= 0),
  in_stock         boolean generated always as (stock_quantity > 0) stored,
  -- kept up to date by place_order() / cancellation, so the public
  -- "best sellers" ranking never needs to read private order data
  sold_count       integer not null default 0 check (sold_count >= 0),
  is_active        boolean not null default true,
  image_url        text,
  extra_images     text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index products_category_idx on public.products (category_id)
  where is_active;
create index products_sold_idx on public.products (sold_count desc);

-- ---------- Orders ----------
create table public.orders (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.profiles (id)
                     on delete restrict,
  status           public.order_status not null default 'pending',
  delivery_method  public.delivery_method not null,
  payment_method   public.payment_method not null default 'cod',
  subtotal         numeric(10,2) not null check (subtotal >= 0),
  shipping_fee     numeric(10,2) not null check (shipping_fee >= 0),
  total            numeric(10,2) not null,
  -- address is copied here so history never changes when a profile does
  ship_name        text not null,
  ship_phone       text not null,
  ship_governorate text not null,
  ship_city        text,
  ship_address     text not null,
  notes            text,
  -- filled in by the admin
  tracking_number  text,   -- Egypt Post
  rep_name         text,   -- representative delivery
  rep_phone        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint orders_total_matches check (total = subtotal + shipping_fee)
);
create index orders_user_idx   on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id           bigint generated always as identity primary key,
  order_id     bigint not null references public.orders (id) on delete cascade,
  product_id   bigint not null references public.products (id)
                 on delete restrict,
  product_name text not null,                    -- name at purchase time
  quantity     integer not null check (quantity > 0),
  unit_price   numeric(10,2) not null check (unit_price >= 0),  -- price paid
  unique (order_id, product_id)
);
create index order_items_product_idx on public.order_items (product_id);

create table public.favorites (
  user_id    uuid   not null references public.profiles (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ---------- Triggers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Create a profile row whenever someone signs up.
-- The role is NEVER read from sign-up data: users control that data.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          new.raw_user_meta_data ->> 'phone');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
