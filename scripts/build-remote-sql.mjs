import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const migrationsDir = path.join(root, 'supabase', 'migrations')

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

let combined = `-- =====================================================================
-- LOLYS ACCESSORIES & HOME - COMPLETE REMOTE DATABASE INITIALIZATION
-- Target: Supabase Cloud (PostgreSQL 15+)
-- How to apply:
--   1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/wcdkrgrceczeuttnijwf
--   2. Click "SQL Editor" in the left navigation.
--   3. Click "New query", paste the entire contents of this file, and click "Run".
-- =====================================================================\n\n`

for (const file of files) {
  combined += `-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`
  combined += `-- MIGRATION: ${file}\n`
  combined += `-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n`
  combined += readFileSync(path.join(migrationsDir, file), 'utf8') + '\n\n'
}

combined += `-- =====================================================================
-- PART 2: STORE POLICIES & INITIAL SEEDING
-- =====================================================================

-- 1. Postal Mail Delivery (Egypt Post ONLY for all 27 governorates)
-- Delivery is strictly through Egypt Post (Postal Code / البريد المصري).
insert into public.delivery_fees (governorate_id, method, fee)
select id, 'egypt_post', 50.00
from public.governorates
on conflict (governorate_id, method) do update set fee = excluded.fee;

-- Ensure courier/representative delivery is completely removed
delete from public.delivery_fees where method = 'representative';

-- 2. Payment Method (InstaPay ONLY - Cash on Delivery disabled)
update public.shop_settings
set value = '["instapay_qr"]'::jsonb
where key = 'payment_methods_enabled';

-- 3. Initial Categories (Bilingual: English + Arabic)
insert into public.categories (name, name_ar, slug, sort_order)
values
  ('Earrings',  'أقراط',  'earrings',  1),
  ('Chains',    'سلاسل',  'chains',    2),
  ('Rings',     'خواتم',  'rings',     3),
  ('Bracelets', 'أساور',  'bracelets', 4)
on conflict (slug) do update set
  name = excluded.name,
  name_ar = excluded.name_ar,
  sort_order = excluded.sort_order;

-- 4. Initial Sample Products
insert into public.products
  (category_id, name, name_ar, price, discount_percent, stock_quantity, is_active)
select c.id, v.name, v.name_ar, v.price, v.discount, v.stock, true
  from (values
    ('earrings',  'Pearl drop earrings',  'أقراط لؤلؤ متدلية',    250, 50, 12),
    ('earrings',  'Gold hoop earrings',   'أقراط حلقية ذهبية',    400, 0,  5),
    ('chains',    'Thin gold chain',      'سلسلة ذهبية رقيقة',    650, 20, 8),
    ('chains',    'Layered silver chain', 'سلسلة فضية متعددة',    520, 0,  10),
    ('rings',     'Stackable ring set',   'طقم خواتم متناسقة',    300, 50, 15),
    ('bracelets', 'Charm bracelet',       'سوار دلايات أنيق',     350, 10, 6)
  ) as v(slug, name, name_ar, price, discount, stock)
  join public.categories c on c.slug = v.slug
where not exists (
  select 1 from public.products p where p.name = v.name and p.category_id = c.id
);

-- 5. Backfill any existing auth users into public.profiles
insert into public.profiles (id, full_name, role)
select id, coalesce(raw_user_meta_data->>'full_name', ''), 'customer'::public.user_role
from auth.users
on conflict (id) do nothing;

-- =====================================================================
-- PART 3: ADMIN ACCOUNT PROMOTION (RUN AFTER YOU SIGN UP)
-- =====================================================================
-- 1. Sign up on the live website or in Supabase Auth (Authentication -> Users -> Add User).
-- 2. Replace 'YOUR_EMAIL@EXAMPLE.COM' with your email and run this query:
--
-- update public.profiles
--    set role = 'admin'
--  where id = (select id from auth.users where email = 'YOUR_EMAIL@EXAMPLE.COM');
--
-- 3. Once promoted, visit /account/security to set up your 2FA authenticator app.
-- 4. Log in to /admin to manage orders, products, and categories.
`

const outPath = path.join(root, 'setup_remote_supabase.sql')
writeFileSync(outPath, combined, 'utf8')
console.log(
  `Successfully generated ${outPath} (${combined.length} bytes, ${files.length} migrations)`,
)
