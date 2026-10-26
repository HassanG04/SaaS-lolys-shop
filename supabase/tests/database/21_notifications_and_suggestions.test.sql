BEGIN;
SELECT plan(28);

SELECT tests.create_supabase_user('notif_admin');
SELECT tests.create_supabase_user('notif_cust_1');
SELECT tests.create_supabase_user('notif_cust_2');

UPDATE public.profiles SET role = 'admin' WHERE id = tests.get_supabase_uid('notif_admin');

-- 1. Anonymous Access Restrictions
SELECT tests.clear_authentication();

SELECT throws_ok(
  $$SELECT * FROM public.customer_notifications$$,
  '42501', NULL,
  'Anonymous cannot read the private notification table'
);

SELECT throws_ok(
  $$INSERT INTO public.customer_notifications (customer_id, type, title_ar, title_en, message_ar, message_en)
    VALUES (gen_random_uuid(), 'general_sale', 'ع', 'E', 'م', 'M')$$,
  '42501', NULL, 'Anonymous cannot insert customer notifications'
);

SELECT throws_ok(
  $$SELECT public.submit_customer_suggestion('products', 'A valid suggestion text here.')$$,
  '42501', NULL, 'Anonymous cannot submit suggestion'
);

SELECT throws_ok(
  $$SELECT * FROM public.admin_get_wishlist_demand()$$,
  '42501', NULL, 'Anonymous cannot access wishlist demand'
);

-- 2. Customer Suggestions Validation & Isolation
SELECT tests.authenticate_as('notif_cust_1');

SELECT throws_ok(
  $$SELECT public.submit_customer_suggestion('invalid_topic', 'Valid message content here.')$$,
  '22023', 'Invalid suggestion topic', 'Invalid suggestion topic rejected'
);

SELECT throws_ok(
  $$SELECT public.submit_customer_suggestion('products', 'Too short')$$,
  '22023', 'Suggestion message must be between 10 and 1000 characters', 'Suggestion message under 10 chars rejected'
);

SELECT throws_ok(
  $$SELECT public.submit_customer_suggestion('products', repeat('a', 1001))$$,
  '22023', 'Suggestion message must be between 10 and 1000 characters', 'Suggestion message over 1000 chars rejected'
);

SELECT public.submit_customer_suggestion('products', 'Please add more silver rings to your collection!') AS sugg_id \gset

SELECT is(
  (SELECT count(*)::integer FROM public.customer_suggestions WHERE id = :'sugg_id'),
  1,
  'Customer 1 sees their own submitted suggestion'
);

SELECT tests.authenticate_as('notif_cust_2');
SELECT is(
  (SELECT count(*)::integer FROM public.customer_suggestions WHERE id = :'sugg_id'),
  0,
  'Customer 2 cannot see Customer 1 suggestion'
);

SELECT throws_ok(
  format($$SELECT public.admin_review_suggestion(%L::uuid, 'reviewed', 'Ok')$$, :'sugg_id'),
  '42501', NULL, 'Non-admin cannot review suggestions'
);

-- 3. Admin Suggestion Review
SELECT tests.authenticate_as('notif_admin', 'aal2');

SELECT is(
  (SELECT count(*)::integer FROM public.customer_suggestions WHERE id = :'sugg_id'),
  1,
  'Admin can see all customer suggestions'
);

SELECT throws_ok(
  format($$SELECT public.admin_review_suggestion(%L::uuid, 'invalid_status')$$, :'sugg_id'),
  '22023', 'Invalid suggestion status', 'Invalid suggestion status rejected'
);

SELECT lives_ok(
  format($$SELECT public.admin_review_suggestion(%L::uuid, 'reviewed', 'Added to quarterly roadmap')$$, :'sugg_id'),
  'Admin successfully reviews suggestion'
);

SELECT is(
  (SELECT status FROM public.customer_suggestions WHERE id = :'sugg_id'),
  'reviewed',
  'Suggestion status updated to reviewed'
);

SELECT ok(
  exists(
    SELECT 1 FROM public.audit_log
     WHERE entity = 'customer_suggestions'
       AND entity_id = :'sugg_id'
       AND action = 'SUGGESTION_REVIEW'
  ),
  'Audit log recorded for suggestion review'
);

-- 4. Customer Notifications: Direct Insertion & Update Isolation
SELECT tests.authenticate_as('notif_cust_1');

SELECT throws_ok(
  format($$INSERT INTO public.customer_notifications (customer_id, type, title_ar, title_en, message_ar, message_en)
    VALUES (%L, 'general_sale', 'ع', 'E', 'م', 'M')$$, tests.get_supabase_uid('notif_cust_1')),
  '42501', NULL, 'Direct notification insertion denied for customers'
);

-- Admin broadcasts a general sale notification
SELECT tests.authenticate_as('notif_admin', 'aal2');

SELECT throws_ok(
  $$SELECT public.admin_broadcast_sale_notification('', 'Valid Title', 'Message AR', 'Message EN')$$,
  '22023', 'Invalid notification payload', 'Empty title rejected'
);

SELECT lives_ok(
  $$SELECT public.admin_broadcast_sale_notification(
      'تخفيضات نهاية الموسم',
      'End of Season Sale',
      'خصومات تصل إلى 40% على جميع الإكسسوارات لفترة محدودة!',
      'Up to 40% off all accessories for a limited time!',
      '/category/all'
    )$$,
  'Admin broadcasts general sale notification'
);

SELECT tests.authenticate_as('notif_cust_1');
SELECT ok(
  exists(
    SELECT 1 FROM public.customer_notifications
     WHERE customer_id = tests.get_supabase_uid('notif_cust_1')
       AND type = 'general_sale'
       AND is_read = false
  ),
  'Customer 1 received broadcast sale notification'
);

SELECT lives_ok(
  $$SELECT public.mark_all_notifications_read()$$,
  'Customer 1 marks all notifications read'
);

SELECT is(
  (SELECT count(*)::integer FROM public.customer_notifications
    WHERE customer_id = tests.get_supabase_uid('notif_cust_1') AND is_read = false),
  0,
  'Customer 1 unread notification count is now 0'
);

-- 5. Automatic Wishlist Sale Notification Trigger
-- Admin creates test product with 0 discount
SELECT tests.authenticate_as('notif_admin', 'aal2');
INSERT INTO public.products (id, category_id, name, name_ar, price, discount_percent, stock_quantity, is_active)
VALUES (888801, 1, 'Test Pearl Ring', 'خاتم لؤلؤ تجريبي', 200, 0, 10, true)
ON CONFLICT (id) DO UPDATE SET discount_percent = 0, is_active = true;

-- Customer 2 adds product to favorites
SELECT tests.authenticate_as('notif_cust_2');
INSERT INTO public.favorites (user_id, product_id)
VALUES (tests.get_supabase_uid('notif_cust_2'), 888801)
ON CONFLICT DO NOTHING;

-- Admin updates product with a discount
SELECT tests.authenticate_as('notif_admin', 'aal2');
UPDATE public.products
   SET discount_percent = 20
 WHERE id = 888801;

-- Customer 2 should now have a wishlist_sale notification
SELECT tests.authenticate_as('notif_cust_2');
SELECT ok(
  exists(
    SELECT 1 FROM public.customer_notifications
     WHERE customer_id = tests.get_supabase_uid('notif_cust_2')
       AND type = 'wishlist_sale'
       AND link = '/products/888801'
  ),
  'Customer 2 automatically notified of wishlist item discount'
);

-- Customer 1 did not favorite 888801, should not have that notification
SELECT tests.authenticate_as('notif_cust_1');
SELECT is(
  (SELECT count(*)::integer FROM public.customer_notifications
    WHERE customer_id = tests.get_supabase_uid('notif_cust_1')
      AND type = 'wishlist_sale'
      AND link = '/products/888801'),
  0,
  'Customer 1 did not receive wishlist notification for non-favorited item'
);

-- 6. Wishlist Demand Reporting RPC
SELECT tests.authenticate_as('notif_cust_1');
SELECT throws_ok(
  $$SELECT * FROM public.admin_get_wishlist_demand()$$,
  '42501', NULL, 'Customers cannot call wishlist demand RPC'
);

SELECT tests.authenticate_as('notif_admin', 'aal2');
SELECT ok(
  exists(
    SELECT 1 FROM public.admin_get_wishlist_demand()
     WHERE product_id = 888801
       AND wishlist_count >= 1
  ),
  'Admin wishlist demand query reports favorited item count'
);

-- 7. Anonymization erases customer notifications and disassociates suggestions
SELECT lives_ok(
  format($$SELECT public.admin_anonymize_customer(%L::uuid)$$, tests.get_supabase_uid('notif_cust_1')),
  'Admin anonymizes customer 1'
);

SELECT is(
  (SELECT count(*)::integer FROM public.customer_notifications
    WHERE customer_id = tests.get_supabase_uid('notif_cust_1')),
  0,
  'Customer 1 notifications deleted upon anonymization'
);

SELECT is(
  (SELECT customer_id FROM public.customer_suggestions WHERE id = :'sugg_id'),
  NULL,
  'Customer 1 suggestion disassociated (customer_id is null) upon anonymization'
);

SELECT * FROM finish();
ROLLBACK;
