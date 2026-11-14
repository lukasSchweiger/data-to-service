# Project Memory & Agent Context (`MEMORY.md`)

## 1. Project Overview
- **Course:** CAS Smart Service Engineering – Module A: Data-Specific Service Design (Day 4, BI Case Manufacturing)
- **Lecturer:** Dr. Lukas Schweiger (ZHAW School of Engineering / Roche Diagnostics)
- **Repository:** `https://github.com/lukasSchweiger/data-to-service`
- **Google Slides Deck ID:** `1Y7VlT4hEuSG8kCiig2SL-heA-JifKsSjT3XQhC0jLWc` ([Presentation Link](https://docs.google.com/presentation/d/1Y7VlT4hEuSG8kCiig2SL-heA-JifKsSjT3XQhC0jLWc/edit))
- **Goal:** Build a complete, live interactive classroom predictive maintenance & smart service engineering platform hosted on **GitHub Pages**, paired with ready-to-flash Arduino firmware and Google Colab notebooks.

## 2. Git & Workflow Conventions
- **Commit Messages:** Strictly follow [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
  - `feat:` for new features (e.g., `feat(web): add Web Serial and Web Bluetooth telemetry dashboard`)
  - `fix:` for bug fixes
  - `docs:` for documentation and memory updates
  - `chore:` for project structure, config, or build tasks
  - `refactor:` for code restructuring
- **Design Language:** Match Lukas's Google Slides presentation palette combined with the clean, minimalist editorial aesthetic of `https://ventriloc.ca/en/`:
  - **Background:** Warm cream `#fffbee` (with clean subtle off-white/cream surfaces and hairline borders).
  - **Primary Text:** Charcoal grey `#595959` (high readability, generous whitespace, editorial typography, zero clutter).
  - **Visualization Copy:** Apply [data-to-viz.com](https://www.data-to-viz.com/) principles silently in chart design; keep at most one brief footer attribution at the end of the page without repeating chart-type explanations in headings or body text.
  - **Content Integration:** Direct references to CRISP-DM (Slide 13), Tagesziele: Kennen · Verstehen · Anwenden (Slide 4), Smart Product Stack Ebene 1–5 (Slide 45), and Digital Twins (Slides 48–50).

## 3. Hardware Setup Status
- **Microcontroller (Owned & Ready):** **Arduino Nano 33 BLE Sense Rev2** (SKU `ABX00069`, headerless flat bottom, nRF52840 64MHz Cortex-M4F, Micro-USB data cable ready).
- **Onboard Sensors (5 Features matching & expanding the classic 4-feature telemetry dataset):**
  1. **Vibration & Rotation:** `BMI270` 6-axis IMU (3-axis accelerometer $a_x, a_y, a_z$ + 3-axis gyroscope $g_x, g_y, g_z$ -> RMS vibration & FFT spectral peaks).
  2. **Voltage / Electrical Load Proxy:** `BMM150` 3-axis magnetometer ($\mu\text{T}$ electromagnetic flux from motor stator coils, or hand/magnet proximity during desk testing).
  3. **Pressure:** `LPS22HB` barometric pressure sensor ($\text{hPa}$ static air pressure drop).
  4. **Temperature & Humidity:** `HS3003` sensor ($^\circ\text{C}$, `%RH`).
  5. **Acoustic Sound:** `MP34DT06JTR` digital PDM microphone (dB / RMS acoustic level).
  - Plus `APDS9960` gesture/proximity/color sensor and onboard **RGB LED** (Pins `LEDR` 22, `LEDG` 23, `LEDB` 24 — active LOW).
- **Industrial Machine Surrogate (To be acquired later):** **Deltaco FT-532** metal desk fan (230V, 3 speeds, oscillation) + 3M Dual Lock mounting + optional 0.96" I2C OLED display.
  - *Note:* Until the fan arrives, all firmware and web tools support **Benchtop / Hand-Testing Mode** (tapping the desk, shaking/tilting the board, blowing on the pressure/mic sensor, warming with a finger, or waving a magnet/phone near the BMM150) as well as a **Synthetic Classroom Simulator Mode**.

## 4. Technical Architecture (GitHub Pages + Edge + Colab)
Because GitHub Pages serves over `https://lukasschweiger.github.io/data-to-service/`, modern Chromium browsers (Chrome, Edge, Brave) unlock two native hardware APIs directly from the static website with **zero backend required**:
1. **Web Serial API (`navigator.serial`):** Connects directly to the Arduino over the Micro-USB cable at `115200` baud for ultra-fast streaming, live FFT, and bidirectional commands (e.g., triggering onboard LED states or fault labels).
2. **Web Bluetooth API (`navigator.bluetooth`):** Connects wirelessly over BLE (`CAS-PdM-Twin` service) to the Arduino when powered by a powerbank/wall adapter, allowing the lecturer or students to stream live telemetry without a cable.
3. **Simulated Digital Twin Mode:** Fallback mode in the browser so students following along on their own laptops (or iOS/Firefox) can interact with the 3D CAD assembly, inject faults, inspect FFT spectra, adjust the CHF Service Cost Confusion Matrix, and export CSV datasets for Colab.

## 5. Planned Repository Structure
```text
data-to-service/
├── MEMORY.md                  # Persistent project context & progress log
├── README.md                  # Course & repo guide with direct links to GitHub Pages & Colab
├── docs/                      # GitHub Pages static web app (HTML/JS/CSS + Three.js + Chart.js)
│   ├── GUIDE.md               # Step-by-step hardware, arduino-cli, firmware & classroom guide
│   ├── index.html             # Live Classroom Dashboard, 3D Digital Twin & WebSerial/WebBLE Connector
│   ├── app.js                 # Web Serial, Web Bluetooth, FFT, Live Anomaly Detection & Service P&L logic
│   └── styles.css             # ZHAW / CAS Smart Service Engineering slide theme
├── firmware/                  # Arduino sketches for Nano 33 BLE Sense Rev2 (ABX00069)
│   └── cas_pdm_edge_twin/
│       └── cas_pdm_edge_twin.ino  # 5-sensor USB Serial + BLE telemetry & onboard Edge anomaly detector
└── notebooks/                 # Google Colab Python notebooks for the hands-on student exercises
    └── CAS_Day4_Predictive_Maintenance_2026.ipynb  # CRISP-DM, Unsupervised vs Supervised, SHAP XAI & CHF Service Cost Matrix
```

## 6. Completed Milestones Log
- **[x] Step 1 — Toolchain & Arduino Firmware (`891573a`, `52491ee`):**
  - Installed `Arduino CLI v1.6.0` (`C:\Program Files\Arduino CLI\arduino-cli.exe`), `arduino:mbed_nano@4.6.0` core, and libraries (`Arduino_BMI270_BMM150@1.2.4`, `Arduino_LPS22HB@1.0.3`, `Arduino_HS300x@1.0.1`, `ArduinoBLE@2.1.0`).
  - Wrote, compiled, and flashed `firmware/cas_pdm_edge_twin/cas_pdm_edge_twin.ino` onto the physical board on `COM3`, verifying live 5-sensor telemetry and auto-calibration (`~950.27 hPa` local altitude pressure).
  - Documented the entire hardware BOM, sensor mapping, fault injection props, `arduino-cli` commands, JSON protocol, and emulator architecture in `docs/GUIDE.md`.
- **[x] Step 2 (First Draft) — Minimalist GitHub Pages Site & 2D Sensor Dashboard:**
  - Created `docs/index.html`, `docs/styles.css`, and `docs/app.js` using the `#fffbee` background and `#595959` text color palette and clean Ventriloc-inspired editorial layout.
  - Focused strictly on **Part 01 / Explanation** (what we set up so far) and **Part 02 / Data Visualization** centered around an interactive 2D SVG diagram of the **Arduino Nano 33 BLE Sense Rev2 (ABX00069)** showing the exact physical IC location and live values of all 5 sensors + RGB LED.
  - Implemented charts following [From Data to Viz](https://www.data-to-viz.com/#explore) and [Data-to-Viz Caveats](https://www.data-to-viz.com/caveats.html): annotated anomaly threshold timeline, ranked horizontal lollipop chart of $|Z|$-scores (avoiding radar/spider and gauge charts), and 5 small-multiple sparklines with dedicated Y-scales and baseline ($\mu$) reference lines (avoiding dual-axis distortion).
  - Added `.github/workflows/deploy-pages.yml` to automatically deploy `./docs` to GitHub Pages via GitHub Actions on push to `main`.
- **[x] Step 2b — Responsive Web Architecture & DPR-Safe Canvas System (`548af92`, `354ec29`):**
  - Replaced fixed canvas/SVG widths with a fluid CSS layout system, compact SVG+HTML callout fallback (`< 700px`), responsive `data-label` stacked table cards (`< 680px`), `ResizeObserver` + DPR watcher (`window.CASResponsive`), and parent-measured `prepCanvas(canvas)` eliminating DPR resize feedback loops.
  - Cleaned up visualization copy so `data-to-viz.com` principles are applied silently with only a single concise footer attribution.
- **[x] Step 3 — CRISP-DM Phase 2: In-Browser Python Data Understanding Lab (`feat/crisp-dm-data-understanding`):**
  - Added **Part 03 / CRISP-DM Phase 2: Data Understanding** (`#crispdm`) connecting the live Arduino/Emulator telemetry buffer (`recordedRows`) directly to an in-browser Python (`Pyodide` WebAssembly + `pandas`/`numpy` with automatic offline DataFrame fallback) environment as `df`.
  - Added 3 editable, runnable Python cells (`Shift+Enter` / `Run Cell ▶`): `2.1 Collect & Verify Data Quality` (sampling interval $\Delta t$, jitter, `cal=0` vs `cal=1`), `2.2 Describe Data` (units, scale disparity, peak $Z$-score), and `2.3 Explore Data` (Edge 32-pt `p2p` vs smoothed cloud rolling mean and $7 \times 7$ Pearson correlation matrix), plus an 80-frame multi-fault sample preset loader.
- **[x] Step 3b — Modular Reorderable Sections & Responsive Sticky Section Rail:**
  - Wrapped all topic sections in `<main id="sectionsContainer" class="sections-stack">` in `docs/index.html` and moved the page footer outside `<main>`, removing hardcoded section-number cross-references so sections can be freely reordered.
  - Added `SECTION_ORDER` and `initModularSections()` (`window.CASSections`) in `docs/app.js` to support reordering either via `SECTION_ORDER` or by moving `<section>` blocks in HTML, automatically renumbering section indices (`01`, `02`, `03`, ...), rebuilding `<nav class="header-nav">` links, and driving scroll-spy active states (`.is-in-view`, `.is-active`).
  - Added a sticky 90°-rotated vertical side rail (`writing-mode: vertical-rl; transform: rotate(180deg);`) on desktop (`> 960px`) in `docs/styles.css` that collapses into a sticky horizontal top strip (`position: sticky; top: 0`) on viewports `<= 960px`.
- **[x] Step 3c — Slide-Style Section Stages, Logitech Presenter Navigation, Jump Dropdown & Single-Screen Beamer Mode:**
  - Structured each modular section into Presenter waypoints: a top **Slide Stage** (`.section-stage[data-waypoint="stage"]` with a 3-step interactive `.stage-visual-card`) and a bottom **Deep Dive / Live Lab** (`.section-lab[data-waypoint="lab"]`) subdivided into cohesive single-screen `.lab-step-pane[data-lab-step][data-step-title]` screens with `.lab-substep-bar` pills in Beamer Mode.
  - Added 1D Presenter navigation (`initPresenterController()` in `docs/app.js`) stepping sequentially through inline visual states (`1 → 2 → 3`) and split Lab screens via `PageDown`/`ArrowRight`/`ArrowDown` and `PageUp`/`ArrowLeft`/`ArrowUp` when Beamer Mode is active (`B` toggles Beamer Mode, `Escape` closes the jump menu or exits Beamer Mode; safely ignores inputs/code editors).
  - Added a Beamer-only floating bottom-right Presenter HUD (`#presenterHud`, hidden outside `body.is-beamer-mode`) with Previous/Next controls, a mouse-clickable **Jump Dropdown** (`#hudJumpMenu`) synced with `SECTION_ORDER`, and a **Beamer Mode** toggle (`#btnBeamerMode` in header, `#hudBeamerBtn` in HUD) that isolates the active section/waypoint/lab pane cleanly on a single screen (`100vh`) with zero bottom cutoff.

## 7. Responsive Design & Layout Standards (Mandatory for All Features)
Every new feature added to `docs/` (3D Digital Twin / Three.js viewport, FFT spectrum analyzer, CHF Service Cost Confusion Matrix, CRISP-DM modules) **must** follow these rules so the site works seamlessly across **`360px` mobile**, **`640px` split-screen beside Google Colab**, **`1024px` laptop**, and **`1440px+` classroom projector** with zero horizontal overflow (`document.documentElement.scrollWidth <= document.documentElement.clientWidth`):
1. **Use Reusable Fluid Grid Primitives (`docs/styles.css`):**
   - Prefer `.l-grid-auto-sm` (`200px`), `.l-grid-auto-md` (`280px`), `.l-grid-auto-lg` (`380px`), `.l-split-2col`, and `.l-split-sidebar` instead of fixed-width columns or bespoke breakpoints.
   - All grid and flex children must keep `min-width: 0` so long `<pre>`, `<code>`, tables, or canvases never force horizontal page scroll.
2. **DPR-Safe Canvases & 3D Viewports (`docs/app.js`):**
   - Wrap `<canvas>` elements in a sized container (`.canvas-container`, `.sm-canvas-wrap`, or `.aspect-16-9` / `.aspect-4-3` / `.aspect-21-9`) and give the canvas `class="responsive-canvas"` (`width: 100% !important; height: 100% !important;`).
   - Always measure the **parent container** (`container.clientWidth` / `container.clientHeight`) via `window.CASResponsive.prepCanvas(canvas)` — **never** read `canvas.getBoundingClientRect()` and multiply by `devicePixelRatio` back into `canvas.width` without CSS containment, or high-DPI screens will cause exponential width expansion.
   - Register new responsive canvases, Three.js renderers, and adaptive SVG diagrams with `window.CASResponsive.observe(containerEl, redrawFn)`.
3. **Responsive Tables & Dense Diagrams:**
   - Any multi-column data table using `.editorial-table` must include `data-label="..."` on every `<td>` so viewports `< 680px` collapse cleanly into stacked key-value cards.
   - Dense annotated diagrams (like the 2D Arduino board) must switch to a focused SVG view + responsive HTML card grid on compact viewports rather than using `min-width` scrolling or shrinking labels below legibility.
4. **Modular Reorderable Section Template (`docs/index.html` & `docs/app.js`):**
   - Every new topic section added inside `<main id="sectionsContainer">` must use `<section id="..." class="section-block" data-section-title="..." data-section-subtitle="..." data-nav-label="...">` containing `<aside class="section-rail">` (with `.section-rail-sticky`) + `<div class="section-body">` split into `<div class="section-stage" data-waypoint="stage">` (intro + `.stage-visual-card` with 1–3 steps) and `<div class="section-lab" data-waypoint="lab" data-lab-title="...">`.
   - Split multi-screen labs or long reference/CLI blocks inside `.section-lab` into cohesive `.lab-step-pane[data-lab-step][data-step-title]` panels paired with a `.lab-substep-bar` so every screen in `body.is-beamer-mode` fits cleanly without vertical cutoff while Normal Mode scrolls continuously.
   - Never hardcode section numbers (e.g. `"Section 02"`) inside prose or Python starter comments; register the section ID in `SECTION_ORDER` in `docs/app.js` (and `DEFAULT_HTML_ORDER` if keeping HTML order as default) so automatic numbering, navigation links, Presenter stops, the Jump Dropdown, and the responsive sticky rail stay synchronized regardless of order.



