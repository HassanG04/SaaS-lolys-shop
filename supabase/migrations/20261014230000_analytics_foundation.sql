-- =====================================================================
-- 20261014230000_analytics_foundation.sql : T-9.01 Analytics database foundation
-- Scenario S31: analytics schema, restricted roles (analytics_reader, analytics_writer),
-- aggregate views (sales_daily, stock_daily), calendar, forecast tables,
-- forecast_accuracy view, and public admin functions.
-- =====================================================================

-- 1. Create analytics schema
create schema if not exists analytics;
alter schema analytics owner to postgres;

-- 2. Create restricted database roles (no login by default, granted in environments)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'analytics_reader') then
    create role analytics_reader with nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'analytics_writer') then
    create role analytics_writer with nologin;
  end if;
end;
$$;

-- Allow postgres (superuser/test harness) to set role to analytics roles
grant analytics_reader, analytics_writer to postgres;

-- Revoke all permissions on analytics schema from public API roles
revoke all on schema analytics from public, anon, authenticated;
grant usage on schema analytics to analytics_reader, analytics_writer;

-- 3. Analytics Views (Aggregates with Zero Personal Data)

-- View 3.1: sales_daily
-- Aggregates non-cancelled orders with confirmed payment
create or replace view analytics.sales_daily as
select
  date_trunc('day', o.created_at)::date as day,
  oi.product_id,
  p.category_id,
  sum(oi.quantity)::integer as units,
  sum(oi.unit_price * oi.quantity)::numeric(12,2) as revenue,
  count(distinct o.id)::integer as orders,
  coalesce(round(avg(case when p.price > 0 and p.price > oi.unit_price then ((p.price - oi.unit_price) / p.price) * 100 else 0 end), 2), 0)::numeric(5,2) as avg_discount_pct
from public.orders o
join public.order_items oi on o.id = oi.order_id
join public.products p on oi.product_id = p.id
where o.status != 'cancelled'
  and (o.payment_status is null or o.payment_status != 'rejected')
  and (
    (o.payment_method = 'cod' and o.status in ('confirmed', 'shipped', 'delivered'))
    or (o.payment_method != 'cod' and o.payment_status = 'paid')
    or (o.payment_method is null and o.status in ('confirmed', 'shipped', 'delivered'))
  )
group by date_trunc('day', o.created_at)::date, oi.product_id, p.category_id;

alter view analytics.sales_daily owner to postgres;

-- View 3.2: stock_daily
-- Reconstructed closing stock and stockout flag from stock_movements
create or replace view analytics.stock_daily as
with ranked_movements as (
  select
    date_trunc('day', sm.at)::date as day,
    sm.product_id,
    sm.new_quantity as closing_stock,
    row_number() over (
      partition by date_trunc('day', sm.at)::date, sm.product_id
      order by sm.at desc, sm.id desc
    ) as rn
  from public.stock_movements sm
)
select
  day,
  product_id,
  closing_stock,
  (closing_stock <= 0) as stockout_flag
from ranked_movements
where rn = 1;

alter view analytics.stock_daily owner to postgres;

-- 4. Calendar Table
create table if not exists analytics.calendar (
  day            date primary key,
  ramadan        boolean not null default false,
  eid_fitr       boolean not null default false,
  eid_adha       boolean not null default false,
  mothers_day    boolean not null default false,
  valentines     boolean not null default false,
  black_friday   boolean not null default false,
  back_to_school boolean not null default false,
  weekday        smallint not null check (weekday between 0 and 6)
);

alter table analytics.calendar owner to postgres;
alter table analytics.calendar enable row level security;

-- Seed calendar dates for 2026-2028 with official Egyptian / Hijri events
insert into analytics.calendar (
  day, ramadan, eid_fitr, eid_adha, mothers_day, valentines, black_friday, back_to_school, weekday
)
select
  d::date as day,
  (
    (d::date between '2026-02-18' and '2026-03-19') or
    (d::date between '2027-02-08' and '2027-03-09') or
    (d::date between '2028-01-28' and '2028-02-26')
  ) as ramadan,
  (
    (d::date between '2026-03-20' and '2026-03-23') or
    (d::date between '2027-03-10' and '2027-03-13') or
    (d::date between '2028-02-27' and '2028-03-01')
  ) as eid_fitr,
  (
    (d::date between '2026-05-27' and '2026-05-30') or
    (d::date between '2027-05-16' and '2027-05-19') or
    (d::date between '2028-05-05' and '2028-05-08')
  ) as eid_adha,
  (extract(month from d) = 3 and extract(day from d) = 21) as mothers_day,
  (extract(month from d) = 2 and extract(day from d) = 14) as valentines,
  (extract(month from d) = 11 and extract(dow from d) = 5 and extract(day from d) >= 22) as black_friday,
  (extract(month from d) = 9 and extract(day from d) between 15 and 30) as back_to_school,
  extract(dow from d)::smallint as weekday
from generate_series('2026-01-01'::date, '2028-12-31'::date, '1 day'::interval) as s(d)
on conflict (day) do update set
  ramadan = excluded.ramadan,
  eid_fitr = excluded.eid_fitr,
  eid_adha = excluded.eid_adha,
  mothers_day = excluded.mothers_day,
  valentines = excluded.valentines,
  black_friday = excluded.black_friday,
  back_to_school = excluded.back_to_school,
  weekday = excluded.weekday;

-- 5. Forecast Pipeline Tables

-- Table 5.1: forecast_runs
create table if not exists analytics.forecast_runs (
  id            bigint generated always as identity primary key,
  run_at        timestamptz not null default now(),
  git_commit    text not null,
  model_version text not null default 'v1.0',
  input_hash    text not null,
  notes         jsonb default '{}'::jsonb,
  status        text not null default 'completed' check (status in ('running', 'completed', 'failed')),
  created_at    timestamptz not null default now()
);

alter table analytics.forecast_runs owner to postgres;
alter table analytics.forecast_runs enable row level security;
create index if not exists forecast_runs_run_at_idx on analytics.forecast_runs (run_at desc);

-- Table 5.2: sales_forecasts
create table if not exists analytics.sales_forecasts (
  id                bigint generated always as identity primary key,
  run_id            bigint not null references analytics.forecast_runs (id) on delete cascade,
  series_type       text not null check (series_type in ('shop', 'category', 'product')),
  series_id         bigint, -- null for shop, category_id for category, product_id for product
  forecast_date     date not null,
  horizon_step      integer not null check (horizon_step >= 1),
  predicted_units   numeric(10,2) not null check (predicted_units >= 0),
  predicted_revenue numeric(12,2) not null check (predicted_revenue >= 0),
  lower_80          numeric(10,2) not null check (lower_80 >= 0),
  upper_80          numeric(10,2) not null check (upper_80 >= lower_80),
  model_name        text not null,
  created_at        timestamptz not null default now(),
  constraint uq_sales_forecast unique (run_id, series_type, series_id, forecast_date)
);

alter table analytics.sales_forecasts owner to postgres;
alter table analytics.sales_forecasts enable row level security;
create index if not exists sales_forecasts_lookup_idx on analytics.sales_forecasts (run_id, series_type, series_id);
create index if not exists sales_forecasts_date_idx on analytics.sales_forecasts (forecast_date);

-- Table 5.3: forecast_metrics
create table if not exists analytics.forecast_metrics (
  id           bigint generated always as identity primary key,
  run_id       bigint not null references analytics.forecast_runs (id) on delete cascade,
  series_type  text not null check (series_type in ('shop', 'category', 'product')),
  series_id    bigint,
  model_name   text not null,
  fold         integer not null default 1,
  wape         numeric(8,4) not null,
  mase         numeric(8,4),
  pinball_loss numeric(8,4),
  bias         numeric(8,4),
  is_selected  boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table analytics.forecast_metrics owner to postgres;
alter table analytics.forecast_metrics enable row level security;
create index if not exists forecast_metrics_run_idx on analytics.forecast_metrics (run_id, series_type, series_id);

-- Table 5.4: basket_pairs
create table if not exists analytics.basket_pairs (
  id            bigint generated always as identity primary key,
  product_a_id  bigint not null references public.products (id) on delete cascade,
  product_b_id  bigint not null references public.products (id) on delete cascade,
  support       numeric(6,4) not null check (support >= 0 and support <= 1),
  confidence    numeric(6,4) not null check (confidence >= 0 and confidence <= 1),
  lift          numeric(8,4) not null check (lift >= 0),
  sample_orders integer not null default 0,
  updated_at    timestamptz not null default now(),
  constraint check_distinct_products check (product_a_id < product_b_id),
  constraint uq_basket_pair unique (product_a_id, product_b_id)
);

alter table analytics.basket_pairs owner to postgres;
alter table analytics.basket_pairs enable row level security;

-- Table 5.5: cohort_retention
create table if not exists analytics.cohort_retention (
  id               bigint generated always as identity primary key,
  cohort_month     date not null,
  period_months    integer not null check (period_months >= 0),
  cohort_size      integer not null check (cohort_size >= 0),
  active_customers integer not null check (active_customers >= 0),
  retention_rate   numeric(6,4) not null check (retention_rate >= 0 and retention_rate <= 1),
  updated_at       timestamptz not null default now(),
  constraint uq_cohort_period unique (cohort_month, period_months)
);

alter table analytics.cohort_retention owner to postgres;
alter table analytics.cohort_retention enable row level security;

-- 6. Forecast Accuracy View
create or replace view analytics.forecast_accuracy as
select
  f.run_id,
  f.series_type,
  f.series_id,
  f.forecast_date,
  f.horizon_step,
  f.model_name,
  f.predicted_units,
  coalesce(actuals.units, 0) as actual_units,
  (f.predicted_units - coalesce(actuals.units, 0)) as unit_error,
  abs(f.predicted_units - coalesce(actuals.units, 0)) as absolute_error,
  f.predicted_revenue,
  coalesce(actuals.revenue, 0) as actual_revenue,
  (f.predicted_revenue - coalesce(actuals.revenue, 0)) as revenue_error,
  case
    when coalesce(actuals.units, 0) > 0 then
      abs(f.predicted_units - actuals.units) / actuals.units
    else null
  end as ape,
  (coalesce(actuals.units, 0) between f.lower_80 and f.upper_80) as in_interval_80
from analytics.sales_forecasts f
left join (
  select
    s.day,
    s.product_id as series_id,
    'product'::text as series_type,
    s.units,
    s.revenue
  from analytics.sales_daily s
  union all
  select
    s.day,
    s.category_id as series_id,
    'category'::text as series_type,
    sum(s.units)::integer as units,
    sum(s.revenue)::numeric(12,2) as revenue
  from analytics.sales_daily s
  group by s.day, s.category_id
  union all
  select
    s.day,
    null::bigint as series_id,
    'shop'::text as series_type,
    sum(s.units)::integer as units,
    sum(s.revenue)::numeric(12,2) as revenue
  from analytics.sales_daily s
  group by s.day
) actuals on f.series_type = actuals.series_type
         and (f.series_id = actuals.series_id or (f.series_id is null and actuals.series_id is null))
         and f.forecast_date = actuals.day;

alter view analytics.forecast_accuracy owner to postgres;

-- 7. Grant Explicit Permissions on Analytics Schema & Tables

-- Revoke all table/view privileges on schema analytics from public roles
revoke all on all tables in schema analytics from public, anon, authenticated;
revoke all on all functions in schema analytics from public, anon, authenticated;

-- analytics_reader permissions
grant select on analytics.sales_daily to analytics_reader;
grant select on analytics.stock_daily to analytics_reader;
grant select on analytics.calendar to analytics_reader;
grant select on analytics.forecast_runs to analytics_reader;
grant select on analytics.sales_forecasts to analytics_reader;
grant select on analytics.forecast_metrics to analytics_reader;
grant select on analytics.basket_pairs to analytics_reader;
grant select on analytics.cohort_retention to analytics_reader;
grant select on analytics.forecast_accuracy to analytics_reader;

-- analytics_writer permissions
grant select, insert, update, delete on analytics.forecast_runs to analytics_writer;
grant select, insert, update, delete on analytics.sales_forecasts to analytics_writer;
grant select, insert, update, delete on analytics.forecast_metrics to analytics_writer;
grant select, insert, update, delete on analytics.basket_pairs to analytics_writer;
grant select, insert, update, delete on analytics.cohort_retention to analytics_writer;
grant select on analytics.calendar to analytics_writer;
grant usage, select on all sequences in schema analytics to analytics_writer;

-- Row Level Security policies for analytics roles
create policy "analytics_reader_select_runs" on analytics.forecast_runs for select to analytics_reader using (true);
create policy "analytics_reader_select_forecasts" on analytics.sales_forecasts for select to analytics_reader using (true);
create policy "analytics_reader_select_metrics" on analytics.forecast_metrics for select to analytics_reader using (true);
create policy "analytics_reader_select_basket" on analytics.basket_pairs for select to analytics_reader using (true);
create policy "analytics_reader_select_cohort" on analytics.cohort_retention for select to analytics_reader using (true);
create policy "analytics_reader_select_calendar" on analytics.calendar for select to analytics_reader using (true);

create policy "analytics_writer_all_runs" on analytics.forecast_runs for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_all_forecasts" on analytics.sales_forecasts for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_all_metrics" on analytics.forecast_metrics for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_all_basket" on analytics.basket_pairs for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_all_cohort" on analytics.cohort_retention for all to analytics_writer using (true) with check (true);
create policy "analytics_writer_select_calendar" on analytics.calendar for select to analytics_writer using (true);

-- Ensure NO access to public tables for analytics roles (defense in depth)
revoke all on all tables in schema public from analytics_reader, analytics_writer;
revoke all on all functions in schema public from analytics_reader, analytics_writer;
revoke all on all sequences in schema public from analytics_reader, analytics_writer;

-- 8. Admin-Only Functions in Public Schema (Exposing Analytics to Admin at AAL2)

-- Function 8.1: admin_get_forecasts
create or replace function public.admin_get_forecasts(
  p_series_type text default 'shop',
  p_series_id bigint default null,
  p_run_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_run_id bigint;
  v_run_record record;
  v_forecasts jsonb;
  v_metrics jsonb;
begin
  perform public.require_admin();

  if p_run_id is not null then
    v_run_id := p_run_id;
  else
    select id into v_run_id
      from analytics.forecast_runs
     where status = 'completed'
     order by run_at desc
     limit 1;
  end if;

  if v_run_id is null then
    return jsonb_build_object(
      'status', 'no_data',
      'message', 'ANL-001: No forecast runs available'
    );
  end if;

  select id, run_at, git_commit, model_version, notes
    into v_run_record
    from analytics.forecast_runs
   where id = v_run_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'forecast_date', f.forecast_date,
      'horizon_step', f.horizon_step,
      'predicted_units', f.predicted_units,
      'predicted_revenue', f.predicted_revenue,
      'lower_80', f.lower_80,
      'upper_80', f.upper_80,
      'model_name', f.model_name
    ) order by f.forecast_date asc
  ), '[]'::jsonb)
    into v_forecasts
    from analytics.sales_forecasts f
   where f.run_id = v_run_id
     and f.series_type = p_series_type
     and (
       (p_series_type = 'shop' and f.series_id is null)
       or (p_series_type != 'shop' and f.series_id = p_series_id)
     );

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'model_name', m.model_name,
      'wape', m.wape,
      'mase', m.mase,
      'pinball_loss', m.pinball_loss,
      'bias', m.bias,
      'is_selected', m.is_selected
    )
  ), '[]'::jsonb)
    into v_metrics
    from analytics.forecast_metrics m
   where m.run_id = v_run_id
     and m.series_type = p_series_type
     and (
       (p_series_type = 'shop' and m.series_id is null)
       or (p_series_type != 'shop' and m.series_id = p_series_id)
     );

  return jsonb_build_object(
    'status', 'ok',
    'run', jsonb_build_object(
      'id', v_run_record.id,
      'run_at', v_run_record.run_at,
      'git_commit', v_run_record.git_commit,
      'model_version', v_run_record.model_version,
      'notes', v_run_record.notes
    ),
    'forecasts', v_forecasts,
    'metrics', v_metrics
  );
end;
$$;

-- Function 8.2: admin_get_reorder_list
create or replace function public.admin_get_reorder_list(
  p_lead_time_days integer default 7,
  p_service_z numeric default 1.28
)
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.require_admin();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_id', p.id,
      'name', p.name,
      'name_ar', p.name_ar,
      'category_id', p.category_id,
      'stock_quantity', p.stock_quantity,
      'daily_forecast', coalesce(fc.daily_mean, 0),
      'days_of_cover', case
        when coalesce(fc.daily_mean, 0) > 0 then
          round((p.stock_quantity::numeric / fc.daily_mean), 1)
        else 999.0
      end,
      'reorder_point', round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1),
      'suggested_quantity', case
        when p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1) then
          greatest(1, ceil(((coalesce(fc.daily_mean, 0) * (p_lead_time_days + 7)) + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)) - p.stock_quantity)::numeric))::integer
        else 0
      end,
      'needs_reorder', (p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1))
    ) order by
      case when p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1) then 0 else 1 end,
      p.stock_quantity asc
  ), '[]'::jsonb)
  into v_result
  from public.products p
  left join (
    select
      f.series_id as product_id,
      avg(f.predicted_units)::numeric(10,2) as daily_mean,
      coalesce(stddev(f.predicted_units), 1.0)::numeric(10,2) as daily_sigma
    from analytics.sales_forecasts f
    where f.series_type = 'product'
      and f.run_id = (select id from analytics.forecast_runs where status = 'completed' order by run_at desc limit 1)
    group by f.series_id
  ) fc on p.id = fc.product_id
  where p.is_active = true;

  return v_result;
end;
$$;

-- Function 8.3: admin_get_analytics_insights
create or replace function public.admin_get_analytics_insights()
returns jsonb
language plpgsql
security definer
set search_path = public, analytics, pg_temp
as $$
declare
  v_basket jsonb;
  v_cohorts jsonb;
begin
  perform public.require_admin();

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
    limit 20
  ) t;

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

  return jsonb_build_object(
    'basket_pairs', v_basket,
    'cohorts', v_cohorts
  );
end;
$$;

-- Grants on Public Admin Functions
revoke all on function public.admin_get_forecasts(text, bigint, bigint) from public, anon;
grant execute on function public.admin_get_forecasts(text, bigint, bigint) to authenticated;

revoke all on function public.admin_get_reorder_list(integer, numeric) from public, anon;
grant execute on function public.admin_get_reorder_list(integer, numeric) to authenticated;

revoke all on function public.admin_get_analytics_insights() from public, anon;
grant execute on function public.admin_get_analytics_insights() to authenticated;
