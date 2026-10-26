-- Hosted reconciliation: do not rely on platform-wide default grants.
-- API roles can use the application schema, never create executable objects.
revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

-- Preserve the existing owner + AAL2 policy without granting TRUNCATE or TRIGGER.
revoke all on public.admin_occasion_reminders from public, anon, authenticated;
grant select, insert, update, delete on public.admin_occasion_reminders to authenticated;

-- Keep private tables off the visitor API; customers may only mark their own
-- notifications read, never rewrite the notification text or recipient.
revoke all on public.customer_notifications from public, anon, authenticated;
grant select, delete, update (is_read) on public.customer_notifications to authenticated;
revoke all on public.customer_suggestions from public, anon, authenticated;
grant select on public.customer_suggestions to authenticated;

-- These trigger functions are not callable APIs, even on a fresh platform
-- whose default privileges grant function execution to browser roles.
revoke all on function public.notify_on_order_approved() from public, anon, authenticated;
revoke all on function public.notify_on_wishlist_sale() from public, anon, authenticated;
revoke all on function public.validate_profile_avatar() from public, anon, authenticated;
revoke all on function public.cleanup_old_avatar() from public, anon, authenticated;
revoke all on function public.cleanup_deleted_profile_avatar() from public, anon, authenticated;
