# Initial admin provisioning runbook

- Status: active
- Task: T-1.14
- Applies to: local, staging, and production environments

This runbook describes the procedure for granting initial administrator privileges to an account.

---

## 1. Security principles

Under Lolys' security architecture:

1. **No client promotion**: Regular users and customers can never promote accounts or alter `profiles.role` via client API, Supabase RPC, or frontend mutations.
2. **Owner-only authority**: Account promotion is strictly restricted to direct database owner SQL execution (e.g. Supabase Dashboard SQL Editor or direct owner connection via `psql`).
3. **MFA requirement**: In Phase 1 hardening (T-1.15), all administrative functions and Row Level Security policies require multi-factor authentication at level `aal2`. Promoting the profile is step one; enrolling an MFA factor is required before executing administrative operations.

---

## 2. Step-by-step promotion procedure

### Step 1: Sign up normally

The person to be appointed as administrator must register as a normal customer first:

1. Visit the store application or Supabase Studio auth page.
2. Register an account using the intended administrator email address (e.g., `admin@example.com`).
3. Confirm the email address:
   - **Local environment**: Open Inbucket at `http://127.0.0.1:56324` and open the confirmation link.
   - **Staging / Production**: Check the real mailbox and open the confirmation link.
4. When the user registers, the database trigger `on_auth_user_created` automatically creates a corresponding row in `public.profiles` with `role = 'customer'`.

### Step 2: Open SQL Editor and run read-only diagnostic

Connect with database owner privileges:

- **Local development**: Navigate to Supabase Studio SQL Editor at `http://127.0.0.1:56323/project/default/sql` (or connect via `psql postgresql://postgres:postgres@127.0.0.1:56322/postgres`).
- **Staging / Production**: Log into the Supabase project dashboard -> **SQL Editor** with owner credentials.

Before performing the update, run this read-only diagnostic query to inspect database execution identity and locate the exact account UUID (substitute the target email):

```sql
-- Diagnostic 1: Execution identity check
select current_database(), current_user, session_user,
       pg_get_userbyid(datdba) as database_owner,
       current_setting('role', true) as active_role
from pg_database
where datname = current_database();

-- Diagnostic 2: Account identification and profile status
select u.id, u.email as auth_email, p.email as profile_email, p.role
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('admin@example.com');
```

Verify from the diagnostic output:

1. `current_user` matches `database_owner` (required by `protect_profile_role` trigger).
2. Exactly one row is returned from `auth.users`, and note the user's UUID `id`.
3. If no row is returned, the email does not exist in `auth.users` in this project.
4. If `p.id` is null, the profile row was not created; sign in or insert the profile first.

### Step 3: Execute promotion using authoritative UUID

Run the promotion using the verified UUID with an explicit `RETURNING` clause:

```sql
update public.profiles
   set role = 'admin'
 where id = '00000000-0000-0000-0000-000000000000'::uuid
returning id, role;
```

Confirm that the query returns 1 row with `role = 'admin'`.

### Step 4: Verify audit log and profile state

Check that the promotion was audited and the profile state is updated:

```sql
-- Verify profile state
select p.id, u.email, p.full_name, p.role
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.id = '00000000-0000-0000-0000-000000000000'::uuid;

-- Verify audit log entry
select action, entity, entity_id, "old", "new", actor, actor_role, at
  from public.audit_log
 where entity = 'profiles'
   and entity_id = '00000000-0000-0000-0000-000000000000'
 order by at desc
 limit 5;
```

### Step 5: Refresh session and step up to MFA (aal2)

1. The promoted user must sign out and sign back in on the web application to refresh JWT claims and client profile state.
2. Under Lolys' admin security architecture (T-1.15), all administrative endpoints and RLS mutations require `aal2` (MFA step-up).
3. The user must navigate to `/admin` or `/account/security`. If no verified authenticator exists, select **Set up authenticator**, scan the QR or enter the manual key in a trusted authenticator app, then enter its current six-digit code. Restarting setup replaces only unfinished Lolys factors; verified factors are preserved.
4. Verify the TOTP challenge code (`/admin/mfa/challenge`).
5. Once verified at `aal2`, administrative routes and database access are fully authorized.

---

## 3. Demoting an administrator (if necessary)

To revoke administrator privileges, the database owner executes:

```sql
update public.profiles
   set role = 'customer'
 where id = '00000000-0000-0000-0000-000000000000'::uuid
returning id, role;
```

---

## 4. Troubleshooting

- **Error: 0 rows updated**: The email address was not found or case mismatch occurred. Use Diagnostic 2 with `lower(email)` to verify the exact account and retrieve its UUID.
- **Error: ADM-001 / Permission denied**: The trigger `protect_profile_role` prevented the change because `current_user` is not the database owner, or `session_user` differs. Ensure you are running as the superuser/owner (`postgres`) in the SQL editor.
- **Admin sees 403 or redirects to login**: The account is at `aal1` instead of `aal2`. Admin routes strictly require multi-factor authentication. Enroll and verify a TOTP device.
- **Client displays old customer role**: The browser has a cached profile. Sign out and sign in again to fetch the updated profile row.
