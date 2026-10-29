-- T-9.15a: gated, AAL2-only aggregate dataset. No writes or personal identifiers.
create or replace function public.admin_get_forecast_export(p_export boolean default false)
returns jsonb language plpgsql security definer
set search_path = public
set timezone = 'UTC'
as $$
declare
  v_first date;
  v_orders bigint;
  v_days integer;
  v_ready boolean;
  v_start date;
  v_rows jsonb := '[]'::jsonb;
  v_count bigint := 0;
begin
  perform public.require_admin();
  select min(o.created_at::date), count(*) into v_first, v_orders
  from public.orders o
  where o.created_at < current_date and o.status <> 'cancelled'
    and coalesce(o.payment_status::text, '') not in ('rejected', 'expired')
    and ((o.payment_method = 'cod' and o.status in ('confirmed', 'shipped', 'delivered'))
      or (o.payment_method <> 'cod' and o.payment_status = 'paid'))
    and exists (select 1 from public.order_items i where i.order_id = o.id);
  v_days := coalesce(current_date - v_first, 0);
  v_ready := v_days >= 56 and v_orders >= 30;
  -- Bound the file to two years of completed UTC days; never return a partial file.
  v_start := greatest(v_first, current_date - 730);
  if coalesce(p_export, false) and v_ready then
    select coalesce(sum(greatest(0, current_date - greatest(p.created_at::date, v_start))), 0)
      into v_count from public.products p;
    if v_count > 50000 then
      raise exception 'Export exceeds interactive row limit'
        using errcode = '54000', hint = 'SYS-001';
    end if;
    with sales as (
      select o.created_at::date as day, i.product_id,
        sum(i.quantity) as units, sum(i.unit_price * i.quantity) as revenue,
        count(distinct o.id) as orders
      from public.orders o join public.order_items i on i.order_id = o.id
      where o.created_at >= v_start and o.created_at < current_date
        and o.status <> 'cancelled'
        and coalesce(o.payment_status::text, '') not in ('rejected', 'expired')
        and ((o.payment_method = 'cod' and o.status in ('confirmed', 'shipped', 'delivered'))
          or (o.payment_method <> 'cod' and o.payment_status = 'paid'))
      group by o.created_at::date, i.product_id
    ), wishlists as (
      select f.product_id, count(*) as total from public.favorites f group by f.product_id
    )
    select coalesce(jsonb_agg(to_jsonb(r) order by r.sale_date, r.product_id), '[]'::jsonb)
      into v_rows from (
      select d.day::date as sale_date, p.id as product_id,
        p.name as product_name, p.name_ar as product_name_ar,
        p.category_id, c.name as category_name, c.name_ar as category_name_ar,
        coalesce(s.units, 0) as units_sold, coalesce(s.revenue, 0) as revenue_egp,
        coalesce(s.orders, 0) as valid_orders,
        round(s.revenue / nullif(s.units, 0), 2) as average_paid_unit_price,
        p.price as current_list_price, p.discount_percent as current_discount_percent,
        p.stock_quantity as current_stock, coalesce(w.total, 0) as wishlists_at_export,
        sd.closing_stock, sd.stockout_flag,
        cal.ramadan, cal.eid_fitr, cal.eid_adha, cal.mothers_day,
        cal.valentines, cal.black_friday, cal.back_to_school,
        statement_timestamp() as exported_at
      from public.products p join public.categories c on c.id = p.category_id
      cross join lateral generate_series(greatest(p.created_at::date, v_start), current_date - 1, interval '1 day') d(day)
      left join sales s on s.day = d.day::date and s.product_id = p.id
      left join wishlists w on w.product_id = p.id
      left join analytics.stock_daily sd on sd.day = d.day::date and sd.product_id = p.id
      left join analytics.calendar cal on cal.day = d.day::date
    ) r;
  end if;
  return jsonb_build_object('ready', v_ready, 'first_sale_date', v_first,
    'valid_orders', v_orders, 'days_since_first_sale', v_days,
    'minimum_days', 56, 'minimum_orders', 30,
    'row_count', jsonb_array_length(v_rows), 'rows', v_rows);
end;
$$;
revoke all on function public.admin_get_forecast_export(boolean) from public, anon;
grant execute on function public.admin_get_forecast_export(boolean) to authenticated;
