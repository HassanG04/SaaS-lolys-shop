# Handover to Anti-Gravity — complete owner request

## Latest owner corrections — read first (2026-10-17)

Additional owner confirmation: the existing complete order/approval/payment/
shipping flow, permissions, stock handling and database behavior were tested and
confirmed. Treat older “whole flow unverified” wording as superseded; record
owner-confirmed evidence without inventing automated results. Postal code is
mandatory with final database NOT NULL/non-empty validation. The latest follow-up
defines safe migration, signup and legacy-data requirements for that correction.

The current checkpoint is `65e3558` on `agent/T-5.13e-admin-slide-transitions`,
which includes Anti-Gravity's `0395a0e` homepage and `8714d4c` admin-motion work.
Preserve those changes. The older baseline and “missing” visual rows below are
historical; those two slices now have implementation and AG-reported tests.

Read [OWNER-FOLLOWUP-2026-10-17.md](docs/handoff/OWNER-FOLLOWUP-2026-10-17.md)
before following any older instruction below. It specifies visible Admin access
and the still-missing mouse editor, opposite-edge offer/heart positioning,
English-left/Arabic-right admin layout, full localization of policy and unvisited
routes, and site animations that run even when device animations are disabled.
The explicit new motion policy supersedes the older OS-always-wins default,
while retaining a visitor-controlled Reduced mode.

Next task is T-3.10b, followed by T-5.13f, T-3.12, T-3.11 and the remaining
database-backed features. The new document includes exact files, evidence,
acceptance tests and production blockers. No cloud or launch success is implied.

## Earlier detailed handoff (read with the corrections above)

Prepared by Codex, 2026-10-17. Supersedes the older handover and 2026-10-16 brief.
This handoff session changes documentation only.

## Current objective and starting point

Finish the owner's full experience request, including the omitted About Us hover
effects and admin slide transitions. Track every row below; a blanket “verify
passed” report does not demonstrate that each requested feature exists.

- Repository: D:/Projects/Programming/الاء.
- Owner-confirmed remote: https://github.com/HassanG04/SaaS-lolys-shop.git.
- Current branch: agent/T-5.13d-responsive-evidence.
- Last application/evidence checkpoint: b17371e34d2ae443d0f8f53a0f89fd94f05c1929.
  Fetch the newer documentation-only handoff commit on this same branch.
- main was fetched during this handoff: 315f01d. Do NOT restart from main or
  analytics e79d047; they omit these repairs.
- Root checkout was clean before this documentation update. Read git status,
  git diff and untracked files. Preserve other agents' work.
- Read AGENTS.md, .agent-state/project-progress.md, this handoff, roadmap sections
  0/1, the selected task, docs/spec/owner-experience-change.md,
  docs/spec/payment-flow-change.md and related design/security/database/error specs.
- Use Node 24.21.0 from .nvmrc; portable runtime is
  .tools/node-v24.21.0-win-x64/node.exe.
- Run roadmap:next, then resume this owner-directed unfinished repair. One task
  per branch; split at the documented review-size limit.
- Preserve .tools/cozy-storefront and its uncommitted work. PR28 is older visual
  work: compare selectively, never merge that checkout wholesale.

## Saved checkpoints and draft PRs

| Commit  | Branch                                 | Scope                                                        | Draft PR                                                   |
| ------- | -------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| 52dfb0b | agent/T-2.06b-mfa-experience-repair    | MFA/session repair, includes AG's unpublished 66877e4 parent | [29](https://github.com/HassanG04/SaaS-lolys-shop/pull/29) |
| a561e3c | agent/T-5.13-admin-workspace-usability | Workspace, thumbnails, duplicate actions, analytics fallback | [30](https://github.com/HassanG04/SaaS-lolys-shop/pull/30) |
| 5580295 | agent/T-5.13b-review-navigation        | Orders/payment links, count, reset preparation               | [31](https://github.com/HassanG04/SaaS-lolys-shop/pull/31) |
| 169b452 | agent/T-5.13c-responsive-navigation    | Right header, mobile scrolling, switch, social links         | [32](https://github.com/HassanG04/SaaS-lolys-shop/pull/32) |
| b17371e | agent/T-5.13d-responsive-evidence      | Component/browser regressions and handoff                    | [33](https://github.com/HassanG04/SaaS-lolys-shop/pull/33) |

All five branches were pushed. PR29 targets the analytics branch; each next PR
targets its predecessor. No merge or deployment. Remote CI was not verified.

## Complete requirement ledger

“Implemented” means code/local evidence exists, not production acceptance.

| Owner requirement                                                 | Current state                                                                                    | Remaining work                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Magnetic buttons, flowers, themes, skeletons                      | Implemented; owner confirms motion after enabling Windows effects; 16 isolated motion tests pass | Check actual pages; preserve reduced motion                  |
| Thumbnail opens image selection                                   | Implemented ProductPhotoButton + existing safe upload API                                        | Real upload/replace/failure test when local DB works         |
| Duplicate quick buttons/crowded products                          | Duplicate actions removed; wider workspace implemented                                           | Actual long bilingual rows and phone overflow review         |
| Right collapsible sidebar                                         | Position/collapse implemented                                                                    | Slide animation MISSING: T-5.13e                             |
| Dashboard label beside toggle; mobile reachability                | Implemented T-5.13c, 12 responsive cases                                                         | Preserve while animating/navigation                          |
| Misshapen Active switch                                           | Implemented centered ToggleSwitch, RTL/LTR, 44px target                                          | Preserve mutation rollback                                   |
| Protruding corners / undefined percentage                         | Table containment and finite-number fallback implemented                                         | Populated/empty/error data review                            |
| Replace hero arch                                                 | NOT wired on actual HomePage                                                                     | T-3.10a first; editing unused StorefrontHero is insufficient |
| Editable hero image/item/headline/promotion                       | NOT implemented                                                                                  | T-3.10 admin mouse-icon control mode and cloud persistence   |
| Editable category shortcuts and plus control                      | NOT implemented                                                                                  | T-3.10; leave Shop by category/products behavior intact      |
| About/Delivery/Returns card enlargement                           | NOT implemented as requested; entrance only                                                      | T-3.10a actual hover/focus enlargement and smooth reversal   |
| Complete English/Arabic parity                                    | PARTIAL                                                                                          | Known HomePage returns/tagline and checkout validation leaks |
| Saved postal code                                                 | NOT implemented                                                                                  | T-4.08 schema/address/order snapshot/fulfilment              |
| Pending card opens Orders                                         | Implemented                                                                                      | Real pending-order navigation check                          |
| My Orders in hamburger                                            | Implemented                                                                                      | Preserve both languages                                      |
| Customer notification bell: wishlist sale, approval, general sale | NOT implemented                                                                                  | T-2.10 database events, isolation, unread handling           |
| Admin wishlist demand                                             | Customer favorites exist; demand view NOT implemented                                            | Extend favorites securely; don't expose unnecessary identity |
| Suggestions and admin inbox                                       | NOT implemented                                                                                  | T-2.10 persistence, RLS, bounded submission                  |
| Profile photo                                                     | NOT implemented                                                                                  | T-2.11 safe upload, owner policy, cleanup                    |
| Correct InstaPay QR/recipient                                     | Only empty receiver fallback corrected; hosted setting unchanged                                 | T-5.14 approved instructions and asset delivery              |
| Preserve verified MFA                                             | Repair implemented; owner confirms enrollment                                                    | Reload/refresh/logout/sensitive-action verification          |
| Payment-proof alert and order/payment link                        | Admin count and exact-order link implemented                                                     | DB-backed approval/proof/review/shipping flow                |
| Delete all accounts/orders SQL                                    | Prepared, NOT executed/tested; refuses ledger/storage conflicts                                  | Review limitations below; no unconditional reset claim       |
| All-user TikTok/Instagram/WhatsApp links                          | Implemented, exact URLs tested                                                                   | Preserve named narrow icons and wider text                   |

## First: T-3.10a — actual homepage repairs

Inspect:

- src/pages/HomePage.tsx (actual routed page).
- src/features/catalog/components/StorefrontHero.tsx (existing candidate, currently unused).
- CategoryTile.tsx / ProductImage.tsx in that directory.
- src/styles/storefront.css, src/components/ui/SectionReveal.tsx.
- src/i18n/ar.json and en.json; homepage/catalogue tests.

Fresh source findings:

1. HomePage imports ArchFrame and renders a tall rounded-arch. A new component
   existing on disk has not changed the active page.
2. salePercent defaults to 50 and the promotional badge is always shown.
   Missing/invalid/zero settings must get neutral copy, not an invented sale.
   A promotion must match the selected product/current discount; a generic
   sale_percent setting alone does not prove all items are discounted.
3. Hero saved text uses only hero_title_ar/hero_subtitle_ar. English saved
   counterparts do not exist yet.
4. returnsText falls back to a literal Arabic paragraph in English.
   The About heading reads tagline_ar regardless of language.
   Delivery badges always show both payment methods, even when disabled.
5. feature-card CSS has only a timed entrance, no requested hover enlargement.
   Mount animations may finish before the user scrolls to About.

Implement without waiting for new schema:

- Replace the active arch with a rounded square/landscape frame suitable for
  accessories/mugs. Reuse documented tokens and existing safe image/skeleton/error
  behavior; don't fabricate product photography.
- Enlarge the real About/Delivery/Returns cards on fine-pointer hover and
  focus-within where they contain controls. Smoothly reverse on leave/blur.
  Avoid layout shifts, clipped text, hidden controls or viewport overflow.
  Don't create fake buttons on informational cards just to animate them.
- Trigger section entrances on reaching the viewport.
- Fix known bilingual leaks and display only enabled payment methods.
- Preserve catalogue filtering and category/product section behavior.
- Test routed HomePage with absent/zero sale settings, long bilingual copy,
  enabled-method variations, keyboard/touch/reduced motion.
- Show actual-page evidence at 320/360/1280 in both themes/directions. Isolated
  CSS checks alone do not prove this feature is visible.

## Second: T-5.13e — admin slide transitions

Files: src/features/admin/{AdminShell,AdminSidebar,AdminRoutes}.tsx,
src/components/layout/Layout.tsx and src/styles/storefront.css.

Desktop currently switches hidden/lg:flex instantly; native mobile dialog opens
and closes instantly. Admin route transitions are absent because Layout now
preserves the shell. Do not restore whole-shell pathname remounts.

Implement:

- Desktop sidebar slides/collapses from the physical right; content takes the
  released width smoothly. Hidden controls must leave keyboard navigation.
- Mobile modal slides in AND out from the right. Preserve native modality, Escape,
  focus containment, focus return and dismissal behavior. Keep modality until exit
  finishes; handle rapid reversals and browsers without transition events.
- Animate only inner page content on pathname changes. Keep header, session,
  sidebar state and shell mounted. Reset inner scroll on a new page, not just
  window.scrollTo. Don't replay for each filter keystroke/search-param change.
- AdminRoutes has a hard-coded Loading aria-label and only PearlLoader. Localize
  and provide appropriate visible lazy/data skeletons without artificial delays
  or discarding cached rows.
- Reduced motion removes sliding/scaling but leaves every state operable.
- Test mid-scroll open/close on mobile, focus return, collapse widths, route changes,
  rapid toggles, both languages/themes and reduced motion.

## Data-backed work — split schema and UI, never fake persistence

T-3.10 editor:

- Mouse-icon control mode visible to authorized admin only, with image selection,
  featured product, bilingual headline/promo and category shortcut plus/edit controls.
- Persist through existing typed settings/API patterns. Inspect shop_settings and
  admin_update_setting allow-lists; hidden controls alone are not authorization.
- Targets: src/features/admin/settings, src/features/settings, HomePage.
- Reference migrations 20261012044500_shop_settings.sql and
  20261014023000_order_approval_and_saved_address.sql; never edit merged migrations.
- Add allowed keys/validation/RLS/AAL2/audit with tests and regenerated types.
- Separate shortcut configuration from categories.show_on_home so changing pills
  does not unexpectedly alter the Shop by category section.
- Test save/cancel, pending/error, lost permissions, reload persistence, deleted/
  inactive selections and missing values. No fake successful save.

T-4.08 postal code:

- Targets: src/features/account/{api,types,hooks}.ts, src/features/checkout,
  src/pages/{AccountPage,CheckoutPage,AccountOrdersPage}.tsx and admin order details.
- Verify current Egypt Post format with an authoritative source; keep a string,
  normalize digits without losing leading zeros; never infer a code from a city.
- Add profile and immutable order snapshot fields through an additive migration,
  validated by place_order, saved for next checkout and visible to fulfilment.
- Require for postal delivery while preserving old data; do not invent backfill.
- Test invalid server input, saved defaults, unticked alternate-address save,
  account edits and historic order immutability.

T-2.10 notifications/suggestions:

- Reuse src/features/favorites, not a second wishlist.
- Split database events/schema from bell/inbox/menu/admin UI.
- Approval events follow committed order transitions; wishlist-sale/general-sale
  events need deduplication, unread state, privacy, limits and documented retention.
- Customer cannot write other users' notifications or payment status.
- Persist suggestions with owner-scoped RLS and an authorized admin inbox.
  Decisions without defaults go in OPEN_DECISION.md + Appendix G.
- Existing PaymentReviewCount is a 30-second ADMIN polling badge, not the requested
  customer notification system.

T-2.11 photo:

- Owner-scoped path/metadata and storage policy; JPEG/PNG/WebP signature checks,
  size cap, renamed and re-encoded files; upload/remove/error states.
- Cleanup replaced files after successful profile persistence.
- Test cross-user access and failure rollback; no privileged browser key or
  localStorage-only photo database.

## InstaPay and reset limits

Approved receiver: alaa.ahm9624@instapay.
Actual asset: ip/ip.jpeg, NOT ip/ip.png.
SHA-256 rechecked during this handoff:
B432667B3ACF96B8CBA2C48CAD0710486789DB0459BD223863B0E41D9B66F6AA.

Historical evidence in docs/handoff/DATABASE-INTEGRATION.md records zxing-cpp 2.3.0
decoding one ipn.eg link with the matching recipient. Today's identical hash links
the same asset to that evidence. No fresh decode or payment-link visit was made;
bank ownership/live payment acceptance remain unverified. Don't invent QR payloads.

Outstanding:

- Corrected fallback does not fix a wrong hosted shop setting.
- uploadInstaPayQrImage uses public product-images; getPublicQrUrl exposes it.
  Private shop_settings RLS does NOT make the QR file private. Apply the
  approval-first contract to asset delivery and metadata.
- Missing payment instructions must show a mapped localized unavailable/error
  state, not silently route money through a hard-coded default.
- No instructions/proof before approval; owner-only instructions; screenshot sets
  under_review, never paid. Admin verifies actual bank transfer/reference and uses
  admin_review_payment. Database rejects unpaid InstaPay shipping/delivery.
- Preserve exact-order payment links, pending cards and admin review count.
- Hosted configuration remains owner-run; don't modify dashboards/cloud SQL.

Reset:

- docs/runbooks/reset-development-data.sql/.md exist; default is ROLLBACK.
- They refuse stock_movements references and owned Storage objects. User/order
  deletion can attempt forbidden ledger updates; SQL Storage metadata deletion
  can orphan real files.
- Stock is not rebuilt. Script is unexecuted and untested; it is NOT a universal
  working reset for a database with history.
- Resolve incompatible reset requirements with owner review. Never disable RLS,
  triggers or audit/ledger protection, or execute destructive cloud SQL.

## Current error and verified baseline

Error: dockerDesktopLinuxEngine pipe absent.
Expected: approved local Docker/Supabase stack reachable.
Actual: db:reset failed; database-backed E2E failed before tests could execute.
Possible cause: Docker Desktop stopped/unavailable.
Don't substitute cloud endpoints. Continue independent visual repairs.

Verified combined application/evidence tree b17371e:

- Full npm run verify EXIT 0, all 12 gates.
- 748 application tests in 65 files + 203 tooling tests.
- Build, secret scan, SQL/migration/token/i18n/supply-chain checks pass.
- Initial JS 199971/200000 gzip bytes: 29 bytes headroom. Don't raise the budget;
  lazy-load feature-only code and remove actual duplication as needed.
- 28 isolated browser checks pass (16 motion, 12 responsive): real component HTML,
  compiled CSS, synthetic session, network aborted. Screenshots reviewed.
  These do not certify live data, font/image loading or complete app flows.
- Roadmap valid at 133 tasks before adding this handoff's two repair slices.
- No remote CI green, hosted acceptance, new DB test pass or launch claim.

Pinned runtime wrapper:

```powershell
& .tools/node-v24.21.0-win-x64/node.exe .tools/cozy-storefront/.tools/run-node.mjs npm run verify
```

Offline geometry reproduction: docs/handoff/RESPONSIVE-REPAIR.md.
Once Docker works: local db:reset, db:test, db:test:concurrency, db:types and relevant
E2E/security checks. Only report tests that ran. Preserve every quality gate.

## Next exact command

After status/diff inspection and fetching the current handoff branch:

```powershell
git switch -c agent/T-3.10a-homepage-visual-repair
```

Start with actual HomePage About cards, arch, false sale fallback and English copy.
Then admin motion T-5.13e. Don't wait on Docker for these independent repairs.

## Return to Codex

Update shared progress after each session. Create HANDOVER_TO_CODEX.md with:

- exact branch/commit and every changed file;
- each ledger row's implemented/partial/missing/blocked state;
- actual-route before/after evidence, viewport/theme/language;
- commands, exit codes/counts, distinguishing mocks/isolated browser/local DB/CI/
  owner acceptance;
- remaining error, expected/actual, possible cause and next exact command.

A dictionary-parity check, unused component, CSS class or green mocked test is not
evidence that the requested feature works. Don't mark owner tasks done.
Keep the confirmed MFA behavior: verified session survives reload, fresh login
after logout and sensitive actions require MFA. Respect reduced motion; a site
override must be an explicit user preference, never silent forced motion.
