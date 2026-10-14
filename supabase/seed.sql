-- =====================================================================
-- Demo catalogue seed (from 05_seed.sql Part B)
-- =====================================================================

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
