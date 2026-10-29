# Hosted feature status — 2026-10-29

The owner confirmed Cloudflare deployment, working Supabase verification mail, real purchases and owner admin access. The homepage editor was repaired in Supabase and the owner confirmed open, publish and persistence after reload. These are owner observations; no production mutations were performed by Codex.

Fresh owner-provided read-only feature check:

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

Cloudflare deploys frontend assets; it does not install database migrations. These seven missing objects explain missing feature support, not a disconnected authentication service. This small check does not establish migration history, every dependency, grants/RLS, columns, or function parity. Do not run every historical migration blindly or reuse the older combined cloud repair: the owner has since installed storefront content and real orders exist. Reconcile the current complete read-only schema audit with the migration sources first; back up hosted data, rehearse any repair locally, preserve existing rows and RLS, then the owner applies the reviewed additive repair.

Password recovery is a separate frontend defect: the existing destination only requested another email. T-2.04b supplies the password-entry step after Supabase resolves an authenticated recovery session. The owner must retest a fresh email link after deploying that repair. Verification email establishes access to an inbox; bot controls remain CAPTCHA and rate limits.

T-9.15a/b adds a separate `admin_get_forecast_export(boolean)` migration and download UI. That new function will also need owner deployment before the button can evaluate hosted readiness. Forecasting code already exists; production activation remains T-9.13 after real-data gates and backtesting. No hosted forecast readiness or price-model accuracy is asserted by the existence check.
