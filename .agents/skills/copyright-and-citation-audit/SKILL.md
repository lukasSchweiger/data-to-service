---
name: copyright-and-citation-audit
description: >-
  Audits all slide graphics, image provenance/licenses, and BibTeX citations
  before pushing to the public GitHub repository. Use before running git push,
  or whenever adding or replacing slide images, icons, logos, or bibliographic
  references.
---

# Copyright, Provenance & Citation Audit

Because `docs/` is published publicly on **GitHub Pages**, Swiss classroom teaching exceptions (Art. 19 URG) do **not** apply to files committed in this repository. Run this audit before every `git push` and after adding or replacing any slide graphic or bibliographic reference.

## Quick Run

```powershell
python .agents/skills/copyright-and-citation-audit/scripts/audit_assets.py
```

- **Exit code `0`**: No blocking `RED` issues (all assets documented, safe provenance verified, all `data-cite` keys valid).
- **Exit code `1`**: One or more `RED` copyright, provenance, or citation errors found. **Do not push until resolved.**

## Traffic-Light Rules Enforced by the Audit

1. **GREEN — Safe for Public GitHub Pages**
   - Redrawn vector `.svg` diagrams/icons in our site style (`Own SVG`), citing underlying ideas via `data-cite="<key>"`.
   - Open-access / permissive figures (`CC BY 4.0`, `CC0`, `Public Domain`, `Wikimedia Commons`, `Unsplash`, `Pexels`) or original lecturer photos (`Own Photo`) explicitly documented in the slide folder's `README.md`.
   - Nominative company logos used strictly for factual case-study identification (`Own SVG / Nominative Case-Study Logo`).
2. **YELLOW — Review Required (Non-Blocking Warning)**
   - `.svg` files containing an embedded raster `<image xlink:href="data:image/...">` (for example, a Canva export wrapping a PNG) that have an explicit safe `Source / License` entry in `README.md`. Consider exporting pure vector paths or verifying Canva Free / custom-element provenance.
   - `README.md` entries referencing an asset file that was removed from the folder.
3. **RED — Blocking Before Push**
   - Any image file in `docs/assets/slides/<slide-slug>/` missing from that folder's `README.md` table or missing a `Source / License` value.
   - Any raster image (`.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`) without an explicit safe license (`Own Photo`, `CC BY`, `CC0`, `Public Domain`, `Unsplash`, `Pexels`, `Wikimedia`, or `Bildzitat (Art. 25 URG)`).
   - Any `.svg` containing external `http(s)://` image hotlinks, stock-agency watermarks/metadata (`Getty`, `Shutterstock`, `Adobe Stock`, `iStock`, `Alamy`, `PicRights`, `Copytrack`), or undocumented embedded raster data URIs.
   - Any `Bildzitat` / `data-cite` requirement in `README.md` without a matching `data-cite="..."` element inside that slide's `.stage-step-panel` in `docs/index.html`.
   - Any `data-cite="<key>"` in `docs/index.html` missing from `docs/references.bib`, or any `references.bib` key missing from `FALLBACK_BIBTEX` in `docs/app.js`.

## Checklist to Fix Findings

1. **Undocumented or unlicensed slide asset:** Document its exact provenance in `docs/assets/slides/<slide-slug>/README.md` under the `Source / License` column—or replace a third-party photo/illustration with a redrawn `.svg` or `CC BY` / `CC0` / own photo.
2. **Missing `data-cite` key:** Add the BibTeX entry to `docs/references.bib` and sync `FALLBACK_BIBTEX` in `docs/app.js`.
3. **Slide quoting a figure (`Bildzitat`, Art. 25 URG):** Ensure the slide text actively discusses the figure itself (not merely decoration) and add `data-cite="<key>"` inside the slide panel.
