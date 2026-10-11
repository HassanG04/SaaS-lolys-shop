# Outstanding UI acceptance evidence

Anti-Gravity reports rendering checks and native-dialog modality/focus/closure.
Its incoming handover does not identify every viewport/theme/direction or record
reduced-motion results. Keep T-0.08e, T-0.08h and T-0.08i open until this evidence
exists. Codex's browser session previously rejected the preview URL; that policy
must not be bypassed. Tests and green CI are not visual acceptance evidence.

Record the commit, browser, actual results and evidence paths for each row in a
permitted verification session. Do not infer a pass from the existing previews.

| Width | Theme | Direction | Arabic copy      | English copy     |
| ----- | ----- | --------- | ---------------- | ---------------- |
| 360   | Light | RTL       | Pending evidence | Pending evidence |
| 360   | Light | LTR       | Pending evidence | Pending evidence |
| 360   | Dark  | RTL       | Pending evidence | Pending evidence |
| 360   | Dark  | LTR       | Pending evidence | Pending evidence |
| 1280  | Light | RTL       | Pending evidence | Pending evidence |
| 1280  | Light | LTR       | Pending evidence | Pending evidence |
| 1280  | Dark  | RTL       | Pending evidence | Pending evidence |
| 1280  | Dark  | LTR       | Pending evidence | Pending evidence |

For each row, check layout/overflow, all controls' 44px targets and focus,
keyboard choices/tabs/dialogs, directional artwork, language-switch focus and
both reduced-motion settings. Pearls animate only while loading and remain
still with reduced motion. Native dialog must contain/restore focus, exclude
background interaction and close via Escape/close action. Include controlled
close, reopen and unmount. Retain Arabic catalogue errors and isolated codes.

Other current prerequisites: owner review of foundation CI (PR 1) and the added
read-only guard check (PR 9, SEC-16/SEC-24); Docker H-08 for T-1.01. Dashboard
configuration, main merges and production deployment remain human-owned.
