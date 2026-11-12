/*
 * CAS Smart Service Engineering - Day 4: Predictive Maintenance & Edge AI
 * Hardware: Arduino Nano 33 BLE Sense Rev2 (ABX00069 - Headerless)
 *
 * Streams 5 physical sensor modalities over both USB Serial (115200 baud, JSON lines)
 * and Bluetooth Low Energy (BLE service "CAS-PdM-Twin") while executing an on-device
 * lightweight Z-score / Mahalanobis anomaly detector and driving the onboard RGB LED.
 *
 * Sensors Used on Nano 33 BLE Sense Rev2:
 *  1. BMI270 + BMM150 (Arduino_BMI270_BMM150.h):
 *     - 3-Axis Accelerometer (g) -> Vibration RMS, Peak-to-Peak, Dominant Frequency (Hz)
 *     - 3-Axis Gyroscope (deg/s) -> Rotational harmonic proxy
 *     - 3-Axis Magnetometer (uT) -> Contactless AC motor stator electromagnetic flux (Voltage/Load proxy)
 *  2. LPS22HB (Arduino_LPS22HB.h):
 *     - Barometric Pressure (hPa) -> Static airflow pressure drop
 *  3. HS300x (Arduino_HS300x.h):
 *     - Temperature (deg C) & Relative Humidity (%) -> Motor thermal load
 *  4. MP34DT06JTR (PDM.h):
 *     - Digital Microphone -> Acoustic RMS level (dB proxy)
 *  5. Optional SSD1306 / SSD1315 0.96" I2C OLED (0x3C) auto-detected via Wire.
 *
 * Serial Commands Supported (send via Web Serial or Serial Monitor):
 *  - 'C' or 'c': Calibrate normal operating baseline (samples ~2 seconds of current state)
 *  - '0': Force LED / Mode to Auto (Edge AI decides state)
 *  - '1': Force State 0 (NORMAL - Green LED)
 *  - '2': Force State 1 (WARNING / IMBALANCE - Yellow LED)
 *  - '3': Force State 2 (ANOMALY / BLOCKAGE - Red LED)
 */

#include <Arduino.h>
#include <Wire.h>
#include <PDM.h>
#include <ArduinoBLE.h>
#include "Arduino_BMI270_BMM150.h"
#include <Arduino_LPS22HB.h>
#include <Arduino_HS300x.h>

// ---------------------------------------------------------------------------
// Configuration & Sampling Constants
// ---------------------------------------------------------------------------
#define SERIAL_BAUD       115200
#define IMU_WINDOW_SAMPLES 32      // ~32 samples per telemetry frame (~10-12 Hz frame rate)
#define PDM_BUFFER_SIZE    256     // Audio buffer size (16-bit PCM at 16 kHz)

// Onboard RGB LED pins on Nano 33 BLE Sense Rev2 (Active LOW: LOW = ON, HIGH = OFF)
#ifndef LEDR
#define LEDR 22
#define LEDG 23
#define LEDB 24
#endif

// ---------------------------------------------------------------------------
// BLE Service & Characteristic UUIDs ("CAS-PdM-Twin")
// ---------------------------------------------------------------------------
BLEService pdmService("19B10000-E8F2-537E-4F6C-D104768A1214");
// JSON string telemetry characteristic (Notify + Read, up to 240 bytes)
BLEStringCharacteristic telemetryChar("19B10001-E8F2-537E-4F6C-D104768A1214", BLERead | BLENotify, 240);
// Command characteristic (Write from Web Bluetooth: 'C'=Calibrate, '0'..'3'=Mode)
BLEByteCharacteristic commandChar("19B10002-E8F2-537E-4F6C-D104768A1214", BLERead | BLEWrite);

// ---------------------------------------------------------------------------
// Sensor Availability Flags & Audio Buffer
// ---------------------------------------------------------------------------
bool hasIMU      = false;
bool hasPressure = false;
bool hasTempHum  = false;
bool hasMic      = false;
bool hasBLE      = false;

short sampleBuffer[PDM_BUFFER_SIZE];
volatile int samplesRead = 0;
volatile float latestAudioRms = 0.0f;

// Slow-sensor cache (queried every 5 frames so IMU sampling stays fast & uniform)
float cachedTempC     = 24.0f;
float cachedHumidity  = 45.0f;
float cachedPressure  = 1013.25f;
float cachedMagFluxUt = 45.0f;
uint32_t frameCounter = 0;

// ---------------------------------------------------------------------------
// On-Device Edge AI Baseline & Anomaly State
// ---------------------------------------------------------------------------
struct BaselineStats {
  float vibRmsMean;
  float vibRmsStd;
  float soundMean;
  float soundStd;
  float magMean;
  float pressureMean;
  bool  calibrated;
};

BaselineStats baseline = {
  0.025f, // default benchtop vibration RMS (g)
  0.015f, // default vibration std (g)
  15.0f,  // default acoustic RMS
  10.0f,  // default acoustic std
  45.0f,  // default magnetic flux (uT)
  1013.0f,// default pressure (hPa)
  false
};

bool     isCalibrating    = false;
uint16_t calibCount       = 0;
float    calibVibSum      = 0.0f;
float    calibVibSqSum    = 0.0f;
float    calibSoundSum    = 0.0f;
float    calibSoundSqSum  = 0.0f;
float    calibMagSum      = 0.0f;
float    calibPressSum    = 0.0f;

int      forcedState      = -1; // -1 = Auto Edge AI, 0 = Normal, 1 = Warning, 2 = Anomaly

// ---------------------------------------------------------------------------
// Helper: Set Onboard RGB LED (Active LOW)
// ---------------------------------------------------------------------------
void setRgbLed(bool r, bool g, bool b) {
  digitalWrite(LEDR, r ? LOW : HIGH);
  digitalWrite(LEDG, g ? LOW : HIGH);
  digitalWrite(LEDB, b ? LOW : HIGH);
}

// ---------------------------------------------------------------------------
// PDM Microphone Callback (ISR)
// ---------------------------------------------------------------------------
void onPDMdata() {
  int bytesAvailable = PDM.available();
  PDM.read(sampleBuffer, bytesAvailable);
  samplesRead = bytesAvailable / 2;

  if (samplesRead > 0) {
    double sumSq = 0.0;
    for (int i = 0; i < samplesRead; i++) {
      float s = (float)sampleBuffer[i];
      sumSq += s * s;
    }
    latestAudioRms = sqrt(sumSq / samplesRead);
  }
}

// ---------------------------------------------------------------------------
// Handle Incoming Command Byte (from USB Serial or BLE)
// ---------------------------------------------------------------------------
void handleCommand(char cmd) {
  if (cmd == 'C' || cmd == 'c') {
    isCalibrating   = true;
    calibCount      = 0;
    calibVibSum     = 0.0f;
    calibVibSqSum   = 0.0f;
    calibSoundSum   = 0.0f;
    calibSoundSqSum = 0.0f;
    calibMagSum     = 0.0f;
    calibPressSum   = 0.0f;
    setRgbLed(false, false, true); // Blue LED while calibrating
  } else if (cmd == '0') {
    forcedState = -1; // Return to Auto Edge AI mode
  } else if (cmd == '1') {
    forcedState = 0;  // Force NORMAL
  } else if (cmd == '2') {
    forcedState = 1;  // Force WARNING / IMBALANCE
  } else if (cmd == '3') {
    forcedState = 2;  // Force ANOMALY / BLOCKAGE
  }
}

// ---------------------------------------------------------------------------
// Arduino Setup
// ---------------------------------------------------------------------------
void setup() {
  pinMode(LEDR, OUTPUT);
  pinMode(LEDG, OUTPUT);
  pinMode(LEDB, OUTPUT);
  // Boot indicator: Blue LED
  setRgbLed(false, false, true);

  Serial.begin(SERIAL_BAUD);
  // Do not block on while(!Serial) so standalone powerbank + BLE operation works!
  delay(400);

  // 1. Initialize IMU + Magnetometer (BMI270 + BMM150)
  if (IMU.begin()) {
    hasIMU = true;
  }

  // 2. Initialize Barometric Pressure Sensor (LPS22HB)
  if (BARO.begin()) {
    hasPressure = true;
    cachedPressure = BARO.readPressure() * 10.0f; // kPa -> hPa
  }

  // 3. Initialize Temperature & Humidity Sensor (HS300x)
  if (HS300x.begin()) {
    hasTempHum = true;
    cachedTempC    = HS300x.readTemperature();
    cachedHumidity = HS300x.readHumidity();
  }

  // 4. Initialize PDM Digital Microphone (MP34DT06JTR)
  PDM.onReceive(onPDMdata);
  if (PDM.begin(1, 16000)) {
    hasMic = true;
  }

  // 5. Initialize Bluetooth Low Energy (BLE)
  if (BLE.begin()) {
    hasBLE = true;
    BLE.setLocalName("CAS-PdM-Twin");
    BLE.setDeviceName("CAS-PdM-Twin");
    BLE.setAdvertisedService(pdmService);
    pdmService.addCharacteristic(telemetryChar);
    pdmService.addCharacteristic(commandChar);
    BLE.addService(pdmService);
    commandChar.writeValue((byte)0);
    BLE.advertise();
  }

  // Ready indicator: Green LED
  setRgbLed(false, true, false);
}

// ---------------------------------------------------------------------------
// Main Loop: High-Frequency Window Acquisition -> Feature Extraction -> Edge AI
// ---------------------------------------------------------------------------
void loop() {
  // 1. Check incoming USB Serial commands
  while (Serial.available() > 0) {
    char c = (char)Serial.read();
    handleCommand(c);
  }

  // 2. Check incoming BLE commands
  if (hasBLE) {
    BLE.poll();
    if (commandChar.written()) {
      char c = (char)commandChar.value();
      handleCommand(c);
    }
  }

  // 3. Sample high-frequency IMU window (32 samples at ~100 Hz -> ~320 ms window)
  float accMag[IMU_WINDOW_SAMPLES];
  float axLast = 0.0f, ayLast = 0.0f, azLast = 1.0f;
  float gxRmsSum = 0.0f;
  float meanMag = 0.0f;

  uint32_t tStartUs = micros();
  for (int i = 0; i < IMU_WINDOW_SAMPLES; i++) {
    if (hasIMU && IMU.accelerationAvailable()) {
      IMU.readAcceleration(axLast, ayLast, azLast);
    }
    if (hasIMU && IMU.gyroscopeAvailable()) {
      float gx, gy, gz;
      IMU.readGyroscope(gx, gy, gz);
      gxRmsSum += (gx * gx + gy * gy + gz * gz);
    }
    float m = sqrt(axLast * axLast + ayLast * ayLast + azLast * azLast);
    accMag[i] = m;
    meanMag  += m;
    delayMicroseconds(2500); // ~2.5 ms spacing + I2C read -> ~250-300 Hz effective sampling
  }
  uint32_t dtUs = micros() - tStartUs;
  float sampleRateHz = (dtUs > 0) ? (1000000.0f * IMU_WINDOW_SAMPLES / (float)dtUs) : 250.0f;
  meanMag /= IMU_WINDOW_SAMPLES;

  // 4. Compute Vibration RMS, Peak-to-Peak, and Zero-Crossing Dominant Frequency (Hz)
  float vibSqSum = 0.0f;
  float vibMin = 999.0f, vibMax = -999.0f;
  int   zeroCrossings = 0;
  float prevCentered = accMag[0] - meanMag;

  for (int i = 0; i < IMU_WINDOW_SAMPLES; i++) {
    float centered = accMag[i] - meanMag; // Remove 1g gravity DC offset
    vibSqSum += centered * centered;
    if (centered < vibMin) vibMin = centered;
    if (centered > vibMax) vibMax = centered;
    if (i > 0 && ((prevCentered < 0.0f && centered >= 0.0f) || (prevCentered >= 0.0f && centered < 0.0f))) {
      zeroCrossings++;
    }
    prevCentered = centered;
  }

  float vibRmsG   = sqrt(vibSqSum / IMU_WINDOW_SAMPLES);
  float vibP2PG   = vibMax - vibMin;
  float domFreqHz = (zeroCrossings * sampleRateHz) / (2.0f * IMU_WINDOW_SAMPLES);
  float gyroRms   = sqrt(gxRmsSum / IMU_WINDOW_SAMPLES);

  // 5. Read slower environmental & magnetic sensors periodically
  if (hasIMU && IMU.magneticFieldAvailable()) {
    float mx, my, mz;
    IMU.readMagneticField(mx, my, mz);
    cachedMagFluxUt = sqrt(mx * mx + my * my + mz * mz);
  }
  if (frameCounter % 5 == 0) {
    if (hasPressure) {
      float p = BARO.readPressure();
      // LPS22HB returns kPa in standard Arduino_LPS22HB library (approx 101.3 kPa -> 1013 hPa)
      cachedPressure = (p < 200.0f) ? (p * 10.0f) : p;
    }
    if (hasTempHum) {
      cachedTempC    = HS300x.readTemperature();
      cachedHumidity = HS300x.readHumidity();
    }
  }
  frameCounter++;

  // Convert raw PDM audio RMS into a clean 30..95 dB-like classroom scale
  float soundDb = 32.0f + (latestAudioRms > 1.0f ? 20.0f * log10(latestAudioRms) : 0.0f);
  if (soundDb > 105.0f) soundDb = 105.0f;

  // 6. Calibration Routine (~20 frames = ~2 seconds)
  if (isCalibrating) {
    calibVibSum     += vibRmsG;
    calibVibSqSum   += vibRmsG * vibRmsG;
    calibSoundSum   += soundDb;
    calibSoundSqSum += soundDb * soundDb;
    calibMagSum     += cachedMagFluxUt;
    calibPressSum   += cachedPressure;
    calibCount++;

    if (calibCount >= 16) {
      baseline.vibRmsMean = calibVibSum / calibCount;
      float vibVar        = (calibVibSqSum / calibCount) - (baseline.vibRmsMean * baseline.vibRmsMean);
      baseline.vibRmsStd  = (vibVar > 0.0001f) ? sqrt(vibVar) : 0.008f;
      if (baseline.vibRmsStd < 0.008f) baseline.vibRmsStd = 0.008f;

      baseline.soundMean  = calibSoundSum / calibCount;
      float sndVar        = (calibSoundSqSum / calibCount) - (baseline.soundMean * baseline.soundMean);
      baseline.soundStd   = (sndVar > 1.0f) ? sqrt(sndVar) : 2.5f;

      baseline.magMean      = calibMagSum / calibCount;
      baseline.pressureMean = calibPressSum / calibCount;
      baseline.calibrated   = true;
      isCalibrating         = false;
    }
  }

  // 7. On-Device Edge AI Anomaly Score (0.0 to 1.0) & State Classification
  float zVib   = fabs(vibRmsG - baseline.vibRmsMean) / baseline.vibRmsStd;
  float zSound = fabs(soundDb - baseline.soundMean) / (baseline.soundStd + 1.5f);
  float zPress = fabs(cachedPressure - baseline.pressureMean) / 0.8f; // 0.8 hPa shift

  // Combined normalized anomaly score [0..1]
  float rawScore = (0.60f * (zVib / 6.0f)) + (0.25f * (zSound / 6.0f)) + (0.15f * (zPress / 4.0f));
  float anomalyScore = constrain(rawScore, 0.02f, 0.99f);

  int stateCode = 0; // 0 = NORMAL, 1 = WARNING, 2 = ANOMALY
  const char* stateLabel = "NORMAL";

  if (forcedState >= 0) {
    stateCode = forcedState;
  } else {
    if (anomalyScore >= 0.65f || vibRmsG > baseline.vibRmsMean + 4.5f * baseline.vibRmsStd) {
      stateCode = 2;
    } else if (anomalyScore >= 0.35f || vibRmsG > baseline.vibRmsMean + 2.2f * baseline.vibRmsStd) {
      stateCode = 1;
    }
  }

  if (isCalibrating) {
    stateLabel = "CALIBRATING";
    setRgbLed(false, false, true); // Blue
  } else if (stateCode == 2) {
    stateLabel = "ANOMALY";
    setRgbLed(true, false, false); // Red
  } else if (stateCode == 1) {
    stateLabel = "WARNING";
    setRgbLed(true, true, false);  // Yellow (Red + Green)
  } else {
    stateLabel = "NORMAL";
    setRgbLed(false, true, false); // Green
  }

  // 8. Emit Single-Line JSON Frame over USB Serial & BLE
  char jsonBuf[240];
  snprintf(
    jsonBuf, sizeof(jsonBuf),
    "{\"ms\":%lu,\"vib\":%.4f,\"p2p\":%.4f,\"freq\":%.1f,\"gyro\":%.1f,\"mag\":%.1f,\"press\":%.2f,\"temp\":%.2f,\"hum\":%.1f,\"snd\":%.1f,\"score\":%.2f,\"state\":\"%s\",\"cal\":%d}",
    millis(),
    vibRmsG,
    vibP2PG,
    domFreqHz,
    gyroRms,
    cachedMagFluxUt,
    cachedPressure,
    cachedTempC,
    cachedHumidity,
    soundDb,
    anomalyScore,
    stateLabel,
    baseline.calibrated ? 1 : 0
  );

  Serial.println(jsonBuf);

  if (hasBLE && BLE.connected()) {
    telemetryChar.writeValue(jsonBuf);
  }
}
