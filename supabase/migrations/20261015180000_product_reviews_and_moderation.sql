-- =====================================================================
-- 20261015180000_product_reviews_and_moderation.sql
-- Product Reviews, 5-Star Rating, Profanity Detector & Ban Controls
-- =====================================================================

-- 1. Profiles ban columns
alter table public.profiles
  add column if not exists is_banned boolean not null default false,
  add column if not exists banned_at timestamptz,
  add column if not exists banned_reason text;

-- 2. Orders ban guard trigger: banned users cannot place orders
create or replace function public.check_user_not_banned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and is_banned = true) then
    raise exception 'USR-004: Your account has been suspended.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_ban_guard on public.orders;
create trigger orders_ban_guard
  before insert on public.orders
  for each row
  execute function public.check_user_not_banned();

-- 3. Product Reviews table
create table if not exists public.product_reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(trim(comment)) > 0 and char_length(comment) <= 1000),
  is_verified_purchase boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists product_reviews_product_idx
  on public.product_reviews (product_id, created_at desc);
create index if not exists product_reviews_user_idx
  on public.product_reviews (user_id);

alter table public.product_reviews enable row level security;

-- Authenticated users can view reviews for active products
create policy product_reviews_select_auth on public.product_reviews
  for select
  to authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_reviews.product_id and p.is_active = true
    )
  );

-- Revoke direct mutation grants; interactions go through guarded RPC
revoke insert, update, delete on public.product_reviews from public, anon, authenticated;
grant select on public.product_reviews to authenticated;

-- 4. Text Normalization for Content Moderation
create or replace function public.normalize_review_text(p_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_res text;
begin
  if p_text is null then
    return '';
  end if;
  v_res := lower(p_text);
  -- Remove Arabic diacritics / tashkeel
  v_res := regexp_replace(v_res, '[\u064B-\u065F\u0670]', '', 'g');
  -- Normalize alef forms (أ, إ, آ -> ا)
  v_res := regexp_replace(v_res, '[إأآا]', 'ا', 'g');
  -- Normalize yaa forms (ى -> ي)
  v_res := regexp_replace(v_res, '[ىي]', 'ي', 'g');
  -- Normalize taa marbuta (ة -> ه)
  v_res := regexp_replace(v_res, '[ةه]', 'ه', 'g');
  -- Remove punctuation and symbols except whitespace
  v_res := regexp_replace(v_res, '[^\w\s\u0600-\u06FF]', ' ', 'g');
  -- Collapse repeated adjacent characters (e.g. كككككس -> كس)
  v_res := regexp_replace(v_res, '(.)\1+', '\1', 'g');
  -- Collapse consecutive whitespace
  v_res := regexp_replace(v_res, '\s+', ' ', 'g');
  return trim(v_res);
end;
$$;

-- 5. Profanity detector: checks both Arabic vulgarities and English curse words
create or replace function public.contains_review_profanity(p_text text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  v_norm text;
  v_pattern text;
begin
  if p_text is null or char_length(trim(p_text)) = 0 then
    return false;
  end if;

  v_norm := public.normalize_review_text(p_text);

  -- Regex pattern covering English and Arabic vulgarities / curse words / slurs
  v_pattern := '(\y(fuck|fucking|shit|bitch|asshole|bastard|dick|cunt|pussy|whore|slut|faggot|nigger|cock|motherfucker)\y)|' ||
               '(\m(شرموط|منيوك|كس|طيز|خول|عرص|زب|قحب|نيك|عاهر|ديوث|وسخ|كلب|حمار|سافل|حقير)\M)';

  return v_norm ~* v_pattern;
end;
$$;

-- 6. Mask Profanities Helper
create or replace function public.mask_review_profanity(p_text text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_res text;
begin
  if p_text is null then
    return '';
  end if;
  v_res := p_text;
  v_res := regexp_replace(v_res, '\y(fuck|fucking|shit|bitch|asshole|bastard|dick|cunt|pussy|whore|slut|faggot|nigger|cock|motherfucker)\y', '***', 'gi');
  v_res := regexp_replace(v_res, '\m(شرموط[ةه]?|منيوك|كس|طيز|خول|عرص|زب|قحب[ةه]?|نيك|عاهر[ةه]?|ديوث)\M', '***', 'gi');
  return v_res;
end;
$$;

-- 7. Submit Product Review RPC (with verification & automated ban on curse words)
create or replace function public.submit_product_review(
  p_product_id bigint,
  p_rating smallint,
  p_comment text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_is_banned boolean;
  v_review_id bigint;
  v_clean_comment text;
  v_created_at timestamptz;
begin
  -- A. Authentication required
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'AUTH-001: Authentication required.' using errcode = 'P0001';
  end if;

  -- B. Check if user is currently banned
  select is_banned into v_is_banned
  from public.profiles
  where id = v_user_id;

  if coalesce(v_is_banned, false) = true then
    raise exception 'REV-001: Your account has been suspended.' using errcode = 'P0001';
  end if;

  -- C. Validate rating bounds
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'REV-004: Rating must be between 1 and 5 stars.' using errcode = 'P0001';
  end if;

  -- D. Validate comment length
  v_clean_comment := trim(coalesce(p_comment, ''));
  if char_length(v_clean_comment) = 0 or char_length(v_clean_comment) > 1000 then
    raise exception 'REV-005: Review comment must be between 1 and 1000 characters.' using errcode = 'P0001';
  end if;

  -- E. Profanity Check: if curse words detected, ban user immediately and reject review!
  if public.contains_review_profanity(v_clean_comment) then
    -- Ban user immediately
    update public.profiles
    set is_banned = true,
        banned_at = now(),
        banned_reason = 'Profanity detected in product review submission'
    where id = v_user_id;

    -- Log moderation action to audit_log
    insert into public.audit_log (
      actor_id,
      actor_role,
      entity,
      entity_id,
      action,
      diff
    ) values (
      v_user_id,
      'customer',
      'user',
      v_user_id::text,
      'USER_BANNED_PROFANITY',
      jsonb_build_object(
        'reason', 'Profanity detected in product review',
        'product_id', p_product_id
      )
    );

    raise exception 'REV-003: Review rejected due to inappropriate language. Your account has been suspended.' using errcode = 'P0001';
  end if;

  -- F. Verified Purchase Check: User must have purchased this product
  if not exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = v_user_id
      and oi.product_id = p_product_id
      and o.status not in ('cancelled')
  ) then
    raise exception 'REV-002: You must purchase this product before writing a review.' using errcode = 'P0001';
  end if;

  -- G. Upsert review
  insert into public.product_reviews (
    product_id,
    user_id,
    rating,
    comment,
    is_verified_purchase,
    updated_at
  ) values (
    p_product_id,
    v_user_id,
    p_rating,
    v_clean_comment,
    true,
    now()
  )
  on conflict (product_id, user_id) do update set
    rating = excluded.rating,
    comment = excluded.comment,
    updated_at = now()
  returning id, created_at into v_review_id, v_created_at;

  return jsonb_build_object(
    'review_id', v_review_id,
    'product_id', p_product_id,
    'rating', p_rating,
    'comment', v_clean_comment,
    'created_at', v_created_at,
    'status', 'published'
  );
end;
$$;

-- 8. Get Product Reviews RPC (Safe for anon & authenticated)
create or replace function public.get_product_reviews(p_product_id bigint)
returns table (
  id bigint,
  product_id bigint,
  rating smallint,
  comment text,
  reviewer_name text,
  is_verified_purchase boolean,
  is_own boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pr.id,
    pr.product_id,
    pr.rating,
    pr.comment,
    case
      when length(coalesce(p.full_name, '')) > 0
        then substring(trim(p.full_name) from 1 for 1) || '***'
      else 'عميل موثق'
    end as reviewer_name,
    pr.is_verified_purchase,
    (auth.uid() is not null and pr.user_id = auth.uid()) as is_own,
    pr.created_at
  from public.product_reviews pr
  join public.profiles p on p.id = pr.user_id
  join public.products prod on prod.id = pr.product_id
  where pr.product_id = p_product_id
    and prod.is_active = true
  order by (auth.uid() is not null and pr.user_id = auth.uid()) desc, pr.created_at desc;
$$;

-- 9. Get Review Summary Stats RPC
create or replace function public.get_product_review_summary(p_product_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_avg numeric(3,2);
  v_c1 integer;
  v_c2 integer;
  v_c3 integer;
  v_c4 integer;
  v_c5 integer;
begin
  select
    count(*),
    coalesce(round(avg(rating)::numeric, 2), 0.00),
    count(*) filter (where rating = 1),
    count(*) filter (where rating = 2),
    count(*) filter (where rating = 3),
    count(*) filter (where rating = 4),
    count(*) filter (where rating = 5)
  into v_count, v_avg, v_c1, v_c2, v_c3, v_c4, v_c5
  from public.product_reviews
  where product_id = p_product_id;

  return jsonb_build_object(
    'review_count', v_count,
    'average_rating', v_avg,
    'distribution', jsonb_build_object(
      '1', v_c1,
      '2', v_c2,
      '3', v_c3,
      '4', v_c4,
      '5', v_c5
    )
  );
end;
$$;

-- 10. Check User Eligibility RPC
create or replace function public.check_user_review_eligibility(p_product_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_is_banned boolean;
  v_has_purchased boolean;
  v_existing_review jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object(
      'is_authenticated', false,
      'is_banned', false,
      'has_purchased', false,
      'existing_review', null
    );
  end if;

  select is_banned into v_is_banned
  from public.profiles
  where id = v_user_id;

  v_has_purchased := exists (
    select 1
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.user_id = v_user_id
      and oi.product_id = p_product_id
      and o.status not in ('cancelled')
  );

  select jsonb_build_object(
    'id', id,
    'rating', rating,
    'comment', comment,
    'created_at', created_at
  ) into v_existing_review
  from public.product_reviews
  where product_id = p_product_id and user_id = v_user_id;

  return jsonb_build_object(
    'is_authenticated', true,
    'is_banned', coalesce(v_is_banned, false),
    'has_purchased', v_has_purchased,
    'existing_review', v_existing_review
  );
end;
$$;

-- 11. Explicit function grants
grant execute on function public.normalize_review_text(text) to anon, authenticated;
grant execute on function public.contains_review_profanity(text) to anon, authenticated;
grant execute on function public.mask_review_profanity(text) to anon, authenticated;
grant execute on function public.get_product_reviews(bigint) to anon, authenticated;
grant execute on function public.get_product_review_summary(bigint) to anon, authenticated;
grant execute on function public.check_user_review_eligibility(bigint) to anon, authenticated;
grant execute on function public.submit_product_review(bigint, smallint, text) to authenticated;
