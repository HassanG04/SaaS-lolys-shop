# T-0.08i: Verify language preferences and accessible switching

Arabic detection now matches the Arabic language tag rather than every tag that
starts with "ar" (for example, arn-CL). Document language/direction updates in a
layout effect so translated content uses the correct direction before paint.
Saved ar/en values remain validated; blocked storage keeps manual switching usable.

Twelve tests cover device/region selection, saved overrides and invalid values,
blocked storage, keyboard focus, remount persistence, independent theme preference,
translated preview controls, Arabic catalogue errors and dictionary key parity.

Validation: npm run verify passes (54 application + 97 tooling tests), including
lint, formatting, types, token negatives and production preview exclusion.
Roadmap validates 118 tasks. Browser visual acceptance is still outstanding;
unit tests do not claim 44px/layout or native-dialog browser proof. Draft stacked
on PR #10. No dependency, backend or authentication changes.
