# Shared project progress

Updated 2026-10-11 (Africa/Cairo). Active: Anti-Gravity, completed T-2.01.

```yaml
Current task: T-1.20 done. Ready for next task.
Completed:
  - T-1.20: Implemented abuse controls (S27, S28): created rate_limits table with revoked API access, implemented check_rate_limit(p_action, p_limit, p_window) function raising SYS-003, wired rate limiting into place_order, submit_payment_proof, and cancel_my_order; capped place_order item lines (30, ORD-013), quantity per line (20, ORD-006), and customer pending orders based on shop_settings.pending_order_limit default 3 (ORD-010). Created 13_abuse_controls.test.sql (19 assertions). Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.19: Implemented catalog admin support (S26): added categories.is_active (default true), categories.show_on_home (default false), and products.is_featured (default false); added storage path regex check constraints on categories.image_url, products.image_url, and products.extra_images; updated storefront RLS select policies so anon/customers see only active categories and products of active categories, while admins see all; added admin_delete_product RPC enforcing product was never ordered (ADM-004); added admin_delete_category RPC enforcing target category when non-empty (ADM-005) and moving products before category deletion. Created 12_catalog_admin.test.sql (31 assertions). Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.18: Implemented orders v2, structured addresses, and payment flow (S23, S24, S25): added instapay_qr payment method, payment_status enum, structured shipping and payment columns on orders and profiles with length constraints, place_order v2 validating payment methods against shop settings (ORD-011) and field lengths (ORD-012) and calculating payment deadlines, legacy place_order wrapper for backward compatibility, submit_payment_proof RPC enforcing owner check (ORD-009) and proof folder prefix <uid>/<order_id>/ and uniqueness (PAY-005), admin_review_payment RPC requiring MFA (aal2) and logging PAYMENT_REVIEW in audit_log, expire_unpaid_orders function cancelling overdue orders and auto-restocking via trigger, COD auto-pay trigger marking orders paid on delivery, and private payment-proofs storage bucket (5 MB limit, JPEG/PNG/WebP). Created 11_orders_v2_payments.test.sql (37 assertions). Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.17: Implemented shop settings (S22): created shop_settings table with 16 seeded default rows, privacy RLS (public keys readable by anon/customers, private keys visible only to admin at AAL2), admin_update_setting RPC enforcing key allow-list (ADM-008) and typed range/regex validation (ADM-007), audit trigger recording settings changes, and configured product-images bucket limit to 3 MB and allowed types (JPEG, PNG, WebP). Created 10_shop_settings.test.sql (26 assertions). Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.16: Implemented audit log (S21): created append-only audit_log table with immutability trigger blocking update and delete for all roles including owner, RLS allowing select only to admin at AAL2, audit_event helper, and triggers recording admin and database owner changes across products, categories, delivery_fees, orders, and profiles role. Customer place_order stock decrements are excluded. Created 09_audit_log.test.sql (17 assertions). Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.15: Hardened database admin access: is_admin() requires AAL2 MFA claim, added require_admin() raising ADM-002 at AAL1 and ADM-001 for non-admins, removed admin_set_role, added protect_profile_role trigger blocking API role mutations, clamped sign-up metadata in handle_new_user, and added text column length check constraints on profiles, categories, products, and orders. Created 08_admin_hardening.test.sql (30 assertions for S19, S20, S30) and updated 05_admin.test.sql. Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.12: Added .github/workflows/db-staging.yml and .github/workflows/db-production.yml with SHA-pinned setup-cli, un-echoed secrets, and manual confirmation gate. Authored docs/runbooks/deploy-db.md covering staging/production procedures, pausing caveat and checklists. Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.10: Added migration 20261012040559_error_codes.sql setting hint to stable error codes (AUTH-004, ORD-001..ORD-008, ORD-009, ORD-014, ADM-001) and detail left=N for stock in place_order, cancel_my_order, admin_dashboard, and orders_status_guard. Implemented Scenario S18 pgTAP test suite in 07_error_codes.test.sql (20 assertions). Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-1.09: Added db job to .github/workflows/ci.yml with SHA-pinned setup-cli, supabase start, reset, test, concurrency launcher, types regeneration diff check, and migration guard. Removed completed check:migrations stub from scripts/pending.mjs. Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-0.12: Reconciled repository security baseline: SECURITY.md, public/.well-known/security.txt, .github/CODEOWNERS, .github/dependabot.yml, .gitleaksignore, and secrets CI job. Full verify passes (225 app + 121 tooling tests = 346 tests).
  - T-0.09: Reconciled repository guards: scripts/check-secrets.mjs rejecting privileged JWTs, secret keys and role mentions outside tests/docs; scripts/check-bundle.mjs enforcing <= 200 KB initial JS gzip budget and lazy admin separation; wired both into build and verify pipelines. Full verify passes.
  - T-8.01: Authored auth email and hardening runbooks (docs/runbooks/auth-email.md explaining custom SMTP limits, configuration, exact non-wildcard redirect URLs, test procedure; docs/runbooks/auth-hardening.md 10-point checklist covering Turnstile, confirmations, 10-char password, TOTP MFA, HIBP, timeouts). Implemented clear "check your email", "resend", and "link expired" (AUTH-009) UI states across Register, Login, Reset Password, and Resend Confirmation pages. Full verify passes (225 app + 111 tooling tests = 336 tests). Initial bundle budget enforced <= 200 KB gzip (192.8 KB).
  - T-6.03: Implemented Chart accessibility and export in src/features/admin/dashboard/ (text summary card and fallback data table for daily chart, aria-labels and table column scopes, ui-print-card and print styles, print report button, UTF-8 BOM CSV export helper formatDailySeriesCsv & downloadDailySeriesCsv). Axe accessibility audit reports 0 serious and 0 critical violations across dashboard in both Arabic and English. Full verify passes (220 app + 111 tooling tests = 331 tests). Initial bundle budget enforced <= 200 KB gzip (192.7 KB).
  - T-6.02: Implemented Dashboard UI in src/features/admin/dashboard/ (KPI cards, lazy-loaded Recharts daily revenue area chart with tokens and accessible summary table, breakdowns for status/delivery/governorate, top products and customers lists, low stock alerts linking to product edit form, preset range selector, and skeleton/empty/error states). Initial JavaScript budget enforced <= 200 KB gzip (192.5 KB) and Recharts strictly isolated to admin chunk. Full verify passes (209 app + 111 tooling tests = 320 tests).
  - T-6.01: Implemented Dashboard data layer in src/features/admin/dashboard/ (Zod schema for admin_dashboard RPC payload per database-contract.md, handled DashboardParseError on malformed response, preset date ranges for 7d/30d/90d/custom in Africa/Cairo time, useAdminDashboard React Query hook). Full verify passes (197 app + 107 tooling tests = 304 tests).
  - T-5.07: Implemented Delivery fees admin in src/features/admin/delivery/ (governorate x method grid, add/update/remove fees, empty cells read "غير متاح", validation for fee >= 0 with Arabic error feedback). Integrated into /admin/delivery route. Integration test proves removing fee makes that method unavailable at checkout. Full verify passes (181 app + 107 tooling tests = 288 tests).
  - T-5.06: Implemented Customers admin in src/features/admin/customers/ (table from customer_stats view, search by name/phone/product, read-only role badges with aria-readonly, no role mutation UI). Added scripts/admin-role-guard.test.mjs in test:tooling proving zero writes to profiles.role and zero admin_set_role calls in src/. Full verify passes (169 app + 107 tooling tests = 276 tests).
  - T-5.01: Implemented Admin shell and access control in src/features/admin/ (AdminShell, AdminSidebar rail with 8 Arabic links, AdminHeader, lazy chunk loader, responsive mobile drawer, AAL2 badge, store return link). Customer receives 403 view (AUTH-011) without downloading admin chunk; admin at aal1 is sent to MFA with ADM-002 prompt without downloading admin chunk; admin at aal2 loads AdminShell. Full verify passes (163 app + 105 tooling tests = 268 tests).
  - T-4.01: Implemented delivery options API and hooks in src/features/delivery/ (getGovernorates with Arabic names first, getDeliveryFees returning empty list when no rows configured, useGovernorates, useDeliveryFees). Unit tests in delivery.test.tsx verify empty list behavior, labels, Arabic sorting, and hook lifecycles. Full verify passes (155 app + 105 tooling tests = 260 tests).
  - T-3.08: Implemented SEO basics: useSeo() hook, useRouteSeo() per-route title/meta hook wired in Layout, bilingual route dictionary in ar.json and en.json, Open Graph and Twitter card meta tags, public/favicon.svg (cropped bow), public/site.webmanifest, and public/robots.txt with crawler boundaries. Verified with 144 app tests + 105 tooling tests (249 total); npm run verify passes.
  - T-2.09: Implemented useStepUp() hook and StepUpDialog with in-memory 5-minute confirmation, challenge and verify, and ADM-003 prompt. Unit tests in stepUp.test.tsx verify in-memory expiry with fake timers and prove confirmation is never written to storage. Full verify passes (118 app + 101 tooling tests).
  - T-2.07: Implemented account security on /account/security: change password (enforcing 10 characters, handling stale sessions with AUTH-007), change email (retaining secure email change confirmation, neutral AUTH-010, targeting only authenticated user), global revocation signOut({ scope: 'global' }), and admin 20-minute idle session timeout with queryClient cache clearing verified with fake timers. Unit tests in accountSecurity.test.tsx and full verify pass (114 app + 101 tooling tests).
  - T-2.06: Implemented TOTP two-factor authentication with Supabase Auth MFA: factor enrollment (QR code and manual secret key in Ltr), challenge and verification, factor listing and removal (enforcing fresh aal2 session), and useAal hook. Configured Admin MFA ladder in RequireAdmin (prompting enrollment if no factors enrolled, challenging until aal2, allowing admin screens only at aal2), and customer 2FA management in /account/security with second-device guidance. Implemented Arabic catalogue error codes AUTH-005 and AUTH-006. Full verify passes with 108 app + 101 tooling tests (209 total).
  - T-2.05: Installed and pinned @tanstack/react-query (5.104.1) in ADR-0001; configured QueryClientProvider with retry policy (suppressing 4xx client retries, max 2 retries for 5xx/network) and 1m/5m cache timers. Added global ErrorBoundary with Arabic reset card, useToast hook and ToastProvider container, and shared ErrorPanel and EmptyState components with documented design tokens and Ltr error codes. Full verify passes with 101 app + 101 tooling tests (202 total).
  - T-2.04: Implemented AuthProvider, useAuth hook, Arabic auth pages (Login, Register, Reset Password, Resend Confirmation), Cloudflare Turnstile integration, route guards (RequireAuth, RequireAdmin with 403 AUTH-011, RequireGuest), and generic catalogue error codes (AUTH-001 through AUTH-012). Strictly enforced SEC-05 enumeration protection: identical request count for known and unknown accounts, neutral AUTH-010 outcome, upfront 10-character password policy, always-visible resend link, and no raw errors in DOM. Unit tests in auth.test.tsx and full verify pass (90 app + 101 tooling tests).
  - T-2.03: Configured i18next and react-i18next with exact pins (26.4.3 and 17.0.16) in src/i18n/i18n.ts, LanguageProvider integration with dual t() callable and property dictionary access, full copy deck in ar.json and en.json from Section 8 of design-system.md, Arabic CLDR 6-form plural rules, Western digits. Added src/lib/format.ts (formatEGP with ar-EG-u-nu-latn, formatDate, formatNumber, LTR helpers), src/components/ui/Ltr.tsx, scripts/check-i18n.mjs (parity, key usage, kit exclusion), scripts/check-i18n.test.mjs, and check:i18n npm script. Verified with 79 app tests, 101 tooling tests, and npm run verify.
  - T-2.02: Implemented React Router v7 with route table, Layout shell, skip link (#main-content), ScrollToTop, responsive Navbar (brand logo, search pill, nav links, cart pill, account, theme/language toggles, mobile menu), and cocoa Footer (tagline, policy links, ribbon divider, copyright). Added 16 route page placeholders with PearlLoader suspense fallback. Updated ADR-0001 with react-router-dom@7.18.4 pin. Verified with 72 unit tests and npm run verify.
  - T-2.01: Added Zod-validated environment configuration in src/lib/env.ts (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_TURNSTILE_SITE_KEY) with readable error formatting, typed createClient<Database> in src/lib/supabase.ts, and clear EnvErrorScreen in development. Unit tests cover validation and error rendering. npm run test:unit:coverage (100% lines, 90% branch) and npm run verify pass.
  - T-1.14: Authored database runbooks docs/runbooks/local-dev.md (Docker, endpoints, Inbucket local mail, test users), docs/runbooks/first-admin.md (owner SQL promotion procedure, security restrictions), and docs/runbooks/delivery-fees.md (fail-safe fee configuration, nationwide post vs. representative). Verified with manual review and npm run verify.
  - T-1.08: Implemented scenario S7 concurrency check in supabase/tests/concurrency.sh and cross-platform launcher scripts/run-concurrency.mjs. Verified: session B waits for session A to finish and commit 3s transaction, session B fails with out-of-stock error ("Only 0 left in stock for \"Concurrent Ring\""), stock is 0, sold is 2, exactly 1 order is created; npm run db:test:concurrency and npm run verify pass.
  - T-1.07: Implemented scenarios S12, S13, S14 in supabase/tests/database/05_admin.test.sql (26 assertions) and S16 in 06_privileges.test.sql (38 assertions). Verified: all 64 assertions pass with npm run db:test (177 total db tests across 7 test files); npm run verify passes.
  - T-1.06: Implemented scenarios S4, S5, S6 in supabase/tests/database/03_orders.test.sql (43 assertions) and S10, S11 in 04_cancel_restock.test.sql (22 assertions). Verified: all 65 assertions pass with npm run db:test (113 total db tests pass); all 12 rejection cases leave zero order rows and zero stock delta; npm run verify passes.
  - T-1.05: Implemented scenarios S1, S2, S3, S8, S9, S15 in supabase/tests/database/02_auth_visibility.test.sql (32 assertions). Verified with npm run db:test (48 total db tests pass); spot-checked two mutations (mutating favorites policy fails S15 tests 28-29, mutating products visibility policy fails S2 test 5; both pass after revert). npm run verify passes.
  - T-1.04: Vendored basejump supabase-test-helpers in supabase/tests/database/00000-supabase_test_helpers.sql; added 01_rls_enabled.test.sql asserting RLS on public schema and all 8 public tables (scenario S17). Verified with npm run db:test; mutation test verified (disabling RLS on categories causes failure, re-enabling passes). npm run verify passes.
  - T-1.03: Generated TypeScript database types via npm run db:types into src/types/database.types.ts; added src/types/index.ts re-exporting Tables, TablesInsert, TablesUpdate, Enums, CompositeTypes, Constants; added src/types/types.test.ts. Ignored database.types.ts in .prettierignore. npm run db:types && git diff --exit-code && npm run typecheck and npm run verify pass.
  - T-1.01: Docker installed and local Supabase stack initialized and running (npm run db:start).
  - T-1.02: Initial SQL converted to 6 timestamped migrations in supabase/migrations/ (schema, security, functions, views, reference_data, storage); demo catalogue seeded in supabase/seed.sql without first-admin snippet. db:reset verified cleanly from scratch; 27 governorates, 4 categories, 6 products, 0 delivery fees, and RLS enabled across all 8 tables. npm run verify passes.
  - T-0.08j compact login/register preview verified and marked done.
  - T-0.08e token guard and UI-kit exclusion checks passed and marked done.
  - T-1.01: Explored, but formally blocked due to missing Docker environment on this host (H-08).
  - Foundation PR 1 published; all four jobs green at b4faa49, including verified lint rejection probe.
  - T-0.01 to T-0.05 verified; T-0.06 implementation verified, owner workflow review pending.
  - Preserved all 53 incoming Anti-Gravity files with SHA-256 hashes.
  - Repaired theme behavior and expanded tests to every documented contrast pair and storage/system cases.
  - Theme PR 2 published; all four jobs green at 7d7fcbf in run 38021668187. Both theme tasks set done.
  - Documentation follow-up 4b56b05 also has four green jobs (run 38021821418).
  - Owner requested icons instead of visible theme text; added crescent/sun SVGs with Arabic accessible name and action tooltip.
  - Icon follow-up e34b6c2 passes all four CI jobs (run 38022228681).
  - Split UI kit into T-0.08 through T-0.08e, preserving its requirements and downstream dependencies.
  - Added Button, IconButton, Card/CardImage and development-only previews; native form/keyboard behavior, required icon labels and directional mirroring tested.
  - Draft UI actions PR 3 published at 0ba979e, stacked on theme PR 2.
  - All four UI actions jobs passed at 0ba979e (run 38023041519).
  - Published the previously local handover commit afd97fe to PR 3; GitHub DNS recovered.
  - Added labelled Input, SearchInput, Select and Textarea; native values/ref/disabled behavior and description IDs tested.
  - Split Checkbox/Radio into T-0.08f; their prepared source is in .tools/form-choice-draft, not discarded.
  - Text-field draft PR 4 published at 3aab682; all four jobs green in run 38028479207.
  - Restored/repaired Checkbox/Radio using native inputs, visible selection marks, 44px minimum dimensions and forced-colors fallback.
  - Choice draft PR 5 published at a0708bc; all four jobs green in run 38028693736.
  - Choice handover commit 5e0ba81 also passes all four jobs in run 38028772831.
  - Added tabs and notifications with Arabic previews; dialog draft preserved for T-0.08g in .tools/feedback-dialog-draft.
  - Feedback draft PR 6 published at 68e506e; all four jobs green in run 38071233956.
  - Feedback documentation 22effa5 also passes all four jobs in run 38071382759.
  - Replaced the dialog draft with a controlled native modal, Arabic labels, lifecycle cleanup and four preview instances. No non-modal fallback or custom focus traversal remains.
  - Dialog draft PR 7 published at a49d87c; all four jobs green in run 38071645439.
  - Dialog handover e5d498b also passes all four jobs in run 38071760275.
  - Owner resolved OD-002: pearls bounce only while loading, static for reduced motion; design spec updated.
Files changed:
  - T-8.01: docs/runbooks/auth-email.md, docs/runbooks/auth-hardening.md, src/features/auth/authErrors.tsx, src/pages/LoginPage.tsx, src/pages/RegisterPage.tsx, src/pages/ResendConfirmationPage.tsx, src/pages/ResetPasswordPage.tsx, src/features/auth/auth.test.tsx, roadmap.md.
  - T-6.03: src/features/admin/dashboard/DashboardChart.tsx, DashboardPage.tsx, exportCsv.ts, dashboardA11y.test.tsx, src/styles/ui.css, roadmap.md.
  - T-2.03: src/i18n/i18n.ts, LanguageProvider.tsx, ar.json, en.json, translations.ts, language.test.tsx, src/lib/format.ts, format.test.ts, src/components/ui/Ltr.tsx, scripts/check-i18n.mjs, scripts/check-i18n.test.mjs, package.json, docs/adr/0001-stack.md, roadmap.md.
  - T-2.02: Layout shell, Navbar, Footer, 16 route placeholders, routes.tsx, App.tsx, App.test.tsx, test-setup.ts, language.test.tsx, check-tokens.mjs, public/brand/ assets, docs/adr/0001-stack.md.
  - Branch agent/T-0.08d-labels-ornaments is based on dialog PR 7 at e5d498b.
  - This slice adds Tabs, Toast, feedback.test.tsx and FeedbackExamples; updates kit, Arabic copy, CSS, roadmap and continuation/PR docs.
  - Dialog slice adds Dialog, dialog.test.tsx and DialogExample; updates kit, Arabic copy, CSS, roadmap and continuation/PR docs.
  - Theme components, tokens, fonts/licenses, tests, dependency pins, roadmap and review notes.
  - Icon follow-up changes ThemeToggle.tsx, theme.test.tsx, ar.json and continuation/PR documentation.
  - UI actions add three components, actions.test.tsx, src/dev/KitPage.tsx and its local SVG fixture, src/styles/ui.css; update App, Arabic copy, tokens and handover/PR/roadmap docs.
  - Text fields add Field, Input, Select, Textarea, SearchInput, forms.test.tsx and FormExamples; update kit, CSS, Arabic copy and continuation/PR/roadmap docs.
  - Choice controls add Choice, Checkbox, Radio, choices.test.tsx and ChoiceExamples; update form preview, CSS, Arabic copy and continuation/PR/roadmap docs.
Tests executed:
  - T-8.01: npm run verify passes with 225 app + 111 tooling tests (336 total); check:tokens, check:i18n, lint, prettier check, typecheck, unit tests (including email verification, expired token link states, resend flows), production build and preview exclusion all pass. Initial JS bundle size is 192.8 KB gzip <= 200 KB.
  - T-6.03: npm run verify passes with 220 app + 111 tooling tests (331 total); axe accessibility audit passes with 0 serious and 0 critical violations across dashboard in both Arabic and English. Initial JS bundle size is 192.7 KB gzip <= 200 KB.
  - T-2.03: npm run verify passes with 79 app + 101 tooling tests (180 total); check:tokens, check:i18n, lint, prettier check, typecheck, production build and preview exclusion all pass.
  - T-2.02: npm run verify passes with 72 app + 97 tooling tests (169 total); token scan, lint, format, typecheck, production build with 16 lazy chunks, preview exclusion pass.
  - Compact form polish: npm run verify passes with 55 app + 97 tooling tests (152 total); token scan, lint, formatting, typecheck, production build and preview exclusion pass.
  - PR 11 at e8774dd passes all four GitHub jobs in run 38081581119; no merge or deployment.
  - Latest npm run verify passes with 54 app + 97 tooling tests (151 total); 12 language cases include saved/device/blocked-storage choices, keyboard persistence, theme independence, key parity and Arabic errors.
  - PR 8 at 6c18be3, PR 9 at 4ac7126 and PR 10 at 8a6786d each have all four GitHub jobs green (runs 38081096113, 38081098408, 38081350854).
  - Compact forms are on agent/T-0.08j-compact-forms; review PR follows.
  - Review repair: npm run verify passes with 42 app + 97 tooling tests; build preview guard and token negative fixtures pass. Use npm_config_script_shell=C:\Windows\System32\cmd.exe on this host to bypass profile startup issues.
  - Incoming Anti-Gravity verify passed (13 app tests, 27 tooling tests); review found requirements not covered by those tests.
  - Exact theme dependency installation passed, zero vulnerabilities reported.
  - Repaired implementation verify passed (10 app tests + 66 tooling tests), including 31 contrast pairs.
  - Both themes passed at 360/1280 in RTL/LTR; keyboard focus, 44px minimum and saved reload checked.
  - Final local verify and 110-task roadmap validation pass after the browser-driven CSS fix.
  - Icon follow-up verify passes (76 tests), build, roadmap and remote CI pass.
  - UI actions verify passes (16 app + 66 tooling tests); production route/copy/fixture exclusion, 114-task roadmap and all four PR checks pass.
  - Text fields verify passes (21 app + 66 tooling tests), production exclusion passes, 115-task roadmap valid; all four PR jobs pass.
  - Five choice behavior tests pass, including both directions, native reset, controlled/disabled states and isolated groups.
  - Full choice verify passes: 26 app + 66 tooling tests (92 total), production build/exclusion and 115-task roadmap pass.
  - Feedback verify passes: 34 app + 66 tooling tests (100 total), production build and 116-task roadmap pass. Browser verification remains open.
  - Dialog verify passes: 36 app + 66 tooling tests (102 total), production build and 116-task roadmap pass. Dialog tests cover closed markup/event contracts only; native modality, focus and Escape are unverified.
Problems found:
  - Earlier approval-service usage limit interrupted verification; subsequent local checks ran successfully.
  - Later UI kit/guards/security drafts did not meet all criteria; statuses corrected to todo with review notes.
  - Owner workflow review and human-owned infrastructure setup remain pending.
  - Docker absent; do not claim database verification or production readiness.
  - Browser URL policy rejected the local preview during icon review; no workaround attempted. Prior screenshots show the text-toggle version.
  - Installed jsdom lacks native dialog methods. T-0.08g must not substitute mocked methods for focus/inert/Escape verification or fall back to a non-modal window.
Next action: T-1.12 done. Proceeding with T-1.15 (Admin hardening).
```

Repository: https://github.com/HassanG04/lolys. Foundation PR:
https://github.com/HassanG04/lolys/pull/1. No main push, merge or deployment.
Theme PR: https://github.com/HassanG04/lolys/pull/2 (stacked on PR 1).
UI actions PR: https://github.com/HassanG04/lolys/pull/3 (stacked on PR 2).
Text fields PR: https://github.com/HassanG04/lolys/pull/4 (stacked on PR 3).
Choice controls PR: https://github.com/HassanG04/lolys/pull/5 (stacked on PR 4).
Feedback PR: https://github.com/HassanG04/lolys/pull/6 (stacked on PR 5).
Dialog PR: https://github.com/HassanG04/lolys/pull/7 (stacked on PR 6).
Ornaments, guard, bilingual and language-test draft PRs: #8, #9, #10, #11 (stacked in that order).
Current branch: agent/T-0.08i-language-verification. See HANDOVER_TO_ANTI_GRAVITY.md for exact commands and the complete changed-file inventory.

Use Node 24.21.0 from `.nvmrc`; local runtime is
`.tools/node-v24.21.0-win-x64`. Install with `npm ci --ignore-scripts`.

The older October 9 snapshot is `.tools/anti-gravity-20261010/` with
`checkpoint-manifest.json` and `deferred-files.json`. The 27 deferred files were
removed from this task's working tree only after hash verification. Their
original contents are recoverable there. Shared-file changes also remain in
that snapshot. Restore selectively for T-0.08, T-0.09 and T-0.12, never copy old
package.json, roadmap, App or workflow over newer verified work wholesale.

The latest October 10 incoming work is preserved as commits 6c18be3 / a47889f / 96ad75f on agent/T-0.08d-labels-ornaments.

Read `.agent-state/anti-gravity-review.md` for concrete findings before resuming
those tasks. `HANDOVER_TO_CODEX.md` is the preserved incoming report, not current
verification evidence. The older `.tools/anti-gravity-t007-checkpoint/` is retained
for provenance; do not restore it over the newer implementation.
