# Hosted feature status — 2026-10-29

**Current result:** after applying the dedicated repair, the owner returned all
eleven feature-check flags as `true`. The previously missing support for profile
photos, notifications, suggestions, wishlist demand, occasion reminders, postal
guards and the CSV API is now present. RLS on the checked tables is enabled, the
editor exists and payment proofs remain private. Do not rerun the installer.
This supersedes the missing-object diagnostic below; it does not establish that
every authenticated website journey has been tested after installation.

The owner confirmed Cloudflare deployment, working Supabase verification mail, real purchases and owner admin access. The homepage editor was repaired in Supabase and the owner confirmed open, publish and persistence after reload. These are owner observations; no production mutations were performed by Codex.

Initial owner-provided read-only feature check, before the repair:

| Object                                    | Present | Repository source                                           |
| ----------------------------------------- | ------- | ----------------------------------------------------------- |
| `profiles.avatar_url`                     | No      | `20261018160000_customer_profile_photo.sql`                 |
| `customer_notifications`                  | No      | `20261018140000_customer_notifications_and_suggestions.sql` |
| `customer_suggestions`                    | No      | Same notifications/suggestions migration                    |
| `admin_get_wishlist_demand()`             | No      | Same notifications/suggestions migration                    |
| `admin_occasion_reminders`                | No      | `20261018180000_occasion_reminders.sql`                     |
| `guard_profile_postal_code()`             | No      | `20261018090000_postal_legacy_update_guards.sql`            |
| `guard_order_postal_code()`               | No      | Same postal-legacy migration                                |
| `admin_get_forecasts(text,bigint,bigint)` | Yes     | Existence only, not a successful production forecast run    |
| `analytics.sales_daily`                   | Yes     | Data quantity/quality unmeasured                            |
| `analytics.stock_daily`                   | Yes     | Data quantity/quality unmeasured                            |
| `analytics.calendar`                      | Yes     | Calendar coverage unmeasured                                |

Cloudflare deploys frontend assets; it does not install database migrations. The initial seven missing objects explained missing feature support. They were subsequently installed through the guarded, locally rehearsed repair. Neither this initial check nor the successful follow-up claims complete migration-history reconciliation or a full audit of every database permission.

Password recovery is a separate frontend defect: the existing destination only requested another email. T-2.04b supplies the password-entry step after Supabase resolves an authenticated recovery session. The owner must retest a fresh email link after deploying that repair. Verification email establishes access to an inbox; bot controls remain CAPTCHA and rate limits.

T-9.15a/b adds `admin_get_forecast_export(boolean)` and a download UI. The function is now installed according to the owner's result; the deployed interface and actual readiness must still be checked. Forecasting code already exists; production activation remains T-9.13 after real-data gates and backtesting. Function existence does not establish sufficient data or price-model accuracy.

Owner SQL follow-up: [hosted-features-2026-10-29.md](../runbooks/hosted-features-2026-10-29.md)
provides a dedicated APPLY file for this missing-feature snapshot, including the
CSV RPC. It checks known MFA/settings functions and current feature absence at
execution time, preserves the repaired editor and existing checkout, and refuses
unrecognized/partial installations. This replaces the older combined recovery
for this specific state. The owner has applied it and returned the successful
check. Local rehearsal and the owner's cloud result are separate evidence.
