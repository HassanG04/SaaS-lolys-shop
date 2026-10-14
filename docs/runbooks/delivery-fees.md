# Delivery fees and shipping coverage runbook

- Status: active
- Task: T-1.14
- Applies to: database configuration across local, staging, and production environments

This runbook documents the configuration of delivery fees, shipping coverage rules, and representative regions.

---

## 1. Core architecture: "No row means not available"

The store operates under a strict fail-safe shipping model:

1. **No accidental free shipping**: Delivery fees are deliberately not pre-populated with default zeroes.
2. **Absence indicates unavailability**: If no row exists in `public.delivery_fees` for a given governorate and delivery method, that method is considered **unavailable**.
3. **Database enforcement**: The order placement function `place_order` queries `public.delivery_fees(governorate_id, method)`. If no matching row is found, order placement is rejected immediately with code `ORD-009` (or error message indicating shipping is unavailable for that governorate and method).

---

## 2. Table structure and enums

### Table: `public.delivery_fees`

- `governorate_id` (`smallint`, foreign key to `public.governorates.id` from 1 to 27).
- `method` (`public.delivery_method` enum: `'egypt_post'` or `'representative'`).
- `fee` (`numeric(10,2)` or `integer`, price in Egyptian Pounds - EGP).
- Primary Key: `(governorate_id, method)`.

### Reference table: `public.governorates`

Egypt's 27 governorates are seeded in `public.governorates`:

- 1: Cairo (القاهرة)
- 2: Giza (الجيزة)
- 3: Alexandria (الإسكندرية)
- ... through 27: South Sinai (جنوب سيناء).

---

## 3. Operational procedures and SQL examples

All modifications can be performed via the Supabase SQL editor or direct admin connection.

### A. Enable nationwide Egypt Post shipping at a flat fee

To enable Egypt Post across all 27 governorates (for example, flat 60 EGP):

```sql
insert into public.delivery_fees (governorate_id, method, fee)
select id, 'egypt_post', 60
  from public.governorates
on conflict (governorate_id, method)
do update set fee = excluded.fee;
```

### B. Enable Representative delivery for specific governorates

Representative delivery is typically restricted to local areas (e.g., Alexandria, Cairo, Giza):

```sql
-- Alexandria representative delivery at 40 EGP
insert into public.delivery_fees (governorate_id, method, fee)
values (3, 'representative', 40)
on conflict (governorate_id, method)
do update set fee = excluded.fee;

-- Cairo and Giza representative delivery at 50 EGP
insert into public.delivery_fees (governorate_id, method, fee)
values
  (1, 'representative', 50),
  (2, 'representative', 50)
on conflict (governorate_id, method)
do update set fee = excluded.fee;
```

### C. Update an existing shipping fee

To adjust the rate for a governorate and delivery method:

```sql
update public.delivery_fees
   set fee = 65
 where governorate_id = 1
   and method = 'egypt_post';
```

### D. Disable / remove shipping coverage

To remove coverage for a specific method in a governorate, simply delete the row:

```sql
delete from public.delivery_fees
 where governorate_id = 26 -- North Sinai
   and method = 'representative';
```

After deletion, any attempt to place an order to North Sinai via representative will fail with an out-of-coverage error.

---

## 4. Auditing and inspecting current coverage

To inspect all currently active shipping methods and rates:

```sql
select g.id as gov_id,
       g.name_en,
       g.name_ar,
       df.method,
       df.fee as fee_egp
  from public.delivery_fees df
  join public.governorates g on g.id = df.governorate_id
 order by g.id, df.method;
```

To list governorates that currently have **no delivery coverage** for Egypt Post:

```sql
select g.id, g.name_en, g.name_ar
  from public.governorates g
 where not exists (
   select 1 from public.delivery_fees df
    where df.governorate_id = g.id
      and df.method = 'egypt_post'
 );
```
