-- =====================================================================
-- 20261018170000_instapay_recipient_and_qr.sql : T-5.14 Verify owner
-- InstaPay recipient and QR.
-- Configures verified owner recipient alaa.ahm9624@instapay in shop_settings,
-- ensures private delivery via get_payment_instructions, and supports both
-- handle and instapay_handle return keys.
-- =====================================================================

-- 1. Ensure approved owner recipient is configured in shop_settings
update public.shop_settings
   set value = '"alaa.ahm9624@instapay"'::jsonb
 where key = 'instapay_handle'
   and (value = '""'::jsonb or value is null or value = '""' or value = 'null'::jsonb);

-- 2. Re-assert privacy of InstaPay payment instruction settings
update public.shop_settings
   set is_public = false
 where key in ('instapay_handle', 'instapay_qr_path');

-- 3. Replace get_payment_instructions to return normalized handle keys and owner fallback
create or replace function public.get_payment_instructions(p_order_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid            uuid := auth.uid();
  v_order_uid      uuid;
  v_status         public.payment_status;
  v_total          numeric(10,2);
  v_deadline       timestamptz;
  v_qr_path        text;
  v_handle         text;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = '42501', hint = 'AUTH-004';
  end if;

  select user_id, payment_status, total, payment_deadline
    into v_order_uid, v_status, v_total, v_deadline
    from public.orders
   where id = p_order_id;

  if v_order_uid is null or v_order_uid <> v_uid then
    raise exception 'Not owner of order'
      using errcode = '42501', hint = 'ORD-009';
  end if;

  if v_status::text = 'awaiting_approval' then
    raise exception 'Order is awaiting store approval'
      using errcode = '22023', hint = 'PAY-007';
  end if;

  if v_status::text not in ('awaiting_proof', 'under_review', 'rejected') then
    raise exception 'Wrong payment status for instructions'
      using errcode = '22023', hint = 'PAY-004';
  end if;

  select value #>> '{}' into v_qr_path from public.shop_settings where key = 'instapay_qr_path';
  select value #>> '{}' into v_handle from public.shop_settings where key = 'instapay_handle';

  return jsonb_build_object(
    'qr_path', coalesce(v_qr_path, 'settings/instapay-qr-default.png'),
    'handle', coalesce(nullif(v_handle, ''), 'alaa.ahm9624@instapay'),
    'instapay_handle', coalesce(nullif(v_handle, ''), 'alaa.ahm9624@instapay'),
    'amount', v_total,
    'deadline', v_deadline
  );
end;
$$;

revoke all on function public.get_payment_instructions(bigint) from public, anon;
grant execute on function public.get_payment_instructions(bigint) to authenticated;
