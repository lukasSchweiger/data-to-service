---
name: in-slide-deep-dive
description: >-
  Builds reusable in-slide drill-down and deep-dive views inside any slide panel
  using chamfered folder tabs, active-tab headers, and presenter-safe keyboard
  navigation. Use when adding clickable overview-to-detail deep dives on any
  slide in docs/index.html.
---

# In-Slide Deep Dive Pattern

Use this pattern whenever a slide gives students a clean overview (e.g., perspectives, steps, components, or case studies) and lets them click into detailed sub-views **directly inside the same slide** without adding extra slide numbers or leaving the deck.

`docs/case-deep-dive.js` automatically initializes every `.stage-step-panel` in `docs/index.html` that contains a `.ex-dive` container. You only need to write HTML following the structure below.

## Design & UX Rules

1. **Clean, uncluttered overview:**
   - Put clickable overview items inside `.ex-dive-overview` (each trigger carries `data-dive="<id>"` and `tabindex="0"` when not a native `<button>` or `<a>`).
   - Do **not** add per-row "Deep Dive" pill buttons or heavy outer cell borders. Signal interactivity with a single subtle caption at the bottom: `<p class="ex-dive-hint">...</p>`.
2. **Chamfered folder tabs matching the deck:**
   - Use `.ex-dive-bar` > `.ex-dive-tabs` > `.ex-dive-tab[data-dive="<id>"]` alongside `<button type="button" class="ex-dive-close">✕ Übersicht</button>`.
   - Inactive tabs display only `.ex-tab-short` (monospace label).
   - The active tab expands `.ex-tab-open` (optional miniature `.ex-tab-logo`, bold `.ex-tab-title`, muted `.ex-tab-sub`) and merges into the panel body. Do **not** add a duplicate `<header>` banner inside `.ex-case` below the tab bar.
3. **Eliminate double headers & nested scrollbars:**
   - When a deep dive opens, `.stage-step-panel.is-diving` automatically hides `.ex-dive-overview`, `.ex-dive-hint`, `.orig-slide-title`, `.stage-panel-heading`, and `.ex-footer-default`.
   - Keep copy concise so `.ex-dive-body` has `0px` inner overflow in normal view and fits on one `1366×900` screen in Presentation Mode (`P`) without clipping.
4. **Slide footer citations:**
   - Place per-tab references inside `.orig-slide-footer` using `.ex-footer-citations` > `.ex-footer-group[data-dive-sources="<id>"][hidden]` with `<span class="orig-slide-citation" data-cite="..."></span>`.
   - If the overview itself has a slide-level citation, give it `.ex-footer-default` so it hides while diving.
   - Keep `docs/references.bib` and `FALLBACK_BIBTEX` in `docs/app.js` synchronized for every `data-cite` key.
5. **Optional horizontal timeline:**
   - For chronological steps or milestones, use a full-width `<section class="ex-block ex-milestones">` with `<ol class="ex-timeline">` placed between the main content and `.orig-slide-footer`.
6. **Keyboard & Presenter support (built into `docs/case-deep-dive.js`):**
   - `←` / `→` (and Presenter `PageUp` / `PageDown`) step through `.ex-dive-tab` items and return to the overview past either end.
   - `Esc` closes an open `#citePopover` first, or otherwise closes the deep dive back to the overview.
   - Leaving the slide, waypoint, or section closes the deep dive automatically.

## HTML Blueprint

Drop this structure directly inside any `<div class="stage-step-panel ...">`:

```html
<h2 class="orig-slide-title">Slide Title</h2>

<div class="ex-dive-overview">
  <!-- Clickable overview items (avoid native buttons inside if whole card clicks) -->
  <div data-dive="item-1" tabindex="0">Overview Item 1</div>
  <div data-dive="item-2" tabindex="0">Overview Item 2</div>
</div>
<p class="ex-dive-hint">Element anklicken für den Deep Dive</p>

<div class="ex-dive" hidden>
  <div class="ex-dive-bar">
    <div class="ex-dive-tabs" role="tablist" aria-label="Deep Dive Themen">
      <button type="button" class="ex-dive-tab" role="tab" data-dive="item-1" aria-selected="false">
        <span class="ex-tab-short">Item 1</span>
        <span class="ex-tab-open">
          <!-- optional: <img class="ex-tab-logo" src="assets/slides/.../icon.svg" alt="" /> -->
          <strong class="ex-tab-title">Item 1 Full Title</strong>
          <span class="ex-tab-sub">Short context · Subtitle</span>
        </span>
      </button>
      <button type="button" class="ex-dive-tab" role="tab" data-dive="item-2" aria-selected="false">
        <span class="ex-tab-short">Item 2</span>
        <span class="ex-tab-open">
          <strong class="ex-tab-title">Item 2 Full Title</strong>
          <span class="ex-tab-sub">Short context · Subtitle</span>
        </span>
      </button>
      <!-- Optional summary/comparison tab at the end: add class ex-dive-tab--compare -->
    </div>
    <button type="button" class="ex-dive-close" aria-label="Deep Dive schliessen und zur Übersicht zurück">✕ Übersicht</button>
  </div>

  <div class="ex-dive-body">
    <article class="ex-case" data-dive="item-1" role="tabpanel" aria-label="Item 1 Full Title" hidden>
      <!-- Use existing layout blocks as needed: .ex-shift-row, .ex-detail-grid, .ex-bottom-row, .ex-milestones -->
    </article>

    <article class="ex-case" data-dive="item-2" role="tabpanel" aria-label="Item 2 Full Title" hidden>
      <!-- ... -->
    </article>
  </div>
</div>

<div class="orig-slide-footer">
  <!-- Optional overview-only citation: <span class="orig-slide-citation ex-footer-default" data-cite="..."></span> -->
  <div class="ex-footer-citations">
    <div class="ex-footer-group" data-dive-sources="item-1" hidden>
      <span class="orig-slide-citation" data-cite="key1"></span>
    </div>
    <div class="ex-footer-group" data-dive-sources="item-2" hidden>
      <span class="orig-slide-citation" data-cite="key2"></span>
    </div>
  </div>
  <span class="orig-slide-num" aria-label="Slide N">N</span>
</div>
```

*(Note: Slide 3 (`praxisbeispiele`) uses the legacy attributes `data-case` and `data-case-sources`, which `docs/case-deep-dive.js` continues to support alongside `data-dive` and `data-dive-sources`.)*

## Verification Checklist

1. If you modify `docs/case-deep-dive.js` or `docs/styles.css`, bump their `?v=` query parameters in `docs/index.html` and run `node --check docs/case-deep-dive.js`.
2. Run the copyright & citation audit:
   ```powershell
   python .agents/skills/copyright-and-citation-audit/scripts/audit_assets.py
   ```
3. Verify visually at `1366×900` in both normal view and Presentation Mode (`P`):
   - All `.ex-dive-tab` items and `✕ Übersicht` fit on one un-wrapped row.
   - Only the active tab shows `.ex-tab-open`, and `.ex-dive-overview` + title hide cleanly.
   - Footer citations switch per tab inside `.orig-slide-footer`, and `←`/`→`/`Esc` navigate and close cleanly.
   - Zero inner scrollbars or bottom clipping in Presentation Mode.
