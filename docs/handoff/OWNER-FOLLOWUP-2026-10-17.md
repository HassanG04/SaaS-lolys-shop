# Owner follow-up — 2026-10-17 (supersedes earlier conflicting directions)

Read this before the earlier HANDOVER_TO_ANTI_GRAVITY.md requirement ledger.
The owner explicitly requests these corrections and continuation by Anti-Gravity.
This Codex session changes documentation only; it does not implement the fixes.

## Current code and evidence

- Root: D:/Projects/Programming/الاء.
- Current branch: agent/T-5.13e-admin-slide-transitions.
- Current application/handoff base: 65e3558afa6cc036f162f3427e03ea8720522149.
- Preserve new commits 0395a0e (homepage) and 8714d4c (admin transitions).
  Do not restart from the older b17371e or e79d047 refs.
- Anti-Gravity reports 758 application + 203 tooling tests and 36 isolated
  browser tests passing; bundle 199990/200000 bytes. Codex read this report and
  source but did not rerun those application checks during this documentation task.
- The source now contains the rounded homepage, About enlargement and admin
  transitions. The new requests below remain open. Do not describe the new
  defects as fixed by those previous checks.
- Docker Server check still fails: dockerDesktopLinuxEngine pipe absent.
  No local database-backed test success or hosted acceptance is implied.
- Current branch had no remote head when checked. Preserve and push authorized
  repair checkpoints to https://github.com/HassanG04/SaaS-lolys-shop.git;
  never push main, merge or deploy.

## 1. Visible Admin entry AND the mouse-icon homepage editor

The owner says “the admin button is not present.” Address both previously
requested controls; they are different features.

Current source:

- Navbar.tsx displays account/cart/language/theme/hamburger, with no direct Admin entry.
- NavbarQuickMenu.tsx has an Admin link only within the hamburger for role === admin.
- T-3.10's mouse-icon editor, featured selection and persistent shortcut controls
  are still not implemented. A Dashboard link does not complete the editor.

T-3.10b (independent UI): add a visible, localized Admin/Dashboard shortcut in the
storefront header for a resolved admin role, with a named icon at narrow widths.
Reuse the existing /admin route/guard and keep menu access. Do not infer role
from email, route history or localStorage. While profile loads, avoid showing
admin controls to a customer. An admin with aal1 may navigate to the existing
MFA step-up path; do not expose protected data or bypass guards.

T-3.10 (persistent editor): add the mouse-icon edit-mode control on the actual
homepage for an authorized admin. It must edit the featured image/product,
Arabic/English headings/promo and category shortcut list including a plus control.
Persist through validated settings/API with AAL2, audit, safe uploads and tests.
Keep save/cancel/error states truthful. Do not ship a decorative editor button
that cannot save, or call an Admin shortcut the requested editor.
Keep Shop by category/product sections' behavior unchanged.

Acceptance: guest/customer see no admin editing; admin sees entry and editor;
fresh/reloaded session, English/Arabic and 320/360/1280 layouts work. Prove editor
save survives reload and authorization loss fails safely.

## 2. Offer ribbon opposite wishlist — actual positioning bug

In src/features/catalog/components/ProductCard.tsx:

- Badge wrapper uses inset-inline-start-2.
- Heart wrapper uses inset-inline-end-2.
  Neither selector exists in the inspected compiled dist CSS. These class names
  therefore do not currently establish the intended opposite edges.

Use supported logical start-2/end-2 or equivalent project CSS, verify the final
compiled declarations, and anchor both to the same positioned photo container.
For English: offer on left, heart on right. For Arabic: offer on right, heart on
left. Any ribbon tail/orientation must face inward from its own edge, away from
the wishlist control. Do not solve overlap with z-index alone.

Preserve a 44px heart target and readable discount/sold-out badges. Add an actual
bounding-box non-intersection check at narrow and desktop sizes, both directions,
large discount text, sold-out + sale combinations and hover zoom. Check Home,
category, search and favorites, since the shared card is reused.
See also src/features/favorites/components/FavoriteButton.tsx and ui/Badge.tsx.

## 3. English dashboard LEFT, Arabic dashboard RIGHT

Latest owner instruction overrides the prior physical-right-in-both-languages
requirement. Mirror the whole admin navigation consistently:

- English/LTR: sidebar and adjacent Dashboard heading/toggle on the left.
- Arabic/RTL: sidebar and adjacent heading/toggle on the right.
- Mobile drawer enters/exits from that same language-dependent edge.
- Preserve collapse, independent content scrolling, fixed/reachable header,
  focus containment/return, modal behavior, current admin page and verified session.

Files: AdminShell.tsx, AdminHeader.tsx, AdminSidebar.tsx, storefront.css and
admin/responsive browser tests. Existing shell flex-row-reverse with RTL overrides
forces physical-right placement; update structure and border/transform rules
together. Existing tests asserting “right in both languages” encode the OLD
requirement: update expected geometry, don't delete the checks.

Test live language switching while expanded, collapsed and drawer-open; verify
there is no offscreen navigation, backwards slide or lost keyboard focus.

## 4. Full English content, not only headings or dictionary parity

Confirmed hard-coded Arabic in:

- src/pages/ReturnsPage.tsx
- src/pages/ShippingPage.tsx
- src/pages/TermsPage.tsx
- src/pages/ContactPage.tsx
  Audit PrivacyPage and every other public/account/admin route and its error states,
  including routes the owner has not visited. Do not wait for more screenshots.

T-3.12: inventory actual routes from routes.tsx and AdminRoutes.tsx. Localize all
rendered copy: paragraphs, headings, links, buttons, labels, aria names, errors,
empty states, loading, toasts, dates/numbers and metadata. User-entered Arabic
product/content data is distinct from untranslated interface text; choose the
appropriate bilingual field instead of always name_ar. FavoriteButton currently
uses product.name_ar in its accessible name even in English: audit this too.

Use the established language provider and synchronized dictionaries. Preserve
the meaning of approved policy text; don't invent refund terms, shipping promises,
tax claims or new legal policy while translating. Flag unsupported existing
claims for owner review. Long policy copy should be route-lazy to protect the
200000-byte initial bundle budget. The current reported headroom is only 10 bytes;
do not increase the limit or omit translations to pass.

Acceptance:

- Explicit route-by-route Arabic/English table, not “620 keys match.”
- Test /returns, /shipping, /terms, /privacy and /contact with actual routed
  components, long content and navigation between pages without reverting language.
- Inspect auth/account/favorites/security/cart/checkout/orders/payment/admin errors.
- Assert representative English body content and absence of Arabic UI literals,
  using fixtures with English product data to avoid false positives.
- Check page titles, lang/dir, responsive layout and deep links after refresh.

## 5. Animations must work with Windows/device animations OFF

The owner NOW explicitly requests this behavior. It supersedes the older
“always suppress on system reduced motion” default for this project.
Do not refuse or quietly keep the old behavior. Provide an accessible site-level
motion setting so a visitor can still opt out.

T-3.11 motion policy:

- Modes: Full animations, Reduced animations, Follow device.
- Default for a fresh visit: Full animations, as the owner now requests, even
  when matchMedia('(prefers-reduced-motion: reduce)') is true.
- A visitor's explicit Reduced setting always wins; persist their selection.
  Follow device uses the OS setting. Clearly label all modes in both languages,
  reachable to guests and signed-in users; no account or cloud setting required.
- Use one effective motion policy for CSS AND JS, initialized before animation
  starts where needed and safely handling unavailable localStorage.
- In Full mode, magnetic motion, flower hover, theme/page transitions, reveals,
  skeleton shimmer and admin slides work even with device reduced-motion=true.
- In Reduced mode, avoid decorative sliding/zoom/spin and smooth scrolling;
  loading shapes/state changes remain visible. Keep keyboard focus behavior,
  touch-pointer magnetism guard and disabled-button handling.
- Follow device updates when the OS preference changes. Mode switches must not
  strand a dialog during an exit transition or leave reveal content invisible.
- No flashing/strobing and no new animation package merely for this preference.

Audit every gate:
src/styles/index.css currently applies global animation:none!important and
transition:none!important under reduced motion. storefront.css/ui.css have
media-gated animations. magnetic.ts, SectionReveal, HomePage, ThemeProvider,
ThemeToggle and AdminSidebar also check matchMedia directly.
Changing just one CSS query will leave most animations disabled.

Tests must emulate OS reduced motion and prove Full still animates; explicit
Reduced stops motion; Follow device follows changes. Test reload persistence,
storage-denied behavior, open/close/rapid-toggle states and skeleton visibility.
Retain these motion/accessibility tests under the new explicit policy.

## 6. Order of work and reporting

1. T-3.10b: visible admin entry + ribbon collision (small independent repair).
2. T-5.13f: language-dependent dashboard placement.
3. T-3.12: route-by-route full localization.
4. T-3.11: explicit motion policy overriding device settings.
5. T-3.10: real persistent homepage editor, once local DB verification is available.
6. Continue postal code, customer notifications/suggestions/demand, profile photo,
   approval-only QR delivery and full payment verification from the main handoff.

Do not discard already completed homepage/admin animation code. Read current diff
before editing. Split tasks, update progress, use existing architecture and tokens.
Missing database tooling blocks schema verification, not independent UI repairs.

## Production readiness — do not convert task counts into a launch percentage

The shop is not ready for public production use yet. Required remaining groups:

1. These visible defects and the unfinished editor, postal code, notifications,
   suggestions, profile photo and correct QR flow.
2. Database/security acceptance: current migrations, RLS/AAL2, saved address/order
   snapshots, approval → private instructions → proof → admin confirmation →
   shipping, expiry/restock and concurrency. Local Docker is currently blocked.
3. Hosted release setup and evidence: SMTP/auth email delivery (T-8.02),
   production hardening/configuration (T-8.03), real catalogue/shipping data
   (T-8.04), admin recovery/onboarding (T-8.09), backed-up/restore-tested data,
   monitoring, verified preview build/assets/deep links and green required CI.
4. Owner soft-launch acceptance (T-8.10): about ten real end-to-end phone orders
   covering COD/InstaPay and both delivery methods, with signed checklist.

Some human-owned tasks are marked done in roadmap. That is not evidence that
their exact acceptance criteria were confirmed. Require existing owner evidence;
do not fabricate it or claim a runbook alone means the operation was completed.
The owner confirms cloud projects exist; this does not prove SMTP, live QR,
security gates, recovery or the payment journey.

No reliable launch date or “90% ready” claim until the remaining implementation
and end-to-end validation have evidence. No merge, production deployment,
dashboard edits or destructive reset by agents.

## Exact next step

After reading current status/diff and the updated handoff, create a task branch
from the latest current checkpoint:

```powershell
git switch -c agent/T-3.10b-admin-entry-and-card-badges
```

Return HANDOVER_TO_CODEX.md with branch/commit, every requirement's state, exact
files/tests, actual-route screenshots in both languages/themes, remaining blockers
and next command. Separate reported results from independently rerun results.
