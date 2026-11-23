Titel: Tag 4: CAS Smart Service Engineering – Modul A: Data-Specific Service Design
Untertitel: Dr. Lukas Schweiger · ZHAW School of Engineering · BI Case Manufacturing
Datum: [Datum eintragen]
Zeit: 09.00 – 17.00 Uhr
Ort: Winterthur / Zürich
Themenbereich: BI Case Manufacturing: Servitization, Edge AI & CRISP-DM
Kursleitung: Dr. Lukas Schweiger
Kennen: Servitization-Stufen (Base / Intermediate / Advanced nach Baines & Lightfoot), Smart Product Stack (Ebene 1–5), CRISP-DM Phasen, Edge-AI-Sensorik
Verstehen: Warum Daten und Risikotransfer untrennbar sind, weshalb 1h-Cloud-Mittelwerte frühe Lagerschäden übersehen, wie Servicekosten (P&L) das ML-Modell prägen
Anwenden: Live-Sensordaten erfassen & kalibrieren (Arduino Nano 33 BLE Sense Rev2 / Emulator), CRISP-DM Phase 2 (Data Understanding) in Python durchführen
Material: GitHub Pages Live-Plattform · Arduino Nano 33 BLE Sense Rev2 (ABX00069) + Micro-USB-Datenkabel · Benchtop-Props (Magnet/Smartphone, Foam-Pad) bzw. Deltaco FT-532 + Binder-Clip & A5-Karton · Google Colab Notebook · Speaker Notes (Tablet / A4)

---

## 09.00 – 09.15 | Block 1 – Begrüssung & Tagesziele
- **Einstieg:** Kurzer Rückblick auf die bisherigen Modultage und Einordnung von Tag 4 (*BI Case Manufacturing*: von physischer Maschine zu datengetriebenem Service).
- **Tagesbogen:** Erst *Warum* (Servitization & Risikoshift), dann *Wie* (Edge-Sensorik & Live-Board), anschliessend *Datenarbeit* (CRISP-DM Phase 2 im Browser & Colab).
- **Klick:** Live-Plattform in Chrome/Edge öffnen und Hinweis für Studierende geben, dass der Emulator auf jedem Laptop parallel funktioniert (`P` startet den Präsentationsmodus).

## 09.15 – 10.15 | Block 2 – Einführung: Servitization (01 / Servitization)

### 1 · Was? — Was ist Servitization? (`was-ist-servitization`)
- **Kernbotschaft:** Vom einmaligen Produktverkauf (*Wir verkaufen Produkte*) zur laufenden Leistungserbringung (*Wir verkaufen Leistung*).
- **Klick:** Schrittweise *Added Value → Servitization → Total Shift* erklären; klarstellen, dass klassischer After-Sales erst der Anfang ist.

### 2 · Wieso? — Warum setzen Hersteller auf Servitization? (`warum-servitization`)
- **Kernbotschaft:** Vier Treiber greifen ineinander: Wirtschaftlich (höhere Marge, planbare Erlöse), Technologisch (IoT/Edge als Enabler), Wissen (Zugang zu Felddaten) und Markt/Ökologie (Kundenbindung & Kreislaufwirtschaft).
- **Frage:** Welcher der vier Treiber ist in Ihrem eigenen Unternehmen aktuell der stärkste Auslöser – und welcher bremst am meisten?

### 3 · Praxisbeispiele — Wie sieht Servitization in der Praxis aus? (`praxisbeispiele`)
- **Klick:** *Rolls-Royce* (*Power-by-the-Hour*, kein Eigentumswechsel, aber Engine Health Monitoring), *Xerox 914* (Pay-per-Copy schon 1959 ab Tag 1 als Markteintritt), *Hilti* (fixe Monatsrate statt Pay-per-Use) oder *Philips* (*Pay-per-Lux* / Schiphol).
- **Kernbotschaft:** Egal ob Flugzeugtriebwerk oder Lampe – ohne verlässliche *Messung* der Leistung am Produkt funktioniert kein Servicevertrag. *Daten sind der Enabler.*

### 4 · Fokus Schweiz — Servitization in der Schweiz (`fokus-schweiz`)
- **Klick:** 3–4 Pins live auf der Schweizer Karte öffnen statt alle 12 vorzulesen:
  - *Elite SA* (Aubonne, VD): *Pay-per-Night* ab ~CHF 0.50/Nacht; **Cashflow-Cue:** «Fish-Modell» (erst eigene Bilanz/CAPEX, später laufender Rückfluss).
  - *TRUMPF Schweiz* (Grüsch, GR): *Pay-per-Part*; **Off-Balance-Sheet-Cue:** *Munich Re* finanziert die Anlage als Risikopartner, *relayr* liefert die IoT-Daten.
  - *Burckhardt Compression* (Winterthur, ZH): *UP! Detect* erkennt ~90 % kritischer Anomalien über Hochfrequenz-Vibration + KI.
  - *PB Swiss Tools* (Wasen i.E., BE): NFC im *DigiTorque* zeigt, dass Servitization nicht erst bei Millionen-Anlagen beginnt.
- **Frage:** Wie überbrückt ein Schweizer KMU ohne Grossbank oder Rückversicherer im Rücken das Cashflow-Tal beim Wechsel auf *Pay-per-Use*?

### 5 · Service-Stufen — Servitization der Industrie (`service-stufen`)
- **Klick:** Erst Grundgrafik entlang *Services für das Produkt ↔ Services für den Kunden* erklären, dann `Beispiele einblenden` klicken und Deep Dive *Intermediate* & *Advanced* öffnen (zeigt jeweils den Unterschied zur Vorstufe: *Versprechen*, *Risiko*, *Daten*).
- **Kernbotschaft:** *Base* = Produkt & Teile (Risiko beim Kunden); *Intermediate* = Zustand aktiv halten (geteilte Verantwortung über Wartungsqualität); *Advanced* = garantierte Verfügbarkeit/Output (Betriebs- & Ausfallrisiko beim Anbieter/SPV).
- **Brücke:** **Brücke zum Tages-Case:** Mit jeder Stufe wandert mehr Risiko zum Anbieter – ab *Intermediate* werden verlässliche Sensorik (*Edge AI*) und Datenanalyse (*CRISP-DM*) entscheidend.
- **Frage:** Warum trifft ein fehlgeschlagener Sensor oder ein falsches ML-Modell bei *Advanced Services* direkt die eigene Erfolgsrechnung (P&L)?

## 10.15 – 10.35 | Pause

## 10.35 – 11.20 | Block 3 – Vom Cloud-Blindspot zu Edge AI (02 / Explanation)

### 6 · Cloud Blindspot — Why 1-Hour Cloud Telemetry Misses Early Faults (`cloud-blindspot`)
- **Kernbotschaft:** In klassischen Cloud-Datensätzen (z. B. 1h-Mittelwerte über `volt`, `rotate`, `pressure`, `vibration`) gehen kurze, hochfrequente Lagerschlag-Impulse komplett im Durchschnitt unter.
- **Vergleich:** Rohdaten mit 10 kHz rund um die Uhr von 100 Maschinen in die Cloud zu streamen scheitert meist an Bandbreite, Kosten und Shopfloor-IT-Security.

### 7 · Ebene 4 on Edge — Fleisch Smart Product Stack (Slide 45) (`ebene-4-on-edge`)
- **Kernbotschaft:** Wir verschieben *Ebene 4 («Analyse»)* des Smart Product Stacks direkt hinunter auf *Ebene 2 («Sensor / Aktor»)* – der Mikrocontroller rechnet lokal auf dem Gerät (*TinyML / Edge AI*) und sendet nur kompakte Zustands-Telemetrie.

### 8 · Zero-Backend Link — Three Live Data Sources & Lab (`zero-backend-link`)
- **Klick:** Kurz zeigen, dass die statische GitHub-Pages-App ohne Backend über *Web Serial* (USB), *Web Bluetooth* (`CAS-PdM-Twin`) und den eingebauten *Emulator* exakt dasselbe 10–12 Hz JSON-Format spricht.
- **Lab-Hinweis:** Im Lab darunter liegen die 5 physischen Sensor-Modalitäten und die `arduino-cli`-Referenz für Interessierte bereit.

## 11.20 – 12.15 | Block 4 – Live Hardware & Fault Injection (03 / Board & Data Viz)

### 9 · 5 Sensors on PCB — Physical Modalities (`5-sensors-on-pcb`)
- **Kernbotschaft:** Das `ABX00069`-Board bildet die 4 klassischen Telemetrie-Features ab und erweitert sie: `BMI270` (`vib`/`p2p`/`freq`/`gyro`), `BMM150` (`mag` als kontaktloser Strom-/Last-Proxy), `LPS22HB` (`press`), `HS3003` (`temp`/`hum`) und `MP34DT06JTR` (`snd` Akustik).

### 10 · Z-Score Fusion & 11 · Visual Triage (`z-score-fusion`, `visual-triage`)
- **Kernbotschaft:** Baseline-Kalibrierung (`'C'`) lernt μ, σ im Normalbetrieb; der Live-Score fusioniert die Auslenkungen in Z-Scores. Bewusste Visualisierung ohne irreführende Radar- oder Dual-Axis-Charts (ein gemeinsamer Zeitstrahl + geranktes |Z|-Lollipop-Diagramm + 5 Small Multiples).

### Live-Lab — Arduino Sensor Map & Streams (Board & Data Viz)
- **Klick:** Board via *USB Serial* oder *BLE* verbinden (alternativ Emulator nutzen), `'C'` für Baseline-Kalibrierung auslösen (blaue LED) und nacheinander 3 Fehlerbilder injizieren:
  1. *Rotor-Unwucht:* Binder-Clip am Lüfterblatt (oder rhythmisches Klopfen am Tisch 2–5 Hz) → `vib` & `p2p` springen sofort, RGB-LED wechselt auf Gelb/Rot.
  2. *Luftstrom-Blockade:* A5-Karton vor Ansauggitter (oder leicht über Sensor blasen) → `press` sinkt/fluktuiert, `snd` steigt, `mag` zieht an.
  3. *Loses Fundament:* Foam-Pad / Kippen → `gyro` und breitbandige Vibration schlagen aus.
- **Brücke:** Nach der Demo 60–90 Sekunden gemischte Daten aufzeichnen (*Record / Export CSV*) bzw. im CRISP-DM Lab das 80-Frame-Sample laden.

## 12.15 – 13.15 | Mittagspause

## 13.15 – 14.45 | Block 5 – CRISP-DM Phase 2: Data Understanding (04 / CRISP-DM Lab)

### 12 · 2.1 Data Quality — Collect & Verify Data Quality (`2-1-data-quality`)
- **Kernbotschaft:** Echte Sensordaten sind nie ideal: Sampling-Jitter (Δt), unkalibrierte Startphasen (`cal=0` vs. `cal=1`) und Messrauschen zuerst prüfen, bevor ein Modell trainiert wird.
- **Klick:** Python-Zelle `2.1` im Browser (`Pyodide`) ausführen (`Shift+Enter`) und die eigenen Live-/Sample-Frames als `df` inspizieren.

### 13 · 2.2 Scale Disparity — Why Raw Units Break Distance Metrics (`2-2-scale-disparity`)
- **Kernbotschaft:** `press` (~950–1013 hPa) überdeckt in Rohwerten eine riesige relative Änderung bei `vib` (0.02 → 0.25 g) um Faktor 1000 – ohne Standardisierung (Z-Scores / Scaling) ist jede Distanzmetrik (KNN, PCA, Isolation Forest) blind.
- **Klick:** Python-Zelle `2.2` ausführen und Roh-Standardabweichung direkt gegen Peak-Z-Scores vergleichen.

### 14 · 2.3 Transients & Corr — Multi-Sensor Signatures (`2-3-transients-corr`)
- **Kernbotschaft:** Der Edge-Peak (`p2p` über 32-pt-Fenster) schlägt den geglätteten Cloud-Mittelwert bei Stössen um Längen; die 7 × 7-Korrelationsmatrix zeigt physikalische Kopplungen (z. B. `vib` ↔ `p2p` ↔ `snd` vs. eigenständiger `press`-Drop).
- **Klick:** Python-Zelle `2.3` ausführen und Studierende die Unterschiede je Fehlerklasse interpretieren lassen.

## 14.45 – 15.05 | Pause

## 15.05 – 16.45 | Block 6 – Vertiefung & Case-Arbeit (Google Colab)
- **Klick:** CSV aus dem Dashboard exportieren oder direkt ins Notebook `CAS_Day4_Predictive_Maintenance_2026.ipynb` in Google Colab wechseln.
- **Kernpunkte:**
  - *Unsupervised vs. Supervised:* Wann genügen Anomalie-Scores (wenige/keine gelabelten Ausfälle im Feld) und wann braucht es Klassifikation?
  - *Explainable AI (SHAP):* Warum Servicetechniker und P&L-Verantwortliche wissen müssen, *welcher* Sensor einen Alarm ausgelöst hat.
  - *CHF Service Cost Matrix:* False Positives (unnötige Anfahrt CHF) gegen False Negatives (ungeplanter Maschinenstillstand / SLA-Pönale) abwägen – **der direkte Kreis zurück zu Slide 5 (*Advanced Services*)**.
- **Abschluss & Wrap-up:** Transfer auf eigene Industrie-Cases der Teilnehmenden und Ausblick.
