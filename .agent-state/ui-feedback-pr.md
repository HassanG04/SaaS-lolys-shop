# T-0.08c: Keyboard tabs and accessible notifications

Adds tabs with unique panel links, automatic activation, RTL/LTR arrow navigation,
Home/End, disabled choices and retained panel content. Toast messages use status
or alert semantics, a state icon and an Arabic dismissal action without moving
focus. Both are shown in the four theme/direction development previews.

Dialog moves to T-0.08g to respect the roadmap review-size rule; all original
criteria and downstream dependencies remain. No dependencies or business rules
change. The AppError integration remains in its documented later task.

## Validation

- Eight new behavior tests cover keyboard navigation, panel relationships/state,
  disabled/fallback selection, notification semantics, focus and dismissal.
- `npm run verify` passes: 34 app + 66 tooling tests, lint, formatting, types and
  production build. Production kit exclusion passes; roadmap validates 116 tasks.
- [All four remote jobs pass](https://github.com/HassanG04/lolys/actions/runs/38071233956)
  at `68e506ea6414a31f4f63ec3a81de5a0f398935bc`.
- Visual checks remain open after browser-policy denial. T-0.08c stays doing;
  upstream visual/dependency gates remain in place. Draft stacked on PR #5.

Keyboard reference: [WAI tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).
