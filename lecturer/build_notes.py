#!/usr/bin/env python3
"""Build self-contained printable/tablet HTML speaker notes from lecturer/speaker-notes.md."""

from __future__ import annotations

import argparse
import html
from html.parser import HTMLParser
import pathlib
import re
import sys


BASE_DIR = pathlib.Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
INDEX_HTML = REPO_ROOT / "docs" / "index.html"
DEFAULT_INPUT = BASE_DIR / "speaker-notes.md"
DEFAULT_OUTPUT = BASE_DIR / "speaker-notes.html"

TRAILING_SLUGS_RE = re.compile(r"^(.*?)\s*\(((?:`[^`]+`\s*,\s*)*`[^`]+`)\)\s*$")

CUE_CLASS_MAP = {
    "klick": "cue-klick",
    "kernbotschaft": "cue-kern",
    "brücke": "cue-bruecke",
    "bruecke": "cue-bruecke",
    "frage": "cue-frage",
}


def render_inline(text: str) -> str:
    """Convert inline Markdown (`code`, **bold**, *italic*) safely to HTML."""
    parts = re.split(r"(`[^`]+`)", text)
    out: list[str] = []
    for part in parts:
        if part.startswith("`") and part.endswith("`") and len(part) >= 2:
            out.append(f"<code>{html.escape(part[1:-1])}</code>")
            continue
        escaped = html.escape(part)
        escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
        escaped = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<em>\1</em>", escaped)
        out.append(escaped)
    return "".join(out)


def render_subheading(raw_title: str) -> str:
    """Render a ### slide/lab subheading, turning trailing (`slug`, ...) into subtle badges."""
    m = TRAILING_SLUGS_RE.match(raw_title.strip())
    if m:
        title_html = render_inline(m.group(1).strip())
        slugs = re.findall(r"`([^`]+)`", m.group(2))
        badges = " ".join(
            f'<span class="slide-slug">{html.escape(s.strip())}</span>' for s in slugs
        )
        return f"<h4>{title_html} {badges}</h4>"
    return f"<h4>{render_inline(raw_title.strip())}</h4>"


def render_list_item(raw_text: str, sub_items: list[tuple[str, str]]) -> str:
    """Render a list item with optional cue badge styling and nested sub-list."""
    cue_cls = ""
    body_html = ""
    cue_match = re.match(r"^\*\*([^*:]+):\*\*\s*(.*)$", raw_text)
    if cue_match:
        label = cue_match.group(1).strip()
        rest = cue_match.group(2).strip()
        mapped = CUE_CLASS_MAP.get(label.lower())
        if mapped:
            cue_cls = mapped
            body_html = f'<span class="cue-tag">{html.escape(label)}</span> {render_inline(rest)}'
        else:
            body_html = f"<strong>{html.escape(label)}:</strong> {render_inline(rest)}"
    else:
        body_html = render_inline(raw_text)

    nested_html = ""
    if sub_items:
        list_tag = "ol" if sub_items[0][0] == "ol" else "ul"
        li_html = "".join(f"<li>{render_inline(item_txt)}</li>" for _, item_txt in sub_items)
        nested_html = f"<{list_tag} class=\"sub-list\">{li_html}</{list_tag}>"

    cls_attr = f' class="cue-item {cue_cls}"' if cue_cls else ""
    return f"<li{cls_attr}>{body_html}{nested_html}</li>"


def render_block_body(lines: list[str]) -> str:
    """Render Markdown lines inside a ## time block into slide groups and cue lists."""
    groups: list[tuple[str | None, list[str]]] = []
    current_heading: str | None = None
    current_lines: list[str] = []

    for line in lines:
        if line.startswith("### "):
            if current_heading is not None or any(l.strip() for l in current_lines):
                groups.append((current_heading, current_lines))
            current_heading = line[4:].strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_heading is not None or any(l.strip() for l in current_lines):
        groups.append((current_heading, current_lines))

    html_parts: list[str] = []
    for heading, g_lines in groups:
        inner: list[str] = []
        if heading is not None:
            inner.append(render_subheading(heading))

        items: list[tuple[str, list[tuple[str, str]]]] = []
        paragraphs: list[str] = []

        for raw in g_lines:
            stripped = raw.strip()
            if not stripped:
                continue
            top_bullet = re.match(r"^-\s+(.*)$", raw)
            if top_bullet:
                items.append((top_bullet.group(1).strip(), []))
                continue
            sub_ol = re.match(r"^\s{2,}\d+\.\s+(.*)$", raw)
            if sub_ol and items:
                items[-1][1].append(("ol", sub_ol.group(1).strip()))
                continue
            sub_ul = re.match(r"^\s{2,}[-*]\s+(.*)$", raw)
            if sub_ul and items:
                items[-1][1].append(("ul", sub_ul.group(1).strip()))
                continue
            paragraphs.append(stripped)

        for p in paragraphs:
            inner.append(f"<p>{render_inline(p)}</p>")

        if items:
            li_all = "".join(render_list_item(txt, subs) for txt, subs in items)
            inner.append(f'<ul class="cue-list">{li_all}</ul>')

        if heading is not None:
            html_parts.append(f'<section class="slide-group">{"".join(inner)}</section>')
        else:
            html_parts.append("".join(inner))

    return "".join(html_parts)


def parse_markdown(md_text: str) -> tuple[dict[str, str], list[dict]]:
    """Parse metadata header (before ---) and ## Zeit | Titel blocks."""
    lines = md_text.splitlines()
    meta: dict[str, str] = {}
    body_start = 0

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "---":
            body_start = idx + 1
            break
        if ":" in stripped and not stripped.startswith("#"):
            k, v = stripped.split(":", 1)
            meta[k.strip()] = v.strip()

    blocks: list[dict] = []
    current_block: dict | None = None

    for line in lines[body_start:]:
        if line.startswith("## "):
            if current_block is not None:
                blocks.append(current_block)
            header_text = line[3:].strip()
            if "|" in header_text:
                t_str, b_title = [p.strip() for p in header_text.split("|", 1)]
            else:
                t_str, b_title = "", header_text
            lower_title = b_title.lower()
            is_break = lower_title.startswith("pause") or lower_title.startswith("mittagspause")
            current_block = {
                "time": t_str,
                "title": b_title,
                "is_break": is_break,
                "lines": [],
            }
        elif current_block is not None:
            current_block["lines"].append(line)

    if current_block is not None:
        blocks.append(current_block)

    return meta, blocks


def build_html(meta: dict[str, str], blocks: list[dict]) -> str:
    """Assemble standalone HTML document with tablet toolbar and A4 print stylesheet."""
    title = meta.get("Titel", "Speaker Notes")
    subtitle = meta.get("Untertitel", "")
    datum = meta.get("Datum", "")
    zeit = meta.get("Zeit", "")
    ort = meta.get("Ort", "")
    themenbereich = meta.get("Themenbereich", "")
    kursleitung = meta.get("Kursleitung", "")
    kennen = meta.get("Kennen", "")
    verstehen = meta.get("Verstehen", "")
    anwenden = meta.get("Anwenden", "")
    material = meta.get("Material", "")

    rows_html: list[str] = []
    for blk in blocks:
        time_html = html.escape(blk["time"])
        title_html = render_inline(blk["title"])
        if blk["is_break"]:
            rows_html.append(
                f'<tr class="row-break">'
                f'<td class="col-time">{time_html}</td>'
                f'<td class="col-program"><strong>{title_html}</strong></td>'
                f'<td class="col-notes" aria-hidden="true"></td>'
                f"</tr>"
            )
        else:
            body_html = render_block_body(blk["lines"])
            rows_html.append(
                f'<tr class="row-block">'
                f'<td class="col-time">{time_html}</td>'
                f'<td class="col-program"><h3>{title_html}</h3>{body_html}</td>'
                f'<td class="col-notes"><div class="notes-lines" aria-hidden="true"></div></td>'
                f"</tr>"
            )

    material_strip = (
        f'<footer class="material-strip"><strong>Material:</strong> {render_inline(material)}</footer>'
        if material
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{html.escape(title)} — Speaker Notes</title>
  <style>
    :root {{
      --bg: #fffbee;
      --bg-card: #fffdf6;
      --bg-subtle: #f7f2e2;
      --bg-break: #f3ecda;
      --border: rgba(89, 89, 89, 0.22);
      --border-strong: rgba(89, 89, 89, 0.42);
      --text: #454545;
      --text-strong: #1f1f1f;
      --text-muted: #6e6a5e;
      --accent: #2b6f6b;
      --accent-soft: rgba(43, 111, 107, 0.08);
      --bronze: #7f6000;
      --font-sans: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      --body-size: 13.5px;
    }}

    body.is-tablet-size {{
      --body-size: 15.5px;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}

    body {{
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      font-size: var(--body-size);
      line-height: 1.48;
      -webkit-font-smoothing: antialiased;
    }}

    .toolbar {{
      position: sticky;
      top: 0;
      z-index: 20;
      background: rgba(255, 251, 238, 0.94);
      backdrop-filter: blur(6px);
      border-bottom: 1px solid var(--border);
      padding: 0.6rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
    }}

    .toolbar-meta {{
      font-family: var(--font-mono);
      font-size: 0.76rem;
      color: var(--text-muted);
    }}

    .toolbar-actions {{
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.45rem;
    }}

    .tool-btn {{
      appearance: none;
      background: var(--bg-card);
      border: 1px solid var(--border-strong);
      color: var(--text-strong);
      font-family: var(--font-mono);
      font-size: 0.76rem;
      padding: 0.38rem 0.72rem;
      cursor: pointer;
      transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
    }}

    .tool-btn:hover {{
      border-color: var(--text-strong);
      background: var(--bg-subtle);
    }}

    .tool-btn.is-primary,
    .tool-btn[aria-pressed="true"] {{
      background: var(--accent);
      border-color: var(--accent);
      color: #fffbee;
    }}

    .sheet {{
      max-width: 1020px;
      margin: 1.25rem auto 2.5rem;
      padding: 0 1.25rem;
    }}

    .sheet-head {{
      border-bottom: 2px solid var(--text-strong);
      padding-bottom: 0.65rem;
      margin-bottom: 0.85rem;
    }}

    .sheet-head h1 {{
      font-size: 1.32rem;
      font-weight: 700;
      color: var(--text-strong);
      line-height: 1.25;
    }}

    .sheet-sub {{
      margin-top: 0.22rem;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--text-muted);
    }}

    .meta-table,
    .run-table {{
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-card);
      border: 1px solid var(--border-strong);
    }}

    .meta-table {{
      margin-bottom: 1rem;
      break-inside: avoid;
    }}

    .meta-table th,
    .meta-table td {{
      text-align: left;
      vertical-align: top;
      padding: 0.44rem 0.65rem;
      border-bottom: 1px solid var(--border);
      font-size: 0.92em;
    }}

    .meta-table th {{
      width: 18%;
      min-width: 130px;
      background: var(--bg-subtle);
      color: var(--text-strong);
      font-weight: 600;
      border-right: 1px solid var(--border);
    }}

    .meta-split {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
    }}

    .goals-grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.65rem;
    }}

    .goal-col strong {{
      display: block;
      font-family: var(--font-mono);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      margin-bottom: 0.15rem;
    }}

    .run-table thead th {{
      background: var(--bg-subtle);
      color: var(--text-strong);
      font-family: var(--font-mono);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      text-align: left;
      padding: 0.48rem 0.65rem;
      border-bottom: 1px solid var(--border-strong);
    }}

    .run-table td {{
      vertical-align: top;
      padding: 0.55rem 0.7rem;
      border-bottom: 1px solid var(--border);
    }}

    .col-time {{
      width: 118px;
      white-space: nowrap;
      font-family: var(--font-mono);
      font-size: 0.8em;
      font-weight: 600;
      color: var(--text-strong);
      border-right: 1px solid var(--border);
    }}

    .col-notes {{
      display: none;
      width: 24%;
      border-left: 1px dashed var(--border-strong);
      background: repeating-linear-gradient(
        to bottom,
        transparent,
        transparent 23px,
        rgba(89, 89, 89, 0.14) 24px
      );
    }}

    body.show-notes-col .col-notes {{
      display: table-cell;
    }}

    .row-break td {{
      background: var(--bg-break);
      color: var(--text-strong);
      padding-top: 0.36rem;
      padding-bottom: 0.36rem;
    }}

    .row-break .col-notes {{
      background: var(--bg-break);
    }}

    .col-program h3 {{
      font-size: 1.04em;
      font-weight: 700;
      color: var(--text-strong);
      margin-bottom: 0.35rem;
      padding-bottom: 0.2rem;
      border-bottom: 1px solid var(--border);
    }}

    .slide-group {{
      margin-top: 0.5rem;
      padding-top: 0.35rem;
      break-inside: avoid;
    }}

    .slide-group:first-of-type {{
      margin-top: 0.2rem;
      padding-top: 0;
    }}

    .slide-group h4 {{
      font-size: 0.96em;
      font-weight: 600;
      color: var(--text-strong);
      margin-bottom: 0.24rem;
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.4rem;
    }}

    .slide-slug {{
      font-family: var(--font-mono);
      font-size: 0.72em;
      font-weight: 500;
      color: var(--text-muted);
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      padding: 0.04rem 0.35rem;
      border-radius: 3px;
    }}

    .cue-list {{
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.26rem;
    }}

    .cue-list > li {{
      position: relative;
      padding-left: 0.85rem;
    }}

    .cue-list > li::before {{
      content: "•";
      position: absolute;
      left: 0;
      color: var(--text-muted);
    }}

    .cue-tag {{
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.74em;
      font-weight: 600;
      padding: 0.03rem 0.36rem;
      border-radius: 3px;
      margin-right: 0.2rem;
      vertical-align: baseline;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      color: var(--text-strong);
    }}

    .cue-klick .cue-tag {{
      color: var(--bronze);
      border-color: rgba(127, 96, 0, 0.32);
      background: rgba(127, 96, 0, 0.08);
    }}

    .cue-kern .cue-tag {{
      color: var(--text-strong);
    }}

    .cue-bruecke {{
      background: var(--accent-soft);
      border-left: 3px solid var(--accent);
      padding: 0.28rem 0.55rem 0.28rem 0.65rem !important;
      margin: 0.15rem 0;
    }}

    .cue-bruecke::before {{
      display: none;
    }}

    .cue-bruecke .cue-tag {{
      color: var(--accent);
      border-color: rgba(43, 111, 107, 0.35);
      background: rgba(255, 255, 255, 0.65);
    }}

    .cue-frage .cue-tag {{
      color: var(--accent);
      border-color: rgba(43, 111, 107, 0.3);
      background: var(--accent-soft);
    }}

    .sub-list {{
      margin: 0.22rem 0 0.1rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.16rem;
    }}

    code {{
      font-family: var(--font-mono);
      font-size: 0.86em;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      padding: 0.02rem 0.28rem;
      border-radius: 3px;
    }}

    .material-strip {{
      margin-top: 0.85rem;
      padding: 0.55rem 0.75rem;
      background: var(--bg-card);
      border: 1px solid var(--border-strong);
      font-size: 0.9em;
      break-inside: avoid;
    }}

    @media (max-width: 720px) {{
      .meta-split,
      .goals-grid {{
        grid-template-columns: 1fr;
      }}
      .col-time {{
        width: 92px;
        white-space: normal;
      }}
      body.show-notes-col .col-notes {{
        width: 28%;
      }}
    }}

    @page {{
      size: A4 portrait;
      margin: 13mm 13mm 14mm;
    }}

    @media print {{
      :root {{
        --bg: #ffffff;
        --bg-card: #ffffff;
        --bg-subtle: #f5f5f5;
        --bg-break: #efefef;
        --border: #d2d2d2;
        --border-strong: #9a9a9a;
        --text: #1f1f1f;
        --text-strong: #000000;
        --text-muted: #4a4a4a;
        --accent: #1f5c58;
        --accent-soft: #f3f7f6;
        --body-size: 10.5pt;
      }}

      .no-print {{
        display: none !important;
      }}

      body {{
        background: #ffffff;
        color: #1f1f1f;
      }}

      .sheet {{
        max-width: none;
        margin: 0;
        padding: 0;
      }}

      .run-table thead {{
        display: table-header-group;
      }}

      .row-break,
      .slide-group,
      .meta-table,
      .material-strip {{
        break-inside: avoid;
        page-break-inside: avoid;
      }}

      .col-program h3 {{
        break-after: avoid;
        page-break-after: avoid;
      }}

      .cue-bruecke {{
        background: #f3f7f6;
      }}
    }}
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <span class="toolbar-meta">Quelle: <code>lecturer/speaker-notes.md</code> · Nicht auf GitHub Pages veröffentlicht</span>
    <div class="toolbar-actions">
      <button type="button" id="btnToggleNotes" class="tool-btn" aria-pressed="false">Notizspalte</button>
      <button type="button" id="btnToggleSize" class="tool-btn" aria-pressed="false">Schriftgrösse: Kompakt</button>
      <button type="button" id="btnPrint" class="tool-btn is-primary">Drucken / PDF (A4)</button>
    </div>
  </div>

  <main class="sheet">
    <header class="sheet-head">
      <h1>{html.escape(title)}</h1>
      <p class="sheet-sub">{html.escape(subtitle)}</p>
    </header>

    <table class="meta-table" aria-label="Kursmetadaten und Tagesziele">
      <tbody>
        <tr>
          <th scope="row">Datum / Zeit / Ort</th>
          <td>
            <div class="meta-split">
              <span><strong>Datum:</strong> {html.escape(datum)}</span>
              <span><strong>Zeit:</strong> {html.escape(zeit)}</span>
              <span><strong>Ort:</strong> {html.escape(ort)}</span>
            </div>
          </td>
        </tr>
        <tr>
          <th scope="row">Themenbereich</th>
          <td>{render_inline(themenbereich)}</td>
        </tr>
        <tr>
          <th scope="row">Tagesziele</th>
          <td>
            <div class="goals-grid">
              <div class="goal-col"><strong>Kennen</strong>{render_inline(kennen)}</div>
              <div class="goal-col"><strong>Verstehen</strong>{render_inline(verstehen)}</div>
              <div class="goal-col"><strong>Anwenden</strong>{render_inline(anwenden)}</div>
            </div>
          </td>
        </tr>
        <tr>
          <th scope="row">Kursleitung</th>
          <td>{html.escape(kursleitung)}</td>
        </tr>
      </tbody>
    </table>

    <table class="run-table" aria-label="Programm und Speaker Notes">
      <thead>
        <tr>
          <th scope="col" class="col-time">Zeit</th>
          <th scope="col" class="col-program">Programm &amp; Speaker Notes</th>
          <th scope="col" class="col-notes">Eigene Notizen</th>
        </tr>
      </thead>
      <tbody>
        {"".join(rows_html)}
      </tbody>
    </table>

    {material_strip}
  </main>

  <script>
    (() => {{
      const notesBtn = document.getElementById('btnToggleNotes');
      const sizeBtn = document.getElementById('btnToggleSize');
      const printBtn = document.getElementById('btnPrint');

      if (notesBtn) {{
        notesBtn.addEventListener('click', () => {{
          const active = document.body.classList.toggle('show-notes-col');
          notesBtn.setAttribute('aria-pressed', String(active));
        }});
      }}

      if (sizeBtn) {{
        sizeBtn.addEventListener('click', () => {{
          const tablet = document.body.classList.toggle('is-tablet-size');
          sizeBtn.setAttribute('aria-pressed', String(tablet));
          sizeBtn.textContent = tablet ? 'Schriftgrösse: Tablet' : 'Schriftgrösse: Kompakt';
        }});
      }}

      if (printBtn) {{
        printBtn.addEventListener('click', () => window.print());
      }}
    }})();
  </script>
</body>
</html>
"""


def slugify_tab(text: str) -> str:
    """Fold German umlauts and normalize a data-slide-tab label into a stable slide slug."""
    folded = (
        text.strip()
        .lower()
        .replace("ä", "ae")
        .replace("ö", "oe")
        .replace("ü", "ue")
        .replace("ß", "ss")
    )
    return re.sub(r"[^a-z0-9]+", "-", folded).strip("-")


class DeckSlideParser(HTMLParser):
    """Extract ordered stage-step-panel slides and their derived slugs from docs/index.html."""

    def __init__(self) -> None:
        super().__init__()
        self.slides: list[dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "div":
            return
        attr_map = {k.lower(): (v or "") for k, v in attrs}
        classes = attr_map.get("class", "").split()
        if "stage-step-panel" not in classes:
            return
        tab = attr_map.get("data-slide-tab", "").strip()
        folder = attr_map.get("data-slide-folder", "").strip()
        slug = pathlib.Path(folder).name if folder else slugify_tab(tab)
        if slug:
            self.slides.append({"tab": tab or slug, "slug": slug})


def extract_deck_slides(index_html_path: pathlib.Path) -> list[dict[str, str]]:
    parser = DeckSlideParser()
    parser.feed(index_html_path.read_text(encoding="utf-8"))
    return parser.slides


def extract_note_slugs(md_text: str) -> list[str]:
    """Collect backticked slide slugs from trailing parentheses on ### headings."""
    slugs: list[str] = []
    for line in md_text.splitlines():
        if not line.startswith("### "):
            continue
        m = TRAILING_SLUGS_RE.match(line[4:].strip())
        if not m:
            continue
        for s in re.findall(r"`([^`]+)`", m.group(2)):
            clean = s.strip()
            if clean:
                slugs.append(clean)
    return slugs


def run_check(in_path: pathlib.Path, out_path: pathlib.Path) -> int:
    green: list[str] = []
    yellow: list[str] = []
    red: list[str] = []

    if not in_path.exists():
        red.append(f"Missing speaker-notes source: {in_path}")
    if not INDEX_HTML.exists():
        red.append(f"Missing deck HTML: {INDEX_HTML}")

    if not red:
        md_text = in_path.read_text(encoding="utf-8")
        deck_slides = extract_deck_slides(INDEX_HTML)
        note_slugs = extract_note_slugs(md_text)
        deck_slug_set = {s["slug"] for s in deck_slides}
        note_slug_set = set(note_slugs)

        for slide in deck_slides:
            if slide["slug"] in note_slug_set:
                green.append(f"Slide '{slide['tab']}' covered via (`{slide['slug']}`).")
            else:
                red.append(
                    f"Slide '{slide['tab']}' in docs/index.html is missing from {in_path.name} (expected slug `{slide['slug']}`)."
                )

        seen_extra: set[str] = set()
        for slug in note_slugs:
            if slug not in deck_slug_set and slug not in seen_extra:
                seen_extra.add(slug)
                yellow.append(
                    f"Speaker-notes slug `{slug}` in {in_path.name} does not match any slide in docs/index.html."
                )

        meta, blocks = parse_markdown(md_text)
        expected_html = build_html(meta, blocks).replace("\r\n", "\n")
        if not out_path.exists():
            red.append(f"Missing generated HTML {out_path.name} — run: python lecturer/build_notes.py")
        else:
            actual_html = out_path.read_text(encoding="utf-8").replace("\r\n", "\n")
            if actual_html != expected_html:
                red.append(
                    f"{out_path.name} is out of date with {in_path.name} — run: python lecturer/build_notes.py"
                )
            else:
                green.append(f"{out_path.name} is up to date with {in_path.name}.")

    print("=== Lecturer Speaker Notes Check ===")
    for item in green:
        print(f"  [GREEN]  {item}")
    for item in yellow:
        print(f"  [YELLOW] {item}")
    for item in red:
        print(f"  [RED]    {item}")
    print(f"Summary: GREEN={len(green)}, YELLOW={len(yellow)}, RED={len(red)}")

    return 1 if red else 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build or validate printable lecturer speaker notes from Markdown."
    )
    parser.add_argument("input", nargs="?", type=pathlib.Path, default=DEFAULT_INPUT)
    parser.add_argument("output", nargs="?", type=pathlib.Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify all slides in docs/index.html have speaker notes and speaker-notes.html is up to date.",
    )
    args = parser.parse_args()

    if args.check:
        return run_check(args.input, args.output)

    if not args.input.exists():
        print(f"Error: missing source file {args.input}", file=sys.stderr)
        return 1

    md_text = args.input.read_text(encoding="utf-8")
    meta, blocks = parse_markdown(md_text)
    html_out = build_html(meta, blocks)
    args.output.write_text(html_out, encoding="utf-8")
    print(f"Generated {args.output} ({len(blocks)} blocks)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
