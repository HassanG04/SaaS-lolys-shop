# ADR-0002: Arabic and English interface

Status: accepted under OD-003, recorded by Anti-Gravity on 2026-10-10.

The owner's request for device-based Arabic/English selection and a manual
switch is recorded in the incoming handover. This supersedes D-10's English
exclusion; Arabic remains the primary copy and brand reference.

Retain the incoming `app-lang` preference: valid saved `ar`/`en` wins; otherwise
an Arabic device locale selects Arabic, other device locales select English.
The selected language is saved when storage is available. Arabic uses RTL,
English LTR. The switch names its destination in that language. Add it to the
navbar/settings when those documented screens exist.

The small current provider is scaffolding. T-2.03 still supplies the specified
i18next integration, pluralization, formatting and translation scanner. Keep
Western digits, EGP and existing error/authentication contracts: catalogue error
messages and codes remain Arabic, isolated and labelled correctly in English UI.
This decision does not authorize translated raw errors or backend changes.

Production dictionaries import only shipped groups by name. The UI-kit group
is imported only by development previews; the build guard verifies exclusion.
T-0.08h repairs the inherited implementation. T-0.08i separately verifies
language persistence, unavailable storage and keyboard/direction behavior to
keep reviews small. Both retain the normal visual acceptance gate.
