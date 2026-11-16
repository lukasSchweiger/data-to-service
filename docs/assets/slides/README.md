# Per-Slide Graphic Assets (`docs/assets/slides/`)

All replaceable slide graphics live here in **one folder per slide** so you can swap icons, logos, or diagrams directly from Canva or vector downloads without touching HTML or CSS.

## Conventions

1. **Number-free Semantic Folder Names (`<slide-slug>/`):**
   - Folders are named after the slide topic (e.g., `servitization-shift/`, `beispiele-servitization/`, `wieso-servitization/`), never slide numbers (`slide-07`).
   - That means inserting, deleting, or reordering slides never breaks folder names or image paths.
2. **Standardized on `.svg` (`<item-slug>.svg`):**
   - Every graphic uses `.svg` so icons and logos scale razor-sharp on 4K classroom projectors and large screens.
   - Dropping a replacement `.svg` with the same name into a slide folder triggers your OS **"Replace existing file?"** prompt—confirming the filename matches and preventing duplicate files or `404` requests.
3. **Graphic-to-Text `README.md` in Every Folder:**
   - Each slide folder includes a `README.md` mapping every `.svg` filename to the exact heading, label, or slide caption it belongs to.

## Current Slide Folders

| Slide Folder | Slide Title | Graphics |
| :--- | :--- | :--- |
| [`servitization-shift/`](./servitization-shift/README.md) | Servitization of Manufacturers | `wir-verkaufen-produkte.svg`, `wir-verkaufen-leistung.svg` |
| [`beispiele-servitization/`](./beispiele-servitization/README.md) | Beispiele Servitization | `rolls-royce-total-care.svg`, `xerox-pay-per-copy.svg`, `hilti-fleet-management.svg`, `philips-pay-per-lux.svg` |
| [`wieso-servitization/`](./wieso-servitization/README.md) | Wieso Servitization? | `wirtschaftliche-perspektive.svg`, `oekologische-perspektive.svg`, `markt-und-soziale-perspektive.svg`, `technologische-perspektive.svg`, `wissens-perspektive.svg` |

## Adding, Reordering, or Editing Slides

Slides are **self-registering** in [`docs/index.html`](../../index.html):

1. **Create a new slide folder** under `docs/assets/slides/<new-slide-slug>/` containing your `<item-slug>.svg` graphics and a `README.md` mapping each file to its text.
2. **Add one `<div class="stage-step-panel orig-slide-panel">` block** inside `.stage-panels` in `docs/index.html`:
   ```html
   <div class="stage-step-panel orig-slide-panel"
        data-slide-tab="My Slide Tab"
        data-slide-folder="assets/slides/<new-slide-slug>">
     <h2 class="orig-slide-title">My Slide Title</h2>
     <!-- Slide content with <img src="assets/slides/<new-slide-slug>/<item>.svg" alt="..." /> -->
     <div class="orig-slide-footer">
       <span class="orig-slide-citation"></span>
       <span class="orig-slide-num"></span>
     </div>
   </div>
   ```
3. **Move or insert anywhere:** On page load, `syncStagePanels()` in `docs/app.js` automatically numbers all slides continuously across every section on the page (`1..N`), generates the top tab buttons (`1 · ...`, `4 · ...`), updates the global slide counter (`Slide X / N`), updates `.orig-slide-num` in the bottom-right footer, and syncs the Presentation Mode Jump Dropdown.
