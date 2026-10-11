# T-0.08h: Arabic/English interface with isolated preview copy

Preserves Anti-Gravity's owner-requested language support and records OD-003 in
ADR-0002. Saved language takes priority over device language; Arabic uses RTL
and English LTR. The language switch now uses the existing accessible Button,
retaining tokens, focus and touch size, with destination-language labelling.

Production dictionaries import only shipped groups; preview copy stays behind
the development route. The build guard previously failed on the inherited full
dictionary and now passes. Catalogue error previews remain Arabic in both locales.
No dependency, database, authentication or error-mapping behavior is added.

Validation: full local verification, including production preview exclusion.
Detailed language behavior tests are split into T-0.08i; visual acceptance remains
open. Inherited commit/history is preserved; the merge resolves only roadmap and
shared-state conflicts. Draft stacked on PR #9. No merge or deployment.
