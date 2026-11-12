# Step-by-Step Hardware, Firmware & Classroom Guide

**Course:** CAS Smart Service Engineering – Module A: Data-Specific Service Design (Day 4, BI Case Manufacturing)  
**Lecturer:** Dr. Lukas Schweiger  
**Target Board:** Arduino Nano 33 BLE Sense Rev2 (`ABX00069`, headerless)

---

## 1. Pedagogical Context: Why Edge AI in Smart Services?

In the classic CAS predictive maintenance case (Slides 14–19), telemetry from 100 precision machines in the watch industry is aggregated into **1-hour cloud means** (`876,100` observations across 4 features: `volt`, `rotate`, `pressure`, `vibration`).

- **The Cloud Aggregation Problem:** If a precision spindle or bearing develops a micro-fracture or imbalance, a 1-hour average washes out the high-frequency vibration spike until the workpiece is ruined. Conversely, streaming raw 10 kHz vibration data from 100 machines to the cloud 24/7 is expensive and often blocked by shop-floor IT security.
- **The Edge AI / TinyML Solution:** We move **Ebene 4 ("Analyse")** of the Fleisch IoT Value Stack (Slide 45) directly down to **Ebene 2 ("Sensor / Aktor")**. The microcontroller samples high-frequency physics locally, computes spectral/statistical features in real time, runs an anomaly detector in milliwatts of power, and only transmits compact health telemetry or triggers an alert when needed.

---

## 2. Hardware Bill of Materials (BOM) & Sensor Mapping

### Core Components
| Component | Model / SKU | Role in the Lecture | Est. Price (CHF) |
| :--- | :--- | :--- | :--- |
| **Edge AI Board** | **Arduino Nano 33 BLE Sense Rev2** (`ABX00069` — without headers) | 64 MHz Arm Cortex-M4F (`nRF52840`) with 5 built-in sensor systems, Bluetooth 5.0 LE, and RGB status LED. Flat bottom for direct vibration coupling. | ~39.90 |
| **Data & Power Cable** | **Micro-USB Data + Sync Cable** (1.5 m – 2.0 m) | Flashes firmware, powers the board, and streams live telemetry to Chrome/Edge via the **Web Serial API**. | ~8.00 |
| **Machine Surrogate** | **Deltaco FT-532** Metal Desk Fan (230V, 3 speeds, oscillation) | Industrial rotating machine surrogate with removable front wire grill for live fault injection. | ~25.00 |
| **Mechanical Coupling** | **3M Dual Lock** (`SJ3550`) or **UHU Patafix ProPower** | Rigidly couples the flat underside of the `ABX00069` onto the rear motor housing (rotated 90° so the USB cable exits safely backward). | ~8.00 |
| **Optional Display** | **0.96" I2C OLED Display** (`SSD1306` / `SSD1315`) + 4x Mini IC Test-Hook Grabbers | Connects without soldering to `3V3`, `GND`, `A4 (SDA)`, and `A5 (SCL)` for standalone readout. | ~12.00 |

### How the 5 Onboard Sensors Match (and Expand) the Classic 4-Feature Dataset
| Classic Dataset Feature (Slide 19) | Physical Sensor on `ABX00069` | JSON Key(s) | What It Measures (Fan & Benchtop) |
| :--- | :--- | :--- | :--- |
| **`vibration`** | **Bosch `BMI270` Accelerometer** (3-axis, sampled in 32-pt windows at ~250 Hz) | `vib` ($g$ RMS), `p2p` ($g$ peak-to-peak) | Mechanical vibration energy. On the benchtop: tap your fingers on the desk or shake the foam pad. |
| **`rotate`** | **Bosch `BMI270` IMU Zero-Crossing & Gyroscope** | `freq` ($\text{Hz}$), `gyro` ($^\circ/\text{s}$) | Dominant vibration harmonic frequency ($\text{Hz} \times 60 = \text{RPM}$) and rotational wobble. |
| **`volt` (Electrical Load)** | **Bosch `BMM150` 3-Axis Magnetometer** | `mag` ($\mu\text{T}$) | **Contactless EMF proxy:** Measures electromagnetic flux ($\mu\text{T}$) from the 230V AC motor stator coils through the housing. On the benchtop: move a smartphone or magnet near the board. |
| **`pressure`** | **STMicro `LPS22HB` Barometer** | `press` ($\text{hPa}$) | Static air pressure drop behind the fan blades when airflow is obstructed. On the benchtop: blow gently on the board. |
| *(New)* **Acoustic & Thermal** | **`MP34DT06JTR` PDM Mic & `HS3003` Temp/Humidity** | `snd` ($\text{dB}$), `temp` ($^\circ\text{C}$), `hum` ($\%$) | Acoustic rattle/turbulence and motor thermal rise. On the benchtop: snap fingers or warm the board with a finger. |

---

## 3. Classroom Fault Injection Scenarios (CRISP-DM Data Understanding)

| State | Classroom Action (With Fan) | Benchtop Action (Without Fan) | Sensor Signature | Onboard RGB LED |
| :--- | :--- | :--- | :--- | :--- |
| **0. Normal Baseline** | Fan running smoothly at Speed 1 or 2 on flat desk. | Board resting calmly on the desk or black foam pad. | Low `vib` RMS, steady `freq`, stable `press` and `snd`. | **Green** (`NORMAL`) |
| **1. Rotor Imbalance / Bearing Wear** | Attach a **15 mm metal binder clip** to one fan blade. | Tap rhythmically on the desk next to the board (2–5 Hz). | Strong spike in `vib` RMS and `p2p` with a sharp periodic peak in `freq`. | **Yellow** (`WARNING`) |
| **2. Airway Blockage / Cavitation** | Hold an **A5 cardboard sheet** flat against the rear intake grill. | Blow across the microphone/barometer while tapping the desk. | Drop/fluctuation in static `press` ($\text{hPa}$), elevated acoustic `snd` ($\text{dB}$), and higher motor `mag` ($\mu\text{T}$). | **Red** (`ANOMALY`) |
| **3. Loosened Mount / External Shock** | Place the fan on a **soft foam pad** or tilt the housing. | Tilt or rock the board back and forth (`gyro` + `vib`). | High `gyro` ($^\circ/\text{s}$) and broadband `vib` shift across axes. | **Red** (`ANOMALY`) |

---

## 4. Automated Toolchain Setup (`arduino-cli`)

Everything required to compile and flash the firmware from Windows PowerShell (without needing the full Arduino IDE) is automated via **Arduino CLI**:

### Step 4.1: Install Arduino CLI (Windows `winget`)
```powershell
winget install -e --id ArduinoSA.CLI --accept-source-agreements --accept-package-agreements
```
*(Installs to `C:\Program Files\Arduino CLI\arduino-cli.exe`.)*

### Step 4.2: Install the Nano 33 BLE Board Core & Official Sensor Libraries
```powershell
& "C:\Program Files\Arduino CLI\arduino-cli.exe" core update-index
& "C:\Program Files\Arduino CLI\arduino-cli.exe" core install arduino:mbed_nano
& "C:\Program Files\Arduino CLI\arduino-cli.exe" lib install "Arduino_BMI270_BMM150" "Arduino_LPS22HB" "Arduino_HS300x" "ArduinoBLE"
```

### Step 4.3: Compile (Verify) the Sketch
```powershell
& "C:\Program Files\Arduino CLI\arduino-cli.exe" compile --fqbn arduino:mbed_nano:nano33ble "firmware/cas_pdm_edge_twin"
```
- **Verified Footprint:** `361,520 bytes` (36% of 983 KB Flash), `72,464 bytes` (27% of 256 KB RAM).

### Step 4.4: Detect Port & Flash to the Board over Micro-USB
1. Plug the **Arduino Nano 33 BLE Sense Rev2** into the laptop using a Micro-USB **data** cable.
2. *(Tip: If the board is not detected or is stuck in a previous sketch, double-press the white physical **RESET** button on the Arduino rapidly so the yellow LED pulses—this forces bootloader mode).*
3. Check the assigned `COM` port and upload:
```powershell
& "C:\Program Files\Arduino CLI\arduino-cli.exe" board list
& "C:\Program Files\Arduino CLI\arduino-cli.exe" upload -p COM3 --fqbn arduino:mbed_nano:nano33ble "firmware/cas_pdm_edge_twin"
```
*(Replace `COM3` with the port shown by `board list`.)*

---

## 5. Firmware Architecture & Telemetry Protocol (`cas_pdm_edge_twin.ino`)

The firmware in [`firmware/cas_pdm_edge_twin/cas_pdm_edge_twin.ino`](../firmware/cas_pdm_edge_twin/cas_pdm_edge_twin.ino) outputs newline-delimited JSON at **10–12 Hz** over both **USB Serial (`115200` baud)** and **Bluetooth Low Energy (`CAS-PdM-Twin`)**:

```json
{"ms":14250,"vib":0.0184,"p2p":0.0620,"freq":31.2,"gyro":1.4,"mag":46.8,"press":1013.42,"temp":25.40,"hum":44.2,"snd":41.5,"score":0.08,"state":"NORMAL","cal":1}
```

### Bidirectional Commands (Browser $\rightarrow$ Arduino)
Send a single ASCII character over **Web Serial** or **Web Bluetooth** (`19B10002-E8F2-537E-4F6C-D104768A1214`):
- `'C'` or `'c'`: **Calibrate Baseline** — records 16 windows (~2 seconds) of current normal operation, turns the RGB LED **Blue**, and updates the onboard Z-score mean and standard deviation ($\mu, \sigma$).
- `'0'`: **Auto Edge AI Mode** — onboard Z-score classifier controls the state and RGB LED automatically.
- `'1'`: **Force `NORMAL`** (Green LED).
- `'2'`: **Force `WARNING`** (Yellow LED).
- `'3'`: **Force `ANOMALY`** (Red LED).

---

## 6. How Emulation & Live Browser Connectivity Work on GitHub Pages

### Why Standard Web Emulators (Wokwi / Tinkercad) Cannot Run `nRF52840` Firmware Directly
- Browser circuit simulators like **Wokwi** emulate `ATmega328P` (Uno), `ESP32`, and `RP2040`, but do not emulate the Nordic `nRF52840` Cortex-M4F microcontroller or the Bosch `BMI270` / `HS3003` I2C peripheral registers.
- Instead, we verify compilation and memory safety at the binary level using `arduino-cli compile --fqbn arduino:mbed_nano:nano33ble`, and provide a **Virtual Arduino Hardware Emulator** built directly into our **GitHub Pages web application**.

### Three Seamless Operating Modes in the GitHub Pages App
Because GitHub Pages serves over `HTTPS`, our static web application supports three interchangeable data sources that all emit the **exact same JSON telemetry stream**:
1. **Virtual Hardware Emulator (Default for Students without Hardware):** Simulates the Deltaco FT-532 fan + Arduino Nano 33 BLE Sense Rev2 physics in real time, responding to fault injection buttons (`Normal`, `Blade Clip Imbalance`, `Cardboard Blockage`, `Loose Foam Mount`) and calibration commands (`'C'`).
2. **USB Web Serial (`navigator.serial`):** One-click direct connection to the physical Arduino over the Micro-USB cable in Chrome, Edge, or Brave.
3. **Wireless Web Bluetooth (`navigator.bluetooth`):** One-click wireless connection to the Arduino (`CAS-PdM-Twin`) when the board is powered via a USB powerbank or wall adapter on the fan.
