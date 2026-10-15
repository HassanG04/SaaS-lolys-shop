-- Migration: Enhance admin_get_forecasts with historical sales and admin_get_reorder_list with stock risk / dead stock

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
  v_history jsonb;
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'day', s.day,
      'units', s.units,
      'revenue', s.revenue
    ) order by s.day asc
  ), '[]'::jsonb)
  into v_history
  from (
    select
      d.day,
      sum(d.units)::integer as units,
      sum(d.revenue)::numeric(12,2) as revenue
    from analytics.sales_daily d
    where (
      (p_series_type = 'shop')
      or (p_series_type = 'category' and d.category_id = p_series_id)
      or (p_series_type = 'product' and d.product_id = p_series_id)
    )
    and d.day >= (current_date - interval '56 days')
    group by d.day
    order by d.day asc
  ) s;

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
    'metrics', v_metrics,
    'history', v_history
  );
end;
$$;

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
      'needs_reorder', (p.stock_quantity <= round((coalesce(fc.daily_mean, 0) * p_lead_time_days + (p_service_z * coalesce(fc.daily_sigma, 1.0) * sqrt(p_lead_time_days)))::numeric, 1)),
      'days_since_last_sale', coalesce((current_date - last_s.last_sale_date), 999),
      'is_dead_stock', (coalesce((current_date - last_s.last_sale_date), 999) >= 60),
      'is_stock_risk', (p.stock_quantity > 0 and case when coalesce(fc.daily_mean, 0) > 0 then (p.stock_quantity::numeric / fc.daily_mean) <= 14 else false end)
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
  left join (
    select
      oi.product_id,
      max(date_trunc('day', o.created_at)::date) as last_sale_date
    from public.order_items oi
    join public.orders o on oi.order_id = o.id
    where o.status != 'cancelled'
    group by oi.product_id
  ) last_s on p.id = last_s.product_id
  where p.is_active = true;

  return v_result;
end;
$$;

revoke all on function public.admin_get_forecasts(text, bigint, bigint) from public, anon;
grant execute on function public.admin_get_forecasts(text, bigint, bigint) to authenticated;

revoke all on function public.admin_get_reorder_list(integer, numeric) from public, anon;
grant execute on function public.admin_get_reorder_list(integer, numeric) to authenticated;
