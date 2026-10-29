-- Explicit grants are necessary: hosted default privileges can be broader or narrower.
revoke all on public.customer_notifications from public, anon, authenticated;
grant select, delete, update (is_read) on public.customer_notifications to authenticated;
revoke all on public.customer_suggestions from public, anon, authenticated;
grant select on public.customer_suggestions to authenticated;
revoke all on public.admin_occasion_reminders from public, anon, authenticated;
grant select, insert, update, delete on public.admin_occasion_reminders to authenticated;

revoke all on function public.notify_on_order_approved() from public, anon, authenticated;
revoke all on function public.notify_on_wishlist_sale() from public, anon, authenticated;
revoke all on function public.validate_profile_avatar() from public, anon, authenticated;
revoke all on function public.cleanup_old_avatar() from public, anon, authenticated;
revoke all on function public.cleanup_deleted_profile_avatar() from public, anon, authenticated;
revoke all on function public.admin_anonymize_customer(uuid) from public, anon;
grant execute on function public.admin_anonymize_customer(uuid) to authenticated;
