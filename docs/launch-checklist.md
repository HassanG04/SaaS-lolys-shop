# Launch Checklist & Keyboard-Only Walkthrough

**Document:** `docs/launch-checklist.md`  
**Task:** T-7.02 (Accessibility pass) & Pre-launch Operational Readiness  
**Standards:** WCAG 2.1 Level AA, WAI-ARIA 1.2, axe-core 4.14  
**Date:** 2026-10-14  
**Status:** All Automated Audits & Keyboard Walkthroughs Verified

---

## 1. Automated Accessibility Audit Summary (axe-core)

Automated accessibility audits run via Playwright (`e2e/accessibility.spec.ts`) against local production builds in both **Light** and **Dark** themes across all 9 critical user journeys. All views passed with **0 Critical** and **0 Serious** violations.

| #   | Page / Journey   | Route             | Light Theme Result | Dark Theme Result | Key Accessibility Features Verified                                                            |
| --- | ---------------- | ----------------- | ------------------ | ----------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Home Page        | `/`               | **0 Violations**   | **0 Violations**  | Hero landmarks, skip link, accessible search form, category cards with alt text                |
| 2   | Category Page    | `/category/all`   | **0 Violations**   | **0 Violations**  | Sort dropdown labelled, stock filter toggle labelled, semantic product grid                    |
| 3   | Product Detail   | `/product/1`      | **0 Violations**   | **0 Violations**  | Quantity stepper buttons (`aria-label`), gallery thumbnails, discount badges                   |
| 4   | Cart Page        | `/cart`           | **0 Violations**   | **0 Violations**  | Line item steppers, remove item buttons labelled, order summary landmarks                      |
| 5   | Checkout Page    | `/checkout`       | **0 Violations**   | **0 Violations**  | Form labels associated with inputs, radio groups with fieldset/legend, errors in `--danger`    |
| 6   | InstaPay Payment | `/pay/:orderId`   | **0 Violations**   | **0 Violations**  | Instructions list (`ol`), copy buttons with feedback, file upload button keyboard-accessible   |
| 7   | Account Orders   | `/account/orders` | **0 Violations**   | **0 Violations**  | Order list headings, status chips with accessible labels, courier contact LTR isolation        |
| 8   | Admin Products   | `/admin/products` | **0 Violations**   | **0 Violations**  | Filter labels, table column headers (`th`), stock edit modal with native `<dialog>` focus trap |
| 9   | Admin Dashboard  | `/admin`          | **0 Violations**   | **0 Violations**  | KPI regions labelled, chart text summary table fallback for screen readers, date range group   |

---

## 2. Keyboard-Only Navigation Walkthrough

All interactive features of the store are fully navigable and operable using the keyboard alone (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Arrow` keys, and `Escape`).

### Walkthrough Sequence

#### A. Global Navigation & Skip Link

1. **Skip to Main Content:**
   - On initial page load, pressing `Tab` focuses the hidden skip-link: `"تخطي إلى المحتوى الرئيسي"`.
   - The link translates into view at the top-start of the viewport (`fixed top-4 start-4`) with brand focus ring.
   - Pressing `Enter` skips over the header navigation and lands keyboard focus directly on `#main-content`.
2. **Navbar Navigation:**
   - Pressing `Tab` cycles through brand logo link, search input box, search submit button, navigation links (`المتجر`, `تصفّح`, `عن المتجر`), cart pill button with badge, account link, theme switch button, and language switch button.
   - All interactive controls exhibit clear focus indicators (`focus:ring-2 focus:ring-focus`).

#### B. Storefront & Product Browsing

1. **Catalog & Category Filter:**
   - On `/category/all`, keyboard users can `Tab` to the sort selector (`ترتيب حسب`) and change options using `ArrowUp` / `ArrowDown`.
   - `Tab` navigates to each product card. Pressing `Enter` navigates to the selected product detail page.
2. **Product Page Interaction:**
   - `Tab` focuses the thumbnail gallery items; pressing `Enter` switches the active image.
   - `Tab` focuses the quantity decrease (`-`) and increase (`+`) buttons.
   - Pressing `Enter` or `Space` on `+` increments the quantity (capped at product stock); pressing `-` decrements the quantity (floored at 1).
   - `Tab` focuses the primary CTA `"أضف إلى السلة"`. Pressing `Enter` adds the item to the cart with audible/visual toast confirmation.

#### C. Cart & Checkout Flow

1. **Cart Review:**
   - Navigating to `/cart`, keyboard users can adjust quantities of individual line items or remove them via keyboard-accessible delete buttons.
   - `Tab` to `"إتمام الطلب"` and press `Enter` to proceed to checkout.
2. **Checkout Form Completion:**
   - `Tab` progresses sequentially through:
     1. Full name input
     2. Mobile number input
     3. Alternative phone (optional)
     4. Governorate dropdown (`select`) - navigable with Arrow keys
     5. City / District inputs
     6. Street address, building, floor, apartment, landmark, notes
     7. Delivery method radio group (`مندوب` vs `البريد المصري`) - selectable with `ArrowUp` / `ArrowDown` / `Space`
     8. Payment method radio group (`الدفع عند الاستلام` vs `الدفع عبر إنستاباي`)
     9. `"احفظ هذا العنوان لطلباتي القادمة"` checkbox - toggled with `Space`
     10. Submit button `"إرسال الطلب"` - triggered with `Enter`

#### D. InstaPay Payment & Order Tracking

1. **Payment Steps (`/pay/:orderId`):**
   - Keyboard users can `Tab` through payment instructions.
   - `Tab` to the copy buttons for the InstaPay handle and order reference; pressing `Enter` copies to clipboard with visual confirmation.
   - `Tab` to the transfer receipt upload button; pressing `Enter` or `Space` opens the system file chooser.
   - `Tab` to the reference number field and submit button.
2. **Account Orders (`/account/orders`):**
   - Keyboard users can navigate order cards, inspect line items, and activate `"إلغاء الطلب"` (for eligible pending orders), which triggers an accessible confirmation dialog.

#### E. Admin Panel & Modal Management

1. **Modal Focus Containment & Restoration:**
   - On `/admin/products`, keyboard navigating to any product's `"تعديل"` button and pressing `Enter` opens the stock adjustment modal.
   - The modal utilizes native HTML `<dialog>` with `.showModal()`, automatically trapping focus inside the dialog and making the rest of the page inert.
   - Pressing `Escape` or the close icon cancels the modal, and keyboard focus is automatically restored back to the opening `"تعديل"` button.
2. **Admin Dashboard Chart Accessibility:**
   - Daily sales chart features a visible fallback toggle for a structured accessible table (`table` with `th` scopes and format strings) allowing screen readers and keyboard users to access exact numeric sales series without visual chart interpretation.

---

## 3. Pre-Launch Verification Checklist

- [x] **A11y automated pass:** `e2e/accessibility.spec.ts` passes with 0 critical and 0 serious findings across 9 views in light and dark themes.
- [x] **Keyboard walkthrough:** Complete keyboard navigation path verified without mouse dependency.
- [x] **Color contrast compliance:** All text elements meet WCAG AA contrast thresholds (tested in `contrast.test.mjs` and axe).
- [x] **Focus management:** Focus visible ring tokens (`--color-focus`) applied consistently across inputs, buttons, links, and switches.
- [x] **Form error association:** Error messages mapped to input IDs via `aria-describedby` and displayed in `--danger`.
- [x] **Directional integrity:** All navigation chevrons and back arrows flip in RTL; checkmarks and QR codes remain unmirrored.
