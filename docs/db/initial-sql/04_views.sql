-- =====================================================================
-- 04_views.sql : per-customer statistics (calculated, never stored)
-- =====================================================================

-- "How much they buy" and "favourite item", worked out from real orders.
-- security_invoker = true means row-level security still applies:
-- a customer sees only their own row, an admin sees everyone.
create or replace view public.customer_stats
with (security_invoker = true) as
select
  p.id                           as user_id,
  p.full_name,
  p.phone,
  p.role,
  coalesce(s.orders_count, 0)    as orders_count,
  coalesce(s.total_spent, 0)     as total_spent,
  f.product_id                   as favorite_product_id,
  f.product_name                 as favorite_product_name
from public.profiles p
left join (
  select user_id, count(*) as orders_count, sum(total) as total_spent
    from public.orders
   where status <> 'cancelled'
   group by user_id
) s on s.user_id = p.id
left join lateral (
  select oi.product_id, oi.product_name
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
   where o.user_id = p.id and o.status <> 'cancelled'
   group by oi.product_id, oi.product_name
   order by sum(oi.quantity) desc, oi.product_id
   limit 1
) f on true;

grant select on public.customer_stats to authenticated;

