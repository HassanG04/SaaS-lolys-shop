BEGIN;
SELECT plan(19);

SELECT tests.create_supabase_user('photo_admin');
SELECT tests.create_supabase_user('photo_cust_1');
SELECT tests.create_supabase_user('photo_cust_2');

UPDATE public.profiles SET role = 'admin' WHERE id = tests.get_supabase_uid('photo_admin');

-- ============================================================================
-- 1. Avatars Storage Bucket Properties
-- ============================================================================

SELECT tests.authenticate_as_service_role();

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'avatars'),
  true,
  'Avatars bucket is public'
);

SELECT is(
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'avatars'),
  2097152::bigint,
  'Avatars bucket file size limit is 2 MB'
);

SELECT is(
  (SELECT array_to_string(allowed_mime_types, ',') FROM storage.buckets WHERE id = 'avatars'),
  'image/jpeg,image/png,image/webp',
  'Avatars bucket allowed MIME types are JPEG, PNG, and WebP'
);

-- ============================================================================
-- 2. Anonymous Access Restrictions
-- ============================================================================

SELECT tests.clear_authentication();

SELECT throws_ok(
  $$INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('avatars', 'anon/test.jpg', gen_random_uuid())$$,
  '42501', NULL, 'Anonymous cannot insert into avatars storage'
);

SELECT throws_ok(
  $$UPDATE public.profiles SET avatar_url = '00000000-0000-0000-0000-000000000000/pic.jpg'$$,
  '42501', NULL, 'Anonymous cannot update profiles avatar_url'
);

-- ============================================================================
-- 3. Profile Avatar Validation & Folder Integrity
-- ============================================================================

SELECT tests.authenticate_as('photo_cust_1');

-- 3a. Full external URL is rejected (check constraint)
SELECT throws_ok(
  format($$UPDATE public.profiles SET avatar_url = 'https://malicious.com/image.png' WHERE id = '%s'$$, tests.get_supabase_uid('photo_cust_1')),
  '23514', NULL, 'Full URL in avatar_url is rejected'
);

-- 3b. Unsupported file extension is rejected (check constraint)
SELECT throws_ok(
  format($$UPDATE public.profiles SET avatar_url = '%s/payload.exe' WHERE id = '%s'$$, tests.get_supabase_uid('photo_cust_1'), tests.get_supabase_uid('photo_cust_1')),
  '23514', NULL, 'Unsupported extension in avatar_url is rejected'
);

-- 3c. Cross-user folder spoofing is rejected (trigger integrity)
SELECT throws_ok(
  format($$UPDATE public.profiles SET avatar_url = '%s/avatar.webp' WHERE id = '%s'$$, tests.get_supabase_uid('photo_cust_2'), tests.get_supabase_uid('photo_cust_1')),
  '23514', NULL, 'Cross-user folder spoofing in avatar_url is rejected'
);

-- 3d. Valid user-owned avatar path succeeds
SELECT lives_ok(
  format($$UPDATE public.profiles SET avatar_url = '%s/photo_1.webp' WHERE id = '%s'$$, tests.get_supabase_uid('photo_cust_1'), tests.get_supabase_uid('photo_cust_1')),
  'Valid user-owned avatar path succeeds'
);

SELECT is(
  (SELECT avatar_url FROM public.profiles WHERE id = tests.get_supabase_uid('photo_cust_1')),
  tests.get_supabase_uid('photo_cust_1') || '/photo_1.webp',
  'Customer 1 avatar_url matches updated path'
);

-- ============================================================================
-- 4. Cross-User Storage Access Isolation (RLS)
-- ============================================================================

-- Customer 1 uploading into own folder succeeds
SELECT lives_ok(
  format($$INSERT INTO storage.objects (bucket_id, name, owner)
            VALUES ('avatars', '%s/test.webp', '%s')$$,
         tests.get_supabase_uid('photo_cust_1'),
         tests.get_supabase_uid('photo_cust_1')),
  'Customer 1 can upload into own avatars folder'
);

-- Customer 2 attempting cross-user upload into Customer 1 folder is denied
SELECT tests.authenticate_as('photo_cust_2');

SELECT throws_ok(
  format($$INSERT INTO storage.objects (bucket_id, name, owner)
            VALUES ('avatars', '%s/cross_user_exploit.webp', '%s')$$,
         tests.get_supabase_uid('photo_cust_1'),
         tests.get_supabase_uid('photo_cust_2')),
  '42501', NULL, 'Customer 2 cannot upload into Customer 1 avatars folder'
);

-- Customer 2 attempting to update Customer 1 storage object is denied (RLS hides row, metadata unchanged)
UPDATE storage.objects SET metadata = '{"updated": true}'::jsonb
 WHERE bucket_id = 'avatars' AND name = tests.get_supabase_uid('photo_cust_1') || '/test.webp';

SELECT is(
  (SELECT metadata->>'updated' FROM storage.objects WHERE bucket_id = 'avatars' AND name = tests.get_supabase_uid('photo_cust_1') || '/test.webp'),
  NULL,
  'Customer 2 cannot update Customer 1 avatar storage object'
);

-- Customer 2 attempting to delete Customer 1 storage object affects 0 rows
SET storage.allow_delete_query = 'true';
DELETE FROM storage.objects
 WHERE bucket_id = 'avatars' AND name = tests.get_supabase_uid('photo_cust_1') || '/test.webp';

SELECT is(
  (SELECT count(*)::integer FROM storage.objects WHERE bucket_id = 'avatars' AND name = tests.get_supabase_uid('photo_cust_1') || '/test.webp'),
  1,
  'Customer 2 cannot delete Customer 1 avatar storage object'
);

-- Customer 1 can delete their own avatar object
SELECT tests.authenticate_as('photo_cust_1');
SET storage.allow_delete_query = 'true';

DELETE FROM storage.objects
 WHERE bucket_id = 'avatars' AND name = tests.get_supabase_uid('photo_cust_1') || '/test.webp';

SELECT is(
  (SELECT count(*)::integer FROM storage.objects WHERE bucket_id = 'avatars' AND name = tests.get_supabase_uid('photo_cust_1') || '/test.webp'),
  0,
  'Customer 1 can delete their own avatar object'
);

-- ============================================================================
-- 5. Automated Replacement Cleanup
-- ============================================================================

SELECT tests.authenticate_as_service_role();

-- Create object for old avatar
INSERT INTO storage.objects (bucket_id, name, owner)
VALUES ('avatars', tests.get_supabase_uid('photo_cust_1') || '/old_pic.jpg', tests.get_supabase_uid('photo_cust_1'));

SELECT tests.authenticate_as('photo_cust_1');

UPDATE public.profiles
   SET avatar_url = tests.get_supabase_uid('photo_cust_1') || '/old_pic.jpg'
 WHERE id = tests.get_supabase_uid('photo_cust_1');

-- Now replace avatar with a new path
UPDATE public.profiles
   SET avatar_url = tests.get_supabase_uid('photo_cust_1') || '/new_pic.webp'
 WHERE id = tests.get_supabase_uid('photo_cust_1');

-- The trigger should have deleted the old object automatically
SELECT tests.authenticate_as_service_role();

SELECT is(
  (SELECT count(*)::integer FROM storage.objects WHERE bucket_id = 'avatars' AND name = tests.get_supabase_uid('photo_cust_1') || '/old_pic.jpg'),
  0,
  'Automated trigger deleted replaced avatar object from storage'
);

-- ============================================================================
-- 6. Customer Anonymization Purges Avatar & Storage
-- ============================================================================

-- Create object for new avatar
INSERT INTO storage.objects (bucket_id, name, owner)
VALUES ('avatars', tests.get_supabase_uid('photo_cust_1') || '/new_pic.webp', tests.get_supabase_uid('photo_cust_1'));

SELECT tests.authenticate_as('photo_admin');

SELECT lives_ok(
  format($$SELECT public.admin_anonymize_customer('%s')$$, tests.get_supabase_uid('photo_cust_1')),
  'Admin anonymization of customer succeeds'
);

SELECT is(
  (SELECT avatar_url FROM public.profiles WHERE id = tests.get_supabase_uid('photo_cust_1')),
  NULL,
  'Anonymization clears avatar_url on profile'
);

SELECT is(
  (SELECT count(*)::integer FROM storage.objects WHERE bucket_id = 'avatars' AND (storage.foldername(name))[1] = tests.get_supabase_uid('photo_cust_1')::text),
  0,
  'Anonymization purges all avatars from storage for user'
);

SELECT * FROM finish();
ROLLBACK;
