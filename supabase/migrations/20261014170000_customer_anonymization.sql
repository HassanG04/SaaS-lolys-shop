-- Migration: Customer Anonymization (T-7.11)
-- Implements admin_anonymize_customer(p_user_id) for GDPR / Egyptian Personal Data Protection Law No. 151 of 2020 Right to Erasure

create or replace function public.admin_anonymize_customer(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role public.user_role;
  v_orders_count integer;
begin
  -- 1. Enforce admin role and AAL2 step-up
  perform public.require_admin();

  -- 2. Validate input and ensure profile exists
  if p_user_id is null then
    raise exception 'Customer user ID is required'
      using errcode = '22023', hint = 'ADM-007';
  end if;

  select role into v_target_role
    from public.profiles
   where id = p_user_id;

  if not found then
    raise exception 'Customer profile not found'
      using errcode = 'P0002', hint = 'ORD-009';
  end if;

  if v_target_role = 'admin' then
    raise exception 'Cannot anonymize an administrator account'
      using errcode = '42501', hint = 'ADM-001';
  end if;

  -- 3. Count customer orders for audit metadata
  select count(*) into v_orders_count
    from public.orders
   where user_id = p_user_id;

  -- 4. Anonymize profile personal data
  update public.profiles
     set full_name = 'عميل مجهول',
         phone = null,
         alt_phone = null,
         governorate_id = null,
         city = null,
         address = null,
         district = null,
         floor = null,
         apartment = null,
         landmark = null
   where id = p_user_id;

  -- 5. Anonymize personal delivery and contact info on all orders belonging to user
  -- Retains subtotal, total, shipping_fee, status, payment_status, payment_method, items, etc.
  update public.orders
     set ship_name = 'عميل مجهول',
         ship_phone = '00000000000',
         ship_alt_phone = null,
         ship_city = null,
         ship_district = null,
         ship_address = '[محذوف]',
         ship_floor = null,
         ship_apartment = null,
         ship_landmark = null,
         notes = null,
         payment_reference = null,
         payment_proof_path = null
   where user_id = p_user_id;

  -- 6. Delete personal customer favorites
  delete from public.favorites
   where user_id = p_user_id;

  -- 7. Audit the anonymization action (without logging personal details)
  perform public.audit_event(
    'CUSTOMER_ANONYMIZE',
    'profiles',
    p_user_id::text,
    jsonb_build_object('anonymized', false, 'orders_count', v_orders_count),
    jsonb_build_object('anonymized', true, 'orders_count', v_orders_count)
  );
end;
$$;

revoke all on function public.admin_anonymize_customer(uuid) from public, anon;
grant execute on function public.admin_anonymize_customer(uuid) to authenticated;
