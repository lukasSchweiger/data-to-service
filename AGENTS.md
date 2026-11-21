# Workspace Rules (`AGENTS.md`)

## Pre-Push Copyright, Provenance & Citation Audit

Because `docs/` is deployed publicly to **GitHub Pages**, every slide graphic and bibliographic citation must pass a provenance and citation check before pushing:

1. **Before running `git push`** (and whenever slide graphics in `docs/assets/slides/` or citations in `docs/index.html` / `docs/references.bib` are added or modified), run:
   ```powershell
   python .agents/skills/copyright-and-citation-audit/scripts/audit_assets.py
   ```
2. **Activate the `.agents/skills/copyright-and-citation-audit/SKILL.md` skill** if any `RED` or `YELLOW` findings appear, or when evaluating third-party figures/photos for public web publication.
3. **Never run `git push`** when `audit_assets.py` exits with code `1` (`RED` issues present). Resolve missing `README.md` `Source / License` entries, unapproved raster images, or broken `data-cite` keys first.

## Reusable In-Slide Deep-Dive Pattern

- **Activate `.agents/skills/in-slide-deep-dive/SKILL.md`** whenever adding interactive drill-down / deep-dive views to a slide in `docs/index.html`, so new slides reuse `docs/case-deep-dive.js`, the chamfered folder-tab UI, active-tab headers, footer citations, and presenter keyboard navigation consistently.
