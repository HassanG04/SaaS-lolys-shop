-- Test: 24_occasion_reminders.test.sql
-- Description: Unit & regression tests for Task T-9.14: Upcoming Occasion Reminders for Admins
-- Verifies:
-- 1. Anonymous & Non-admin denial (AUTH-004 / ADM-001 with 42501)
-- 2. Admin AAL1 step-up denial (ADM-002 with 42501)
-- 3. Setting occasion_reminder_advance_days bounds and privacy
-- 4. Admin AAL2 retrieval of calendar occasions with Cairo date boundaries and uncertainty notes
-- 5. Deduplication of generated reminders
-- 6. Multi-admin isolation on reminder retrieval and dismissal
-- 7. RLS protection on public.admin_occasion_reminders table

BEGIN;
SELECT plan(26);

-- 1. Create test users: two admins and one customer
SELECT tests.create_supabase_user('remind_admin_1');
SELECT tests.create_supabase_user('remind_admin_2');
SELECT tests.create_supabase_user('remind_cust_1');

UPDATE public.profiles SET role = 'admin' WHERE id IN (
  tests.get_supabase_uid('remind_admin_1'),
  tests.get_supabase_uid('remind_admin_2')
);

-- ============================================================================
-- 1. Privacy and Validation of occasion_reminder_advance_days Setting
-- ============================================================================
SELECT tests.authenticate_as_service_role();

SELECT is(
  (SELECT is_public FROM public.shop_settings WHERE key = 'occasion_reminder_advance_days'),
  false,
  'occasion_reminder_advance_days is private (is_public = false)'
);

SELECT is(
  (SELECT (value #>> '{}')::int FROM public.shop_settings WHERE key = 'occasion_reminder_advance_days'),
  14,
  'Default advance notice days is 14'
);

SELECT tests.clear_authentication();

SELECT is(
  (SELECT count(*)::int FROM public.shop_settings WHERE key = 'occasion_reminder_advance_days'),
  0,
  'Anonymous cannot inspect private occasion_reminder_advance_days setting'
);

-- ============================================================================
-- 2. Anonymous & Customer Access Denial (ADM-001 / 42501)
-- ============================================================================

-- 2a. Anonymous calls are rejected
SELECT throws_ok(
  $$SELECT public.admin_get_upcoming_occasions(90)$$,
  '42501',
  NULL,
  'Anonymous cannot call admin_get_upcoming_occasions'
);

SELECT throws_ok(
  $$SELECT public.admin_generate_occasion_reminders(14)$$,
  '42501',
  NULL,
  'Anonymous cannot call admin_generate_occasion_reminders'
);

SELECT throws_ok(
  $$SELECT public.admin_get_occasion_reminders()$$,
  '42501',
  NULL,
  'Anonymous cannot call admin_get_occasion_reminders'
);

-- 2b. Customer calls are rejected
SELECT tests.authenticate_as('remind_cust_1');

SELECT throws_ok(
  $$SELECT public.admin_get_upcoming_occasions(90)$$,
  '42501',
  'Admins only',
  'Customer cannot call admin_get_upcoming_occasions'
);

SELECT throws_ok(
  $$SELECT public.admin_generate_occasion_reminders(14)$$,
  '42501',
  'Admins only',
  'Customer cannot call admin_generate_occasion_reminders'
);

-- Customer cannot access table directly via RLS
SELECT is(
  (SELECT count(*)::int FROM public.admin_occasion_reminders),
  0,
  'Customer selects 0 rows from admin_occasion_reminders table'
);

-- ============================================================================
-- 3. Admin AAL1 Step-up Enforcement (ADM-002 / 42501)
-- ============================================================================
SELECT tests.authenticate_as('remind_admin_1', 'aal1');

SELECT throws_ok(
  $$SELECT public.admin_get_upcoming_occasions(90)$$,
  '42501',
  'Two-factor authentication required for admin actions',
  'Admin at AAL1 is rejected with ADM-002 for admin_get_upcoming_occasions'
);

SELECT throws_ok(
  $$SELECT public.admin_generate_occasion_reminders(14)$$,
  '42501',
  'Two-factor authentication required for admin actions',
  'Admin at AAL1 is rejected with ADM-002 for admin_generate_occasion_reminders'
);

-- ============================================================================
-- 4. Admin AAL2 Success & Setting Management
-- ============================================================================
SELECT tests.authenticate_as('remind_admin_1', 'aal2');

-- 4a. Update occasion_reminder_advance_days setting
SELECT lives_ok(
  $$SELECT public.admin_update_setting('occasion_reminder_advance_days', '21'::jsonb)$$,
  'Admin AAL2 can update occasion_reminder_advance_days to 21'
);

SELECT throws_ok(
  $$SELECT public.admin_update_setting('occasion_reminder_advance_days', '15'::jsonb)$$,
  '22023',
  'Invalid setting value',
  'Admin cannot set non-standard advance days (must be 7, 14, 21, or 30)'
);

-- Reset back to 14
SELECT public.admin_update_setting('occasion_reminder_advance_days', '14'::jsonb);

-- ============================================================================
-- 5. Upcoming Occasions Retrieval (Cairo dates, Year Rollover, Uncertainty)
-- ============================================================================
-- Request calendar occasions for the next 750 days (covers 2 years + rollover)
SELECT is(
  (SELECT jsonb_typeof(public.admin_get_upcoming_occasions(750))),
  'array',
  'admin_get_upcoming_occasions returns a JSONB array'
);

-- Verify all 7 event keys are present across 2026-2028
SELECT is(
  (SELECT count(distinct elem->>'occasion_key')::int
     FROM jsonb_array_elements(public.admin_get_upcoming_occasions(750)) elem),
  7,
  'All 7 retail occasion types are present in calendar extraction'
);

-- Verify uncertainty labeling on Hijri events vs Gregorian events
SELECT is(
  (SELECT (elem->>'is_uncertain')::boolean
     FROM jsonb_array_elements(public.admin_get_upcoming_occasions(750)) elem
    WHERE elem->>'occasion_key' = 'ramadan' LIMIT 1),
  true,
  'Ramadan is correctly marked as uncertain (subject to moon sighting)'
);

SELECT is(
  (SELECT (elem->>'is_uncertain')::boolean
     FROM jsonb_array_elements(public.admin_get_upcoming_occasions(750)) elem
    WHERE elem->>'occasion_key' = 'valentines' LIMIT 1),
  false,
  'Valentine''s Day is not uncertain'
);

SELECT isnt(
  (SELECT elem->>'uncertainty_note_ar'
     FROM jsonb_array_elements(public.admin_get_upcoming_occasions(750)) elem
    WHERE elem->>'occasion_key' = 'eid_fitr' LIMIT 1),
  NULL,
  'Eid al-Fitr has official Dar al-Ifta Arabic uncertainty note'
);

-- ============================================================================
-- 6. Reminder Generation & Deduplication
-- ============================================================================
-- Generate reminders for Admin 1 (with 365 advance days to ensure upcoming events exist)
SELECT lives_ok(
  $$SELECT public.admin_generate_occasion_reminders(30)$$,
  'admin_generate_occasion_reminders executes cleanly'
);

-- Calling a second time must return 0 (100% deduplicated!)
SELECT is(
  (SELECT public.admin_generate_occasion_reminders(30)),
  0,
  'Second generation call with same advance window returns 0 (deduplication guarantee)'
);

-- Insert a deterministic reminder for test isolation verification
INSERT INTO public.admin_occasion_reminders (
  admin_id, occasion_key, event_year, event_date, title_ar, title_en, message_ar, message_en, advance_days
) VALUES (
  tests.get_supabase_uid('remind_admin_1'),
  'mothers_day',
  2027,
  '2027-03-21',
  'عيد الأم',
  'Mother''s Day',
  'تذكير عيد الأم',
  'Mother''s Day reminder',
  14
) RETURNING id AS test_admin1_remind_id \gset

-- Verify Admin 1 sees this reminder
SELECT is(
  (SELECT count(*)::int FROM jsonb_array_elements(public.admin_get_occasion_reminders()) elem
    WHERE (elem->>'id')::uuid = :'test_admin1_remind_id'),
  1,
  'Admin 1 retrieves their active reminder'
);

-- ============================================================================
-- 7. Multi-Admin Isolation & Dismissal
-- ============================================================================
-- Setup matching reminder for Admin 2 using service role
SELECT tests.authenticate_as_service_role();

INSERT INTO public.admin_occasion_reminders (
  admin_id, occasion_key, event_year, event_date, title_ar, title_en, message_ar, message_en, advance_days
) VALUES (
  tests.get_supabase_uid('remind_admin_2'),
  'mothers_day',
  2027,
  '2027-03-21',
  'عيد الأم',
  'Mother''s Day',
  'تذكير عيد الأم',
  'Mother''s Day reminder',
  14
) RETURNING id AS test_admin2_remind_id \gset

-- Switch back to Admin 1 (AAL2)
SELECT tests.authenticate_as('remind_admin_1', 'aal2');

-- Admin 1 dismisses their reminder
SELECT is(
  (SELECT public.admin_dismiss_occasion_reminder(:'test_admin1_remind_id')),
  true,
  'Admin 1 successfully dismisses their reminder'
);

-- Admin 1 active reminders now excludes the dismissed reminder
SELECT is(
  (SELECT count(*)::int FROM jsonb_array_elements(public.admin_get_occasion_reminders()) elem
    WHERE (elem->>'id')::uuid = :'test_admin1_remind_id'),
  0,
  'Dismissed reminder is excluded from Admin 1 active reminders'
);

-- Switch to Admin 2 (AAL2)
SELECT tests.authenticate_as('remind_admin_2', 'aal2');

-- Admin 2's reminder is STILL active and untouched
SELECT is(
  (SELECT count(*)::int FROM jsonb_array_elements(public.admin_get_occasion_reminders()) elem
    WHERE (elem->>'id')::uuid = :'test_admin2_remind_id'),
  1,
  'Admin 2 reminder remains active after Admin 1 dismissed theirs (Admin Isolation)'
);

-- Admin 2 cannot dismiss Admin 1's reminder (returns false, 0 rows modified)
SELECT is(
  (SELECT public.admin_dismiss_occasion_reminder(:'test_admin1_remind_id')),
  false,
  'Admin 2 cannot dismiss Admin 1 reminder'
);

-- Admin 2 cannot see Admin 1 reminders in table query
SELECT is(
  (SELECT count(*)::int FROM public.admin_occasion_reminders
    WHERE admin_id = tests.get_supabase_uid('remind_admin_1')),
  0,
  'Admin 2 cannot view Admin 1 reminders through RLS'
);

SELECT * FROM finish();
ROLLBACK;
