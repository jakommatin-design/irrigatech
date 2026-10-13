/*
 * ===============================================================================
 *  IRRIGA-TECH SMART GREENHOUSE & AUTOMATED IRRIGATION SYSTEM
 *  Firmware Version: V2.4 (Production Grade)
 * ===============================================================================
 *  Features:
 *   - DHT11 Temperature & Humidity Sensor (Pin D2) with isnan() guard
 *   - FC-28 Analog Soil Moisture Sensor (Pin A0) with calibrated dryness logic
 *   - 4-Channel Relay Module:
 *       • Pin D3: Submersible Water Pump
 *       • Pin D7: Climate AC / Extraction Fan
 *       • Pin D8: Alert Buzzer / Visual Status LED
 *   - I2C 16x2 Character LCD (0x27)
 *   - JSON Serial Communication Protocol (9600 Baud)
 *   - Bidirectional Command Listener for Web Dashboard Control
 *   - Non-blocking millis() loop for instant command response
 * ===============================================================================
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

// Pin definitions
#define DHTPIN 2              // Digital pin for DHT11 sensor
#define DHTTYPE DHT11         // DHT 11
#define SOIL_MOISTURE_PIN A0  // Analog pin for FC-28 soil moisture sensor
#define PH_SENSOR_PIN A1      // Analog pin for Soil pH Sensor probe (PH-4502C / E-201-C)
#define RELAY_PIN 3           // Relay for Water Pump
#define AC_PIN 7              // Relay for AC / Ventilation Fan
#define LED_PIN 8             // Buzzer & Status LED

// LCD and DHT objects
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// Operational thresholds
float DRY_SOIL_THRESHOLD = 70.0; // Soil dryness percentage (> 70% triggers pump)
float HIGH_TEMP_THRESHOLD = 32.0; // Temperature (> 32°C triggers AC)
float LOW_TEMP_THRESHOLD  = 18.0;

// State tracking
bool pumpState = false;
bool acState   = false;
bool ledState  = false;
bool manualOverride = false;

unsigned long lastSensorReadTime = 0;
const unsigned long SENSOR_INTERVAL = 2000; // 2 seconds

// Non-blocking pump safety cutoff (Max 5 minutes)
unsigned long pumpStartTime = 0;
const unsigned long MAX_PUMP_DURATION = 300000; // 5 minutes

void setup() {
  Serial.begin(9600);

  // Initialize Relays and LED (Active HIGH or LOW depending on relay module)
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(AC_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);

  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(AC_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  // Initialize LCD
  lcd.init();
  lcd.clear();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("IRRIGA-TECH V2.4");
  lcd.setCursor(0, 1);
  lcd.print("System Booting...");

  // Initialize DHT
  dht.begin();
  delay(1200);

  lcd.clear();
  lcd.print("Sensors Online");
  delay(800);
}

void loop() {
  // 1. Process any incoming serial commands from Web Dashboard
  processSerialCommands();

  // 2. Safety guard: auto cutoff if pump runs longer than 5 minutes
  if (pumpState && (millis() - pumpStartTime > MAX_PUMP_DURATION)) {
    pumpState = false;
    ledState = false;
    digitalWrite(RELAY_PIN, LOW);
    digitalWrite(LED_PIN, LOW);
    manualOverride = false;
  }

  // 3. Periodic Sensor Acquisition (Non-blocking every 2s)
  unsigned long currentMillis = millis();
  if (currentMillis - lastSensorReadTime >= SENSOR_INTERVAL) {
    lastSensorReadTime = currentMillis;
    readSensorsAndUpdate();
  }
}

void readSensorsAndUpdate() {
  float hum = dht.readHumidity();
  float temp = dht.readTemperature();

  // Guard against DHT NaN read failures (Bug #2 resolved)
  if (isnan(hum) || isnan(temp)) {
    Serial.println("{\"error\":\"DHT_READ_FAILED\",\"retry\":true}");
    lcd.setCursor(0, 0);
    lcd.print("DHT Sensor Error");
    return;
  }

  // Read analog soil moisture (0-1023)
  // Higher analog read = dryer soil on resistive probes
  int rawSoil = analogRead(SOIL_MOISTURE_PIN);
  float soilDryPercentage = (rawSoil / 1023.0) * 100.0;

  // Automated irrigation decision (if not under manual override)
  if (!manualOverride) {
    if (soilDryPercentage > DRY_SOIL_THRESHOLD) {
      if (!pumpState) {
        pumpState = true;
        ledState = true;
        pumpStartTime = millis();
        digitalWrite(RELAY_PIN, HIGH);
        digitalWrite(LED_PIN, HIGH);
      }
    } else if (soilDryPercentage < 45.0) { // Well hydrated hysteresis target
      if (pumpState) {
        pumpState = false;
        ledState = false;
        digitalWrite(RELAY_PIN, LOW);
        digitalWrite(LED_PIN, LOW);
      }
    }

    // Automated Climate control
    if (temp > HIGH_TEMP_THRESHOLD || temp < LOW_TEMP_THRESHOLD) {
      acState = true;
      digitalWrite(AC_PIN, HIGH);
    } else {
      acState = false;
      digitalWrite(AC_PIN, LOW);
    }
  }

  // Update physical 16x2 LCD display
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print((int)temp);
  lcd.print("C H:");
  lcd.print((int)hum);
  lcd.print("%");

  lcd.setCursor(0, 1);
  lcd.print("S:");
  lcd.print((int)soilDryPercentage);
  lcd.print("% P:");
  lcd.print(pumpState ? "ON " : "OFF");

  // Read analog soil pH probe (A1)
  int rawPh = analogRead(PH_SENSOR_PIN);
  float soilPh = 3.5 + (rawPh / 1023.0) * 5.5; // Calibration: maps ADC to 3.5–9.0 pH range

  // Output structured JSON telemetry for Web/Serial Bridge
  Serial.print("{\"temperature\":");
  Serial.print(temp, 1);
  Serial.print(",\"humidity\":");
  Serial.print(hum, 1);
  Serial.print(",\"soilMoisture\":");
  Serial.print(soilDryPercentage, 1);
  Serial.print(",\"soilPh\":");
  Serial.print(soilPh, 2);
  Serial.print(",\"pump\":");
  Serial.print(pumpState ? "true" : "false");
  Serial.print(",\"ac\":");
  Serial.print(acState ? "true" : "false");
  Serial.print(",\"led\":");
  Serial.print(ledState ? "true" : "false");
  Serial.println("}");
}

void processSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    if (command == "PUMP_ON") {
      manualOverride = true;
      pumpState = true;
      ledState = true;
      pumpStartTime = millis();
      digitalWrite(RELAY_PIN, HIGH);
      digitalWrite(LED_PIN, HIGH);
      Serial.println("{\"ack\":\"PUMP_ON_EXECUTED\"}");
    } else if (command == "PUMP_OFF") {
      manualOverride = false;
      pumpState = false;
      ledState = false;
      digitalWrite(RELAY_PIN, LOW);
      digitalWrite(LED_PIN, LOW);
      Serial.println("{\"ack\":\"PUMP_OFF_EXECUTED\"}");
    } else if (command == "AC_ON") {
      acState = true;
      digitalWrite(AC_PIN, HIGH);
      Serial.println("{\"ack\":\"AC_ON_EXECUTED\"}");
    } else if (command == "AC_OFF") {
      acState = false;
      digitalWrite(AC_PIN, LOW);
      Serial.println("{\"ack\":\"AC_OFF_EXECUTED\"}");
    } else if (command == "LED_ON") {
      ledState = true;
      digitalWrite(LED_PIN, HIGH);
      Serial.println("{\"ack\":\"LED_ON_EXECUTED\"}");
    } else if (command == "LED_OFF") {
      ledState = false;
      digitalWrite(LED_PIN, LOW);
      Serial.println("{\"ack\":\"LED_OFF_EXECUTED\"}");
    }
  }
}
