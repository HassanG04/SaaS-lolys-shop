begin;
select plan(15);
select tests.create_supabase_user('role_guard_customer');
select tests.create_supabase_user('role_guard_admin');
update public.profiles set role = 'admin' where id = tests.get_supabase_uid('role_guard_admin');

-- Exercise the trigger independently of the normal column-level denial.
grant update(role) on public.profiles to authenticated;
select tests.authenticate_as('role_guard_customer', 'aal2');
select throws_ok(
  $$update public.profiles set role = 'admin' where id = auth.uid()$$,
  '42501', 'Role cannot be modified through the API', 'S20: trigger rejects customer even with accidental role grant');
select tests.authenticate_as('role_guard_admin', 'aal2');
select throws_ok(
  $$update public.profiles set role = 'customer' where id = auth.uid()$$,
  '42501', 'Role cannot be modified through the API', 'S20: trigger rejects aal2 admin even with accidental role grant');
select tests.authenticate_as_service_role();
select throws_ok(
  $$update public.profiles set role = 'admin' where id = tests.get_supabase_uid('role_guard_customer')$$,
  '42501', 'Role cannot be modified through the API', 'S20: service-role API cannot promote users');
reset role;
select set_config('request.jwt.claims', '', true);
select lives_ok(
  $$update public.profiles set role = 'admin' where id = tests.get_supabase_uid('role_guard_customer')$$,
  'S20: owner SQL can promote');
select is((select role::text from public.profiles where id = tests.get_supabase_uid('role_guard_customer')), 'admin', 'S20: owner promotion persisted');
update public.profiles set role = 'customer' where id = tests.get_supabase_uid('role_guard_customer');

select tests.authenticate_as('role_guard_customer');
select throws_ok($$select public.audit_event('FORGED', 'profiles', 'fake')$$, '42501', null, 'S21: customer cannot forge audit helper entries');
select throws_ok($$insert into public.audit_log(actor_role,action,entity,entity_id) values ('admin','FORGED','profiles','fake')$$, '42501', null, 'S21: customer cannot directly append audit entries');
select tests.authenticate_as('role_guard_admin', 'aal2');
select throws_ok($$select public.audit_event('FORGED', 'profiles', 'fake')$$, '42501', null, 'S21: aal2 admin cannot forge audit helper entries');
select throws_ok($$insert into public.audit_log(actor_role,action,entity,entity_id) values ('admin','FORGED','profiles','fake')$$, '42501', null, 'S21: aal2 admin cannot directly append audit entries');
select throws_ok($$truncate public.audit_log$$, '42501', null, 'S21: aal2 admin cannot truncate audit history');
select tests.authenticate_as_service_role();
select throws_ok($$select public.audit_event('FORGED', 'profiles', 'fake')$$, '42501', null, 'S21: service-role API cannot forge helper entries');
select throws_ok($$insert into public.audit_log(actor_role,action,entity,entity_id) values ('admin','FORGED','profiles','fake')$$, '42501', null, 'S21: service-role API cannot directly append audit entries');
reset role;
select set_config('request.jwt.claims', '', true);
select is((select count(*) from public.audit_log where action = 'FORGED'), 0::bigint, 'S21: no forged events persisted');
select ok(exists(select 1 from public.audit_log where entity = 'profiles' and entity_id = tests.get_supabase_uid('role_guard_customer')::text and actor is null and actor_role = 'postgres'), 'S21: owner promotion is attributed to the owner');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 'S17: every public table including audit_log has RLS');
select * from finish();
rollback;
