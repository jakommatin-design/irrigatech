/*
 * ===============================================================================
 *  IRRIGA-TECH SMART GREENHOUSE & AUTOMATED IRRIGATION SYSTEM
 *  Firmware Version: V2.4 (Production Grade)
 * ===============================================================================
 *  Features:
 *   - DHT11 Temperature & Humidity Sensor (GPIO 4 on ESP32, D2 on classic Arduino)
 *   - Soil moisture and pH analog inputs (GPIO 34/35 on ESP32, A0/A1 on Arduino)
 *   - Relay outputs (GPIO 25/26/27 on ESP32; D3/D7/D8 on Arduino)
 *   - I2C 16x2 Character LCD (0x27)
 *   - JSON Serial Communication Protocol (9600 Baud) for local USB mode
 *   - Optional Wi-Fi telemetry and command polling over certificate-verified HTTPS on ESP32
 *   - Non-blocking millis() loop for instant command response
 * ===============================================================================
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

#if defined(ESP32)
  #include <WiFi.h>
  #include <WiFiClientSecure.h>
  #include <HTTPClient.h>
  #if __has_include("secrets.h")
    #include "secrets.h" // Copy secrets.example.h to secrets.h and fill it locally; never commit it.
    #define IRRIGA_HAS_CLOUD_CONFIG 1
  #else
    #define IRRIGA_HAS_CLOUD_CONFIG 0
  #endif
  #define IRRIGA_DHT_PIN 4
  #define IRRIGA_SOIL_PIN 34
  #define IRRIGA_PH_PIN 35
  #define IRRIGA_RELAY_PIN 25
  #define IRRIGA_AC_PIN 26
  #define IRRIGA_LED_PIN 27
  #define IRRIGA_ADC_MAX 4095.0
#else
  #define IRRIGA_DHT_PIN 2
  #define IRRIGA_SOIL_PIN A0
  #define IRRIGA_PH_PIN A1
  #define IRRIGA_RELAY_PIN 3
  #define IRRIGA_AC_PIN 7
  #define IRRIGA_LED_PIN 8
  #define IRRIGA_ADC_MAX 1023.0
  #define IRRIGA_HAS_CLOUD_CONFIG 0
#endif

// Pin definitions
#define DHTPIN IRRIGA_DHT_PIN // ESP32 uses GPIO4; classic Arduino uses D2
#define DHTTYPE DHT11         // DHT 11
#define SOIL_MOISTURE_PIN IRRIGA_SOIL_PIN
#define PH_SENSOR_PIN IRRIGA_PH_PIN
#define RELAY_PIN IRRIGA_RELAY_PIN
#define AC_PIN IRRIGA_AC_PIN
#define LED_PIN IRRIGA_LED_PIN

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
unsigned long lastCloudPostTime = 0;
unsigned long lastCloudCommandPollTime = 0;
unsigned long lastWiFiAttemptTime = 0;

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
#if defined(ESP32) && IRRIGA_HAS_CLOUD_CONFIG
  WiFi.mode(WIFI_STA);
  WiFi.begin(IRRIGA_WIFI_SSID, IRRIGA_WIFI_PASSWORD);
#endif
  delay(1200);

  lcd.clear();
  lcd.print("Sensors Online");
  delay(800);
}

void loop() {
  // 1. Process any incoming serial commands from Web Dashboard
  processSerialCommands();
  serviceCloudConnection();

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
  float soilDryPercentage = (rawSoil / IRRIGA_ADC_MAX) * 100.0;

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
  float soilPh = 3.5 + (rawPh / IRRIGA_ADC_MAX) * 5.5; // Calibrate with your pH probe before field use

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

#if defined(ESP32) && IRRIGA_HAS_CLOUD_CONFIG
  if (WiFi.status() == WL_CONNECTED && millis() - lastCloudPostTime >= 10000) {
    lastCloudPostTime = millis();
    postCloudTelemetry(temp, hum, soilDryPercentage, soilPh);
  }
#endif
}

void serviceCloudConnection() {
#if defined(ESP32) && IRRIGA_HAS_CLOUD_CONFIG
  if (WiFi.status() != WL_CONNECTED && millis() - lastWiFiAttemptTime >= 15000) {
    lastWiFiAttemptTime = millis();
    WiFi.disconnect();
    WiFi.begin(IRRIGA_WIFI_SSID, IRRIGA_WIFI_PASSWORD);
  }
  if (WiFi.status() == WL_CONNECTED && millis() - lastCloudCommandPollTime >= 5000) {
    lastCloudCommandPollTime = millis();
    pollCloudCommands();
  }
#endif
}

#if defined(ESP32) && IRRIGA_HAS_CLOUD_CONFIG
WiFiClientSecure createVerifiedTlsClient() {
  WiFiClientSecure client;
  client.setCACert(IRRIGA_ROOT_CA_PEM); // CA verification stays enabled; do not replace with setInsecure().
  return client;
}

void postCloudTelemetry(float temp, float hum, float soil, float ph) {
  WiFiClientSecure client = createVerifiedTlsClient();
  HTTPClient http;
  String url = String(IRRIGA_API_BASE_URL) + "/api/device/telemetry";
  http.setTimeout(2000);
  if (!http.begin(client, url)) return;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", IRRIGA_DEVICE_TOKEN);
  StaticJsonDocument<384> doc;
  doc["deviceId"] = IRRIGA_DEVICE_ID;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["soilMoisture"] = soil;
  doc["soilPh"] = ph;
  doc["pump"] = pumpState;
  doc["ac"] = acState;
  doc["led"] = ledState;
  doc["uptime"] = millis() / 1000;
  String body;
  serializeJson(doc, body);
  int status = http.POST(body);
  if (status < 200 || status >= 300) Serial.printf("Cloud telemetry HTTP %d\n", status);
  http.end();
}

void pollCloudCommands() {
  WiFiClientSecure client = createVerifiedTlsClient();
  HTTPClient http;
  String url = String(IRRIGA_API_BASE_URL) + "/api/device/commands";
  http.setTimeout(2000);
  if (!http.begin(client, url)) return;
  http.addHeader("X-Device-Token", IRRIGA_DEVICE_TOKEN);
  int status = http.GET();
  if (status == 200) {
    StaticJsonDocument<1024> doc;
    if (deserializeJson(doc, http.getString()) == DeserializationError::Ok) {
      for (JsonObject command : doc["commands"].as<JsonArray>()) {
        String id = command["id"] | "";
        String name = command["cmd"] | "";
        executeCommand(name);
        http.end();
        WiFiClientSecure ackClient = createVerifiedTlsClient();
        HTTPClient ack;
        String ackUrl = String(IRRIGA_API_BASE_URL) + "/api/device/commands/" + id + "/ack";
        ack.setTimeout(2000);
        if (ack.begin(ackClient, ackUrl)) {
          ack.addHeader("X-Device-Token", IRRIGA_DEVICE_TOKEN);
          ack.addHeader("Content-Type", "application/json");
          ack.POST("{\"success\":true}");
          ack.end();
        }
        return;
      }
    }
  }
  http.end();
}
#endif

void processSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    executeCommand(command);
  }
}

void executeCommand(String command) {
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
