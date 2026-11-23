---
name: lecturer-notes-sync
description: >-
  Keeps lecturer/speaker-notes.md and the printable A4/tablet handout
  lecturer/speaker-notes.html synchronized whenever slides, deep dives, labs,
  or live demos in docs/index.html are added, edited, simplified, reordered,
  or removed. Activate on any slide/deck edit or before git push.
---

# Lecturer Speaker Notes Sync (`lecturer-notes-sync`)

Because `docs/` is the student-facing GitHub Pages site, classroom teaching cues, bridges, timings, and discussion prompts belong in `lecturer/speaker-notes.md` (compiled to `lecturer/speaker-notes.html`), keeping slides crisp without losing spoken guidance.

## When to Update Lecturer Notes

Update `lecturer/speaker-notes.md` and rebuild `lecturer/speaker-notes.html` whenever a change touches:
- **Slides (`.stage-step-panel`):** adding, removing, renaming, reordering, or changing the main takeaway of a slide in `docs/index.html`.
- **Slide simplifications:** whenever prose, bridges (*Brücken*), or discussion questions are trimmed from a slide or deep dive for "less is more" clarity, preserve the spoken insight inside `lecturer/speaker-notes.md` instead of deleting it permanently.
- **Interactive UI / Live Demos:** new buttons, deep-dive tabs, map pins, Python lab cells, or hardware/fault-injection steps that need a `**Klick:**` cue during teaching.
- **Schedule / Hardware changes:** changes to timing, `Tagesziele`, or `Material` items.

## Markdown Format & Writing Conventions (`lecturer/speaker-notes.md`)

1. **Header metadata (top of file before `---`):**
   - Keep `Titel`, `Untertitel`, `Datum`, `Zeit`, `Ort`, `Themenbereich`, `Kursleitung`, `Kennen`, `Verstehen`, `Anwenden`, and `Material` as single `Key: Value` lines.
2. **Chronological run-of-show (`##` headings):**
   - Use `## <HH.MM – HH.MM> | <Blocktitel>` for teaching blocks, and `## <HH.MM – HH.MM> | Pause` / `Mittagspause` for break rows.
   - If sections in `docs/index.html` are reordered, adjust the block order and timings to match.
3. **Slide entries (`###` headings) & Slug Linking:**
   - End every slide subheading with its backticked slug (or comma-separated slugs when two adjacent slides share a note group):
     `### <Tab Label> — <Short Title> (\`<slide-slug>\`)`
   - **Slug derivation rule (enforced by `lecturer/build_notes.py --check`):**
     - If the `.stage-step-panel` has `data-slide-folder="assets/slides/<folder>"`, the slug is `<folder>`.
     - Otherwise, the slug is `data-slide-tab` lowercased with German umlauts folded (`ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`) and non-alphanumeric runs replaced by `-` (for example, `2.1 Data Quality` → `2-1-data-quality`, `2.3 Transients & Corr` → `2-3-transients-corr`).
   - Do **not** add backticked parentheses to non-slide subheadings (such as lab blocks); use plain parentheses like `(Board & Data Viz)`.
4. **Scannable Speaker Cues & Typography:**
   - Keep bullets concise for at-a-glance reading on A4 paper or a tablet.
   - Use standard cue prefixes so `build_notes.py` styles them automatically:
     - `**Klick:**` — what to click, open, run, or trigger on screen/hardware.
     - `**Kernbotschaft:**` — the 1–2 sentence point students must take away.
     - `**Brücke:**` — transition connecting the current slide to the next block or live case.
     - `**Frage:**` — optional classroom discussion prompt.
   - Use **Swiss German orthography (`ss`, never `ß`)** in German copy, and use **Unicode math (`μ, σ, Δt, ×`)** instead of LaTeX `$...$` (the standalone handout HTML does not load KaTeX).

## Rebuild & Verification

After editing `lecturer/speaker-notes.md` (or modifying any `.stage-step-panel` in `docs/index.html`), always run:

```powershell
python lecturer/build_notes.py
python lecturer/build_notes.py --check
```

- Exit code `0`: every slide in `docs/index.html` has a matching slug in `lecturer/speaker-notes.md` and `lecturer/speaker-notes.html` is up to date (`RED=0`).
- Exit code `1`: one or more slides lack notes or `lecturer/speaker-notes.html` needs rebuilding. Fix before running `git push`.
