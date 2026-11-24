# Workspace Rules (`AGENTS.md`)

## Pre-Push Copyright, Provenance & Citation Audit

Because `docs/` is deployed publicly to **GitHub Pages**, every slide graphic and bibliographic citation must pass a provenance and citation check before pushing:

1. **Before running `git push`** (and whenever slide graphics in `docs/assets/slides/` or citations in `docs/index.html` / `docs/references.bib` are added or modified), run:
   ```powershell
   python .agents/skills/copyright-and-citation-audit/scripts/audit_assets.py
   ```
2. **Activate the `.agents/skills/copyright-and-citation-audit/SKILL.md` skill** if any `RED` or `YELLOW` findings appear, or when evaluating third-party figures/photos for public web publication.
3. **Never run `git push`** when `audit_assets.py` exits with code `1` (`RED` issues present). Resolve missing `README.md` `Source / License` entries, unapproved raster images, or broken `data-cite` keys first.

## Per-Slide Replaceable Asset Folders (`docs/assets/slides/`)

Whenever a slide in `docs/index.html` includes photos, portraits, logos, icons, static illustrations, or photo placeholders, **never** leave inline HTML/SVG placeholder boxes — always create a number-free semantic folder `docs/assets/slides/<slide-slug>/` with real replaceable files so the user can overwrite them in-place without touching HTML or CSS *(dynamic JS-driven charts and interactive widgets remain inline)*:

1. **Formats:** Use `.svg` for icons, logos, and vector graphics; use `.jpg` (or `.png` / `.webp`) for photos and drop-in photo placeholders (generate clean `#f7f2e2` / `#595959` `.jpg` placeholders up front).
2. **HTML wiring:** Reference assets via `<img src="assets/slides/<slide-slug>/...">` (or `<image href="...">`) and declare `data-slide-folder="assets/slides/<slide-slug>"` on the slide's `.stage-step-panel`.
3. **Folder provenance:** Create `docs/assets/slides/<slide-slug>/README.md` with a `File` + `Source / License` table (e.g., `Own Photo`, `Own SVG`, `Nominative Case-Study Logo`).
4. **Master index:** Register the folder in the `Current Slide Folders` table in `docs/assets/slides/README.md`.

## Reusable In-Slide Deep-Dive Pattern

- **Activate `.agents/skills/in-slide-deep-dive/SKILL.md`** whenever adding interactive drill-down / deep-dive views to a slide in `docs/index.html`, so new slides reuse `docs/case-deep-dive.js`, the chamfered folder-tab UI, active-tab headers, footer citations, and presenter keyboard navigation consistently.

## Synchronized Lecturer Speaker Notes

Whenever slides, deep dives, labs, or live demos in `docs/index.html` are added, modified, simplified, reordered, or removed, keep the printable/tablet lecturer handout in `lecturer/` synchronized:

1. **Activate `.agents/skills/lecturer-notes-sync/SKILL.md`** and update `lecturer/speaker-notes.md` (including moving any trimmed slide prose, bridges, or discussion prompts into speaker notes rather than losing them).
2. **Rebuild and validate** the standalone A4/tablet HTML printout before committing or pushing:
   ```powershell
   python lecturer/build_notes.py
   python lecturer/build_notes.py --check
   ```
3. **Never run `git push`** when `build_notes.py --check` exits with code `1` (`RED` missing slide coverage or stale `lecturer/speaker-notes.html`).

## Conventional Commits

Every commit message MUST follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) (`<type>(<optional-scope>): <description>`, lowercase after the colon), matching `MEMORY.md`:

- `feat:` new features (e.g., `feat(web): refine Slide 5 extended-tier reveal and unified .btn styling`)
- `fix:` bug fixes
- `docs:` documentation and memory updates
- `chore:` project structure, config, hooks, or build tasks
- `refactor:` code restructuring without behavior changes
