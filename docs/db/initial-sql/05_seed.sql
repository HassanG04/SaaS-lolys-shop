-- =====================================================================
-- 05_seed.sql : starter data
-- Part A is required. Part B is demo data - delete it before launch.
-- =====================================================================

-- ---------- Part A (required): Egypt's 27 governorates ----------
insert into public.governorates (id, name_en, name_ar) values
  (1,  'Cairo',           'القاهرة'),
  (2,  'Giza',            'الجيزة'),
  (3,  'Alexandria',      'الإسكندرية'),
  (4,  'Qalyubia',        'القليوبية'),
  (5,  'Port Said',       'بورسعيد'),
  (6,  'Suez',            'السويس'),
  (7,  'Dakahlia',        'الدقهلية'),
  (8,  'Sharqia',         'الشرقية'),
  (9,  'Gharbia',         'الغربية'),
  (10, 'Monufia',         'المنوفية'),
  (11, 'Beheira',         'البحيرة'),
  (12, 'Kafr El Sheikh',  'كفر الشيخ'),
  (13, 'Damietta',        'دمياط'),
  (14, 'Ismailia',        'الإسماعيلية'),
  (15, 'Faiyum',          'الفيوم'),
  (16, 'Beni Suef',       'بني سويف'),
  (17, 'Minya',           'المنيا'),
  (18, 'Asyut',           'أسيوط'),
  (19, 'Sohag',           'سوهاج'),
  (20, 'Qena',            'قنا'),
  (21, 'Luxor',           'الأقصر'),
  (22, 'Aswan',           'أسوان'),
  (23, 'Red Sea',         'البحر الأحمر'),
  (24, 'New Valley',      'الوادي الجديد'),
  (25, 'Matrouh',         'مطروح'),
  (26, 'North Sinai',     'شمال سيناء'),
  (27, 'South Sinai',     'جنوب سيناء');

-- Delivery fees are deliberately NOT seeded: no row means "not available",
-- so the shop cannot accidentally ship for free. Add real fees in the admin
-- screen, or in SQL, for example (replace the numbers with your own):
--   insert into public.delivery_fees (governorate_id, method, fee)
--   select id, 'egypt_post', 60 from public.governorates;
--   insert into public.delivery_fees (governorate_id, method, fee)
--   values (3, 'representative', 40);   -- representative: Alexandria only

-- ---------- Part B (optional): demo catalogue ----------
insert into public.categories (name, name_ar, slug, sort_order) values
  ('Earrings',  'أقراط',  'earrings',  1),
  ('Chains',    'سلاسل',  'chains',    2),
  ('Rings',     'خواتم',  'rings',     3),
  ('Bracelets', 'أساور',  'bracelets', 4);

insert into public.products
  (category_id, name, price, discount_percent, stock_quantity)
select c.id, v.name, v.price, v.discount, v.stock
  from (values
    (1, 'earrings',  'Pearl drop earrings',   250, 50, 12),
    (2, 'earrings',  'Gold hoop earrings',    400, 0,  5),
    (3, 'chains',    'Thin gold chain',       650, 20, 8),
    (4, 'chains',    'Layered silver chain',  520, 0,  0),
    (5, 'rings',     'Stackable ring set',    300, 50, 15),
    (6, 'bracelets', 'Charm bracelet',        350, 10, 6)
  ) as v(ord, slug, name, price, discount, stock)
  join public.categories c on c.slug = v.slug
 order by v.ord;

-- ---------- Your first admin ----------
-- 1) Sign up on the website with your own email.
-- 2) Run this once in the Supabase SQL editor (it runs as the owner, so the
--    column restrictions for website users do not apply):
--   update public.profiles
--      set role = 'admin'
--    where id = (select id from auth.users where email = 'you@example.com');

