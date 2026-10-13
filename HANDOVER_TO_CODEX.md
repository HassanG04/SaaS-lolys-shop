# Handover to Codex / Owner

## Objective

Completed task `T-5.08: Payment review` on branch `agent/T-5.08-admin-payments`.

## Completed Work in T-5.08

1. **Payment Review View (`src/features/admin/payments/PaymentsPage.tsx`)**:
   - Queue of orders `under_review` sorted oldest first (FIFO) for administrative verification.
   - Status tabs: `under_review` (default with active count badge), `all`, `paid`, `rejected`, `awaiting_proof`.
   - Search input supporting order `#ID`, customer name, phone number, and payment reference code.
   - Responsive table displaying order ID & timestamp, customer name & phone, total in EGP (`formatEGP`), payment reference code with copy button, deadline/submission timestamp, proof viewer trigger, and `PaymentStatusBadge`.
   - Quick action buttons ("قبول" / "رفض") for review directly from table.
   - Action launcher for "تطهير الإثباتات القديمة" (Purge old proofs).

2. **Ephemeral Proof Viewer (`src/features/admin/payments/ProofViewerModal.tsx`)**:
   - Generates short-lived 60-second signed URLs via `supabase.storage.from('payment-proofs').createSignedUrl(path, 60)`.
   - Never stores signed URLs in persistent storage or database.
   - Displays proof image, order amount, copyable reference code, customer details, and external tab link.
   - Ephemeral privacy notice banner explaining 60s validity.

3. **Payment Review Dialog (`src/features/admin/payments/PaymentReviewDialog.tsx`)**:
   - Approve action: marks payment `paid` via `admin_review_payment` RPC (AAL2 MFA required, auto-audited).
   - Reject action: marks payment `rejected` with note via `admin_review_payment` RPC, allowing the customer to resubmit before deadline on storefront `/pay/:orderId`.
   - Arabic catalogue error mapping via `toAppError`.

4. **Purge Old Proofs Action (`src/features/admin/payments/PurgeProofsDialog.tsx`)**:
   - Enforces data retention and privacy policy (`docs/spec/security-model.md § 7`): targets orders delivered longer ago than retention period (default 90 days after delivery).
   - Guarded by Step-Up MFA (`useStepUp` / `StepUpDialog`).
   - Deletes image objects from private `payment-proofs` bucket through Storage API (`remove`).
   - Clears `payment_proof_path = null` on the order records in the database.
   - Toast feedback with count of purged files.

5. **API & Data Hooks (`src/features/admin/payments/api.ts`, `hooks.ts`, `types.ts`)**:
   - `getAdminPaymentOrders`: Query filtered by status and search with FIFO sorting for `under_review`.
   - `getSignedProofUrl`: 60-second signed URL generator.
   - `adminReviewPayment`: RPC wrapper for `admin_review_payment`.
   - `purgeOldProofs`: Retention query, storage object removal, and database path cleanup.
   - TanStack Query hooks with automatic cache invalidation (`admin-payment-orders`, `admin-orders`, `admin-dashboard`).

6. **Route Wiring**:
   - Added lazy route `payments` to `src/features/admin/AdminRoutes.tsx`.

7. **Bundle Budget & Optimizations**:
   - Inlined scroll restoration in `src/components/layout/Layout.tsx` and consolidated guard loaders in `src/routes.tsx`.
   - Initial JavaScript bundle: exactly **199,994 gzip bytes** (under 200,000 byte budget).
   - Recharts and admin chunks strictly isolated to admin lazy chunk.

8. **Verification & Quality**:
   - 15 unit tests in `src/features/admin/payments/payments.test.tsx` testing API queries, FIFO sorting, signed link expiry, approve/reject RPC, error mapping, retention purge, and UI interactions.
   - Full test suite: **706 tests pass** (565 application tests + 141 tooling tests).
   - Full verify passed: `npm run verify` exited 0 (`check:migrations`, `check:sql`, `check:tokens`, `check:i18n`, `lint`, `format:check`, `typecheck`, `test:unit`, `build`, `check:secrets`, `check:bundle`).
   - Roadmap updated: `T-5.08: done` (76/119 tasks completed, Phase 5: 8/12 completed).

## Next Task

- **T-5.09: Site settings** (`/admin/settings`):
  - Shop info, WhatsApp and phone, announcement bar, hero text and sale percent, enabled payment methods, InstaPay address and QR image (replace with preview), returns text.
  - Each save calls `admin_update_setting`.
  - QR, payment methods and limits require step-up MFA.
  - Show latest changes from audit log.
  - Ship placeholder QR until real images exist (H-10).
  - Verify with `npm run test:unit`.

## Command to run next

```bash
git checkout -b agent/T-5.09-admin-settings
npm run roadmap:next
```
