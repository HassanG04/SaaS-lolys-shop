# Handover to Codex / Owner

## Objective

Completed task `T-5.09: Site settings` on branch `agent/T-5.09-admin-settings`.

## Completed Work in T-5.09

1. **Settings Types (`src/features/admin/settings/types.ts`)**:
   - `ShopSettingsMap` defining all 16 allow-listed database settings keys: `shop_name_ar`, `shop_name_en`, `tagline_ar`, `phone`, `whatsapp`, `instagram`, `announcement_ar`, `hero_title_ar`, `hero_subtitle_ar`, `sale_percent`, `payment_methods_enabled`, `instapay_qr_path`, `instapay_handle`, `returns_text_ar`, `payment_window_hours`, `pending_order_limit`.
   - `UpdateSettingPayload` discriminated union and `SettingsAuditEntry` schema.
   - `SENSITIVE_SETTING_KEYS` identifying MFA Step-Up requirements.

2. **Validators (`src/features/admin/settings/validators.ts`)**:
   - Pure validation functions enforcing exact database contract constraints, character limits, number ranges, and regexes.
   - `validateSettingValue` returning `{ valid: false, errorHint: 'ADM-008' }` for unknown keys and `ADM-007` for value violations.

3. **API Layer (`src/features/admin/settings/api.ts`)**:
   - `getAdminSettings`: queries `shop_settings` table and returns typed settings with `DEFAULT_SETTINGS` fallbacks.
   - `updateAdminSetting`: pre-validates inputs and calls database RPC `admin_update_setting(p_key, p_value)` with Arabic error catalogue mapping (`toAppError`).
   - `uploadInstaPayQrImage`: validates file magic bytes (JPEG/PNG/WebP <= 5 MB), resizes and re-encodes, uploads to `product-images` bucket under `settings/instapay-qr-${uuid}.${ext}`, persists path via RPC, and deletes previous custom QR image from storage (leaving default placeholder untouched).
   - `getPublicQrUrl`: resolves public URL, falling back to `/placeholders/instapay-qr.svg` if empty or default.
   - `getRecentSettingsAudit`: queries `audit_log` where `entity = 'shop_settings'` (latest 10 entries).

4. **React Query Hooks (`src/features/admin/settings/hooks.ts`)**:
   - `useAdminSettings`, `useUpdateAdminSetting`, `useUploadInstaPayQr`, and `useRecentSettingsAudit`.
   - Invalidation synchronizes admin settings, public storefront settings (`['settings', 'public']`), and audit log query keys.

5. **Settings Administration UI (`src/features/admin/settings/SettingsPage.tsx`)**:
   - Organized into 5 tabbed sections:
     - **معلومات المتجر والتواصل**: Names, tagline, phone, WhatsApp, Instagram link.
     - **الواجهة الرئيسية والخصم والإعلانات**: Announcement bar, hero title, subtitle, sale discount percent, with live storefront hero badge preview.
     - **طرق الدفع المفعلة وإنستاباي**: Payment method checkboxes, InstaPay IPA address, QR preview and replacement file picker.
     - **الحدود التشغيلية والسياسات**: Pending order limit (1..10), InstaPay payment window (1..72 hours), returns text.
     - **سجل تغييرات إعدادات المتجر**: Chronological audit log table with translated friendly setting names, old/new values, and actor roles.
   - Step-Up MFA prompt integration (`useStepUp` / `StepUpDialog`) guarding payment methods, operational limits, and QR image replacement.

6. **Route & Layout Wiring**:
   - Added lazy route `{ path: 'settings', element: <AdminSettingsPage /> }` in `src/features/admin/AdminRoutes.tsx`.
   - Added `'settings'` icon and navigation entry `{ to: '/admin/settings', label: t.admin.settings, icon: 'settings' }` in `src/features/admin/AdminSidebar.tsx` and `types.ts`.

7. **Verification & Quality**:
   - 22 unit tests in `src/features/admin/settings/settings.test.tsx` (100% pass) testing validators, API functions, RPC calls, old QR file deletion, error mappings, step-up prompts, and UI interactions.
   - Full test suite: **728 tests pass** (587 application tests + 141 tooling tests).
   - Full `npm run verify` passed: `check:migrations`, `check:sql`, `check:tokens`, `check:i18n`, `lint`, `format:check`, `typecheck`, `test:unit`, `build`, `check:secrets`, and `check:bundle`.
   - Initial JS bundle budget maintained: **199,998 / 200,000 gzip bytes** in 4 initial chunks.
   - Roadmap updated: `T-5.09: done` (77/119 tasks completed, Phase 5: 9/12 completed).

## Next Task

- **T-5.10: Audit log viewer** (`/admin/audit`):
  - Read-only table with filters (date, entity, actor, action).
  - Readable before-and-after view.
  - "Recent sensitive changes" panel for the dashboard.
  - No edit or delete controls.
  - Verification: `npm run verify`.
