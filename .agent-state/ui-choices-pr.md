# T-0.08f: Accessible checkbox and radio controls

Adds labelled native inputs with 44px minimum dimensions, visible focus and
token-based checked, disabled and invalid styling. Checkmarks/radio dots convey
selection without relying on color. Forced-colors mode restores native controls.
Radio names and IDs stay independent in repeated theme/direction previews.

The choice controls retain checked/defaultChecked, change handlers, refs, form
values and native reset behavior. Tests cover pointer/keyboard activation,
disabled controls, controlled state, form values, validation descriptions and
radio-group isolation. No new dependencies, backend or business rules.

## Validation

- `npm run verify` passes: 26 app tests + 66 tooling tests, lint, format, types
  and production build. Development route/code/copy/fixture exclusion passes;
  roadmap validates 115 tasks.
- Visual checks at 360/1280 and the upstream UI gates remain open because the
  browser tool denied preview access. T-0.08f stays doing; no gate is waived.
- Draft is stacked on PR #4. No merge or deployment.
