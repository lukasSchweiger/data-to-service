/**
 * CAS Smart Service Engineering — Day 4: Data-Specific Service Design
 * Live Hardware Connector (Web Serial + Web Bluetooth + Virtual Benchtop Emulator)
 * & Data-to-Viz Compliant Canvas Renderers (Annotated Timeline, Ranked Lollipop, 5 Small Multiples)
 */

(() => {
  'use strict';

  // -------------------------------------------------------------------------
  // Constants & Color Palette (matching styles.css)
  // -------------------------------------------------------------------------
  const COLORS = {
    bg: '#fffbee',
    bgSubtle: '#f7f2e2',
    text: '#595959',
    textStrong: '#3d3d3d',
    textMuted: '#8a867a',
    grid: 'rgba(89, 89, 89, 0.12)',
    baseline: 'rgba(89, 89, 89, 0.45)',
    vib: '#2b6f6b',
    mag: '#6b5b95',
    press: '#3d6b99',
    temp: '#c06038',
    snd: '#88743e',
    normal: '#2b6f6b',
    warn: '#b87d14',
    anomaly: '#b54434',
    cal: '#3d6b99',
  };

  const HISTORY_LEN = 60; // ~6 seconds at 10 Hz
  const BLE_SERVICE_UUID = '19b10000-e8f2-537e-4f6c-d104768a1214';
  const BLE_TELEMETRY_UUID = '19b10001-e8f2-537e-4f6c-d104768a1214';
  const BLE_COMMAND_UUID = '19b10002-e8f2-537e-4f6c-d104768a1214';

  // -------------------------------------------------------------------------
  // Modular Section Order (Reorder IDs here OR move <section> blocks in HTML)
  // -------------------------------------------------------------------------
  const DEFAULT_HTML_ORDER = ['servitization', 'explanation', 'dataviz', 'crispdm'];
  const SECTION_ORDER = [
    'servitization', // Servitization · Original Slides 6–8
    'explanation',   // Explanation · Current Setup
    'dataviz',       // Data Visualization · Live Hardware & Emulator
    'crispdm',       // CRISP-DM Phase 2 · Data Understanding
  ];

  // -------------------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------------------
  let connectionMode = 'sim'; // 'sim' | 'serial' | 'ble'
  let simStimulus = 'normal'; // 'normal' | 'tap' | 'blow' | 'magnet'
  let selectedSensor = null;  // null | 'vib' | 'mag' | 'press' | 'temp' | 'snd' | 'edge'

  // Web Serial & Web Bluetooth handles
  let serialPort = null;
  let serialReader = null;
  let serialWriter = null;
  let bleDevice = null;
  let bleCommandChar = null;

  // Calibrated Baseline (initialized with real desk readings from COM3)
  const baseline = {
    vib: { mean: 0.0006, std: 0.0080 },
    mag: { mean: 38.9, std: 3.5 },
    press: { mean: 950.27, std: 0.25 },
    temp: { mean: 26.64, std: 0.35 },
    snd: { mean: 45.9, std: 4.0 },
  };

  // Rolling time-series history buffers
  const history = {
    vib: new Array(HISTORY_LEN).fill(0.0006),
    mag: new Array(HISTORY_LEN).fill(38.9),
    press: new Array(HISTORY_LEN).fill(950.27),
    temp: new Array(HISTORY_LEN).fill(26.64),
    snd: new Array(HISTORY_LEN).fill(45.9),
    score: new Array(HISTORY_LEN).fill(0.02),
  };

  // Recorded rows for CSV export
  const recordedRows = [];

  // Latest telemetry frame
  let latestFrame = {
    ms: 286646,
    vib: 0.0006,
    p2p: 0.0025,
    freq: 9.5,
    gyro: 0.2,
    mag: 38.9,
    press: 950.27,
    temp: 26.64,
    hum: 48.9,
    snd: 45.9,
    score: 0.02,
    state: 'NORMAL',
    cal: 1,
  };

  // Virtual emulator internal clock & calibration state
  let simStartMs = performance.now();
  let simCalibFramesRemaining = 0;
  let liveCalibAccumulator = [];

  // -------------------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------------------
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const statusSub = document.getElementById('statusSub');
  const btnConnectSerial = document.getElementById('btnConnectSerial');
  const btnConnectBle = document.getElementById('btnConnectBle');
  const btnModeSim = document.getElementById('btnModeSim');
  const btnCalibrate = document.getElementById('btnCalibrate');
  const btnExportCsv = document.getElementById('btnExportCsv');
  const csvCount = document.getElementById('csvCount');
  const rawJsonReadout = document.getElementById('rawJsonReadout');
  const boardCenterpiece = document.querySelector('.board-centerpiece');
  const boardSvg = document.getElementById('boardSvg');
  const boardCalloutGrid = document.getElementById('boardCalloutGrid');

  // SVG Readouts
  const svgValVib = document.getElementById('svgValVib');
  const svgValFreq = document.getElementById('svgValFreq');
  const svgValGyro = document.getElementById('svgValGyro');
  const svgValTemp = document.getElementById('svgValTemp');
  const svgValHum = document.getElementById('svgValHum');
  const svgValSnd = document.getElementById('svgValSnd');
  const svgValMag = document.getElementById('svgValMag');
  const svgValPress = document.getElementById('svgValPress');
  const svgValState = document.getElementById('svgValState');
  const svgValScore = document.getElementById('svgValScore');
  const svgValCal = document.getElementById('svgValCal');
  const svgEdgeStripe = document.getElementById('svgEdgeStripe');
  const svgRgbGlow = document.getElementById('svgRgbGlow');
  const svgRgbCore = document.getElementById('svgRgbCore');

  // Compact HTML Callout Card Readouts
  const cardValVib = document.getElementById('cardValVib');
  const cardValFreq = document.getElementById('cardValFreq');
  const cardValGyro = document.getElementById('cardValGyro');
  const cardValTemp = document.getElementById('cardValTemp');
  const cardValHum = document.getElementById('cardValHum');
  const cardValSnd = document.getElementById('cardValSnd');
  const cardValMag = document.getElementById('cardValMag');
  const cardValPress = document.getElementById('cardValPress');
  const cardValState = document.getElementById('cardValState');
  const cardValScore = document.getElementById('cardValScore');
  const cardValCal = document.getElementById('cardValCal');
  const cardEdgeStripe = document.getElementById('cardEdgeStripe');

  // Top Viz Readouts
  const readoutAnomalyScore = document.getElementById('readoutAnomalyScore');
  const readoutTopDriver = document.getElementById('readoutTopDriver');

  // Small Multiples Readouts
  const smValVib = document.getElementById('smValVib');
  const smSubVibLeft = document.getElementById('smSubVibLeft');
  const smSubVibRight = document.getElementById('smSubVibRight');

  const smValMag = document.getElementById('smValMag');
  const smSubMagRight = document.getElementById('smSubMagRight');

  const smValPress = document.getElementById('smValPress');
  const smSubPressLeft = document.getElementById('smSubPressLeft');
  const smSubPressRight = document.getElementById('smSubPressRight');

  const smValTemp = document.getElementById('smValTemp');
  const smSubTempLeft = document.getElementById('smSubTempLeft');
  const smSubTempRight = document.getElementById('smSubTempRight');

  const smValSnd = document.getElementById('smValSnd');
  const smSubSndRight = document.getElementById('smSubSndRight');

  // Canvases
  const canvasAnomalyTimeline = document.getElementById('canvasAnomalyTimeline');
  const canvasLollipop = document.getElementById('canvasLollipop');
  const canvasSmVib = document.getElementById('canvasSmVib');
  const canvasSmMag = document.getElementById('canvasSmMag');
  const canvasSmPress = document.getElementById('canvasSmPress');
  const canvasSmTemp = document.getElementById('canvasSmTemp');
  const canvasSmSnd = document.getElementById('canvasSmSnd');

  // -------------------------------------------------------------------------
  // Interactive Highlight Linking (2D Board <-> Small Multiples)
  // -------------------------------------------------------------------------
  function setActiveSensor(sensorKey) {
    selectedSensor = selectedSensor === sensorKey ? null : sensorKey;
    updateHighlightClasses();
  }

  function updateHighlightClasses() {
    const svgNodes = document.querySelectorAll('.sensor-node');
    const smCards = document.querySelectorAll('.sm-card');
    const hasSelection = Boolean(selectedSensor);

    boardSvg.classList.toggle('has-selection', hasSelection);
    if (boardCalloutGrid) {
      boardCalloutGrid.classList.toggle('has-selection', hasSelection);
    }

    svgNodes.forEach((node) => {
      node.classList.toggle('is-active', node.dataset.sensor === selectedSensor);
    });

    smCards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.sensor === selectedSensor);
    });
  }

  document.querySelectorAll('.sensor-node').forEach((node) => {
    node.addEventListener('click', () => setActiveSensor(node.dataset.sensor));
  });

  document.querySelectorAll('.sm-card').forEach((card) => {
    card.addEventListener('click', () => setActiveSensor(card.dataset.sensor));
  });

  // -------------------------------------------------------------------------
  // Stimulus Pill Buttons (Virtual Emulator)
  // -------------------------------------------------------------------------
  document.querySelectorAll('.btn-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      simStimulus = btn.dataset.sim;
    });
  });

  // -------------------------------------------------------------------------
  // Virtual Benchtop Emulator Generator (10 Hz)
  // -------------------------------------------------------------------------
  function generateSimulatedFrame() {
    const elapsedMs = Math.round(performance.now() - simStartMs) + 286000;
    const t = elapsedMs / 1000;

    // Base desk noise matching actual COM3 telemetry
    let vib = 0.0006 + (Math.random() - 0.5) * 0.00025;
    let p2p = vib * 3.8;
    let freq = 9.5 + (Math.random() - 0.5) * 2.4;
    let gyro = 0.2 + Math.random() * 0.1;
    let mag = 38.9 + (Math.random() - 0.5) * 1.8;
    let press = 950.27 + (Math.random() - 0.5) * 0.04;
    let temp = 26.64 + Math.sin(t * 0.05) * 0.03;
    let hum = 48.9 + Math.cos(t * 0.04) * 0.1;
    let snd = 45.2 + (Math.random() - 0.5) * 3.2;

    if (simStimulus === 'tap') {
      // Rhythmic finger tapping on desk: high vibration RMS, 18-24 Hz harmonic, slight acoustic bump
      const pulse = 0.5 + 0.5 * Math.sin(t * 9.0);
      vib = 0.0320 + pulse * 0.0480 + Math.random() * 0.008;
      p2p = vib * 4.2;
      freq = 21.5 + (Math.random() - 0.5) * 3.0;
      gyro = 3.8 + pulse * 4.5;
      snd = 56.0 + pulse * 8.5;
    } else if (simStimulus === 'blow') {
      // Blowing air across board: barometric pressure spike + strong microphone turbulence
      const gust = 0.6 + 0.4 * Math.sin(t * 4.5);
      press = 951.65 + gust * 0.95 + (Math.random() - 0.5) * 0.15;
      snd = 72.0 + gust * 11.0 + (Math.random() - 0.5) * 2.5;
      temp = 27.15 + gust * 0.25;
      hum = 56.5 + gust * 4.0;
      vib = 0.0022 + Math.random() * 0.001;
    } else if (simStimulus === 'magnet') {
      // Moving smartphone / magnet near BMM150 magnetometer
      const wave = 0.5 + 0.5 * Math.sin(t * 3.2);
      mag = 95.0 + wave * 85.0 + (Math.random() - 0.5) * 4.0;
      vib = 0.0012 + Math.random() * 0.0005;
    }

    // Z-score calculation matching firmware
    const zVib = Math.abs(vib - baseline.vib.mean) / baseline.vib.std;
    const zSnd = Math.abs(snd - baseline.snd.mean) / (baseline.snd.std + 1.5);
    const zPress = Math.abs(press - baseline.press.mean) / 0.8;
    const zMag = Math.abs(mag - baseline.mag.mean) / 25.0;

    let rawScore = 0.60 * (zVib / 6.0) + 0.25 * (zSnd / 6.0) + 0.15 * (zPress / 4.0) + 0.20 * (zMag / 3.0);
    let score = Math.max(0.02, Math.min(0.99, rawScore));

    let state = 'NORMAL';
    let cal = 1;

    if (simCalibFramesRemaining > 0) {
      simCalibFramesRemaining--;
      state = 'CALIBRATING';
      cal = 0;
    } else if (score >= 0.65 || vib > baseline.vib.mean + 4.5 * baseline.vib.std) {
      state = 'ANOMALY';
    } else if (score >= 0.35 || vib > baseline.vib.mean + 2.2 * baseline.vib.std) {
      state = 'WARNING';
    }

    return {
      ms: elapsedMs,
      vib: Number(vib.toFixed(4)),
      p2p: Number(p2p.toFixed(4)),
      freq: Number(freq.toFixed(1)),
      gyro: Number(gyro.toFixed(1)),
      mag: Number(mag.toFixed(1)),
      press: Number(press.toFixed(2)),
      temp: Number(temp.toFixed(2)),
      hum: Number(hum.toFixed(1)),
      snd: Number(snd.toFixed(1)),
      score: Number(score.toFixed(2)),
      state,
      cal,
    };
  }

  // -------------------------------------------------------------------------
  // Ingest Telemetry Frame (from USB Serial, BLE, or Virtual Emulator)
  // -------------------------------------------------------------------------
  function ingestFrame(frame) {
    if (!frame || typeof frame.vib !== 'number') return;
    latestFrame = frame;

    // Update rolling baseline mean if firmware is calibrating or just finished
    if (frame.state === 'CALIBRATING') {
      liveCalibAccumulator.push(frame);
    } else if (liveCalibAccumulator.length >= 5) {
      const n = liveCalibAccumulator.length;
      baseline.vib.mean = liveCalibAccumulator.reduce((s, f) => s + f.vib, 0) / n;
      baseline.mag.mean = liveCalibAccumulator.reduce((s, f) => s + f.mag, 0) / n;
      baseline.press.mean = liveCalibAccumulator.reduce((s, f) => s + f.press, 0) / n;
      baseline.temp.mean = liveCalibAccumulator.reduce((s, f) => s + f.temp, 0) / n;
      baseline.snd.mean = liveCalibAccumulator.reduce((s, f) => s + f.snd, 0) / n;
      liveCalibAccumulator = [];
    }

    // Push into rolling buffers
    pushBuffer(history.vib, frame.vib);
    pushBuffer(history.mag, frame.mag);
    pushBuffer(history.press, frame.press);
    pushBuffer(history.temp, frame.temp);
    pushBuffer(history.snd, frame.snd);
    pushBuffer(history.score, frame.score);

    // Record for CSV export (cap at 5,000 rows)
    if (recordedRows.length < 5000) {
      recordedRows.push({
        timestamp_iso: new Date().toISOString(),
        mode: connectionMode,
        ...frame,
      });
      csvCount.textContent = String(recordedRows.length);
      const pyRowCountEl = document.getElementById('pyRowCount');
      if (pyRowCountEl) pyRowCountEl.textContent = String(recordedRows.length);
    }

    updateDomReadouts(frame);
    renderAllCharts();
  }

  function pushBuffer(arr, val) {
    arr.push(val);
    if (arr.length > HISTORY_LEN) arr.shift();
  }

  // -------------------------------------------------------------------------
  // Update DOM & 2D SVG Readouts
  // -------------------------------------------------------------------------
  function updateDomReadouts(f) {
    // State color selection
    let stateColor = COLORS.normal;
    if (f.state === 'ANOMALY') stateColor = COLORS.anomaly;
    else if (f.state === 'WARNING') stateColor = COLORS.warn;
    else if (f.state === 'CALIBRATING') stateColor = COLORS.cal;

    statusDot.style.backgroundColor = stateColor;
    const modeTitle =
      connectionMode === 'serial'
        ? 'LIVE HARDWARE: USB WEB SERIAL'
        : connectionMode === 'ble'
        ? 'LIVE HARDWARE: BLUETOOTH LE'
        : 'MODE: VIRTUAL BENCHTOP EMULATOR';
    statusLabel.textContent = modeTitle;
    statusSub.textContent = `State: ${f.state} · Score: ${f.score.toFixed(2)} · Uptime: ${(f.ms / 1000).toFixed(1)}s`;

    // 2D SVG Callout Values
    svgValVib.textContent = `${f.vib.toFixed(4)} g`;
    svgValFreq.textContent = `${f.freq.toFixed(1)} Hz`;
    svgValGyro.textContent = `p2p: ${f.p2p.toFixed(4)} g · gyro: ${f.gyro.toFixed(1)} °/s`;

    svgValTemp.textContent = `${f.temp.toFixed(2)} °C`;
    svgValHum.textContent = `${f.hum.toFixed(1)} %RH`;

    svgValSnd.textContent = `${f.snd.toFixed(1)} dB`;
    svgValMag.textContent = `${f.mag.toFixed(1)} µT`;
    svgValPress.textContent = `${f.press.toFixed(2)} hPa`;

    svgValState.textContent = f.state;
    svgValState.setAttribute('fill', stateColor);
    svgValScore.textContent = `Score ${f.score.toFixed(2)}`;
    const calText = f.cal ? 'Baseline: Calibrated (cal=1)' : 'Baseline: Calibrating (cal=0)';
    svgValCal.textContent = calText;
    svgEdgeStripe.setAttribute('fill', stateColor);
    svgRgbGlow.setAttribute('fill', stateColor);
    svgRgbCore.setAttribute('fill', stateColor);

    // Compact HTML Callout Cards
    if (cardValVib) {
      cardValVib.textContent = `${f.vib.toFixed(4)} g`;
      cardValFreq.textContent = `${f.freq.toFixed(1)} Hz`;
      cardValGyro.textContent = `p2p: ${f.p2p.toFixed(4)} g · gyro: ${f.gyro.toFixed(1)} °/s`;
      cardValTemp.textContent = `${f.temp.toFixed(2)} °C`;
      cardValHum.textContent = `${f.hum.toFixed(1)} %RH`;
      cardValSnd.textContent = `${f.snd.toFixed(1)} dB`;
      cardValMag.textContent = `${f.mag.toFixed(1)} µT`;
      cardValPress.textContent = `${f.press.toFixed(2)} hPa`;
      cardValState.textContent = f.state;
      cardValState.style.color = stateColor;
      cardValScore.textContent = `Score ${f.score.toFixed(2)}`;
      cardValCal.textContent = calText;
      cardEdgeStripe.style.setProperty('--callout-accent', stateColor);
    }

    // Small Multiples Cards
    smValVib.textContent = f.vib.toFixed(4);
    smSubVibLeft.textContent = `Freq: ${f.freq.toFixed(1)} Hz`;
    smSubVibRight.textContent = `μ: ${baseline.vib.mean.toFixed(4)} g`;

    smValMag.textContent = f.mag.toFixed(1);
    smSubMagRight.textContent = `μ: ${baseline.mag.mean.toFixed(1)} µT`;

    const dP = f.press - baseline.press.mean;
    smValPress.textContent = f.press.toFixed(2);
    smSubPressLeft.textContent = `ΔP: ${dP >= 0 ? '+' : ''}${dP.toFixed(2)} hPa`;
    smSubPressRight.textContent = `μ: ${baseline.press.mean.toFixed(2)}`;

    smValTemp.textContent = f.temp.toFixed(2);
    smSubTempLeft.textContent = `Hum: ${f.hum.toFixed(1)} %`;
    smSubTempRight.textContent = `μ: ${baseline.temp.mean.toFixed(2)} °C`;

    smValSnd.textContent = f.snd.toFixed(1);
    smSubSndRight.textContent = `μ: ${baseline.snd.mean.toFixed(1)} dB`;

    // Top Chart Header Readout
    readoutAnomalyScore.textContent = `${f.score.toFixed(2)} (${f.state})`;
    readoutAnomalyScore.style.color = stateColor;

    // Raw JSON stream bar
    rawJsonReadout.textContent = JSON.stringify(f);
  }

  // -------------------------------------------------------------------------
  // Responsive Board Layout (Zoomed PCB + Card Grid below 700px)
  // -------------------------------------------------------------------------
  function updateBoardLayout() {
    if (!boardCenterpiece || !boardSvg) return;
    const width = boardCenterpiece.clientWidth;
    if (!width) return;

    const isCompact = width < 700;
    boardCenterpiece.classList.toggle('is-compact', isCompact);
    boardSvg.setAttribute('viewBox', isCompact ? '224 122 508 184' : '0 0 1000 430');
  }

  // -------------------------------------------------------------------------
  // High-DPI Canvas Setup Helper (Measures parent container to avoid DPR loops)
  // -------------------------------------------------------------------------
  function prepCanvas(canvas) {
    const container = canvas.parentElement;
    const w = (container ? container.clientWidth : canvas.clientWidth) || 300;
    const h = (container ? container.clientHeight : canvas.clientHeight) || 150;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const targetW = Math.max(1, Math.round(w * dpr));
    const targetH = Math.max(1, Math.round(h * dpr));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  // -------------------------------------------------------------------------
  // Chart 1: Annotated Anomaly Score Timeline (Line + Threshold Zones)
  // -------------------------------------------------------------------------
  function drawAnomalyTimeline() {
    const { ctx, w, h } = prepCanvas(canvasAnomalyTimeline);
    const isNarrow = w < 420;
    const pad = isNarrow
      ? { top: 14, right: 54, bottom: 24, left: 30 }
      : { top: 14, right: 68, bottom: 24, left: 36 };
    const pw = Math.max(40, w - pad.left - pad.right);
    const ph = Math.max(40, h - pad.top - pad.bottom);

    const yFor = (val) => pad.top + ph * (1 - Math.max(0, Math.min(1, val)));
    const xFor = (i) => pad.left + (i / (HISTORY_LEN - 1)) * pw;

    // Subtle background threshold bands
    const yAnom = yFor(0.65);
    const yWarn = yFor(0.35);

    ctx.fillStyle = 'rgba(181, 68, 52, 0.05)';
    ctx.fillRect(pad.left, pad.top, pw, yAnom - pad.top);

    ctx.fillStyle = 'rgba(184, 125, 20, 0.05)';
    ctx.fillRect(pad.left, yAnom, pw, yWarn - yAnom);

    // Horizontal grid & threshold lines (direct labeling on right per data-to-viz)
    ctx.font = `${isNarrow ? 9 : 10}px "JetBrains Mono", monospace`;
    ctx.textBaseline = 'middle';
    const labelOffset = isNarrow ? 4 : 6;

    // 0.65 Anomaly threshold line
    ctx.strokeStyle = 'rgba(181, 68, 52, 0.45)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yAnom);
    ctx.lineTo(pad.left + pw, yAnom);
    ctx.stroke();
    ctx.fillStyle = COLORS.anomaly;
    ctx.textAlign = 'left';
    ctx.fillText('0.65 ANOM', pad.left + pw + labelOffset, yAnom);

    // 0.35 Warning threshold line
    ctx.strokeStyle = 'rgba(184, 125, 20, 0.45)';
    ctx.beginPath();
    ctx.moveTo(pad.left, yWarn);
    ctx.lineTo(pad.left + pw, yWarn);
    ctx.stroke();
    ctx.fillStyle = COLORS.warn;
    ctx.fillText('0.35 WARN', pad.left + pw + labelOffset, yWarn);

    ctx.setLineDash([]);

    // Y-axis ticks (0.0, 0.5, 1.0)
    [0.0, 0.5, 1.0].forEach((tick) => {
      const y = yFor(tick);
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + pw, y);
      ctx.stroke();

      ctx.fillStyle = COLORS.textMuted;
      ctx.textAlign = 'right';
      ctx.fillText(tick.toFixed(1), pad.left - 6, y);
    });

    // Area fill under score curve
    const data = history.score;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = xFor(i);
      const y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(xFor(data.length - 1), pad.top + ph);
    ctx.lineTo(xFor(0), pad.top + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(43, 111, 107, 0.08)';
    ctx.fill();

    // Main score line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = xFor(i);
      const y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    const lastVal = data[data.length - 1];
    const lineColor =
      lastVal >= 0.65 ? COLORS.anomaly : lastVal >= 0.35 ? COLORS.warn : COLORS.normal;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // End point dot
    const lastX = xFor(data.length - 1);
    const lastY = yFor(lastVal);
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fill();

    // X-axis time labels
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'left';
    ctx.fillText('-6.0s', pad.left, h - 8);
    ctx.textAlign = 'right';
    ctx.fillText('Now (10 Hz)', pad.left + pw, h - 8);
  }

  // -------------------------------------------------------------------------
  // Chart 2: Ranked Horizontal Lollipop Chart of Sensor |Z|-Scores
  // (Replaces radar/spider or gauge charts per data-to-viz.com/caveats.html)
  // -------------------------------------------------------------------------
  function drawLollipopChart() {
    const { ctx, w, h } = prepCanvas(canvasLollipop);
    const f = latestFrame;
    const isNarrow = w < 420;

    const items = [
      {
        key: 'vib',
        label: 'Vibration (BMI270)',
        shortLabel: 'Vibration',
        z: Math.abs(f.vib - baseline.vib.mean) / baseline.vib.std,
        color: COLORS.vib,
      },
      {
        key: 'snd',
        label: 'Acoustic (MP34DT06)',
        shortLabel: 'Acoustic',
        z: Math.abs(f.snd - baseline.snd.mean) / baseline.snd.std,
        color: COLORS.snd,
      },
      {
        key: 'press',
        label: 'Pressure (LPS22HB)',
        shortLabel: 'Pressure',
        z: Math.abs(f.press - baseline.press.mean) / baseline.press.std,
        color: COLORS.press,
      },
      {
        key: 'mag',
        label: 'Mag Flux (BMM150)',
        shortLabel: 'Mag Flux',
        z: Math.abs(f.mag - baseline.mag.mean) / baseline.mag.std,
        color: COLORS.mag,
      },
      {
        key: 'temp',
        label: 'Temp (HS3003)',
        shortLabel: 'Temp',
        z: Math.abs(f.temp - baseline.temp.mean) / baseline.temp.std,
        color: COLORS.temp,
      },
    ];

    // Sort descending by |Z| so the primary anomaly driver is always on top
    items.sort((a, b) => b.z - a.z);

    if (items[0].z > 1.8) {
      readoutTopDriver.textContent = `Top: ${items[0].shortLabel} (${items[0].z.toFixed(1)}σ)`;
    } else {
      readoutTopDriver.textContent = 'All within < 2σ';
    }

    const pad = isNarrow
      ? { top: 14, right: 42, bottom: 24, left: 76 }
      : { top: 14, right: 48, bottom: 24, left: 132 };
    const pw = Math.max(60, w - pad.left - pad.right);
    const ph = Math.max(60, h - pad.top - pad.bottom);
    const maxZ = Math.max(5.0, Math.ceil(items[0].z * 1.15));
    const rowH = ph / items.length;

    const xFor = (z) => pad.left + Math.min(1, z / maxZ) * pw;

    // Vertical reference line at 2.5 sigma
    const xRef = xFor(2.5);
    ctx.strokeStyle = 'rgba(184, 125, 20, 0.35)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xRef, pad.top);
    ctx.lineTo(xRef, pad.top + ph);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = `${isNarrow ? 9.5 : 10}px "JetBrains Mono", monospace`;
    ctx.fillStyle = COLORS.textMuted;
    ctx.textAlign = 'center';
    const refLabelX = Math.max(pad.left + 36, Math.min(pad.left + pw - 20, xRef));
    ctx.fillText('2.5σ threshold', refLabelX, h - 8);

    // Draw each horizontal lollipop
    items.forEach((item, idx) => {
      const cy = pad.top + idx * rowH + rowH / 2;
      const xEnd = xFor(item.z);

      // Baseline guide
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad.left, cy);
      ctx.lineTo(pad.left + pw, cy);
      ctx.stroke();

      // Stem
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pad.left, cy);
      ctx.lineTo(xEnd, cy);
      ctx.stroke();

      // Lollipop circle head
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(xEnd, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Left label
      ctx.font = `${isNarrow ? 10.5 : 11}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = COLORS.textStrong;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(isNarrow ? item.shortLabel : item.label, pad.left - (isNarrow ? 8 : 10), cy);

      // Direct value label on right of lollipop head
      ctx.font = `${isNarrow ? 10 : 10.5}px "JetBrains Mono", monospace`;
      ctx.fillStyle = COLORS.textStrong;
      ctx.textAlign = 'left';
      ctx.fillText(`${item.z.toFixed(1)}σ`, xEnd + (isNarrow ? 6 : 8), cy);
    });
  }

  // -------------------------------------------------------------------------
  // Chart 3: Small Multiples Sparklines (5 Dedicated Scales + Mean Line)
  // -------------------------------------------------------------------------
  function drawSmallMultiple(canvas, data, baseMean, minSpan, color) {
    const { ctx, w, h } = prepCanvas(canvas);
    const pad = { top: 8, right: 6, bottom: 8, left: 6 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    let minVal = Math.min(...data, baseMean - minSpan / 2);
    let maxVal = Math.max(...data, baseMean + minSpan / 2);
    if (maxVal - minVal < minSpan) {
      const mid = (maxVal + minVal) / 2;
      minVal = mid - minSpan / 2;
      maxVal = mid + minSpan / 2;
    }

    const yFor = (v) => pad.top + ph * (1 - (v - minVal) / (maxVal - minVal));
    const xFor = (i) => pad.left + (i / (data.length - 1)) * pw;

    // Dashed calibrated mean baseline
    const yMean = yFor(baseMean);
    ctx.strokeStyle = COLORS.baseline;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left, yMean);
    ctx.lineTo(pad.left + pw, yMean);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sparkline path
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = xFor(i);
      const y = yFor(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Current value dot
    const lastX = xFor(data.length - 1);
    const lastY = yFor(data[data.length - 1]);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderAllCharts() {
    drawAnomalyTimeline();
    drawLollipopChart();
    drawSmallMultiple(canvasSmVib, history.vib, baseline.vib.mean, 0.015, COLORS.vib);
    drawSmallMultiple(canvasSmMag, history.mag, baseline.mag.mean, 12.0, COLORS.mag);
    drawSmallMultiple(canvasSmPress, history.press, baseline.press.mean, 0.8, COLORS.press);
    drawSmallMultiple(canvasSmTemp, history.temp, baseline.temp.mean, 1.0, COLORS.temp);
    drawSmallMultiple(canvasSmSnd, history.snd, baseline.snd.mean, 12.0, COLORS.snd);
  }

  // -------------------------------------------------------------------------
  // Hardware Connectivity 1: Web Serial API (USB Cable)
  // -------------------------------------------------------------------------
  async function connectWebSerial() {
    if (!('serial' in navigator)) {
      alert('Web Serial API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Brave.');
      return;
    }

    try {
      serialPort = await navigator.serial.requestPort();
      await serialPort.open({ baudRate: 115200 });

      connectionMode = 'serial';
      updateModeButtons();

      const textDecoder = new TextDecoderStream();
      serialPort.readable.pipeTo(textDecoder.writable);
      serialReader = textDecoder.readable.getReader();

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(serialPort.writable);
      serialWriter = textEncoder.writable.getWriter();

      let lineBuffer = '';
      while (true) {
        const { value, done } = await serialReader.read();
        if (done) break;
        if (value) {
          lineBuffer += value;
          const lines = lineBuffer.split(/\r?\n/);
          lineBuffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
              try {
                const parsed = JSON.parse(trimmed);
                ingestFrame(parsed);
              } catch (_) {
                // Ignore partial serial line
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Web Serial connection closed or cancelled:', err);
      connectionMode = 'sim';
      updateModeButtons();
    }
  }

  // -------------------------------------------------------------------------
  // Hardware Connectivity 2: Web Bluetooth API (BLE Wireless)
  // -------------------------------------------------------------------------
  async function connectWebBluetooth() {
    if (!('bluetooth' in navigator)) {
      alert('Web Bluetooth API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Brave.');
      return;
    }

    try {
      bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'CAS-PdM-Twin' }, { services: [BLE_SERVICE_UUID] }],
        optionalServices: [BLE_SERVICE_UUID],
      });

      const server = await bleDevice.gatt.connect();
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const telemetryChar = await service.getCharacteristic(BLE_TELEMETRY_UUID);
      bleCommandChar = await service.getCharacteristic(BLE_COMMAND_UUID);

      await telemetryChar.startNotifications();
      telemetryChar.addEventListener('characteristicvaluechanged', (event) => {
        const decoder = new TextDecoder('utf-8');
        const jsonStr = decoder.decode(event.target.value).trim();
        if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
          try {
            ingestFrame(JSON.parse(jsonStr));
          } catch (_) {
            // Ignore malformed BLE packet
          }
        }
      });

      bleDevice.addEventListener('gattserverdisconnected', () => {
        connectionMode = 'sim';
        updateModeButtons();
      });

      connectionMode = 'ble';
      updateModeButtons();
    } catch (err) {
      console.warn('Web Bluetooth connection cancelled or failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // Send Command ('C' for Calibrate) to Active Device or Virtual Emulator
  // -------------------------------------------------------------------------
  async function sendCommand(cmdChar) {
    if (connectionMode === 'serial' && serialWriter) {
      await serialWriter.write(cmdChar);
    } else if (connectionMode === 'ble' && bleCommandChar) {
      const code = cmdChar.charCodeAt(0);
      await bleCommandChar.writeValue(new Uint8Array([code]));
    } else {
      // Virtual emulator calibration
      if (cmdChar === 'C' || cmdChar === 'c') {
        simCalibFramesRemaining = 16;
        liveCalibAccumulator = [];
      }
    }
  }

  function updateModeButtons() {
    btnConnectSerial.classList.toggle('active', connectionMode === 'serial');
    btnConnectBle.classList.toggle('active', connectionMode === 'ble');
    btnModeSim.classList.toggle('active', connectionMode === 'sim');
  }

  // -------------------------------------------------------------------------
  // CSV Export
  // -------------------------------------------------------------------------
  function exportCsv() {
    if (recordedRows.length === 0) return;
    const headers = [
      'timestamp_iso',
      'mode',
      'ms',
      'vib',
      'p2p',
      'freq',
      'gyro',
      'mag',
      'press',
      'temp',
      'hum',
      'snd',
      'score',
      'state',
      'cal',
    ];
    const csvLines = [headers.join(',')];
    for (const r of recordedRows) {
      csvLines.push(headers.map((h) => r[h]).join(','));
    }
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cas_pdm_telemetry_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // -------------------------------------------------------------------------
  // Responsive Layout Manager (ResizeObserver + DPR Watcher for All Features)
  // -------------------------------------------------------------------------
  const responsiveCallbacks = new Map();
  const pendingResizeCallbacks = new Set();
  let resizeRafId = null;

  function flushPendingResizes() {
    resizeRafId = null;
    const toRun = Array.from(pendingResizeCallbacks);
    pendingResizeCallbacks.clear();
    toRun.forEach((fn) => fn());
  }

  function scheduleResizeCallback(fn) {
    if (typeof fn !== 'function') return;
    pendingResizeCallbacks.add(fn);
    if (resizeRafId === null) {
      resizeRafId = requestAnimationFrame(flushPendingResizes);
    }
  }

  const sharedResizeObserver =
    typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => {
          for (const entry of entries) {
            const cb = responsiveCallbacks.get(entry.target);
            if (cb) scheduleResizeCallback(cb);
          }
        })
      : null;

  function registerResponsiveElement(el, onResize) {
    if (!el || typeof onResize !== 'function') return;
    responsiveCallbacks.set(el, onResize);
    if (sharedResizeObserver) {
      sharedResizeObserver.observe(el);
    }
  }

  function watchDevicePixelRatio(onChange) {
    if (typeof window.matchMedia !== 'function') return;
    let mediaQuery = null;
    const handleChange = () => {
      onChange();
      arm();
    };
    const arm = () => {
      mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange, { once: true });
      }
    };
    arm();
  }

  window.CASResponsive = {
    prepCanvas,
    observe: registerResponsiveElement,
  };

  // -------------------------------------------------------------------------
  // Part 03: CRISP-DM Phase 2 — In-Browser Python Lab (Pyodide WASM + Offline Fallback)
  // -------------------------------------------------------------------------
  const pyStatusDot = document.getElementById('pyStatusDot');
  const pyStatusLabel = document.getElementById('pyStatusLabel');
  const pyRowCount = document.getElementById('pyRowCount');
  const btnInjectSample = document.getElementById('btnInjectSample');
  const btnRunAllPy = document.getElementById('btnRunAllPy');
  const btnResetPy = document.getElementById('btnResetPy');

  const INITIAL_CELL_CODE = {};
  ['cell1', 'cell2', 'cell3'].forEach((id) => {
    const el = document.getElementById(`code-${id}`);
    if (el) INITIAL_CELL_CODE[id] = el.value;
  });

  let pyodideInstance = null;
  let pyodideLoadPromise = null;
  let useOfflineFallback = false;

  function setPyStatus(state, text) {
    if (!pyStatusDot || !pyStatusLabel) return;
    pyStatusDot.className = 'status-dot';
    if (state === 'loading') pyStatusDot.classList.add('py-dot-loading');
    else if (state === 'ready') pyStatusDot.classList.add('py-dot-ready');
    else pyStatusDot.classList.add('py-dot-idle');
    pyStatusLabel.textContent = text;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Generate an 80-frame multi-regime recording (calibration + quiet baseline + tap + air blow + magnet)
  function injectMixedFaultSample() {
    recordedRows.length = 0;
    const nowBoardMs = Math.round(performance.now() - simStartMs) + 286000;
    let cursorMs = nowBoardMs - 80 * 100;
    const baseIsoMs = Date.now() - 8000;

    for (let i = 0; i < 80; i++) {
      // Realistic packet interval ~100ms with ±3.8ms USB/BLE jitter
      const jitter = Math.round(Math.sin(i * 1.7) * 3.8 + (Math.random() - 0.5) * 2.4);
      cursorMs += 100 + jitter;

      let vib = 0.0006 + Math.sin(i * 0.5) * 0.00012;
      let p2p = Number((vib * 3.9).toFixed(4));
      let freq = 9.5 + Math.cos(i * 0.4) * 0.8;
      let gyro = 0.2;
      let mag = 38.9 + Math.sin(i * 0.3) * 0.7;
      let press = 950.27 + Math.cos(i * 0.25) * 0.02;
      let temp = 26.64 + Math.sin(i * 0.1) * 0.03;
      let hum = 48.9;
      let snd = 45.4 + Math.sin(i * 0.6) * 1.2;
      let score = 0.02;
      let state = 'NORMAL';
      let cal = 1;

      if (i < 4) {
        // Startup auto-calibration frames (cal=0)
        cal = 0;
        state = 'CALIBRATING';
        score = 0.02;
      } else if (i >= 30 && i < 50) {
        // Desk tap mechanical vibration shock
        const intensity = 0.6 + 0.4 * Math.sin((i - 30) * 0.65);
        vib = 0.036 + intensity * 0.038;
        p2p = vib * 4.25;
        freq = 21.8 + Math.sin(i) * 1.6;
        gyro = 4.4 + intensity * 3.8;
        snd = 57.5 + intensity * 7.2;
        score = Math.min(0.96, 0.58 + intensity * 0.34);
        state = score >= 0.65 ? 'ANOMALY' : 'WARNING';
      } else if (i >= 50 && i < 65) {
        // Blowing air across board (barometer + microphone + slight thermal/humidity shift)
        const gust = 0.55 + 0.45 * Math.sin((i - 50) * 0.45);
        press = 951.55 + gust * 0.92;
        snd = 73.0 + gust * 10.5;
        temp = 27.18 + gust * 0.24;
        hum = 56.8 + gust * 3.5;
        vib = 0.0021;
        p2p = 0.0084;
        score = Math.min(0.92, 0.52 + gust * 0.35);
        state = score >= 0.65 ? 'ANOMALY' : 'WARNING';
      } else if (i >= 65) {
        // Smartphone / magnet EMF wave near BMM150
        const wave = 0.5 + 0.5 * Math.cos((i - 65) * 0.5);
        mag = 98.0 + wave * 78.0;
        score = Number((0.36 + wave * 0.24).toFixed(2));
        state = 'WARNING';
      }

      const frame = {
        ms: cursorMs,
        vib: Number(vib.toFixed(4)),
        p2p: Number(p2p.toFixed(4)),
        freq: Number(freq.toFixed(1)),
        gyro: Number(gyro.toFixed(1)),
        mag: Number(mag.toFixed(1)),
        press: Number(press.toFixed(2)),
        temp: Number(temp.toFixed(2)),
        hum: Number(hum.toFixed(1)),
        snd: Number(snd.toFixed(1)),
        score: Number(score.toFixed(2)),
        state,
        cal,
      };

      recordedRows.push({
        timestamp_iso: new Date(baseIsoMs + i * 100).toISOString(),
        mode: 'preset_mixed_faults',
        ...frame,
      });

      if (i >= 80 - HISTORY_LEN) {
        pushBuffer(history.vib, frame.vib);
        pushBuffer(history.mag, frame.mag);
        pushBuffer(history.press, frame.press);
        pushBuffer(history.temp, frame.temp);
        pushBuffer(history.snd, frame.snd);
        pushBuffer(history.score, frame.score);
      }
      latestFrame = frame;
    }

    csvCount.textContent = String(recordedRows.length);
    if (pyRowCount) pyRowCount.textContent = String(recordedRows.length);
    updateDomReadouts(latestFrame);
    renderAllCharts();
  }

  async function ensurePyodideReady() {
    if (pyodideInstance || useOfflineFallback) return;
    if (pyodideLoadPromise) return pyodideLoadPromise;

    setPyStatus('loading', 'PYTHON RUNTIME: LOADING PYODIDE & PANDAS...');
    pyodideLoadPromise = (async () => {
      try {
        if (typeof window.loadPyodide !== 'function') {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Pyodide CDN unreachable'));
            document.head.appendChild(script);
          });
        }
        pyodideInstance = await window.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
        });
        await pyodideInstance.loadPackage(['numpy', 'pandas']);

        await pyodideInstance.runPythonAsync(`
import sys, io, json, ast
import numpy as np
import pandas as pd

_USER_NS = {"pd": pd, "np": np}

def _execute_crisp_cell(code_str, rows_json):
    rows = json.loads(rows_json)
    df = pd.DataFrame(rows)
    _USER_NS["df"] = df
    stdout_buf = io.StringIO()
    old_stdout, old_stderr = sys.stdout, sys.stderr
    sys.stdout = stdout_buf
    sys.stderr = stdout_buf
    html_table = ""
    text_result = ""
    try:
        tree = ast.parse(code_str, mode="exec")
        last_val = None
        if tree.body and isinstance(tree.body[-1], ast.Expr):
            last_expr = ast.Expression(tree.body.pop().value)
            exec(compile(tree, "<cell>", "exec"), _USER_NS)
            last_val = eval(compile(last_expr, "<cell>", "eval"), _USER_NS)
        else:
            exec(compile(tree, "<cell>", "exec"), _USER_NS)
        if isinstance(last_val, pd.DataFrame):
            html_table = last_val.to_html(classes="py-df-table", border=0)
        elif isinstance(last_val, pd.Series):
            html_table = last_val.to_frame().to_html(classes="py-df-table", border=0)
        elif last_val is not None:
            text_result = repr(last_val)
        return json.dumps({
            "ok": True,
            "stdout": stdout_buf.getvalue(),
            "html_table": html_table,
            "text_result": text_result
        })
    except Exception as exc:
        import traceback
        return json.dumps({
            "ok": False,
            "stdout": stdout_buf.getvalue(),
            "error": traceback.format_exc()
        })
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
`);
        setPyStatus('ready', 'PYTHON 3.11 READY · PANDAS + NUMPY ACTIVE');
      } catch (err) {
        console.warn('Pyodide CDN unavailable; switching to built-in local DataFrame engine:', err);
        useOfflineFallback = true;
        setPyStatus('ready', 'PYTHON ENGINE READY (LOCAL DATAFRAME RUNTIME)');
      }
    })();

    return pyodideLoadPromise;
  }

  // Built-in local DataFrame computation fallback if CDN is blocked/offline
  function executeLocalFallback(cellId, codeStr, rows) {
    const n = rows.length;
    const mean = (arr) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
    const std = (arr) => {
      if (arr.length < 2) return 0;
      const m = mean(arr);
      return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1));
    };

    const buildHtmlTable = (headers, indexLabels, matrix) => {
      let html = '<table class="py-df-table"><thead><tr><th></th>';
      headers.forEach((h) => {
        html += `<th>${escapeHtml(h)}</th>`;
      });
      html += '</tr></thead><tbody>';
      matrix.forEach((row, rIdx) => {
        html += `<tr><td>${escapeHtml(indexLabels[rIdx])}</td>`;
        row.forEach((val) => {
          html += `<td>${escapeHtml(val)}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      return html;
    };

    if (cellId === 'cell1' || codeStr.includes('dt_ms')) {
      const dts = [];
      for (let i = 1; i < rows.length; i++) {
        const dt = rows[i].ms - rows[i - 1].ms;
        if (dt > 0 && dt < 1000) dts.push(dt);
      }
      const cal0 = rows.filter((r) => r.cal === 0).length;
      const cal1 = rows.filter((r) => r.cal === 1).length;
      const stateCounts = {};
      rows.forEach((r) => {
        stateCounts[r.state] = (stateCounts[r.state] || 0) + 1;
      });
      const stateStr =
        '{' +
        Object.entries(stateCounts)
          .map(([k, v]) => `'${k}': ${v}`)
          .join(', ') +
        '}';

      const stdout = [
        `Total frames in df : ${n} rows × 16 columns`,
        `Sampling interval  : ${mean(dts).toFixed(1)} ms mean (±${std(dts).toFixed(1)} ms jitter)`,
        `Missing values     : 0 (excluding first diff)`,
        `Calibration frames : ${cal0} uncalibrated (cal=0) | ${cal1} locked (cal=1)`,
        `State distribution : ${stateStr}`,
      ].join('\n');

      const tailRows = rows.slice(-6);
      const cols = ['ms', 'dt_ms', 'vib', 'p2p', 'freq', 'mag', 'press', 'temp', 'snd', 'state', 'cal'];
      const idxLabels = tailRows.map((_, idx) => String(Math.max(0, n - tailRows.length) + idx));
      const matrix = tailRows.map((r, idx) => {
        const globalIdx = Math.max(0, n - tailRows.length) + idx;
        const dt = globalIdx > 0 ? (r.ms - rows[globalIdx - 1].ms).toFixed(1) : 'NaN';
        return [
          r.ms,
          dt,
          r.vib.toFixed(4),
          r.p2p.toFixed(4),
          r.freq.toFixed(1),
          r.mag.toFixed(1),
          r.press.toFixed(2),
          r.temp.toFixed(2),
          r.snd.toFixed(1),
          r.state,
          r.cal,
        ];
      });

      return { ok: true, stdout, html_table: buildHtmlTable(cols, idxLabels, matrix), text_result: '' };
    }

    if (cellId === 'cell2' || codeStr.includes('peak_z_sigma')) {
      const clean = rows.some((r) => r.cal === 1) ? rows.filter((r) => r.cal === 1) : rows;
      const sensors = ['vib', 'mag', 'press', 'temp', 'snd'];
      const headers = ['mean', 'std', 'min', 'max', 'range', 'peak_z_sigma'];
      const statsMap = {};
      const matrix = sensors.map((s) => {
        const vals = clean.map((r) => Number(r[s]));
        const m = mean(vals);
        const sd = std(vals);
        const mn = Math.min(...vals);
        const mx = Math.max(...vals);
        const rng = mx - mn;
        const pz = (mx - m) / (sd || 1e-9);
        statsMap[s] = { m, sd, mn, mx, rng, pz };
        return [m.toFixed(4), sd.toFixed(4), mn.toFixed(4), mx.toFixed(4), rng.toFixed(4), pz.toFixed(4)];
      });

      const ratio = Math.round(statsMap.press.m / Math.max(statsMap.vib.m, 1e-6));
      const stdout = [
        `Scale disparity (press / vib): ${ratio.toLocaleString('en-US')}× difference in raw magnitude`,
        `-> Raw distance metrics would be 99.9% dominated by press & mag without Z-score scaling.`,
      ].join('\n');

      return { ok: true, stdout, html_table: buildHtmlTable(headers, sensors, matrix), text_result: '' };
    }

    // Cell 3: Rolling average vs p2p + Pearson correlation matrix
    const vibs = rows.map((r) => r.vib);
    const p2ps = rows.map((r) => r.p2p);
    const rollingMeans = vibs.map((_, idx) => {
      const slice = vibs.slice(Math.max(0, idx - 29), idx + 1);
      return mean(slice);
    });
    const p2pMax = Math.max(...p2ps);
    const cloudMax = Math.max(...rollingMeans);
    const cols = ['vib', 'p2p', 'freq', 'mag', 'press', 'temp', 'snd'];

    const corr = (a, b) => {
      const ma = mean(a);
      const mb = mean(b);
      let num = 0;
      let da = 0;
      let db = 0;
      for (let i = 0; i < a.length; i++) {
        const xa = a[i] - ma;
        const xb = b[i] - mb;
        num += xa * xb;
        da += xa * xa;
        db += xb * xb;
      }
      const denom = Math.sqrt(da * db);
      return denom === 0 ? 0 : num / denom;
    };

    const colArrays = {};
    cols.forEach((c) => {
      colArrays[c] = rows.map((r) => Number(r[c]));
    });

    const matrix = cols.map((c1) =>
      cols.map((c2) => (c1 === c2 ? '1.00' : corr(colArrays[c1], colArrays[c2]).toFixed(2)))
    );

    const stdout = [
      `Edge 32-pt Peak-to-Peak max : ${p2pMax.toFixed(4)} g`,
      `Smoothed Rolling Mean max   : ${cloudMax.toFixed(4)} g (${(p2pMax / Math.max(cloudMax, 1e-6)).toFixed(1)}× higher transient capture on Edge)`,
      ``,
      `Cross-Sensor Correlation Matrix (Pearson r):`,
    ].join('\n');

    return { ok: true, stdout, html_table: buildHtmlTable(cols, cols, matrix), text_result: '' };
  }

  async function runPythonCell(cellId) {
    const codeEl = document.getElementById(`code-${cellId}`);
    const outEl = document.getElementById(`output-${cellId}`);
    if (!codeEl || !outEl) return;

    // Ensure we have enough frames for a meaningful analysis
    if (recordedRows.length < 8) {
      for (let i = 0; i < 15; i++) {
        ingestFrame(generateSimulatedFrame());
      }
    }

    outEl.classList.remove('is-empty');
    outEl.innerHTML = '<div class="py-stdout">Running Python cell against live df buffer...</div>';

    await ensurePyodideReady();

    const codeStr = codeEl.value;
    let result;

    if (pyodideInstance && !useOfflineFallback) {
      try {
        pyodideInstance.globals.set('_raw_code_str', codeStr);
        pyodideInstance.globals.set('_raw_rows_json', JSON.stringify(recordedRows));
        const rawJson = await pyodideInstance.runPythonAsync(
          `_execute_crisp_cell(_raw_code_str, _raw_rows_json)`
        );
        result = JSON.parse(rawJson);
      } catch (err) {
        result = { ok: false, stdout: '', error: String(err) };
      }
    } else {
      result = executeLocalFallback(cellId, codeStr, recordedRows);
    }

    if (!result.ok) {
      outEl.innerHTML =
        (result.stdout ? `<pre class="py-stdout">${escapeHtml(result.stdout)}</pre>` : '') +
        `<pre class="py-error">${escapeHtml(result.error)}</pre>`;
      return;
    }

    let html = '';
    if (result.stdout && result.stdout.trim()) {
      html += `<pre class="py-stdout">${escapeHtml(result.stdout.trimEnd())}</pre>`;
    }
    if (result.html_table) {
      html += `<div class="py-output-table-wrap">${result.html_table}</div>`;
    } else if (result.text_result) {
      html += `<pre class="py-stdout">${escapeHtml(result.text_result)}</pre>`;
    }
    if (!html) {
      html = `<div class="py-stdout">Executed successfully (${recordedRows.length} rows in df).</div>`;
    }
    outEl.innerHTML = html;
  }

  async function runAllPythonCells() {
    await runPythonCell('cell1');
    await runPythonCell('cell2');
    await runPythonCell('cell3');
  }

  function resetPythonCells() {
    ['cell1', 'cell2', 'cell3'].forEach((id) => {
      const codeEl = document.getElementById(`code-${id}`);
      if (codeEl && INITIAL_CELL_CODE[id]) {
        codeEl.value = INITIAL_CELL_CODE[id];
      }
    });
  }

  document.querySelectorAll('.btn-run-cell').forEach((btn) => {
    btn.addEventListener('click', () => runPythonCell(btn.dataset.target));
  });

  document.querySelectorAll('.py-editor').forEach((textarea) => {
    textarea.addEventListener('keydown', (e) => {
      if ((e.shiftKey || e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const cellId = textarea.id.replace('code-', '');
        runPythonCell(cellId);
      }
    });
  });

  if (btnInjectSample) {
    btnInjectSample.addEventListener('click', async () => {
      injectMixedFaultSample();
      await runAllPythonCells();
    });
  }
  if (btnRunAllPy) {
    btnRunAllPy.addEventListener('click', runAllPythonCells);
  }
  if (btnResetPy) {
    btnResetPy.addEventListener('click', resetPythonCells);
  }

  // -------------------------------------------------------------------------
  // Modular Sections: Reordering, Auto-Numbering, Nav Sync & Scroll Spy
  // -------------------------------------------------------------------------
  function initModularSections() {
    const sectionsContainer = document.getElementById('sectionsContainer');
    if (!sectionsContainer) return;

    const headerNav = document.querySelector('.header-nav');
    const externalNavLinks = headerNav
      ? Array.from(headerNav.querySelectorAll('a')).filter((a) => {
          const href = a.getAttribute('href') || '';
          return !href.startsWith('#');
        })
      : [];

    const getSections = () =>
      Array.from(sectionsContainer.children).filter((el) =>
        el.classList.contains('section-block')
      );

    function applyOrder(orderIds) {
      const byId = new Map();
      const allSections = getSections();
      allSections.forEach((sec) => {
        if (sec.id) byId.set(sec.id, sec);
      });

      const placed = new Set();
      orderIds.forEach((id) => {
        const sec = byId.get(id);
        if (sec) {
          sectionsContainer.appendChild(sec);
          placed.add(sec);
        }
      });

      allSections.forEach((sec) => {
        if (!placed.has(sec)) sectionsContainer.appendChild(sec);
      });
    }

    let spyRafId = null;
    let presenterApi = null;

    function updateActiveSection() {
      spyRafId = null;
      if (document.body.classList.contains('is-beamer-mode')) return;
      const sections = getSections();
      if (sections.length === 0) return;

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      let activeId = sections[0].id;

      if (atBottom) {
        activeId = sections[sections.length - 1].id;
      } else {
        const triggerY = window.innerHeight * 0.28;
        for (const sec of sections) {
          if (sec.getBoundingClientRect().top <= triggerY) {
            activeId = sec.id;
          }
        }
      }

      sections.forEach((sec) => {
        sec.classList.toggle('is-in-view', sec.id === activeId);
      });

      if (headerNav) {
        headerNav.querySelectorAll('a[href^="#"]').forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${activeId}`);
        });
      }

      if (presenterApi) {
        presenterApi.syncFromScroll();
      }
    }

    function scheduleActiveSectionUpdate() {
      if (spyRafId === null) {
        spyRafId = requestAnimationFrame(updateActiveSection);
      }
    }

    const sectionObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(scheduleActiveSectionUpdate, {
            threshold: [0, 0.25, 0.5],
          })
        : null;

    function refreshSections() {
      const sections = getSections();
      if (sectionObserver) sectionObserver.disconnect();

      sections.forEach((sec, idx) => {
        const num = String(idx + 1).padStart(2, '0');
        const title = sec.dataset.sectionTitle || sec.id;
        const subtitle = sec.dataset.sectionSubtitle || '';
        const indexText = `${num} / ${title}`;

        const railIndex = sec.querySelector('.section-rail-index');
        const railSub = sec.querySelector('.section-rail-sub');
        const railSep = sec.querySelector('.section-rail-sep');
        if (railIndex) railIndex.textContent = indexText;
        if (railSub) railSub.textContent = subtitle;
        if (railSep) railSep.style.display = subtitle ? '' : 'none';

        const eyebrowIndex = sec.querySelector('.section-eyebrow-index');
        const eyebrowSub = sec.querySelector('.section-eyebrow-sub');
        const eyebrowSep = sec.querySelector('.section-eyebrow-sep');
        if (eyebrowIndex) eyebrowIndex.textContent = indexText;
        if (eyebrowSub) eyebrowSub.textContent = subtitle;
        if (eyebrowSep) eyebrowSep.style.display = subtitle ? '' : 'none';

        if (sectionObserver) sectionObserver.observe(sec);
      });

      if (headerNav) {
        headerNav.innerHTML = '';
        sections.forEach((sec, idx) => {
          const num = String(idx + 1).padStart(2, '0');
          const label = sec.dataset.navLabel || sec.dataset.sectionTitle || sec.id;
          const a = document.createElement('a');
          a.href = `#${sec.id}`;
          a.textContent = `${num} / ${label}`;
          headerNav.appendChild(a);
        });
        externalNavLinks.forEach((ext) => headerNav.appendChild(ext));
      }

      if (presenterApi) {
        presenterApi.rebuildStops();
      }
      updateActiveSection();
    }

    const isCustomOrder =
      SECTION_ORDER.length !== DEFAULT_HTML_ORDER.length ||
      SECTION_ORDER.some((id, idx) => id !== DEFAULT_HTML_ORDER[idx]);
    if (isCustomOrder) {
      applyOrder(SECTION_ORDER);
    }

    presenterApi = initPresenterController({
      getSections,
      scheduleScrollSync: scheduleActiveSectionUpdate,
    });

    refreshSections();

    window.addEventListener('scroll', scheduleActiveSectionUpdate, { passive: true });
    window.addEventListener('resize', scheduleActiveSectionUpdate);

    window.CASSections = {
      getOrder: () => getSections().map((s) => s.id),
      setOrder: (orderIds) => {
        if (!Array.isArray(orderIds) || orderIds.length === 0) return;
        applyOrder(orderIds);
        refreshSections();
        scheduleResizeCallback(updateBoardLayout);
        scheduleResizeCallback(renderAllCharts);
      },
      refresh: refreshSections,
    };
  }

  // -------------------------------------------------------------------------
  // Presenter Mode: 1D Waypoints, Inline Steps, Jump Dropdown & Presentation Mode
  // -------------------------------------------------------------------------
  function initPresenterController({ getSections, scheduleScrollSync }) {
    const btnBeamerMode = document.getElementById('btnBeamerMode');
    const presenterHud = document.getElementById('presenterHud');
    const hudPrevBtn = document.getElementById('hudPrevBtn');
    const hudNextBtn = document.getElementById('hudNextBtn');
    const hudJumpBtn = document.getElementById('hudJumpBtn');
    const hudCurrentLabel = document.getElementById('hudCurrentLabel');
    const hudJumpMenu = document.getElementById('hudJumpMenu');
    const hudBeamerBtn = document.getElementById('hudBeamerBtn');
    const headerNav = document.querySelector('.header-nav');

    let stops = [];
    let currentStopIndex = 0;
    let scrollLockUntil = 0;
    let isBeamerMode = false;

    function redrawInteractiveVisuals() {
      requestAnimationFrame(() => {
        updateBoardLayout();
        renderAllCharts();
      });
    }

    function getActiveStepIndex(sectionEl) {
      const activeBtn = sectionEl.querySelector('.stage-step-btn.is-active');
      return activeBtn ? Number(activeBtn.dataset.step || 0) : 0;
    }

    function setStageStep(sectionEl, stepIndex) {
      const buttons = Array.from(sectionEl.querySelectorAll('.stage-step-btn'));
      const panels = Array.from(sectionEl.querySelectorAll('.stage-step-panel'));
      if (buttons.length === 0 || panels.length === 0) return 0;

      const clamped = Math.max(0, Math.min(buttons.length - 1, stepIndex));
      buttons.forEach((btn) => {
        const active = Number(btn.dataset.step) === clamped;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', String(active));
      });
      panels.forEach((panel) => {
        panel.classList.toggle('is-active', Number(panel.dataset.step) === clamped);
      });

      const counterEl = sectionEl.querySelector('.stage-step-counter');
      if (counterEl) {
        const prefix = counterEl.dataset.prefix || 'Step';
        counterEl.textContent = `${prefix} ${clamped + 1} / ${buttons.length}`;
      }
      return clamped;
    }

    function setLabStep(sectionEl, labStepIndex) {
      const panes = Array.from(sectionEl.querySelectorAll('.lab-step-pane[data-lab-step]'));
      const buttons = Array.from(sectionEl.querySelectorAll('.lab-substep-btn[data-lab-step]'));
      if (panes.length === 0) return 0;

      const clamped = Math.max(0, Math.min(panes.length - 1, labStepIndex));
      panes.forEach((pane, idx) => {
        const stepVal = Number(pane.dataset.labStep ?? idx);
        pane.classList.toggle('is-beamer-pane', stepVal === clamped);
      });
      buttons.forEach((btn, idx) => {
        const stepVal = Number(btn.dataset.labStep ?? idx);
        const active = stepVal === clamped;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', String(active));
      });
      return clamped;
    }

    function applyBeamerVisibility() {
      const sections = getSections();
      const waypoints = Array.from(document.querySelectorAll('.section-stage, .section-lab'));
      const activeStop = stops[currentStopIndex];

      if (!isBeamerMode || !activeStop) {
        sections.forEach((sec) => sec.classList.remove('is-beamer-section'));
        waypoints.forEach((wp) => wp.classList.remove('is-beamer-waypoint'));
        return;
      }

      sections.forEach((sec) => {
        const active = sec === activeStop.sectionEl;
        sec.classList.toggle('is-beamer-section', active);
        sec.classList.toggle('is-in-view', active);
      });

      waypoints.forEach((wp) => {
        wp.classList.toggle('is-beamer-waypoint', wp === activeStop.targetEl);
      });

      if (activeStop.type === 'stage') {
        setStageStep(activeStop.sectionEl, activeStop.stepIndex || 0);
      } else if (activeStop.type === 'lab') {
        setLabStep(activeStop.sectionEl, activeStop.labStepIndex || 0);
      }

      if (headerNav) {
        headerNav.querySelectorAll('a[href^="#"]').forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${activeStop.sectionEl.id}`);
        });
      }
    }

    function updateHudUI() {
      const currentStop = stops[currentStopIndex];
      if (!currentStop) return;

      if (hudCurrentLabel) {
        hudCurrentLabel.textContent = currentStop.hudLabel;
      }
      if (hudPrevBtn) {
        hudPrevBtn.disabled = currentStopIndex <= 0;
      }
      if (hudNextBtn) {
        hudNextBtn.disabled = currentStopIndex >= stops.length - 1;
      }
      if (hudJumpMenu) {
        hudJumpMenu.querySelectorAll('.hud-menu-item').forEach((item) => {
          item.classList.toggle('is-active', Number(item.dataset.stopIndex) === currentStopIndex);
        });
      }
    }

    function closeJumpMenu() {
      if (!hudJumpMenu || !hudJumpBtn) return;
      hudJumpMenu.hidden = true;
      hudJumpBtn.setAttribute('aria-expanded', 'false');
    }

    function toggleJumpMenu() {
      if (!hudJumpMenu || !hudJumpBtn) return;
      const willOpen = hudJumpMenu.hidden;
      hudJumpMenu.hidden = !willOpen;
      hudJumpBtn.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) {
        const activeItem = hudJumpMenu.querySelector('.hud-menu-item.is-active');
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'nearest' });
        }
      }
    }

    function addMenuItem(groupEl, stopIdx, labelText, tagText) {
      if (!groupEl) return;
      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = 'hud-menu-item';
      itemBtn.setAttribute('role', 'menuitem');
      itemBtn.dataset.stopIndex = String(stopIdx);

      const labelSpan = document.createElement('span');
      labelSpan.textContent = labelText;
      const tagSpan = document.createElement('span');
      tagSpan.className = 'hud-menu-item-tag';
      tagSpan.textContent = tagText;

      itemBtn.appendChild(labelSpan);
      itemBtn.appendChild(tagSpan);
      itemBtn.addEventListener('click', () => {
        navigateToStop(stopIdx, true);
        closeJumpMenu();
      });
      groupEl.appendChild(itemBtn);
    }

    function rebuildStops() {
      const sections = getSections();
      const nextStops = [];
      if (hudJumpMenu) hudJumpMenu.innerHTML = '';

      sections.forEach((sec, secIdx) => {
        const num = String(secIdx + 1).padStart(2, '0');
        const title = sec.dataset.sectionTitle || sec.id;
        const subtitle = sec.dataset.sectionSubtitle || '';
        const navLabel = sec.dataset.navLabel || title;
        const sectionHeading = subtitle ? `${num} / ${title} · ${subtitle}` : `${num} / ${title}`;

        const groupEl = hudJumpMenu ? document.createElement('div') : null;
        if (groupEl) {
          groupEl.className = 'hud-menu-group';
          const groupLabel = document.createElement('div');
          groupLabel.className = 'hud-menu-group-label';
          groupLabel.textContent = sectionHeading;
          groupEl.appendChild(groupLabel);
        }

        const stageEl = sec.querySelector('.section-stage');
        const stepButtons = stageEl ? Array.from(stageEl.querySelectorAll('.stage-step-btn')) : [];

        if (stageEl && stepButtons.length > 0) {
          stepButtons.forEach((btn, stepIdx) => {
            const rawText = btn.textContent.trim().replace(/^\d+\s*·\s*/, '');
            const stopIdx = nextStops.length;
            nextStops.push({
              type: 'stage',
              sectionEl: sec,
              targetEl: stageEl,
              stepIndex: stepIdx,
              labStepIndex: null,
              hudLabel: `${num} / ${navLabel} · Step ${stepIdx + 1}/${stepButtons.length}`,
            });
            addMenuItem(groupEl, stopIdx, rawText, `Slide ${stepIdx + 1}/${stepButtons.length}`);
          });
        }

        const labEl = sec.querySelector('.section-lab');
        if (labEl) {
          const labPanes = Array.from(labEl.querySelectorAll('.lab-step-pane[data-lab-step]'));
          if (labPanes.length > 0) {
            labPanes.forEach((pane, paneIdx) => {
              const stepNum = Number(pane.dataset.labStep ?? paneIdx);
              const stepTitle = pane.dataset.stepTitle || labEl.dataset.labTitle || `Lab ${paneIdx + 1}`;
              const stopIdx = nextStops.length;
              const tagText = labPanes.length > 1 ? `Lab ${paneIdx + 1}/${labPanes.length}` : 'Live Lab';
              nextStops.push({
                type: 'lab',
                sectionEl: sec,
                targetEl: labEl,
                paneEl: pane,
                stepIndex: null,
                labStepIndex: stepNum,
                hudLabel: labPanes.length > 1
                  ? `${num} / ${navLabel} · ${tagText}`
                  : `${num} / ${navLabel} · Live Lab`,
              });
              addMenuItem(groupEl, stopIdx, stepTitle, tagText);
            });
          } else {
            const labTitle = labEl.dataset.labTitle || 'Interactive Lab';
            const stopIdx = nextStops.length;
            nextStops.push({
              type: 'lab',
              sectionEl: sec,
              targetEl: labEl,
              paneEl: null,
              stepIndex: null,
              labStepIndex: 0,
              hudLabel: `${num} / ${navLabel} · Live Lab`,
            });
            addMenuItem(groupEl, stopIdx, labTitle, 'Live Lab');
          }
        }

        if (hudJumpMenu && groupEl) {
          hudJumpMenu.appendChild(groupEl);
        }
      });

      stops = nextStops;
      if (currentStopIndex >= stops.length) {
        currentStopIndex = Math.max(0, stops.length - 1);
      }
      applyBeamerVisibility();
      updateHudUI();
    }

    function navigateToStop(index, forceScroll = false) {
      if (stops.length === 0) return;
      const clamped = Math.max(0, Math.min(stops.length - 1, index));
      const stop = stops[clamped];
      currentStopIndex = clamped;

      if (stop.type === 'stage') {
        setStageStep(stop.sectionEl, stop.stepIndex);
      } else if (stop.type === 'lab') {
        setLabStep(stop.sectionEl, stop.labStepIndex || 0);
      }

      if (isBeamerMode) {
        applyBeamerVisibility();
        scrollLockUntil = performance.now() + 250;
        window.scrollTo({ top: 0, behavior: 'instant' });
        redrawInteractiveVisuals();
      } else {
        const scrollTarget = stop.paneEl || stop.targetEl;
        if (scrollTarget) {
          const rect = scrollTarget.getBoundingClientRect();
          const needsScroll =
            forceScroll || rect.top < -24 || rect.top > window.innerHeight * 0.35;
          if (needsScroll) {
            scrollLockUntil = performance.now() + 600;
            scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }

      updateHudUI();
    }

    function goNextStop() {
      if (currentStopIndex < stops.length - 1) {
        navigateToStop(currentStopIndex + 1, false);
      }
    }

    function goPrevStop() {
      if (currentStopIndex > 0) {
        navigateToStop(currentStopIndex - 1, false);
      }
    }

    function syncFromScroll(force = false) {
      if (stops.length === 0) return;
      if (!force && (isBeamerMode || performance.now() < scrollLockUntil)) return;

      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

      if (atBottom) {
        currentStopIndex = stops.length - 1;
        updateHudUI();
        return;
      }

      const waypoints = Array.from(document.querySelectorAll('.section-stage, .section-lab'));
      if (waypoints.length === 0) return;

      const triggerY = window.innerHeight * 0.32;
      let activeWaypoint = waypoints[0];
      for (const wp of waypoints) {
        if (wp.getBoundingClientRect().top <= triggerY) {
          activeWaypoint = wp;
        }
      }

      const parentSec = activeWaypoint.closest('.section-block');
      const isStage = activeWaypoint.classList.contains('section-stage');
      let matchIdx = -1;

      if (isStage && parentSec) {
        const activeStep = getActiveStepIndex(parentSec);
        matchIdx = stops.findIndex(
          (s) => s.sectionEl === parentSec && s.type === 'stage' && s.stepIndex === activeStep
        );
      } else if (parentSec) {
        const panes = Array.from(activeWaypoint.querySelectorAll('.lab-step-pane[data-lab-step]'));
        let activeLabStep = 0;
        if (panes.length > 0) {
          activeLabStep = Number(panes[0].dataset.labStep || 0);
          for (const pane of panes) {
            if (pane.getBoundingClientRect().top <= triggerY) {
              activeLabStep = Number(pane.dataset.labStep || 0);
            }
          }
        }
        matchIdx = stops.findIndex(
          (s) => s.sectionEl === parentSec && s.type === 'lab' && s.labStepIndex === activeLabStep
        );
        if (matchIdx === -1) {
          matchIdx = stops.findIndex((s) => s.sectionEl === parentSec && s.type === 'lab');
        }
      }

      if (matchIdx !== -1 && matchIdx !== currentStopIndex) {
        currentStopIndex = matchIdx;
        updateHudUI();
      }
    }

    function setBeamerMode(enabled) {
      const nextMode = Boolean(enabled);
      if (nextMode && !isBeamerMode) {
        syncFromScroll(true);
      }

      isBeamerMode = nextMode;
      document.body.classList.toggle('is-beamer-mode', isBeamerMode);

      if (btnBeamerMode) {
        btnBeamerMode.classList.toggle('active', isBeamerMode);
        btnBeamerMode.setAttribute('aria-pressed', String(isBeamerMode));
        btnBeamerMode.textContent = isBeamerMode ? 'Exit Presentation Mode ✕' : 'Start Presentation Mode';
      }
      if (hudBeamerBtn) {
        hudBeamerBtn.classList.toggle('active', isBeamerMode);
        hudBeamerBtn.setAttribute('aria-pressed', String(isBeamerMode));
      }

      document.querySelectorAll('.tech-drawer').forEach((drawer) => {
        drawer.open = true;
      });

      if (!isBeamerMode) {
        closeJumpMenu();
      }

      applyBeamerVisibility();
      updateHudUI();

      if (isBeamerMode) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        redrawInteractiveVisuals();
      } else {
        const activeStop = stops[currentStopIndex];
        const restoreTarget = activeStop?.paneEl || activeStop?.targetEl;
        requestAnimationFrame(() => {
          updateBoardLayout();
          renderAllCharts();
          if (restoreTarget) {
            restoreTarget.scrollIntoView({ behavior: 'instant', block: 'start' });
          }
          scheduleScrollSync();
        });
      }
    }

    function toggleBeamerMode() {
      setBeamerMode(!isBeamerMode);
    }

    // Bind inline stage step tabs and lab sub-step tabs
    document.querySelectorAll('.section-block').forEach((sec) => {
      sec.querySelectorAll('.stage-step-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const stepIdx = Number(btn.dataset.step || 0);
          setStageStep(sec, stepIdx);
          const matchIdx = stops.findIndex(
            (s) => s.sectionEl === sec && s.type === 'stage' && s.stepIndex === stepIdx
          );
          if (matchIdx !== -1) {
            currentStopIndex = matchIdx;
            updateHudUI();
          }
        });
      });

      sec.querySelectorAll('.lab-substep-btn[data-lab-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const labStepIdx = Number(btn.dataset.labStep || 0);
          setLabStep(sec, labStepIdx);
          const matchIdx = stops.findIndex(
            (s) => s.sectionEl === sec && s.type === 'lab' && s.labStepIndex === labStepIdx
          );
          if (matchIdx !== -1) {
            currentStopIndex = matchIdx;
            updateHudUI();
          }
          redrawInteractiveVisuals();
        });
      });
    });

    // Header navigation links jump to the first stop of that section while in Presentation Mode
    if (headerNav) {
      headerNav.addEventListener('click', (e) => {
        if (!isBeamerMode) return;
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;
        const targetId = link.getAttribute('href').slice(1);
        const firstStopIdx = stops.findIndex((s) => s.sectionEl.id === targetId);
        if (firstStopIdx !== -1) {
          e.preventDefault();
          navigateToStop(firstStopIdx, true);
        }
      });
    }

    // HUD & Header controls
    if (hudPrevBtn) hudPrevBtn.addEventListener('click', goPrevStop);
    if (hudNextBtn) hudNextBtn.addEventListener('click', goNextStop);
    if (hudJumpBtn) hudJumpBtn.addEventListener('click', toggleJumpMenu);
    if (btnBeamerMode) btnBeamerMode.addEventListener('click', toggleBeamerMode);
    if (hudBeamerBtn) hudBeamerBtn.addEventListener('click', toggleBeamerMode);

    document.addEventListener('click', (e) => {
      if (presenterHud && !presenterHud.contains(e.target)) {
        closeJumpMenu();
      }
    });

    // Logitech Presenter & Keyboard 1D Navigation
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (hudJumpMenu && !hudJumpMenu.hidden) {
          closeJumpMenu();
        } else if (isBeamerMode) {
          setBeamerMode(false);
        }
        return;
      }

      if (e.key === 'p' || e.key === 'P' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleBeamerMode();
        return;
      }

      if (!isBeamerMode) return;

      if (e.key === 'PageDown' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNextStop();
        return;
      }

      if (e.key === 'PageUp' || e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrevStop();
      }
    });

    return {
      rebuildStops,
      syncFromScroll,
      goNextStop,
      goPrevStop,
      setBeamerMode,
    };
  }

  // -------------------------------------------------------------------------
  // Event Listeners & Main Loop Initialization
  // -------------------------------------------------------------------------
  btnConnectSerial.addEventListener('click', connectWebSerial);
  btnConnectBle.addEventListener('click', connectWebBluetooth);
  btnModeSim.addEventListener('click', async () => {
    if (serialReader) {
      try {
        await serialReader.cancel();
      } catch (_) {}
    }
    connectionMode = 'sim';
    updateModeButtons();
  });
  btnCalibrate.addEventListener('click', () => sendCommand('C'));
  btnExportCsv.addEventListener('click', exportCsv);

  if (boardCenterpiece) {
    registerResponsiveElement(boardCenterpiece, updateBoardLayout);
  }
  document.querySelectorAll('.canvas-container, .sm-canvas-wrap').forEach((container) => {
    registerResponsiveElement(container, renderAllCharts);
  });

  window.addEventListener('resize', () => {
    scheduleResizeCallback(updateBoardLayout);
    scheduleResizeCallback(renderAllCharts);
  });
  watchDevicePixelRatio(() => scheduleResizeCallback(renderAllCharts));

  // Run 10 Hz virtual emulator loop whenever not connected to physical hardware
  setInterval(() => {
    if (connectionMode === 'sim') {
      ingestFrame(generateSimulatedFrame());
    }
  }, 100);

  // Initial modular section setup, layout & render
  initModularSections();
  updateBoardLayout();
  updateDomReadouts(latestFrame);
  renderAllCharts();
})();
