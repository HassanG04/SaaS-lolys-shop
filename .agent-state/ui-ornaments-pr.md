# T-0.08d: Labels, loading feedback and brand ornaments

Adds Pill, Chip, sale/stock/payment badges, static Skeleton, a conditional pearl
loader, and currentColor ribbon/sparkle/arch ornaments. The owner approved pearls
bouncing only during loading; reduced motion keeps them still. Includes the
four theme/direction previews and six behavior tests.

Validation: 42 application tests (108 total with the preceding tooling suite)
passed before Anti-Gravity committed this slice. Later guard verification also
passes against these components. Anti-Gravity reports browser verification;
its report does not enumerate the complete acceptance matrix. The final UI-kit
gate remains open in the following guard PR until that evidence is recorded.

No new dependencies, business behavior or token values. Draft stacked on PR #7.
