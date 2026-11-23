# Lecturer Speaker Notes (`lecturer/`)

Dozentenseitiges Regieblatt und A4-/Tablet-Handout für **Tag 4: CAS Smart Service Engineering**. Da GitHub Pages ausschliesslich `./docs` veröffentlicht, erscheint dieser Ordner **nicht** auf der Studierenden-Website.

## Workflow (2 Schritte)

1. **Inhalte pflegen:** `lecturer/speaker-notes.md` bearbeiten (Kopf-Metadaten, `Tagesziele`, Blöcke unter `## Zeit | Titel`, Slide-Hinweise unter `### Slide (\`slug\`)`, Cues wie `**Klick:**`, `**Kernbotschaft:**`, `**Brücke:**`, `**Frage:**`).
2. **HTML neu erzeugen & prüfen:**
   ```powershell
   python lecturer/build_notes.py
   python lecturer/build_notes.py --check
   ```
   `--check` stellt sicher, dass alle Slides in `docs/index.html` über ihren Slug in `lecturer/speaker-notes.md` abgedeckt sind und `lecturer/speaker-notes.html` aktuell ist (wird auch automatisch vor `git push` ausgeführt).
3. **Tablet oder Druck (A4):** `lecturer/speaker-notes.html` direkt im Browser öffnen (funktioniert komplett offline).
   - **Notizspalte** einblenden, falls Platz für handschriftliche Notizen auf dem Tablet/Papier gewünscht ist.
   - **Schriftgrösse: Kompakt / Tablet** umschalten.
   - Über **Drucken / PDF (A4)** (`Ctrl+P`) direkt auf Papier drucken oder als PDF für GoodNotes / Notability exportieren.
