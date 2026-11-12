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
- **Design Language:** Match ZHAW / CAS Smart Service Engineering slide styling:
  - Light academic theme (`#F4F6F9` background, white cards `#FFFFFF`, ZHAW Blue `#0064A6` primary accent).
  - Direct references to CRISP-DM (Slide 13), Tagesziele: Kennen · Verstehen · Anwenden (Slide 4), Smart Product Stack Ebene 1–5 (Slide 45), and Digital Twins (Slides 48–50).

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
- **[x] Step 1 — Toolchain & Arduino Firmware (`891573a`):**
  - Installed `Arduino CLI v1.6.0` (`C:\Program Files\Arduino CLI\arduino-cli.exe`), `arduino:mbed_nano@4.6.0` core, and libraries (`Arduino_BMI270_BMM150@1.2.4`, `Arduino_LPS22HB@1.0.3`, `Arduino_HS300x@1.0.1`, `ArduinoBLE@2.1.0`).
  - Wrote and verified compilation of `firmware/cas_pdm_edge_twin/cas_pdm_edge_twin.ino` (0 errors, 36% Flash, 27% RAM).
  - Documented the entire hardware BOM, sensor mapping, fault injection props, `arduino-cli` commands, JSON protocol, and emulator architecture in `docs/GUIDE.md`.

