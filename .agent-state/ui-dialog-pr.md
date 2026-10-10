# T-0.08g: Native modal dialogs

Adds a controlled native dialog with Arabic close controls, unique accessible
title/description links and initial focus on the close action. Opening uses
`showModal`; closing or unmounting restores focus to the connected opener.
Browser modality handles background inactivity, focus containment and Escape.
Queued close events from cleanup are ignored after a newer opening.

The preserved draft's non-modal fallback and custom focus traversal are removed.
Theme/direction previews include multiple focusable elements for verification.
No new dependencies, design values or business behavior.

## Validation

- `npm run verify` passes: 36 app + 66 tooling tests, lint, format, types and
  production build. Roadmap validates 116 tasks. Remote checks pending.
- The two dialog unit tests cover closed markup and React event
  contracts only. Installed jsdom lacks native dialog methods; no polyfill or
  mock pretends to verify browser behavior.
- Before acceptance, check opening, forward/reverse Tab, background inactivity,
  Escape, close button, reopen, controlled closure/unmount, and focus restoration.
  Repeat at 360/1280 in both directions/themes, including 44px/focus outlines and
  reduced motion. Browser-policy denial still blocks this; T-0.08g stays doing.
- Draft stacked on PR #6; upstream visual/dependency gates remain open.

Native behavior reference: [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).
