# Codex coordination handoff — 2026-10-18

## Current objective and ownership

The owner says Anti-Gravity is continuing. Codex has stopped implementation to
avoid concurrent changes. Continue from the current primary checkout, not the
older isolated checkpoint. This note adds review findings only; it does not
revert statuses or change the active roadmap.

## Observed current state

- Primary checkout: `D:\Projects\Programming\الاء`.
- Branch: `agent/T-9.14-occasion-reminders`; HEAD `cb35cb4` when inspected.
- `roadmap.md` already has uncommitted work; preserve it.
- Recent commits include notifications/suggestions (`291f688`), profile photos
  (`4751d4c`), recipient verification (`90427c4`) and footer/policies (`cb35cb4`).
- Isolated checkout `C:\Users\Hassan-PC\.codex\worktrees\owner-controls\الاء`
  is clean on `agent/T-3.10e-published-content` and already contains Anti-Gravity's
  continuation. Do not copy it over the newer primary checkout.

## Verification provenance

Codex's earlier public-consumer typecheck and 11 focused tests passed. The prior
full verification process is no longer available (unknown session 19342), so
Codex cannot independently assert its final result. Anti-Gravity's progress
entries report subsequent successful verification; those remain AG-reported
results, not a new Codex run. Browser acceptance of the complete editor flow was
not established by Codex.

## Review findings to resolve before closing the editor experience

1. **Automatic bestseller hides the card.** The editor's empty featured-product
   option is labelled "Automatic bestseller" and writes null. `HomePage.tsx`
   currently maps `featured_product_id === null` to no card. Restore the documented
   automatic bestseller fallback, and test selecting a product then returning to
   Automatic. Preserve live catalogue price/stock and inactive-product handling.
2. **Empty category selection is treated as no configuration.** HomePage uses
   `if (!configuredIds?.length) return categories`, so unchecking every shortcut
   republishes all shortcuts. Distinguish an absent field (default) from an
   explicitly saved empty array, or explicitly prevent an empty selection if the
   specification requires one. Keep the main category tiles and browse unchanged.
3. **Policy fetch and label states need acceptance coverage.** PublishedPolicy
   shows static fallback while settings are loading or failed, and an edited
   label without a custom body changes metadata but leaves the visible static
   heading unchanged. Check these against the published-content requirement;
   do not silently present stale policy text as a successfully loaded publication.
4. **Audit every editable field end-to-end.** The editor exposes announcement
   fields; the inspected HomePage has no announcement consumer. Check the full
   repository for the intended consumer, and test publication/reload/language
   switching for each exposed field rather than relying on dictionary parity.

These findings include defects in Codex's initial consumer wiring. Passing the
current tests alone does not resolve them. No feature edits, database resets,
remote changes, merges or deployments were performed during this coordination
handoff.

## Next exact commands

```powershell
git status --short --branch
git diff -- roadmap.md
```

Continue the already active task without resetting other work. Schedule the
above editor regressions before final acceptance and record actual evidence.
