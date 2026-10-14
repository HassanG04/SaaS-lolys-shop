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

### Step 2: Open SQL Editor as database owner

Connect with database owner privileges:

- **Local development**: Navigate to Supabase Studio SQL Editor at `http://127.0.0.1:56323/project/default/sql` (or connect via `psql postgresql://postgres:postgres@127.0.0.1:56322/postgres`).
- **Staging / Production**: Log into the Supabase project dashboard -> **SQL Editor** with owner credentials.

### Step 3: Execute promotion query

Run the following SQL statement, replacing `admin@example.com` with the actual account email:

```sql
update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'admin@example.com');
```

### Step 4: Verify the promotion

Verify that the account has been upgraded to `admin`:

```sql
select p.id, u.email, p.full_name, p.role, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
 where u.email = 'admin@example.com';
```

Expected output:

- `role`: `admin`

---

## 3. Demoting an administrator (if necessary)

To revoke administrator privileges, the database owner executes:

```sql
update public.profiles
   set role = 'customer'
 where id = (select id from auth.users where email = 'admin@example.com');
```

---

## 4. Troubleshooting

- **Error: 0 rows updated**: The email address has not been registered in `auth.users`. Ensure Step 1 (sign-up) completed successfully.
- **Admin cannot access admin functions**: Ensure the user has signed out and signed back in to refresh JWT claims, and that multi-factor authentication (MFA / TOTP) has been enrolled if required by the environment.
