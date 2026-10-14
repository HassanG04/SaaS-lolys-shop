# Approval-flow implementation checkpoint — 2026-10-14

This is Codex's parallel-work checkpoint. Preserve Anti-Gravity's T-5.10 work and its HANDOVER_TO_CODEX.md.

## Current objective

Implement the owner's attached approve-first InstaPay and saved-address change request.
Working checkout: C:\Users\Hassan-PC\.codex\worktrees\main-polish\الاء
Branch: agent/T-1.23-order-approval, based on 0359dc2 (T-5.09).
The original D:\Projects\Programming\الاء checkout now records T-5.10 done; that newer audit code has not been integrated into the isolated branch.

## Completed drafts

- supabase/migrations/20261013232546_order_approval_enum.sql
- supabase/migrations/20261013232547_order_approval.sql
- src/lib/errors.ts: ORD-015, PAY-007, PAY-008 Arabic catalogue entries.
- supabase/tests/database/10_shop_settings.test.sql: new setting counts.
- supabase/tests/database/11_orders_v2_payments.test.sql: explicit approval-disabled legacy scenario and owner-run expiry.
- package-lock.json: inherited lock inconsistency repaired; npm ci --ignore-scripts passed.
- Customer UI draft in CheckoutPage, PayOrderPage, AccountOrdersPage, checkout payload/validation, payments API/hooks/types, public settings API/types, order status badge/timeline.
- Admin draft in orders API/hooks/types/transitions, OrderApprovalDialog.tsx, whatsapp.ts, orders.test.tsx. Remaining admin integration must be inspected before assuming completion.

The migration adds orders.approval_note and the awaiting_approval enum, private QR/handle settings, require_order_approval=true and approval_window_hours=24; replaces place_order, approval/rejection RPCs, payment instructions, submit proof, order status guard and expiry. Address saving is atomic with successful order creation. Expiry is owner-only. Review all draft SQL before applying.

## Remaining

1. Read actual git status/diff and all untracked files. Capture exact final customer/admin agent changes; this checkpoint is not a completed file inventory.
2. Add pgTAP scenarios S32–S37 and E1 database behavior coverage. The attempted write of 15_order_approval.test.sql did NOT execute.
3. Finish UI tests and administrator screen wiring/settings controls; add Arabic/English keys. New UI currently references keys not yet added.
4. Regenerate src/types/database.types.ts from actual isolated migrated DB (currently stale, new RPC typing not available).
5. Update docs/spec and roadmap in isolated branch, split large task per roadmap; original D roadmap already contains T-1.23 doing.
6. Verify approval/cancel/payment races, settings validation and anonymous/customer/admin permissions. Do not fabricate reset, DB tests or full verify results.
7. Run full verify and local E2E safely, then prepare PR for owner review. Never push/merge main or deploy.

## Isolated database

Ignored test workdir: C:\Users\Hassan-PC\.codex\worktrees\main-polish\الاء\.tools\order-approval-db
Project ID: lolys-approval-test. Ports: DB55322/API55321; original Anti-Gravity stack uses54322/54321.
Initial db start succeeded when the two new migrations were still empty. They were subsequently populated and copied to test workdir, and a reset was started. Process session54955 became unavailable before final result was observed; inspect database and re-run isolated reset when authorized.
Use D:\Projects\Programming\الاء\node_modules\.bin\supabase.cmd with explicit --workdir .tools/order-approval-db and --local. NEVER reset the original stack, use --linked, or print Supabase status secrets.

## Current error

Action: escalated file write adding approval pgTAP tests in isolated checkout.
Actual: Automatic approval review failed because usage limit was reached; action was NOT executed. Reviewer said this was a review failure, not a finding the action was unsafe. No bypass attempted.
Expected: write tests, reset isolated database, run pgTAP and generate types.
Cause: approval-service usage limit, not a code test failure.

## Next exact command

Run from isolated checkout after approval-service access is restored:

```powershell
git status --short
```

Then inspect diff/untracked files and finish tests/types/translations before running verify. Node runtime is D:\Projects\Programming\الاء\.tools\node-v24.21.0-win-x64; use npm_config_script_shell C:\Windows\System32\cmd.exe.
