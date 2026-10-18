# Owner follow-up: generated themed InstaPay QR

## Request and coordination

The owner asks for a QR generated from the admin dashboard's InstaPay input,
styled to match the shop. Anti-Gravity owns active implementation. Codex has
performed read-only research and added this handoff, without editing payment
code, resetting the database, changing the active roadmap, or deploying.

Before implementation, register a separate task and append this owner extension
to the payment specification. Preserve the approval-first payment flow and all
server-enforced permissions. Do not treat this note as an implementation claim.

## What is already available

- Settings currently save the IPA and uploaded QR independently in
  `src/features/admin/settings/SettingsPage.tsx` and its feature API.
- `ip/ip.jpeg` is still present (56,906 bytes). Codex rechecked its SHA-256:
  `B432667B3ACF96B8CBA2C48CAD0710486789DB0459BD223863B0E41D9B66F6AA`.
- This matches `docs/handoff/DATABASE-INTEGRATION.md`, which records historical
  offline decoding of an HTTPS `ipn.eg` link matching `alaa.ahm9624@instapay`.
  Re-decode locally to recover the exact payload; do not invent its opaque suffix
  or commit the owner payment link into public frontend assets or migrations.
- A matching path is not proof of account ownership. Actual recipient identity
  must still be checked in the InstaPay app before publication/use.

## Required behavior

1. Keep the human-readable IPA, and accept the official payment share link from
   InstaPay in Settings. The existing verified image can supply the initial link
   through local decoding. Do not turn bare `name@instapay` text into a QR and
   call it a verified payment QR; no verified official handle-to-link minting API
   was established by this research.
2. Generate the QR locally from the exact saved link with a maintained encoder.
   Do not send payment instructions to a third-party QR-generation service.
   Use existing dependencies if suitable; otherwise follow supply-chain checks
   and lazy-load the encoder to preserve the initial bundle budget.
3. Preview generation can react to validated form edits, but customers see only
   saved server-provided instructions. Save the address/link pair coherently via
   an AAL2-protected audited operation. A changed address must not silently keep
   a QR that points to a different recipient. Require a matching official link;
   reject malformed/mismatched input with a localized catalogue error.
4. Validate using parsed URLs plus the verified payload structure: HTTPS, exact
   hostname, no credentials or unexpected port, bounded input, and expected
   recipient. Reject lookalike domains and encoded path tricks. Domain/path
   validation alone does not establish account ownership or bank authenticity.
5. Keep the new payment-link setting private. Extend
   `get_payment_instructions` only through an additive migration, preserving own
   order checks and allowed payment states; no QR/link before order approval.
   Server values remain authoritative for amount, deadline and recipient.
6. Review `src/features/payments/api.ts`: it currently substitutes a hardcoded
   owner IPA if the server's handle is missing. Generation must not infer payment
   destinations from that fallback; incomplete settings should give a safe
   localized unavailable state. Cover legacy instructions deliberately.
7. Style with existing documented cocoa/cream/blush tokens. Keep a cream-backed
   QR with dark squares in both themes, with decorative pink framing outside the
   scan area. Preserve a clear four-module quiet zone, sharp square modules and
   adequate display size; no gradient, overlapping logo, animation or inversion
   within the scannable symbol. The surrounding card may follow the site theme.
8. Offer a localized "Open InstaPay" link for same-device use and retain
   recipient-copy and amount/order-reference instructions. Do not invent amount
   or order-number URL parameters unsupported by the verified payment format.
9. Payment remains manually reviewed against the real bank transfer. Generating,
   opening, scanning or uploading proof must never mark an order paid.

## Acceptance evidence

- Decode generated images using an independent decoder at supported screen sizes
  in both themes; decoded payload must exactly match the saved link.
- Test link/address mismatch, invalid host/scheme/port, missing settings, unsaved
  preview vs published value, and address replacement with an old QR.
- Test admin AAL1/customer/anonymous denial, AAL2 save with audit, pre-approval and
  cross-customer instruction denial, and unchanged amount/status/stock behavior.
- Verify Arabic and English labels/errors, mobile same-device link and clear
  loading/error states. Run appropriate database/type, unit, browser and full
  project verification; report actual results and leave phone-app acceptance
  pending until it is observed.

## Sources checked 2026-10-18

- KFH Egypt's InstaPay instructions list beneficiary payment links and app-generated
  QR codes: https://www.eg.kfh.com/personal/instapay/
- InstaPay's publisher-provided app listing describes IPA transfers through QR,
  Link and Favorite: https://apps.apple.com/eg/app/instapay-egypt/id1592108795
- DENSO WAVE requires a four-module quiet zone:
  https://www.qrcode.com/en/howto/code.html
- DENSO WAVE explains module size and scanner readability:
  https://www.qrcode.com/en/howto/cell.html

## Next action

Read the current progress/status first; finish or checkpoint the active task.
Then register a separate generated-QR slice from the latest verified base and
inspect the payment specs, APIs and database guards before implementation.
