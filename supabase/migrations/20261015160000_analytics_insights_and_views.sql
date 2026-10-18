-- Migration: 20261015160000_analytics_insights_and_views.sql
-- Description: Descriptive analyses, aggregate customer segments table, analytics SQL views, and comprehensive admin insights RPC (T-9.11)

-- 1. Customer Segments Table (RFM Aggregates with zero PII)
create table if not exists analytics.customer_segments (
  id               bigint generated always as identity primary key,
  segment          text not null check (segment in ('champions', 'loyal', 'promising', 'at_risk', 'lost', 'other')),
  customer_count   integer not null check (customer_count >= 0),
  total_revenue    numeric(12,2) not null check (total_revenue >= 0),
  avg_order_value  numeric(10,2) not null check (avg_order_value >= 0),
  updated_at       timestamptz not null default now(),
  constraint uq_customer_segment unique (segment)
);

alter table analytics.customer_segments owner to postgres;
alter table analytics.customer_segments enable row level security;
grant select on analytics.customer_segments to analytics_reader;
grant select, insert, update, delete on analytics.customer_segments to analytics_writer;

-- 2. Sales Overview View (7d and 28d moving averages)
create or replace view analytics.sales_overview as
with daily_totals as (
  select
    day,
    sum(units)::integer as units,
    sum(revenue)::numeric(12,2) as revenue
  from analytics.sales_daily
  group by day
),
moving_averages as (
  select
    day,
    units,
    revenue,
    round(avg(units) over (order by day rows between 6 preceding and current row), 2)::numeric(10,2) as units_ma7,
    round(avg(revenue) over (order by day rows between 6 preceding and current row), 2)::numeric(12,2) as revenue_ma7,
    round(avg(units) over (order by day rows between 27 preceding and current row), 2)::numeric(10,2) as units_ma28,
    round(avg(revenue) over (order by day rows between 27 preceding and current row), 2)::numeric(12,2) as revenue_ma28
  from daily_totals
)
select * from moving_averages;

alter view analytics.sales_overview owner to postgres;
grant select on analytics.sales_overview to analytics_reader;

-- 3. Product Performance View (ABC Revenue Share & XYZ Demand Variability)
create or replace view analytics.product_performance as
with product_rev as (
  select
    p.id as product_id,
    p.name,
    p.name_ar,
    p.category_id,
    coalesce(sum(sd.revenue), 0)::numeric(12,2) as total_revenue,
    coalesce(sum(sd.units), 0)::integer as total_units
  from public.products p
  left join analytics.sales_daily sd on p.id = sd.product_id
  where p.is_active = true
  group by p.id, p.name, p.name_ar, p.category_id
),
total_shop_rev as (
  select coalesce(sum(total_revenue), 0) as grand_total from product_rev
),
abc_calc as (
  select
    pr.*,
    case
      when tsr.grand_total > 0 then round((pr.total_revenue / tsr.grand_total * 100)::numeric, 2)
      else 0
    end as revenue_share_pct,
    case
      when tsr.grand_total > 0 then
        round((sum(pr.total_revenue) over (order by pr.total_revenue desc, pr.product_id asc) / tsr.grand_total * 100)::numeric, 2)
      else 100
    end as cum_revenue_pct
  from product_rev pr
  cross join total_shop_rev tsr
),
weekly_demand as (
  select
    oi.product_id,
    date_trunc('week', o.created_at)::date as week_start,
    sum(oi.quantity)::numeric as weekly_units
  from public.order_items oi
  join public.orders o on oi.order_id = o.id
  where o.status != 'cancelled'
  group by oi.product_id, date_trunc('week', o.created_at)::date
),
xyz_calc as (
  select
    product_id,
    avg(weekly_units) as mean_weekly,
    stddev(weekly_units) as std_weekly
  from weekly_demand
  group by product_id
)
select
  a.product_id,
  a.name,
  a.name_ar,
  a.category_id,
  a.total_revenue,
  a.total_units,
  a.revenue_share_pct,
  case
    when a.cum_revenue_pct <= 80.00 then 'A'
    when a.cum_revenue_pct <= 95.00 then 'B'
    else 'C'
  end as abc_class,
  case
    when coalesce(x.mean_weekly, 0) = 0 then 'Z'
    when (coalesce(x.std_weekly, 0) / x.mean_weekly) < 0.5 then 'X'
    when (coalesce(x.std_weekly, 0) / x.mean_weekly) <= 1.0 then 'Y'
    else 'Z'
  end as xyz_class,
  case
    when coalesce(x.mean_weekly, 0) > 0 then round((coalesce(x.std_weekly, 0) / x.mean_weekly)::numeric, 2)
    else null
  end as cv_demand
from abc_calc a
left join xyz_calc x on a.product_id = x.product_id;

alter view analytics.product_performance owner to postgres;
grant select on analytics.product_performance to analytics_reader;

-- 4. Discount Effect View
create or replace view analytics.discount_effect as
with weekly_discount as (
  select
    date_trunc('week', sd.day)::date as week_start,
    (avg(sd.avg_discount_pct) > 5.0) as is_discount_week,
    sum(sd.units)::numeric as units,
    sum(sd.revenue)::numeric as revenue
  from analytics.sales_daily sd
  group by date_trunc('week', sd.day)::date
),
stats as (
  select
    is_discount_week,
    count(*)::integer as weeks_count,
    round(avg(units)::numeric, 1) as avg_weekly_units,
    round(avg(revenue)::numeric, 2) as avg_weekly_revenue
  from weekly_discount
  group by is_discount_week
),
comp as (
  select
    disc.avg_weekly_units as promo_units,
    base.avg_weekly_units as regular_units,
    case
      when coalesce(base.avg_weekly_units, 0) > 0 then
        round((((disc.avg_weekly_units - base.avg_weekly_units) / base.avg_weekly_units) * 100)::numeric, 1)
      else 0
    end as unit_lift_pct
  from (select * from stats where is_discount_week = true) disc
  full outer join (select * from stats where is_discount_week = false) base on true
)
select
  coalesce(promo_units, 0)::numeric(10,1) as promo_weekly_units,
  coalesce(regular_units, 0)::numeric(10,1) as baseline_weekly_units,
  coalesce(unit_lift_pct, 0)::numeric(6,1) as uplift_pct,
  'هذا التحليل للمقارنة ولا يثبت علاقة سببية حتمية'::text as note_ar,
  'Correlation for comparison; not proof of cause'::text as note_en
from comp;

alter view analytics.discount_effect owner to postgres;
grant select on analytics.discount_effect to analytics_reader;

-- 5. Fulfilment Quality View
create or replace view analytics.fulfilment_quality as
with order_metrics as (
  select
    o.id,
    o.status,
    o.payment_method,
    o.payment_status,
    o.delivery_method,
    coalesce(nullif(o.ship_governorate, ''), 'القاهرة') as governorate,
    o.created_at,
    case
      when o.status = 'delivered' and o.created_at is not null then
        extract(epoch from (o.updated_at - o.created_at)) / 86400.0
      else null
    end as delivery_days,
    case
      when o.payment_method = 'instapay_qr' and o.payment_status = 'paid' and o.payment_submitted_at is not null and o.paid_at is not null then
        extract(epoch from (o.paid_at - o.payment_submitted_at)) / 3600.0
      else null
    end as proof_turnaround_hours
  from public.orders o
)
select
  count(*)::integer as total_orders,
  coalesce(round((count(*) filter (where status = 'cancelled')::numeric / nullif(count(*), 0) * 100), 1), 0)::numeric(5,1) as cancellation_rate_pct,
  coalesce(round((count(*) filter (where payment_status = 'rejected')::numeric / nullif(count(*), 0) * 100), 1), 0)::numeric(5,1) as refusal_rate_pct,
  coalesce(round((count(*) filter (where status = 'cancelled' and payment_status in ('unpaid', 'awaiting_proof'))::numeric / nullif(count(*), 0) * 100), 1), 0)::numeric(5,1) as expiry_rate_pct,
  round(coalesce(percentile_cont(0.5) within group (order by delivery_days), 0)::numeric, 1) as median_delivery_days,
  round(coalesce(avg(proof_turnaround_hours), 0)::numeric, 1) as avg_proof_hours
from order_metrics;

alter view analytics.fulfilment_quality owner to postgres;
grant select on analytics.fulfilment_quality to analytics_reader;

-- 6. Geography Distribution View (Privacy Rule: groups < 5 customers merged into 'أخرى')
create or replace view analytics.geography as
with gov_raw as (
  select
    coalesce(nullif(o.ship_governorate, ''), 'القاهرة') as governorate,
    count(distinct o.user_id)::integer as customer_count,
    count(o.id)::integer as orders_count,
    sum(o.total)::numeric(12,2) as total_revenue
  from public.orders o
  where o.status != 'cancelled'
  group by coalesce(nullif(o.ship_governorate, ''), 'القاهرة')
),
gov_anonymized as (
  select
    case when customer_count >= 5 then governorate else 'أخرى' end as governorate,
    customer_count,
    orders_count,
    total_revenue
  from gov_raw
)
select
  governorate,
  sum(customer_count)::integer as customer_count,
  sum(orders_count)::integer as orders_count,
  sum(total_revenue)::numeric(12,2) as total_revenue
from gov_anonymized
group by governorate
order by total_revenue desc;

alter view analytics.geography owner to postgres;
grant select on analytics.geography to analytics_reader;

-- 7. Updated admin_get_analytics_insights Function (AAL2 MFA Enforced)
create or replace function public.admin_get_analytics_insights()
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_basket jsonb;
  v_cohorts jsonb;
  v_segments jsonb;
  v_sales_overview jsonb;
  v_product_perf jsonb;
  v_discount_effect jsonb;
  v_fulfilment jsonb;
  v_geography jsonb;
begin
  perform public.require_admin();

  -- 1. Basket Analysis Pairs
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_a_id', t.product_a_id,
      'product_a_name', t.name_a,
      'product_a_name_ar', t.name_ar_a,
      'product_b_id', t.product_b_id,
      'product_b_name', t.name_b,
      'product_b_name_ar', t.name_ar_b,
      'support', t.support,
      'confidence', t.confidence,
      'lift', t.lift,
      'sample_orders', t.sample_orders
    )
  ), '[]'::jsonb)
  into v_basket
  from (
    select
      b.product_a_id,
      pa.name as name_a,
      pa.name_ar as name_ar_a,
      b.product_b_id,
      pb.name as name_b,
      pb.name_ar as name_ar_b,
      b.support,
      b.confidence,
      b.lift,
      b.sample_orders
    from analytics.basket_pairs b
    join public.products pa on b.product_a_id = pa.id
    join public.products pb on b.product_b_id = pb.id
    order by b.lift desc
    limit 25
  ) t;

  -- 2. Cohort Retention Matrix
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'cohort_month', c.cohort_month,
      'period_months', c.period_months,
      'cohort_size', c.cohort_size,
      'active_customers', c.active_customers,
      'retention_rate', c.retention_rate
    ) order by c.cohort_month desc, c.period_months asc
  ), '[]'::jsonb)
  into v_cohorts
  from analytics.cohort_retention c;

  -- 3. Customer Segments (RFM)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'segment', s.segment,
      'customer_count', s.customer_count,
      'total_revenue', s.total_revenue,
      'avg_order_value', s.avg_order_value
    ) order by s.total_revenue desc
  ), '[]'::jsonb)
  into v_segments
  from analytics.customer_segments s;

  -- 4. Sales Overview (Recent 28 days)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'day', so.day,
      'units', so.units,
      'revenue', so.revenue,
      'units_ma7', so.units_ma7,
      'revenue_ma7', so.revenue_ma7,
      'units_ma28', so.units_ma28,
      'revenue_ma28', so.revenue_ma28
    ) order by so.day asc
  ), '[]'::jsonb)
  into v_sales_overview
  from (
    select * from analytics.sales_overview order by day desc limit 28
  ) so;

  -- 5. Product Performance (ABC / XYZ)
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_id', pp.product_id,
      'name', pp.name,
      'name_ar', pp.name_ar,
      'category_id', pp.category_id,
      'total_revenue', pp.total_revenue,
      'total_units', pp.total_units,
      'revenue_share_pct', pp.revenue_share_pct,
      'abc_class', pp.abc_class,
      'xyz_class', pp.xyz_class,
      'cv_demand', pp.cv_demand
    ) order by pp.total_revenue desc
  ), '[]'::jsonb)
  into v_product_perf
  from (
    select * from analytics.product_performance order by total_revenue desc limit 50
  ) pp;

  -- 6. Discount Effect
  select coalesce(
    jsonb_build_object(
      'promo_weekly_units', de.promo_weekly_units,
      'baseline_weekly_units', de.baseline_weekly_units,
      'uplift_pct', de.uplift_pct,
      'note_ar', de.note_ar,
      'note_en', de.note_en
    ),
    jsonb_build_object(
      'promo_weekly_units', 0,
      'baseline_weekly_units', 0,
      'uplift_pct', 0,
      'note_ar', 'هذا التحليل للمقارنة ولا يثبت علاقة سببية حتمية',
      'note_en', 'Correlation for comparison; not proof of cause'
    )
  )
  into v_discount_effect
  from analytics.discount_effect de
  limit 1;

  -- 7. Fulfilment Quality
  select coalesce(
    jsonb_build_object(
      'total_orders', fq.total_orders,
      'cancellation_rate_pct', fq.cancellation_rate_pct,
      'refusal_rate_pct', fq.refusal_rate_pct,
      'expiry_rate_pct', fq.expiry_rate_pct,
      'median_delivery_days', fq.median_delivery_days,
      'avg_proof_hours', fq.avg_proof_hours
    ),
    jsonb_build_object(
      'total_orders', 0,
      'cancellation_rate_pct', 0,
      'refusal_rate_pct', 0,
      'expiry_rate_pct', 0,
      'median_delivery_days', 0,
      'avg_proof_hours', 0
    )
  )
  into v_fulfilment
  from analytics.fulfilment_quality fq;

  -- 8. Geography Distribution
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'governorate', g.governorate,
      'customer_count', g.customer_count,
      'orders_count', g.orders_count,
      'total_revenue', g.total_revenue
    ) order by g.total_revenue desc
  ), '[]'::jsonb)
  into v_geography
  from analytics.geography g;

  return jsonb_build_object(
    'basket_pairs', v_basket,
    'cohorts', v_cohorts,
    'customer_segments', v_segments,
    'sales_overview', v_sales_overview,
    'product_performance', v_product_perf,
    'discount_effect', coalesce(v_discount_effect, '{}'::jsonb),
    'fulfilment_quality', coalesce(v_fulfilment, '{}'::jsonb),
    'geography', v_geography
  );
end;
$$;
