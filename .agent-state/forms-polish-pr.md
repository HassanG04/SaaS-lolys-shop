# T-0.08j: Compact login and registration preview

Responds to the owner's preview feedback that form fields stretched across the
page. Adds a centered `ui-form-panel` capped at 28rem, keeps each field full
width within its panel, stacks panels on narrow screens, and uses two columns
from the large-screen breakpoint. The existing responsive tokens and logical
CSS remain in use.

The kit now includes clearly marked login and registration layout examples with
Arabic and English copy. They are disabled preview controls; authentication is
still the later T-2.04 task. The production marker guard includes the new
preview component and copy.

Validation: `npm run verify` passes with 55 application and 97 tooling tests;
roadmap validates 119 tasks. No dependency, auth API, database or security
behavior changed. T-0.08i's visual acceptance dependency remains open.
