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

  // Initial layout & render
  updateBoardLayout();
  updateDomReadouts(latestFrame);
  renderAllCharts();
})();
