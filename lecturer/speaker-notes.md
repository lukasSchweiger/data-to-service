Titel: Tag 4: CAS Smart Service Engineering – Modul A: Data-Specific Service Design
Untertitel: Lukas Schweiger Ph.D. · ZHAW School of Engineering · BI Case Manufacturing
Datum: [Datum eintragen]
Zeit: 09.00 – 14.15 Uhr
Ort: Winterthur / Zürich
Themenbereich: BI Case Manufacturing: Servitization, CRISP-DM / CRISP-ML(Q), Live-Sensorik & Predictive Maintenance
Kursleitung: Lukas Schweiger Ph.D.
Kennen: Servitization-Stufen (Base / Intermediate / Advanced nach Baines & Lightfoot), Smart Product Stack (Ebene 1–5), CRISP-DM & CRISP-ML(Q), Edge-AI-Sensorik
Verstehen: Warum Risikotransfer verlässliche Daten verlangt, weshalb 1h-Cloud-Mittelwerte Stösse verpassen, wie Rolling Windows / Labeling / chronologische Splits & CHF-Servicekosten (P&L) das ML-Modell prägen
Anwenden: Live-Sensordaten am Lüfter-Teststand erfassen & kalibrieren (Arduino Nano 33 BLE Sense Rev2 / Emulator), Predictive-Maintenance-Pipeline im Browser (Pyodide + scikit-learn) auf der 100-Maschinen-Flotte evaluieren
Material: GitHub Pages Live-Plattform · Arduino Nano 33 BLE Sense Rev2 (ABX00069) + Micro-USB-Datenkabel · Deltaco FT-532 Lüfter + Binder-Clip & A5-Karton (oder Benchtop-Props: Magnet/Smartphone, Foam-Pad) · Speaker Notes (Tablet / A4) · Optional: Take-Home Google Colab Backup

---

## 09.00 – 09.10 | Block 0 – Begrüssung, Agenda & Tagesziele (00 / Einstieg)

### 1 · Vorstellung — Lukas Schweiger Ph.D. (`vorstellung`)
- **Klick:** Live-Plattform in Chrome/Edge öffnen (`P` schaltet in den Präsentationsmodus) und kurz der Linie *Vom Stahl zu den Daten* folgen:
  1. *Physische Technik:* Konstrukteur EFZ (Lehre bei Rheinmetall Air Defence) → BSc & Praktikum bei Bircher Reglomat AG (Sensorik & Automatisierung).
  2. *Industrie & Service:* Burckhardt Compression im letzten BSc-Semester sowie zwischen Bachelor und Master (Kompressoren & Service, wenn Stillstand Millionen kostet) → MSc & Migros-Genossenschafts-Bund während des Masters (Technik trifft Business/P&L).
  3. *Daten & Smart Services:* Ph.D. Smart Industry & ZHAW (Digital Twins) → Roche Diagnostics (regulierte MedTech-Praxis).
- **Kernbotschaft:** Der eigene Werdegang spiegelt exakt den Tagesbogen: physische Maschine → Service-Geschäftsmodell → datenbasierte Entscheidungen (abgerundet über die 4 persönlichen Fotos).
- **Brücke:** Kurze Vorstellungsrunde bzw. Erwartungsabfrage im Plenum, bevor der Blick auf Tagesagenda und Lernziele geht.

### 2 · Agenda — Tagesagenda (09.00 – 14.15 Uhr) (`agenda`)
- **Klick:** Auf den zeitlichen Ablauf (`09.00 – 14.15`) und die fünf 45-Minuten-Blöcke inkl. Pausen verweisen.
- **Kernbotschaft:** Roter Faden des Halbtages: Zuerst *Warum* (Servitization & Risikoshift), dann *Business Case bei 0 Daten* (Schweizer Ventilatoren-KMU), anschliessend *Live-Sensorik* am Lüfter-Teststand und danach *Zeitsprung +12 Monate* auf eine 100-Maschinen-Flotte bis hin zu CHF-Servicekosten und Digital Twin.

### 3 · Tagesziele — Kennen, Verstehen & Anwenden (`tagesziele`)
- **Klick:** Die drei Lernziele (*Kennen*, *Verstehen*, *Anwenden*) kurz durchgehen.
- **Kernbotschaft:** Am Ende des Tages verbinden die Teilnehmenden Geschäftsmodell (*Servitization*), Hardware-Physik (*Arduino / Edge*) und Python-ML-Evaluation (*CHF Service Cost Matrix*) zu einem durchgängigen Bild.
- **Brücke:** Kurzer Hinweis für Studierende, dass alle interaktiven Werkzeuge direkt im Browser laufen — ohne eigene Installation oder Cloud-Login.

## 09.10 – 09.55 | Block 1 – Einführung: Servitization (01 / Servitization)

### 4 · Was? — Was ist Servitization? (`was-ist-servitization`)
- **Kernbotschaft:** Vom einmaligen Produktverkauf (*Wir verkaufen Produkte*) zur laufenden Leistungserbringung (*Wir verkaufen Leistung*).
- **Klick:** Schrittweise *Added Value → Servitization → Total Shift* erklären; klarstellen, dass klassischer After-Sales erst der Anfang ist.

### 5 · Wieso? — Warum setzen Hersteller auf Servitization? (`warum-servitization`)
- **Kernbotschaft:** Vier Treiber greifen ineinander: Wirtschaftlich (höhere Marge, planbare Erlöse), Technologisch (IoT/Edge als Enabler), Wissen (Zugang zu Felddaten) und Markt/Ökologie (Kundenbindung & Kreislaufwirtschaft).
- **Frage:** Welcher der vier Treiber ist in Ihrem eigenen Unternehmen aktuell der stärkste Auslöser – und welcher bremst am meisten?

### 6 · Praxisbeispiele — Wie sieht Servitization in der Praxis aus? (`praxisbeispiele`)
- **Klick:** *Rolls-Royce* (*Power-by-the-Hour*, kein Eigentumswechsel, aber Engine Health Monitoring), *Xerox 914* (Pay-per-Copy schon 1959 ab Tag 1 als Markteintritt), *Hilti* (fixe Monatsrate statt Pay-per-Use) oder *Philips* (*Pay-per-Lux* / Schiphol).
- **Kernbotschaft:** Egal ob Flugzeugtriebwerk oder Lampe – ohne verlässliche *Messung* der Leistung am Produkt funktioniert kein Servicevertrag. *Daten sind der Enabler.*

### 7 · Fokus Schweiz — Servitization in der Schweiz (`fokus-schweiz`)
- **Klick:** 3–4 Pins live auf der Schweizer Karte öffnen statt alle 12 vorzulesen:
  - *Elite SA* (Aubonne, VD): *Pay-per-Night* ab ~CHF 0.50/Nacht; **Cashflow-Cue:** «Fish-Modell» (erst eigene Bilanz/CAPEX, später laufender Rückfluss).
  - *TRUMPF Schweiz* (Grüsch, GR): *Pay-per-Part*; **Off-Balance-Sheet-Cue:** *Munich Re* finanziert die Anlage als Risikopartner, *relayr* liefert die IoT-Daten.
  - *Burckhardt Compression* (Winterthur, ZH): *UP! Detect* erkennt ~90 % kritischer Anomalien über Hochfrequenz-Vibration + KI.
  - *PB Swiss Tools* (Wasen i.E., BE): NFC im *DigiTorque* zeigt, dass Servitization nicht erst bei Millionen-Anlagen beginnt.
- **Frage:** Wie überbrückt ein Schweizer KMU ohne Grossbank oder Rückversicherer im Rücken das Cashflow-Tal beim Wechsel auf *Pay-per-Use*?

### 8 · Service-Stufen — Servitization der Industrie (`service-stufen`)
- **Klick:** Erst Grundgrafik entlang *Services für das Produkt ↔ Services für den Kunden* erklären, dann `Beispiele einblenden` klicken und Deep Dive *Intermediate* & *Advanced* öffnen (zeigt jeweils den Unterschied zur Vorstufe: *Versprechen*, *Risiko*, *Daten*).
- **Kernbotschaft:** *Base* = Produkt & Teile (Risiko beim Kunden); *Intermediate* = Zustand aktiv halten (geteilte Verantwortung über Wartungsqualität); *Advanced* = garantierte Verfügbarkeit/Output (Betriebs- & Ausfallrisiko beim Anbieter/SPV).
- **Brücke:** **Brücke zum Tages-Case:** Mit jeder Stufe wandert mehr Risiko zum Anbieter – ab *Intermediate* werden verlässliche Sensorik (*Edge AI*) und Datenanalyse (*CRISP-DM*) entscheidend.
- **Frage:** Warum trifft ein fehlgeschlagener Sensor oder ein falsches ML-Modell bei *Advanced Services* direkt die eigene Erfolgsrechnung (P&L)?

## 09.55 – 10.05 | Pause

## 10.05 – 10.50 | Block 2 – Datennutzung im Industriellen Service & Business Understanding (02 / Datennutzung & Business)

### 9 · CRISP-DM & ML(Q) — Struktur-Backbone für den Datenprozess (`crisp-dm-ml-q`)
- **Klick:** Den interaktiven 6-Phasen-CRISP-DM-Zyklus durchgehen und kurz die Erweiterung durch CRISP-ML(Q) (Quality Gates je Phase + Monitoring/Drift nach Deployment) aufzeigen.
- **Kernbotschaft:** CRISP-DM bleibt der gemeinsame Standard für Projektstruktur; für laufende Industrieservices braucht es zusätzlich Quality Gates und Drift-Überwachung gemäss CRISP-ML(Q).

### 10 · Business Case — Schweizer Industrie-Ventilatoren-KMU (`business-case`)
- **Kernbotschaft:** Wir starten bewusst bei **0 Daten**: Ein Schweizer Ventilatoren-KMU will von reinem Anlagenverkauf (*Base*) auf garantierte Verfügbarkeit (*Intermediate/Advanced*) wechseln — zuerst im 1-Geräte-Pilot am Lüfter-Teststand, dann nach +12 Monaten auf 100 vernetzten Feldmaschinen.
- **Brücke:** Jeder Fehler, den wir heute vormittag am physischen Lüfter auslösen, taucht am Nachmittag im Flotten-Datensatz wieder auf.

### 11 · Stakeholder — Perspektiven & Zielkonflikte (`stakeholder`)
- **Klick:** Die vier Perspektiven (Geschäftsleitung, Serviceleitung, Technik/F&E, Industriekunde) kurz einblenden.
- **Frage:** Welche Metrik zählt für die Serviceleitung (First-Time-Fix, Einsatzplanung) gegenüber der Geschäftsleitung (P&L-Marge) – und wo widersprechen sie sich?

### 12 · Wartung — Maintenance Strategien (`wartung`)
- **Kernbotschaft:** Einordnung von *Reactive*, *Preventive (Age-based)*, *Condition-based* und *Predictive Maintenance* (sowie *Opportunistic* / nicht-ideale Wartung).
- **Brücke:** Ab *Intermediate/Advanced Service* genügt kein starres Zeitintervall mehr – der Wechsel auf Condition/Predictive entscheidet über Kosten und Marge.

## 10.50 – 11.00 | Pause

## 11.00 – 11.45 | Block 3 – Data Understanding: Live-Sensorik → Flotte (03 / Data Understanding)

### 13 · Datenerhebung — Smart Product Stack & Cloud-1h-Blindspot (`datenerhebung`)
- **Kernbotschaft:** Vor dem Sammeln klären: Welche Signale, welche Speicherfrequenz, welche Qualitätsrisiken? Nach Fleisch (Ebene 1–5) rückt die Analyse (*Ebene 4*) nahe an den Sensor, weil 1h-Cloud-Mittelwerte kurze Stösse auswaschen und 10-kHz-Rohdaten-Streaming an Bandbreite/Shopfloor-IT scheitert.

### 14 · Pilot-Sensorik — 5 Sensoren & 4 Lüfter-Fehlerbilder (`pilot-sensorik`)
- **Kernbotschaft:** Das `ABX00069`-Board misst Vibration/Rotation (`BMI270`), Magnetfluss (`BMM150`), Luftdruck (`LPS22HB`), Temperatur/Feuchte (`HS3003`) und Akustik (`MP34DT06JTR`) und bildet damit Unwucht, Luftstrom-Blockade, loses Fundament und thermische Überlast direkt ab.

### 15 · Flotten-Zeitsprung — +12 Monate: 100-Maschinen-Flotte (`flotten-zeitsprung`)
- **Kernbotschaft:** Zeitsprung nach erfolgreichem Pilot: 100 Ventilatoren liefern über Monate strukturierte Multi-Table-Daten (`telemetry`, `machines`, `errors`, `maintenance`, `failures`) mit exakt derselben Sensorik — inklusive Skalenunterschieden (950 hPa vs. 0.0006 g) und seltenen Ausfall-Labels.

### Live-Lab — Arduino & Emulator Sensor-Cockpit (Data Understanding)
- **Klick:** Board via *USB Serial* oder *BLE* verbinden (alternativ *Virtual Emulator* nutzen), `'C'` für Baseline-Kalibrierung auslösen (blaue LED) und Fehlerbilder live testen (Unwucht / Klopfen, Luftstrom-Blockade / Blasen, Magnet/Last-Proxy), optional als CSV exportieren.
- **Brücke:** Mit den aufgezeichneten Live-Frames im Rücken wechseln wir in die strukturierte Datenvorbereitung und Modellierung auf der 100-Maschinen-Flotte.

## 11.45 – 11.55 | Pause

## 11.55 – 12.40 | Block 4 – Data Preparation & Modeling (04 / Data Prep & Modeling)

### 16 · Time Windows — Rolling vs. Tumbling Windows (`time-windows`)
- **Klick:** Im künftigen Widget Rolling vs. Tumbling animieren und zeigen, warum Streuungs- und Formmasse (*Range*, *Std Dev*, *Kurtosis*) mechanische Stösse besser erfassen als der blosse Mittelwert.
- **Kernbotschaft:** Einzelne Messpunkte zeigen keine Dynamik; Zeitfenster und Lag-Features übersetzen Physik in ML-Merkmale.

### 17 · Labeling — Labeling Strategy der Zielvariable (`labeling`)
- **Klick:** Die vier Modi vergleichen: Binary (Vorwarnfenster X), Multiclass (Fehlerarten P1–P3), RUL (Restlebensdauer Y) und Time-Buckets (Z).
- **Kernbotschaft:** Ein Label exakt im Moment des Ausfalls nützt der Serviceplanung nichts – das Vorwarnfenster muss zur Reaktionszeit des Serviceteams passen.

### 18 · Train/Test Split — Zeitreihen-Split & Data Leakage (`train-test-split`)
- **Klick:** *Random Split* (Leakage-Warnung) gegen *Chronological Split + Purged Gap* umschalten.
- **Kernbotschaft:** Zufälliges Mischen lässt Rolling-Window-Features aus der Zukunft in das Training leaken; ein chronologischer Split mit Sicherheitslücke ist ein zentrales CRISP-ML(Q)-Quality-Gate.

### 19 · ML-Methoden — Überblick & Bagging vs. Boosting (`ml-methoden`)
- **Klick:** Nach kurzem Überblick (*Supervised* vs. *Unsupervised*) im Trainer den Unterschied zwischen parallelem Bootstrap-Voting (*Random Forest / Bagging*, senkt Varianz) und sequentiellem Fehler-Nachlernen (*Gradient Boosting*, senkt Bias) Schritt für Schritt zeigen.

### Live-Lab — In-Browser Python Lab (Data Prep & Modeling)
- **Klick:** Studierende führen die Python-Zellen direkt im Browser (`Pyodide`) aus (aktuell Live-`df`-Verifikation, im Ausbau auf 100-Maschinen-Flotte + `scikit-learn` Vergleich von Decision Tree, Random Forest und Gradient Boosting; Take-Home-Colab als Backup).

## 12.40 – 13.30 | Mittagspause

## 13.30 – 14.15 | Block 5 – Evaluation, Service-Ökonomie & Deployment (05 / Evaluation & Deployment)

### 20 · Confusion Matrix — Context Matters (`confusion-matrix`)
- **Klick:** Zwischen *Predictive Maintenance* (Fokus *Recall*), *Cancer Screening*, *Spam Filtering* (Fokus *Precision*) und *Fraud* wechseln und live Werte in TP/FN/FP/TN anpassen.
- **Kernbotschaft:** Bei seltenen Maschinenausfällen ist reine Accuracy wertlos; der Geschäftskontext bestimmt, ob *Recall* oder *Precision* Priorität hat.

### 21 · Service-Ökonomie — Von Metriken zu CHF (`service-oekonomie`)
- **Klick:** FP-Anfahrtskosten (z. B. CHF 450) gegen FN-Stillstand / SLA-Pönale (z. B. CHF 8'500) abwägen und optimalen Klassifikations-Schwellwert diskutieren.
- **Brücke:** **Direkter Kreis zurück zu Slide 8 (*Service-Stufen*):** Bei *Advanced Services* treffen False Negatives direkt die eigene P&L.

### 22 · Deployment & Twin — Digital Twin & CRISP-ML(Q) Monitoring (`deployment-twin`)
- **Kernbotschaft:** Der *Digital Twin* im After-Sales verbindet physische Maschine, Datenlink und Service-Entscheidung. Nach dem Go-Live schliessen CRISP-ML(Q)-Monitoring (Data/Concept Drift durch Saison oder geänderte Lasten) und Retraining den Kreis zurück zum Service-Geschäftsmodell.
- **Abschluss & Wrap-up:** Rückblick auf die drei Tagesziele (*Kennen · Verstehen · Anwenden*) und Transferfrage auf die eigenen Industrie-Cases der Teilnehmenden.
