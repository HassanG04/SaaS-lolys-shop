# Self-hosted fonts

The font assets were downloaded from Google Fonts by Anti-Gravity on 2026-10-09
and preserved during Codex review. Cairo is variable, weights 400–700; Aref
Ruqaa provides 400 and 700. Arabic, Latin and Latin extended subsets are local
WOFF2 files. Stylesheets contain local URLs only and use `font-display: swap`.

Original requests:

- https://fonts.googleapis.com/css2?family=Cairo:wght@400..700&display=swap
- https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&display=swap

Both families use the SIL Open Font License. The original copyright notices
and license terms are in `OFL-Cairo.txt` and `OFL-Aref-Ruqaa.txt`, retrieved from
the [Cairo](https://github.com/google/fonts/tree/main/ofl/cairo) and
[Aref Ruqaa](https://github.com/google/fonts/tree/main/ofl/arefruqaa) distributions.
Keep these license files with the assets when redistributing them.

No fonts are fetched from Google by the application at runtime. Tests validate
the WOFF2 signatures and the local stylesheet paths. The original downloader
is checkpointed with Anti-Gravity's handover; it is not part of the build.
