# T-0.08b: Labelled text and search fields

Adds Input, Select, Textarea and SearchInput with visible Arabic labels,
stable IDs, linked help/error descriptions, forwarded refs and native form
behavior. Search submits the entered value with either Enter or its round
button, including when the caller supplies a custom field name. Disabled
controls retain native behavior. Styles use the documented tokens and shared
44px minimum/focus rules.

The development kit includes normal, disabled and invalid examples in both
themes and directions. Error styling uses a static Arabic ADM-007 fixture;
real error mapping remains T-2.08. No backend, business forms or dependency
changes. Checkbox/Radio are preserved locally for the separate T-0.08f review.

## Validation

- Five new behavior tests pass: native values/ref/labels, controlled updates,
  validation associations, keyboard/button search, disabled controls and unique
  IDs across repeated previews (some scenarios share a test).
- Full verify passes: 21 app tests + 66 tooling tests, lint, format, types and build.
- Roadmap validates 115 tasks; production exclusion recheck passed.
- [All four remote jobs passed](https://github.com/HassanG04/lolys/actions/runs/38028479207)
  at `3aab6820f15a1650246ad6fe315f4e4363e2288b`.
- Browser policy still prevents the required 360/1280 visual checks. T-0.08b
  remains doing; this is prepared on top of PR #3, whose visual gate is also open.

The original inventory and acceptance criteria remain across T-0.08b/T-0.08f.
Owner review and production deployment remain separate; no merge is performed.
