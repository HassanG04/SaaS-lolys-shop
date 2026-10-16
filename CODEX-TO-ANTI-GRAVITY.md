# Anti-Gravity / Gemini Flash: verified experience repair

Prepared by Codex on 2026-10-16 for Lolys' Accessories & Home.
This is the owner's implementation brief. Read it completely before editing.
Do the work, verify visible behavior, and return a reviewable handoff to Codex.

## 1. Start from the right code

- Repository: `D:/Projects/Programming/الاء`.
- Required starting ref: `origin/agent/T-9.11-descriptive-analyses-and-analytics-page`.
- Ref freshly fetched and inspected by Codex: `e79d0478319d8ae2e7dc0d86936922f66ea2fb22`.
- Do not start from `origin/main`, an old development branch, or an old generated SQL bundle.
- Run `git fetch origin --prune`, `git status --short`, `git diff`, and inspect untracked files. Record the remote SHA you actually use. If the remote moved, inspect the additional commits first.
- Read `AGENTS.md`, `.agent-state/project-progress.md`, incoming handovers, roadmap sections 0/1, and the relevant task/specification sections. Use Node **24.21.0** from `.nvmrc`.
- Run `npm run roadmap:next`. At the inspected SHA it says no runnable agent tasks. That is a status-label problem, not evidence that these owner-reported defects do not exist. Register/reopen the relevant repair tasks and their acceptance criteria before coding.
- Use an `agent/<task-id>-<slug>` repair branch/worktree based on the required remote ref. Do not switch/reset another agent's checkout. Preserve this brief in the repair checkout. Split large changes into reviewable task commits; do one slice at a time.
- There is older, partly uncommitted Codex work in `.tools/cozy-storefront`, branch `agent/T-3.09-cozy-storefront`, with draft PR #28. The new baseline already contains some of its motion code. Inspect selective differences; **do not merge or copy that older checkout wholesale** over newer auth, performance, translation or database work.
- Do not edit `.env*`, expose credentials, change production/dashboard settings, merge, or push main. No dependency additions or architectural replacement without the documented process. Keep every existing gate and budget.

The latest owner request explicitly authorizes the visual interactions, bilingual UI/error presentation and stronger new-password behavior below. Update the relevant spec amendments so older “Arabic messages only” or “150–250ms only” wording does not silently override this request. Arabic remains the default, with complete English when selected. RLS, MFA, generic authentication responses and database authority remain mandatory.

## 2. What Codex actually found at the inspected SHA

These are source findings, not claims that a new browser or cloud test passed.

| Area                                                  | Evidence                                                                                                                                                                      | Required response                                                                                                                                        |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Magnetic behavior exists but is inconsistently wired  | `src/components/ui/Button.tsx`, `magnetic.ts`, `MagneticAnchor.tsx`; `HomePage.tsx` uses plain category buttons and plain hero anchors; `ThemeToggle.tsx` uses a plain button | Trace each visible control to its rendered element and computed styles; repair integration, not another unused helper.                                   |
| Theme transitions already exist                       | `ThemeProvider.tsx` adds `theme-transition`; `src/styles/index.css` contains color transitions                                                                                | Reproduce why the visible page still snaps. Check loaded build, cascade, computed properties, timing and media settings before changing code.            |
| Skeletons exist but can be invisible                  | `Skeleton.tsx` has no base fill or default block size; `.ui-skeleton` paints its gradient only inside the no-reduced-motion media query                                       | Give actual loading shapes a token fill and dimensions even with motion disabled.                                                                        |
| Image lifecycle is incomplete                         | `ProductImage.tsx` assumes eager images are already loaded; loaded/error state does not reset when `src` changes                                                              | Handle loading, completion, failure and replacement source explicitly.                                                                                   |
| Category click provides no navigation cue             | `HomePage.tsx:handleCategorySelect` only updates category and limit                                                                                                           | Scroll to the existing `#browse` / `#browse-heading` and reveal the selected results.                                                                    |
| “Scroll-triggered” CSS is not scroll detection        | `.catalog-stagger-item` and `.section-heading-reveal` animate on mount; no IntersectionObserver is attached to those Home sections                                            | Animate when a section enters view, not while it is still offscreen.                                                                                     |
| Some card motion selectors are unused                 | `storefront.css` targets `.catalog-product` / `.catalog-category`; actual `ProductCard.tsx` / `CategoryTile.tsx` use other classes                                            | Connect styles to actual rendered components and avoid competing transforms.                                                                             |
| Arabic remains in English UI                          | `AccountSecurityPage.tsx` has hardcoded Arabic throughout; `AccountFavoritesPage.tsx` has Arabic subtitle/loading text/fallbacks and an Arabic-first toast product name       | Audit all routes and all states, not only these two pages.                                                                                               |
| Error rendering bypasses language selection           | `src/lib/errors.ts:ErrorMessage` renders the Arabic catalogue message and labels; `AuthAlert.tsx` uses `getAuthMessage()` from Arabic-only `authErrors.tsx`                   | Localize safe catalogue codes at render time in the selected language.                                                                                   |
| Password controls are inconsistent                    | Register has separate reveal controls; Login and AccountSecurity still use plain password inputs                                                                              | Consolidate accessible password reveal/copy; generation only for setting a new password.                                                                 |
| Weak-password enforcement differs by layer            | App signup/update checks only length >= 10; `supabase/config.toml` has `minimum_password_length = 6` and empty requirements                                                   | Repair local server alignment and prove what cloud Auth actually enforces before claiming protection.                                                    |
| Account enumeration regression                        | `signUpApi`, `authErrors.tsx`, `errors.ts`, Register UI/tests added `AUTH-015`, revealing registered emails                                                                   | Restore SEC-05's neutral existing/new-account behavior. Keep helpful login/reset navigation neutral and consistently available.                          |
| CAPTCHA has production-reachable fake-token fallbacks | `src/features/auth/Turnstile.tsx` calls success with synthetic tokens if the widget is absent or throws                                                                       | Repair the failure boundary during auth work; test-only mocks must not run in production. Do not claim the server accepts these tokens without evidence. |
| A styled buy button can still do nothing              | Home/Category/Search pass no `onAddToCart` to `ProductCard`; its handler only calls that optional callback. Favorites does supply it                                          | Wire the real cart action and test the actual visible cart result while styling the button.                                                              |
| Cache already exists                                  | `src/lib/queryClient.ts`: 1-minute default stale / 5-minute GC; catalogue hooks mostly 5-minute stale                                                                         | Reuse and measure this cache, rather than introducing a second cache or unlimited stale data.                                                            |
| Hero differs from earlier owner direction             | Home still renders `ArchFrame`, an assumed category-cover path, a fallback 50% discount and Arabic returns fallback                                                           | Reconcile the earlier broad cozy-frame request using the older UI handoff/assets selectively. Never invent a promotion or catalogue photo.               |

The progress file claims 725 application + 203 tooling tests and a 200,000-byte bundle at its last revision. Codex did **not** rerun those gates for this brief. Rebuild and measure your own exact head; the budget has no safe margin. Passing tests or a “done” roadmap label alone does not prove the animations work or the store is launch-ready.

## 3. First prove the problem in the running build

Start the correct checkout's local preview with the existing safe local/test configuration. Record checkout, branch, SHA, port and whether data is synthetic/local/cloud. Never print configuration values. Confirm the page is serving the intended build; do not assume a tab on port 5173 belongs to this checkout.

For a representative button, theme toggle, product card and pending skeleton, record:

1. Rendered element/component, CSS classes and loaded stylesheet.
2. Whether `prefers-reduced-motion`, `hover` and `pointer` media queries match. Do not disable a user's accessibility setting; use an isolated test context to exercise both modes.
3. Pointer events and actual computed `transform`, `animation-name`, `transition-property`, `background-color`, dimensions and opacity.
4. Any overriding Tailwind utility, animation `fill-mode`, parent stacking/overflow or competing transform.
5. Expected behavior, observed behavior and the precise cause. Mark unconfirmed causes as hypotheses.

Do not call adding CSS classes a fix until a real browser shows the interaction. If browser access is unavailable, record visual acceptance as pending and complete independent work; do not bypass a browser access/security denial.

## 4. Shared interaction system: repair and reuse

Work mainly in `src/components/ui/`, `src/styles/ui.css`, `storefront.css`, `index.css`, and the real consumer components.

### Magnetic buttons and illuminated hover

- Reuse `magneticHandlers` and the shared Button/anchor patterns. Cover primary actions, homepage category pills, hero actions, theme control and the new password controls as appropriate. Preserve links as links and buttons as buttons.
- A fine mouse pointer should visibly attract the button a small bounded amount: about +/-5px horizontally and +/-3px vertically, plus a 2px lift. Return smoothly on leave/cancel/blur and reset before activation. Avoid movement calculations based on already-transformed bounds causing jitter; use a stable wrapper/baseline if necessary.
- Use CSS custom properties or refs for pointer offsets, not React state updates per pointer move. Preserve caller refs, event handlers, `preventDefault`, form types and native activation.
- Hover should visibly brighten the surface/border, increase the documented shadow, and play one restrained gold/blush glimmer. Use existing theme tokens. Do not make pale text illegible during the effect.
- No attraction or hover-only actions for touch/coarse pointers, disabled/busy controls, keyboard-focused controls or reduced motion. Keyboard focus gets an equally clear static focus ring. Do not remove outlines or disable pointer events indiscriminately.
- The owner's ordinary-button reference is Uiverse **e-coders**: transparent bordered pill/rounded control, 300ms `cubic-bezier(.23,1,.32,1)`, filled illuminated hover, 2px lift and active return. Adapt it to the existing Cairo typography, radius, brand/contrast and shadow tokens. Do not paste a global `button { ... }` rule, hardcoded black/white, or `transition: all`.
- Namespace variants. Do not use generic `.btn`, `.wrapper`, `.text` or `.flower` globally. Avoid applying two different `transform` animations to the same element; use an outer magnetic wrapper and inner decoration where needed.

### Smooth light/dark switching

- Keep `data-theme` and the existing pre-paint theme initialization. First load must not flash the wrong theme or wait for an animation.
- On explicit toggle, smoothly interpolate existing background, surface, border and text colors over about 360ms. Animate the sun/crescent wrapper, not just a tooltip. Cover the page, header, forms, cards, dialogs and footer.
- Inspect real computed colors at start, midpoint and finish. The presence of `theme-transition` is insufficient. Address batching/cascade or registered custom-property behavior based on evidence; ensure the pre-change computed state exists before transitioning if that is the cause.
- Restrict the temporary transition scope/properties so it does not break hover, scrolling, layout or popover positioning. Include relevant pseudo-elements without repainting every property on every frame.
- Rapid toggles must settle on the latest choice; clear timers/classes on unmount. Preserve local storage and system-theme behavior. Reduced motion changes the theme immediately.

### Loading skeletons that actually render

- Repair the existing `Skeleton`/`SkeletonCard` rather than adding a parallel family. Use visible token-based base fills, explicit sizes and aspect ratios outside animation media queries.
- Use matching shapes for cold routes, category/product grids, product detail, account favorites and pending images. Preserve final layout space. A localized status announcement belongs to the loading region; decorative bars are `aria-hidden`.
- Shimmer/pulse only while pending. Reduced motion displays static visible placeholders. Failure must end loading and show the normal retry/empty/error state.
- Eager means fetch priority, not already loaded. A changed image source must reset loaded/error state; cached successful images, broken images and an error followed by a valid replacement must work.
- Distinguish initial load from background refetch/load-more. Keep useful cached content visible on background refetch; append placeholders where appropriate instead of replacing the whole grid.
- Never add artificial production delays just to show skeletons. Prove them with controlled delayed requests in browser tests, then release the response and verify replacement.

## 5. Product hover: zoom, shadow and background blur

Owner reference: Animista `shadow-drop-2-center`, 400ms `cubic-bezier(.250,.460,.450,.940)`, with reverse appearance on pointer leave.

The supplied keyframes only change depth/shadow: `translateZ(0)` to `translateZ(50px)` and a transparent-to-dark shadow. **They do not blur a background, and translateZ alone does not guarantee visible zoom without perspective.** Implement all requested effects explicitly.

- On fine-pointer hover, raise the active product/category card above its grid, smoothly scale it about 1.035 and lift it slightly; use the existing popover shadow token. Product artwork can zoom inside its rounded image clip without stretching.
- Soften the surrounding grid behind the active card by about 2px blur. Keep the active card, its text, buy button and favorite control sharp. Scope the backdrop/sibling effect to that grid; do not blur the whole application, sticky header or active forms.
- A grid-local noninteractive backdrop with the active card above it is acceptable. If filtering siblings instead, keep filtering off the active card/its ancestors. Preserve hit testing and keyboard access; decorative layers use `pointer-events: none` and `aria-hidden`.
- Use symmetric CSS transitions for enter and leave so rapid enter/leave reverses from the current visual state. Do not mount duplicate forward/reverse rules with the same class or run the “leave” animation at initial load.
- Keep image clipping separate from the outer raised-card layer. Resolve stacking contexts from section reveal animations, transformed ancestors and `overflow-hidden` so the zoom/shadow is not cut off.
- No blur/movement on coarse pointers or reduced motion. Keyboard focus receives an obvious static outline/highlight, with surrounding content readable.
- Retain Animista attribution/FreeBSD notice if reusing its code. The owner supplied the reference from `http://animista.net/license`; verify the original terms before adding copied source to attribution documentation.

## 6. Category navigation, section reveal and caching

### Clicking “Earrings” must visibly take the user to results

In `src/pages/HomePage.tsx`, the quick-link row is currently:
`flex flex-wrap items-center justify-center gap-2 sm:gap-3`.
The target toolbar is under the existing `section#browse`, with `h2#browse-heading`:
`flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-4`.

- Keep the selected-category update and reset limit to 12. After the state/DOM update, scroll the **stable section ref/id**, not a brittle concatenated class selector, into view smoothly. Account for the sticky navbar using the existing scroll margin or measured header offset.
- Scroll on an explicit quick-category activation, including a repeat click on an already selected category. Do not scroll when unrelated data refreshes, theme changes, sort updates or typing occurs.
- Make the selected pill state accessible, update the results heading promptly, and announce loading/result count in the active language. With keyboard activation, manage focus on the results heading without triggering a second jump; pointer use must not unexpectedly trap focus.
- Reduced motion uses immediate scrolling. Avoid arbitrary timeouts waiting for the API; the heading is available while the actual result skeleton loads.
- A rapid sequence of category clicks must end on the final category without stale results or repeated scroll callbacks. Preserve category-tile links to their existing category routes unless a documented owner request changes them.

### Reveal sections when they enter view

Owner reference: Animista `roll-in-blurred-left`, **650ms**, `cubic-bezier(.230,1,.320,1)`:
start `translateX(-1000px) rotate(-720deg)`, `blur(50px)`, opacity 0;
finish zero translation/rotation, blur 0, opacity 1.

- Use a reusable small reveal wrapper/hook with IntersectionObserver. Trigger when the real section/content group enters the viewport, normally once per mount. A requested category change can replay the result-group entrance, including cached results.
- Preserve the reference's blurred roll character and timing. Mirror entry direction for RTL. Bound translation to available space on narrow screens and prevent temporary horizontal overflow; document that responsive adaptation.
- Animate compact section content/groups, not the entire page, navbar, active form or focused input. Do not remount the application or lose a form value to replay an animation.
- Keep reveal transforms separate from card hover transforms. Remove temporary clipping/transform/layer hints after completion where they would cut off card shadows or focus rings.
- Content is visible by default. No permanent opacity-0 state if JavaScript/observer fails. Reduced motion, missing observer, keyboard focus entering a region and cleanup must leave content available. Disconnect observers on unmount.
- Do not label mount-only CSS “scroll-triggered”. Record actual scroll-triggered browser evidence and a rapid category-switch test.

### Use the existing query cache effectively

- Inspect `src/lib/queryClient.ts`, `src/features/catalog/hooks.ts`, `api.ts`, `types.ts` and admin mutation invalidations. Catalogue keys currently live inline in `hooks.ts`; do not assume a `catalog/keys.ts` file already exists.
- Reuse TanStack Query; preserve category, sort, limit, offset and stock-filter dimensions in keys. Share query options/key construction if adding prefetch, so prefetch and useQuery address the exact same data.
- Prefetch the likely next category on deliberate pointer hover/keyboard focus if useful. Avoid fetching every category, repeated pointer-move fetches, or unbounded caching. Honor connection/data-saving constraints where supported.
- Revisit a fresh category without an unnecessary request or full skeleton. Measure cold versus warm behavior and request count; do not promise a speed gain without evidence.
- Keep background-refresh status clear and invalidate catalogue data after relevant mutations. Never let cached prices/stock authorize orders: `place_order` remains authoritative.
- No localStorage/service-worker cache for passwords, sessions, private profiles, orders or payment proofs. Preserve user-scoped query keys and clearing on sign-out. Keep authentication state separate from public catalogue cache.
- Check existing static asset caching before proposing changes; hashed assets may be long-lived but HTML must not point indefinitely at deleted build chunks. This request does not authorize production Cloudflare settings changes.

## 7. Pink flower buy/add-to-cart button

Owner reference: Uiverse **yaroslavas2001**, six four-petal flowers surrounding the button label. Implement a reusable purchase variant of the real shared button; do not replace the cart action with decorative markup.

- Use pink/blush petals and existing lighter surface/pink tokens for the gradient, with documented border/shadow tokens in both themes. No blue sample colors or hardcoded black/white. Keep text on an opaque-enough contrast-safe surface; decorative flowers are not an input boundary.
- Translate the label through the normal catalogue keys (“Add to cart” / Arabic equivalent). Preserve accessible names, stock-disabled state, busy state and preventing duplicate activation.
- Use scoped classes or data attributes. Inner wrapper is about 8em x 2em with space around it; outer button stays responsive and at least 44px high. Do not force 12em width into narrow two-column product grids. Reserve flower space so it does not overlap neighboring controls or get clipped.
- Four petals per flower: 2-column arrangement, default 1em petals, with the supplied four rotations (0, 90, 270, 180 degrees) and organic `40% 70% / 7% 90%` silhouette. Expand to 1.5em on hover over about 800ms. This silhouette is an owner-authorized decorative shape, not a replacement control radius token.
- Preserve the six-flower composition, using logical start/end positions for RTL:

| Flower | Placement from reference | Rest angle | Hover rotation                      |
| ------ | ------------------------ | ---------- | ----------------------------------- |
| 1      | top -12px, start -13px   | 5deg       | 5 to 365deg, 15s linear             |
| 2      | bottom -5px, start 8px   | 35deg      | 35 to -325deg, 13s linear, 1s delay |
| 3      | bottom -15px, centered   | 0deg       | 0 to 360deg, 16s linear, 1s delay   |
| 4      | top -14px, centered      | 15deg      | 15 to 375deg, 17s linear, 1s delay  |
| 5      | top -3px, end 11px       | 25deg      | 25 to -335deg, 20s linear, 1s delay |
| 6      | bottom -15px, end -15px  | 30deg      | 30 to 390deg, 15s linear, 1s delay  |

- Rotation runs only while fine-pointer hover is active, never continuously at rest or while disabled/busy. On leave, return gracefully without snapping. Respect reduced motion; keyboard users get a clear static decorated focus state. Avoid animating width/height in a way that changes document layout; an isolated decorative layer or transform-based equivalent is acceptable.
- Decorative flowers are `aria-hidden`, have no interactive descendants and do not intercept clicks. Use valid phrasing markup inside a button (for example spans); do not paste the sample's nested paragraph/div structure blindly into React.
- The magnetic transform and flower rotation belong on separate elements. Do not make the purchase button inherit `overflow:hidden` if it would cut off its flowers; keep any glimmer clipped on an inner surface instead.
- Verify original reuse/license requirements and retain the provided Uiverse author attribution if copying that design. Do not invent a source URL or license statement.
- Wire Home, Category and Search cards to the existing cart provider/API. A click must actually update the cart with the intended product/quantity; sold-out and pending buttons remain inactive. Test this with the provider, not only a mocked callback count.

## 8. Complete bilingual UI, including errors

Start with `AccountSecurityPage.tsx`, `AccountFavoritesPage.tsx`, `AuthAlert.tsx`, `src/lib/errors.ts`, `authErrors.tsx`, `ErrorPanel.tsx`, ToastProvider, then inventory **every route in `src/routes.tsx`** (confirm its actual path/extension).

- Move all application-owned copy into the existing `ar.json` / `en.json` system, including headings, subtitles, labels, tooltips, screen-reader labels, placeholders, loading/empty/error/success states, dialog buttons, validation, MFA, account navigation, footer/legal copy and toasts. No Arabic fallback literals for missing English keys, and no scattered `lang === ...` prose replacements.
- Use English catalogue names for English when supplied. Favorites currently chooses `product.name_ar || product.name` for its toast regardless of language; fix it. User-entered Arabic content is not a translation defect and must not be silently machine-translated; record missing business-content translations separately.
- Preserve `AppError` codes, safe params and reference IDs. Resolve the **approved** translated error template at render time using the active language. Switching languages while an error is visible must update it without repeating the failed request. Never display raw Supabase/network `error.message`, and do not translate arbitrary server text.
- AuthAlert, ErrorMessage, ErrorPanel and error toasts must share the same safe localization contract, with translated “Error code” and “Reference” labels. Keep generic security behavior in both languages.
- Amend the earlier Arabic-only presentation wording in the relevant docs to reflect this explicit owner requirement; do not weaken the raw-error prohibition or add exceptions that hide leaks.
- Run a source scan for Arabic in production TS/TSX, review each hit (exclude tests/comments/dictionaries deliberately), and add browser coverage of every route/state with deterministic English fixture data. Dictionary parity alone does not detect hardcoded Arabic.
- Required regression routes include `/account/security` and `/account/favorites`: headings, normal forms, validation, empty/populated/loading states, errors, toasts, MFA status and sign-out controls. Cover logged-out/unauthorized redirects without bypassing guards.
- Test English → Arabic → English, document lang/dir, correct logical spacing, preserved form values and errors, and Latin codes/emails in LTR spans. Error codes are stable machine identifiers, not translated text.

## 9. Password reveal, copy, generation and real strength checks

Use a reusable accessible password field/control based on the existing Input and Button. Audit Login, Register, AccountSecurity and the actual new-password recovery flow; do not assume an email-reset request form sets a password.

### Controls

- Add show/hide and an adjacent explicit copy action to applicable password fields. Default to masked. Preserve current value, caret/focus and password-manager/autofill support; use `current-password` for login and `new-password` for new/confirm inputs. Do not trim, normalize or silently truncate a password.
- Controls use `type="button"`, localized names/tooltips and clear toggle state. At 360px, long labels cannot overlap the input. Empty/disabled fields disable copy. Tab/Enter/Space must work without submitting the form accidentally.
- Copy only the value explicitly requested by the user through Clipboard API after a click. Handle unavailable/denied clipboard access with a safe localized message. Never auto-copy, log, toast the password itself, persist it, send it to analytics, or promise clipboard removal.
- A Generate action appears only when **setting a new password**, not on login, OTP verification or MFA challenge. Generate a strong 20-character value locally with `crypto.getRandomValues`, unbiased selection and an appropriate supported alphabet; never use Math.random or a remote generator. Fill both password and confirmation together and run the same validation.
- Retain each reveal state deliberately; generating a value need not expose it automatically. Let the user reveal/copy it to save it. Clear secret state after successful submission/unmount through normal component lifecycle; do not persist drafts of passwords.
- “Any secret input” does not authorize generating MFA codes, exposing backend keys or making a fake replacement for an authenticator. Keep those security mechanisms intact.

### Strength policy and enforcement

- Keep the documented minimum of 10 unless an explicit updated policy is recorded. Reject the owner's example `12345678910`, ascending/descending numeric runs, single-character repetition, repeated trivial patterns, common keyboard walks and a documented small common-password blocklist. Allow long meaningful passphrases; do not substitute arbitrary mandatory symbol/uppercase composition rules for strength.
- Centralize this policy for new signup/password-change/recovery UI and their feature API boundary. Display specific safe, translated guidance for the locally entered weak password. Do not apply the new strength policy to login and thereby lock out existing users with otherwise valid credentials.
- Fix the local Supabase minimum of 6 so the server matches the documented minimum. Inspect supported current Supabase Auth/password-policy capabilities using **official documentation for the installed/provider version and project plan**. Record links and date; do not infer capabilities from model memory or invent a database trigger that sees plaintext Auth passwords.
- Frontend validation is bypassable. Prove server rejection through direct local Auth signup/change requests. If the managed service cannot enforce a custom pattern rule with the current configuration, state exactly which protection is UI-only, record the provider limitation/owner configuration decision, and keep that part of the launch gate open. Do not add an unapproved custom authentication service or claim full server enforcement from a UI test.
- Review the local `secure_password_change = false` setting against existing reauthentication requirements. Any required hosted configuration remains owner-run with a prepared exact checklist; no dashboard changes by the agent.
- Restore neutral registration/reset/resend behavior and remove the account-existence disclosure introduced by `AUTH-015`; update contradictory tests to assert the security requirement, not the regression. Preserve rate limits, CAPTCHA and session behavior.
- Fix Turnstile's synthetic-token production fallback. Wait for actual widget readiness and handle expiry/failure safely; stable callbacks must not repeatedly recreate the widget while typing. Unit fixtures belong in tests. Prove CAPTCHA rejection at the appropriate boundary and report live-provider verification separately.

## 10. Diagnose admin promotion from the current schema

Owner symptom: updating `public.profiles.role` with an email predicate did not produce the expected admin result after profile emails were added. **The cloud root cause is not established.** The query updates `role`, not the email value itself.

Read these exact sources first:

- `docs/runbooks/first-admin.md`
- `supabase/migrations/20261012041924_admin_hardening.sql` (`protect_profile_role`)
- `supabase/migrations/20261012043500_audit_log.sql`
- `supabase/migrations/20261010232048_security.sql` and `20261012060000_profile_address_grants.sql`
- `supabase/migrations/20261016040000_profile_email_and_conflict_upsert.sql`
- `src/features/auth/session.api.ts`, AuthProvider, admin route/MFA guards and generated types.

The current role trigger is SECURITY INVOKER and requires both `current_user` to equal the database owner and `session_user = current_user`. Client column grants do not include `role` or the new email column. Adding an email column does not remove these protections. A hosted SQL editor's execution identity must be measured, not guessed.

Prepare an owner-run **read-only** diagnostic, substituting the owner's chosen account privately:

```sql
select current_database(), current_user, session_user,
       pg_get_userbyid(datdba) as database_owner,
       current_setting('role', true) as active_role
from pg_database
where datname = current_database();

select u.id, u.email as auth_email, p.email as profile_email, p.role
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('replace-with-the-intended-account@example.com');
```

Do not execute this against production yourself. Do not commit real account output. Obtain/record the exact SQL error or affected-row count, correct project/environment and applied migration state through the owner's approved channel. Distinguish:

1. Zero matching rows (wrong project, email, case, stale profile copy or missing profile).
2. Permission/`ADM-001` exception from the role guard or audit trigger.
3. Successful role update but stale client profile/cache.
4. Successful role update with `aal1`, correctly blocked pending MFA enrollment/verification.

Use authoritative `auth.users.id` to identify the intended account, then an exact UUID for the documented owner operation. Do not rely on a profile-email copy as the security authority. The latest migration populates/backfills email but does not itself demonstrate ongoing sync after confirmed Auth email changes; test that lifecycle and fix only if needed with an append-only migration.

Reproduce owner promotion and API denial on the local stack. If the hosted identity differs from the current guard's owner assumption, propose the smallest allow-listed, tested owner-only correction with owner review. **Never disable the trigger/RLS, grant role updates to clients, use an unrestricted role list, or insert a privileged key into the browser.** Do not rerun `setup_remote_supabase.sql` blindly as a fix; compare applied migrations first.

The corrected runbook must show how the owner verifies exactly one intended profile, performs the authorized update with a verifiable returned result, refreshes the application's profile/session, enrolls/verifies MFA, and confirms admin access only at `aal2`. Do not report a promotion succeeded without a returned/queried role. Regenerate database types, never hand-edit them as proof of schema verification.

## 11. Verification is part of the implementation

Make small checkpoints. Extend meaningful behavior tests; do not write tests that only assert a class name exists, and do not weaken old gates.

Required browser evidence on the final SHA:

| Interaction            | Acceptance evidence                                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Magnetism              | A real mouse changes the visible/computed transform; leave/cancel/disabled/busy/focus restore it; pointer clicks and keyboard activation still work.                                               |
| Themes                 | Start/mid/end computed colors differ appropriately; both final themes are correct; rapid toggles settle; reduced motion is immediate; initial load has no flash.                                   |
| Skeletons              | Delayed local/mock requests show visible shapes; successful response removes them; failures stop loading; eager/cached/replaced/broken images covered; reduced-motion placeholders remain visible. |
| Card hover             | Active card sharp/raised, surrounding grid softened, no clipped shadow or blocked controls; rapid enter/leave returns cleanly; touch/reduced motion stay readable.                                 |
| Category navigation    | Clicking Earrings selects it and scrolls its heading below the sticky header; results match; same-category and rapid switching work; cached revisits also scroll/reveal.                           |
| Section reveal         | Scroll into an initially offscreen section triggers it once; no horizontal scrollbar, invisible content or lost input/focus; observer fallback works.                                              |
| Flower purchase action | Pink flowers animate on hover only, fit 360px grids, obey disabled/reduced-motion states; real cart gets the intended product exactly once.                                                        |
| Cache                  | Cold/warm request counts and timing recorded; no unnecessary warm re-request; invalidation updates products; no cross-account private-data cache.                                                  |
| Language               | All routes audited in both languages, including security/favorites and every error/loading/empty/success state; no untranslated application-owned text in the English fixture run.                 |
| Passwords              | Show/hide, copy success/denial, generation fills both fields, strength rules, matching, autofill/caret, no accidental submit/leak; direct Auth tests distinguish server policy from UI checks.     |
| Admin                  | Local owner can promote, anon/customer/API cannot; `aal1` refused and `aal2` accepted; profile/email lifecycle and audit preserved. Hosted result remains owner-confirmed.                         |

Use 360px and 1280px, Arabic/English, light/dark, mouse/keyboard/touch and reduced motion. Include Brave/Chromium behavior where accessible. Browser screenshots prove appearance; short recordings or computed-style samples prove motion. A passing jsdom test does not prove animation.

Run and report actual exit status, counts and skipped/blocked cases:

```text
npm ci --ignore-scripts          (when lockfile/dependency setup requires it)
npm run verify
npm run roadmap:check
npm run test:e2e                 (include applicable e2e/security coverage)
npm run db:reset                 (isolated local stack only, if auth/schema/config changes)
npm run db:test
npm run db:test:concurrency      (when database changes warrant it)
npm run db:types
npm run db:types:check
```

`verify` includes migration, SQL, token, supply-chain, i18n, lint, formatting, TypeScript, unit/tooling, production-build, secrets and bundle gates. List each result separately. Keep the 200,000-byte initial JS limit; preserve lazy imports and avoid importing both full locale/error dictionaries or a large animation/password library into the initial bundle. Do not use unrelated minification tricks or remove checks to claim a pass.

Tests are local unless explicitly evidenced otherwise. Never run a destructive reset against another agent's stack or a cloud database. Missing Docker/browser/owner access is a specific pending gate, not a pass.

## 12. Deliver back to Codex for review, then the owner

Keep `.agent-state/project-progress.md` current with Current task, Completed, Files changed, Tests executed, Problems found and Next action. Update Appendix G, relevant specs/runbooks and task statuses honestly. Human-owned tasks and copy/security sign-off stay human-owned.

Create/update `HANDOVER_TO_CODEX.md` containing:

1. Required base SHA, final branch/SHA, commit list and draft PR link; no merge.
2. Every requested item above mapped to implementation files, test names and browser evidence, with pass/fail/pending status.
3. Root causes actually confirmed, not only descriptions of CSS added.
4. Exact gate results, test counts, skipped checks, bundle bytes and cold/warm measurements.
5. The admin diagnosis: error/row count, local proof, hosted unknowns and exact owner-only next step; no real credentials or private account output.
6. Password-policy enforcement split by UI/local Auth/hosted Auth, plus any provider/plan limitation or owner decision still required.
7. Existing security regressions found/fixed, including enumeration and CAPTCHA. Name the affected SEC controls for owner review.
8. Remaining issues and the next exact command. If blocked, give Error / Expected / Actual / Possible cause.
9. A phase 0–9 evidence table: verified complete, implemented but unverified, incomplete, and human-owned launch work. Do not derive “launch ready” from task counts. Include email delivery, deployed migrations, correct assets/MIME, real catalogue/delivery/payment configuration, admin MFA/recovery and real checkout/payment/shipping verification as explicit launch evidence requirements.

Finish with a concise owner-facing summary and the handoff path. Codex will inspect the actual diff, rerun appropriate checks, review the browser evidence and assess the remaining launch work after the owner returns with your results. Do not claim Codex has approved your work, or that the product is launched/ready, before that review.
