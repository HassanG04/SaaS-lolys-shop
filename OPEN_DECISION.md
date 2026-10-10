# Open decisions

## OD-001 — Compatible quality-tool versions

Task: T-0.02. Status: approved by owner on 2026-10-09.

The roadmap requires both current stable majors (section 3.1) and the named
ESLint/TypeScript/accessibility plugins (T-0.02). Registry metadata checked on
2026-10-09 shows two incompatible peer ranges:

- TypeScript 7.0.2 is latest; typescript-eslint 8.71.1 supports TypeScript >=4.8.4 <6.1.0.
- ESLint 10.12.0 is latest; eslint-plugin-jsx-a11y 6.10.2 supports ESLint through major 9.

Approved exception: use the latest compatible stable TypeScript 6.0.x and ESLint
9.x (with matching @eslint/js 9.x), pin exact versions in package.json/lockfile,
and document the reason in ADR-0001. Keep every required lint and accessibility
check. Revisit majors when the named plugins support them.

Alternative: retain the latest majors and leave T-0.02 blocked pending plugin
support. Do not bypass peer checks with force or legacy-peer-deps.

Sources: official npm registry metadata for typescript, typescript-eslint,
eslint, eslint-plugin-jsx-a11y and @eslint/js. Owner answered "Approve compatible
versions" in this chat. Implementation and validation proceed under this exception.

## OD-002 — Pearl loader motion

Task: T-0.08d. Status: approved by owner on 2026-10-10.

Design-system section 6 describes bouncing pearls but its general motion rule
allows automatic motion only for the sparkle. Owner chose “Bounce only while
loading” in this chat. The loader animates only while loading is active; reduced
motion keeps it still. Record this exception in the design spec; retain its
hover-only sparkle rule and all existing motion/accessibility requirements.

## External prerequisites

- H-07: GitHub remote supplied on 2026-10-09: https://github.com/HassanG04/lolys
  (private). Repository access verified; PR and CI verification are underway.
- H-08: Docker is not on PATH; local Supabase database verification is pending.
- H-01/H-04: no Shop reference or standalone logo supplied; use documented
  placeholders when the corresponding tasks are reached.
