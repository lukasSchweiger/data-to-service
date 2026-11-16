#!/usr/bin/env python3
"""Pre-push copyright, provenance, and BibTeX citation audit for docs/."""

from __future__ import annotations

import pathlib
import re
import sys
from html.parser import HTMLParser


REPO_ROOT = pathlib.Path(__file__).resolve().parents[4]
DOCS_DIR = REPO_ROOT / "docs"
SLIDES_DIR = DOCS_DIR / "assets" / "slides"
INDEX_HTML = DOCS_DIR / "index.html"
REFERENCES_BIB = DOCS_DIR / "references.bib"
APP_JS = DOCS_DIR / "app.js"

IMAGE_EXTS = {".svg", ".png", ".webp", ".jpg", ".jpeg", ".gif"}
RASTER_EXTS = {".png", ".webp", ".jpg", ".jpeg", ".gif"}

SAFE_RASTER_KEYWORDS = (
    "own photo",
    "own image",
    "own screenshot",
    "own graphic",
    "own svg",
    "cc by",
    "cc-by",
    "cc0",
    "public domain",
    "unsplash",
    "pexels",
    "wikimedia",
    "mit",
    "apache",
    "bildzitat",
    "art. 25",
    "art 25",
)

SAFE_SVG_KEYWORDS = SAFE_RASTER_KEYWORDS + (
    "canva",
    "nominative",
    "custom",
)

WATERMARK_PATTERNS = re.compile(
    r"\b(getty|shutterstock|adobe\s*stock|istock(?:photo)?|alamy|picrights|copytrack|dreamstime|123rf|depositphotos)\b",
    re.IGNORECASE,
)

SVG_SAFE_URL_PREFIXES = (
    "http://www.w3.org/",
    "https://www.w3.org/",
    "http://ns.adobe.com/",
    "http://purl.org/",
    "http://creativecommons.org/",
    "https://creativecommons.org/",
)


def parse_bibtex_keys(bib_text: str) -> set[str]:
    keys: set[str] = set()
    clean_lines = [
        line for line in bib_text.splitlines() if not line.lstrip().startswith("%")
    ]
    clean_text = "\n".join(clean_lines)
    for match in re.finditer(r"@([a-zA-Z]+)\s*[{(]\s*([^,\s]+)\s*,", clean_text):
        entry_type = match.group(1).lower()
        if entry_type in {"comment", "preamble", "string"}:
            continue
        keys.add(match.group(2).strip())
    return keys


def extract_fallback_bibtex(app_js_text: str) -> str:
    match = re.search(r"const\s+FALLBACK_BIBTEX\s*=\s*`([\s\S]*?)`;", app_js_text)
    return match.group(1) if match else ""


class SlidePanelParser(HTMLParser):
    """Parses index.html for data-cite keys, asset paths, and slide panel associations."""

    def __init__(self) -> None:
        super().__init__()
        self.data_cites: list[str] = []
        self.asset_refs: list[str] = []
        self.external_media: list[str] = []
        self.panel_stack: list[dict] = []
        self.div_depth = 0
        self.panels: list[dict] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {k.lower(): (v or "") for k, v in attrs}
        tag_l = tag.lower()

        if tag_l == "div":
            self.div_depth += 1
            classes = attr_map.get("class", "").split()
            if "stage-step-panel" in classes:
                panel = {
                    "depth": self.div_depth,
                    "slide_folder": attr_map.get("data-slide-folder", "").strip(),
                    "slide_tab": attr_map.get("data-slide-tab", "").strip(),
                    "cites": [],
                }
                self.panel_stack.append(panel)
                self.panels.append(panel)

        if "data-cite" in attr_map:
            cite_key = attr_map["data-cite"].strip()
            if cite_key:
                self.data_cites.append(cite_key)
                if self.panel_stack:
                    self.panel_stack[-1]["cites"].append(cite_key)

        if tag_l in {"img", "image", "source", "video"}:
            ref = attr_map.get("src") or attr_map.get("href") or attr_map.get("xlink:href") or ""
            ref = ref.strip()
            if ref.startswith("assets/slides/"):
                self.asset_refs.append(ref)
            elif ref.startswith(("http://", "https://")):
                self.external_media.append(f"<{tag_l}> {ref}")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "div":
            if self.panel_stack and self.panel_stack[-1]["depth"] == self.div_depth:
                self.panel_stack.pop()
            self.div_depth = max(0, self.div_depth - 1)


def parse_readme_table(readme_text: str) -> tuple[bool, dict[str, str]]:
    """Extracts {filename: source_license} from markdown table in slide README.md."""
    lines = readme_text.splitlines()
    file_col = -1
    license_col = -1
    mapping: dict[str, str] = {}

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not (stripped.startswith("|") and "|" in stripped[1:]):
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if file_col == -1:
            lowered = [c.lower() for c in cells]
            for ci, name in enumerate(lowered):
                if name in {"file", "filename", "image", "asset"}:
                    file_col = ci
                if "source" in name or "license" in name or "provenance" in name:
                    license_col = ci
            continue

        # Skip markdown separator row | :--- | :--- |
        if all(re.fullmatch(r":?-{2,}:?", c.replace(" ", "")) for c in cells if c):
            continue

        if file_col != -1 and file_col < len(cells):
            fname = cells[file_col].strip("`").strip()
            if not fname:
                continue
            license_val = (
                cells[license_col].strip()
                if license_col != -1 and license_col < len(cells)
                else ""
            )
            mapping[fname] = license_val

    has_license_col = license_col != -1
    return has_license_col, mapping


def main() -> int:
    green: list[str] = []
    yellow: list[str] = []
    red: list[str] = []

    if not INDEX_HTML.exists():
        red.append(f"Missing HTML entrypoint: {INDEX_HTML.relative_to(REPO_ROOT)}")
        html_text = ""
    else:
        html_text = INDEX_HTML.read_text(encoding="utf-8")

    parser = SlidePanelParser()
    parser.feed(html_text)

    # 1. BibTeX & Citation Integrity
    bib_keys: set[str] = set()
    if not REFERENCES_BIB.exists():
        red.append("Missing docs/references.bib bibliography file.")
    else:
        bib_keys = parse_bibtex_keys(REFERENCES_BIB.read_text(encoding="utf-8"))
        green.append(f"Parsed {len(bib_keys)} BibTeX entry(ies) from docs/references.bib.")

    if not APP_JS.exists():
        red.append("Missing docs/app.js.")
    else:
        fallback_bib = extract_fallback_bibtex(APP_JS.read_text(encoding="utf-8"))
        fallback_keys = parse_bibtex_keys(fallback_bib)
        missing_in_fallback = sorted(bib_keys - fallback_keys)
        if missing_in_fallback:
            red.append(
                "docs/app.js FALLBACK_BIBTEX is out of sync with docs/references.bib; missing keys: "
                + ", ".join(missing_in_fallback)
            )
        else:
            green.append("docs/app.js FALLBACK_BIBTEX contains all keys from docs/references.bib.")

    for cite_key in sorted(set(parser.data_cites)):
        if cite_key not in bib_keys:
            red.append(
                f'Citation data-cite="{cite_key}" in docs/index.html is missing from docs/references.bib.'
            )
        else:
            green.append(f'Citation data-cite="{cite_key}" resolves in docs/references.bib.')

    for ext in parser.external_media:
        red.append(
            f"External media URL in docs/index.html ({ext}) — store verified assets locally under docs/assets/slides/."
        )

    for ref in sorted(set(parser.asset_refs)):
        target = DOCS_DIR / ref
        if not target.exists():
            red.append(f"Broken slide asset reference in docs/index.html: docs/{ref}")

    # Map slide_folder -> panel metadata
    panel_by_folder = {
        p["slide_folder"]: p for p in parser.panels if p["slide_folder"]
    }
    for folder_ref in panel_by_folder:
        if not (DOCS_DIR / folder_ref).is_dir():
            red.append(f'Missing folder for data-slide-folder="{folder_ref}" in docs/index.html.')

    # 2. Per-Slide Folder Provenance & Copyright Audit
    if not SLIDES_DIR.is_dir():
        red.append("Missing docs/assets/slides/ directory.")
    else:
        slide_folders = sorted(p for p in SLIDES_DIR.iterdir() if p.is_dir())
        for folder in slide_folders:
            rel_folder = folder.relative_to(DOCS_DIR).as_posix()
            readme = folder / "README.md"
            assets = sorted(
                f for f in folder.iterdir()
                if f.is_file() and f.suffix.lower() in IMAGE_EXTS
            )

            if not readme.exists():
                red.append(f"{rel_folder}/ is missing README.md provenance table.")
                continue

            has_license_col, mapping = parse_readme_table(
                readme.read_text(encoding="utf-8")
            )
            if not has_license_col:
                red.append(
                    f'{rel_folder}/README.md table is missing a "Source / License" column.'
                )
                continue

            requires_cite = False
            for asset in assets:
                fname = asset.name
                ext = asset.suffix.lower()
                if fname not in mapping:
                    red.append(
                        f"Undocumented slide graphic: {rel_folder}/{fname} is not listed in {rel_folder}/README.md."
                    )
                    continue

                lic = mapping[fname].strip()
                if not lic:
                    red.append(
                        f"Missing Source / License value for {rel_folder}/{fname} in {rel_folder}/README.md."
                    )
                    continue

                lic_l = lic.lower()
                if "bildzitat" in lic_l or "data-cite" in lic_l or "art. 25" in lic_l:
                    requires_cite = True

                raw_bytes = asset.read_bytes()
                raw_ascii = raw_bytes.decode("utf-8", errors="ignore")

                wm = WATERMARK_PATTERNS.search(raw_ascii)
                if wm:
                    red.append(
                        f"Stock-agency/watermark metadata ({wm.group(1)}) detected in {rel_folder}/{fname}."
                    )
                    continue

                if ext == ".svg":
                    svg_no_comments = re.sub(r"<!--[\s\S]*?-->", "", raw_ascii)
                    svg_no_meta = re.sub(
                        r"<metadata\b[\s\S]*?</metadata>", "", svg_no_comments, flags=re.IGNORECASE
                    )
                    ref_urls = re.findall(
                        r"(?:(?:xlink:)?href|src)\s*=\s*[\"'](https?://[^\"']+)[\"']|url\(\s*[\"']?(https?://[^\"')]+)[\"']?\s*\)",
                        svg_no_meta,
                        flags=re.IGNORECASE,
                    )
                    http_urls = [
                        u for pair in ref_urls for u in pair if u
                        and not any(u.startswith(prefix) for prefix in SVG_SAFE_URL_PREFIXES)
                    ]
                    if http_urls:
                        red.append(
                            f"External image/link URL(s) found inside SVG {rel_folder}/{fname}: {', '.join(http_urls[:2])}"
                        )
                        continue

                    has_embedded_raster = bool(
                        re.search(r"data:image/(?:png|jpeg|jpg|webp|gif)", raw_ascii, re.IGNORECASE)
                    )
                    has_safe_svg_kw = any(kw in lic_l for kw in SAFE_SVG_KEYWORDS)
                    if not has_safe_svg_kw:
                        red.append(
                            f"Unrecognized or missing safe provenance for {rel_folder}/{fname} (Source / License: {lic!r})."
                        )
                    elif has_embedded_raster:
                        yellow.append(
                            f"{rel_folder}/{fname} embeds a raster bitmap inside SVG (documented as: {lic}). Verify it contains only Free/custom elements or replace with pure vector SVG."
                        )
                    else:
                        green.append(f"{rel_folder}/{fname} ({lic})")

                elif ext in RASTER_EXTS:
                    has_safe_raster_kw = any(kw in lic_l for kw in SAFE_RASTER_KEYWORDS)
                    if not has_safe_raster_kw:
                        red.append(
                            f"Raster graphic {rel_folder}/{fname} lacks an approved public-web license in Source / License ({lic!r}). Use Own Photo, CC BY, CC0, Unsplash, Pexels, Wikimedia, or Bildzitat (Art. 25 URG)."
                        )
                    else:
                        green.append(f"{rel_folder}/{fname} ({lic})")

            for doc_file in sorted(mapping):
                if not (folder / doc_file).exists():
                    yellow.append(
                        f"{rel_folder}/README.md lists '{doc_file}', which does not exist in the folder."
                    )

            if requires_cite:
                panel = panel_by_folder.get(rel_folder)
                if not panel:
                    red.append(
                        f"{rel_folder}/README.md references data-cite/Bildzitat, but no panel in docs/index.html has data-slide-folder=\"{rel_folder}\"."
                    )
                elif not panel["cites"]:
                    red.append(
                        f"Slide '{panel['slide_tab'] or rel_folder}' requires a data-cite=\"...\" citation in docs/index.html per {rel_folder}/README.md."
                    )
                else:
                    green.append(
                        f"{rel_folder}/ citation requirement satisfied via data-cite=\"{', '.join(panel['cites'])}\"."
                    )

    print("=== Copyright, Provenance & Citation Audit ===")
    for item in green:
        print(f"  [GREEN]  {item}")
    for item in yellow:
        print(f"  [YELLOW] {item}")
    for item in red:
        print(f"  [RED]    {item}")
    print(f"Summary: GREEN={len(green)}, YELLOW={len(yellow)}, RED={len(red)}")

    return 1 if red else 0


if __name__ == "__main__":
    sys.exit(main())
