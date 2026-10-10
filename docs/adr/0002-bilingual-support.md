# ADR 0002: Bilingual Support (AR/EN)

**Date**: 2026-10-10

## Status

Accepted

## Context

The project was originally specified as an "Arabic-first RTL storefront". However, a requirement emerged (OD-003) to support English (LTR) dynamically based on device language, with a manual override capability.

## Decision

We implement a `LanguageProvider` that provides Arabic (`ar`) and English (`en`) translations via context.

- Default resolution: check `localStorage` for `app-lang`. If missing, check `navigator.language` and default to English if it starts with 'en' (or isn't Arabic). Otherwise Arabic.
- Context injection: Instead of directly importing `ar.json`, components use a `useLanguage()` hook.
- `lang` and `dir` HTML attributes are kept in sync with the current language via `useEffect`.

## Consequences

- The UI gracefully switches between LTR and RTL layouts without reload.
- Tests that expect Arabic strings default to Arabic because of a mock in `test-setup.ts`.
- `ar.json` and `en.json` are shipped with the client bundle.
