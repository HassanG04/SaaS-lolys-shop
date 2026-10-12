-- =====================================================================
-- 20261012060000_profile_address_grants.sql
-- Grant column update permissions on profiles structured address fields
-- to authenticated role for customer profile self-service editing.
-- =====================================================================

grant update (alt_phone, district, floor, apartment, landmark)
  on public.profiles to authenticated;
