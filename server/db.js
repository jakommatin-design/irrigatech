import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'irrigatech.db');

// Initialize single-file SQLite database
const sqlite = new Database(DB_PATH);

// Enable Write-Ahead Logging (WAL) for high performance & crash-resilience on Raspberry Pi / PC
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');

// ─── 1. Schema Definition ──────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    iso_time TEXT NOT NULL,
    soil_moisture REAL,
    temperature REAL,
    humidity REAL,
    light_lux REAL,
    battery_voltage REAL,
    battery_soc REAL,
    solar_watts REAL,
    water_tank REAL,
    flow_rate REAL DEFAULT 0.0,
    pump INTEGER DEFAULT 0,
    ac INTEGER DEFAULT 0,
    shade_pct INTEGER DEFAULT 20,
    zone1_moisture REAL,
    zone2_moisture REAL,
    zone3_moisture REAL,
    zone4_moisture REAL
  );

  CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp);

  CREATE TABLE IF NOT EXISTS irrigation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    iso_time TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT DEFAULT 'AUTO_SCHEDULE',
    source TEXT DEFAULT 'ARDUINO_CORE',
    zone_id INTEGER DEFAULT 1,
    duration_seconds INTEGER DEFAULT 0,
    water_liters REAL DEFAULT 0.0
  );

  CREATE INDEX IF NOT EXISTS idx_irrigation_timestamp ON irrigation_events(timestamp);

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    iso_time TEXT NOT NULL,
    type TEXT NOT NULL, -- 'warning', 'info', 'critical'
    category TEXT,      -- 'battery', 'water', 'temperature', 'soil'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    acknowledged INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    crop TEXT NOT NULL,
    location TEXT,
    moisture_min REAL DEFAULT 35.0,
    moisture_max REAL DEFAULT 50.0,
    target_vpd REAL DEFAULT 0.85
  );

  CREATE TABLE IF NOT EXISTS device_thresholds (
    key TEXT PRIMARY KEY,
    value REAL NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// ─── 2. Seed Default Farms if empty ─────────────────────────────────────────
const farmCount = sqlite.prepare('SELECT count(*) as cnt FROM farms').get().cnt;
if (farmCount === 0) {
  const insertFarm = sqlite.prepare(`
    INSERT INTO farms (id, name, crop, location, moisture_min, moisture_max, target_vpd)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertFarm.run('farm-tomato', 'Greenhouse 1 (Alpha)', 'Tomato (Vegetative)', 'Nanyuki Agrotech Cluster', 35.0, 50.0, 0.85);
  insertFarm.run('farm-peppers', 'Greenhouse 2 (Beta)', 'Sweet Bell Peppers', 'Zone 2 Automated Bed', 40.0, 55.0, 0.95);
  insertFarm.run('farm-lettuce', 'Greenhouse 3 (Hydro)', 'Butterhead Lettuce', 'Vertical Hydro Bed 3', 45.0, 65.0, 0.75);
  insertFarm.run('farm-herbs', 'Greenhouse 4 (Spices)', 'Basil & Mint', 'High-humidity Herb Zone', 30.0, 45.0, 0.90);
}

// ─── 3. Prepared Statements ────────────────────────────────────────────────
const stmtInsertTelemetry = sqlite.prepare(`
  INSERT INTO telemetry (
    timestamp, iso_time, soil_moisture, temperature, humidity, light_lux,
    battery_voltage, battery_soc, solar_watts, water_tank, flow_rate,
    pump, ac, shade_pct, zone1_moisture, zone2_moisture, zone3_moisture, zone4_moisture
  ) VALUES (
    @timestamp, @iso_time, @soil_moisture, @temperature, @humidity, @light_lux,
    @battery_voltage, @battery_soc, @solar_watts, @water_tank, @flow_rate,
    @pump, @ac, @shade_pct, @zone1_moisture, @zone2_moisture, @zone3_moisture, @zone4_moisture
  )
`);

const stmtInsertIrrigation = sqlite.prepare(`
  INSERT INTO irrigation_events (
    timestamp, iso_time, action, reason, source, zone_id, duration_seconds, water_liters
  ) VALUES (
    @timestamp, @iso_time, @action, @reason, @source, @zone_id, @duration_seconds, @water_liters
  )
`);

const stmtInsertAlert = sqlite.prepare(`
  INSERT INTO alerts (
    timestamp, iso_time, type, category, title, message, acknowledged
  ) VALUES (
    @timestamp, @iso_time, @type, @category, @title, @message, 0
  )
`);

// ─── 4. Database API Object ────────────────────────────────────────────────
export const db = {
  /**
   * Log incoming sensor telemetry stream to SQLite
   */
  logTelemetry(reading) {
    const ts = reading.ts || Date.now();
    const zm = reading.zoneMoisture || {};
    const entry = {
      timestamp: ts,
      iso_time: new Date(ts).toISOString(),
      soil_moisture: reading.soilMoisture ?? zm.zone1 ?? 42.0,
      temperature: reading.temperature ?? 28.0,
      humidity: reading.humidity ?? 65.0,
      light_lux: reading.lightLux ?? 720.0,
      battery_voltage: reading.batteryVoltage ?? 12.4,
      battery_soc: reading.batterySoc ?? 80.0,
      solar_watts: reading.solarWatts ?? 180.0,
      water_tank: reading.waterTank ?? 75.0,
      flow_rate: reading.pump ? (reading.flowRate || 1.4) : 0.0,
      pump: reading.pump ? 1 : 0,
      ac: reading.ac ? 1 : 0,
      shade_pct: reading.shadePct ?? 20,
      zone1_moisture: zm.zone1 ?? reading.soilMoisture ?? 42.0,
      zone2_moisture: zm.zone2 ?? 44.5,
      zone3_moisture: zm.zone3 ?? 52.0,
      zone4_moisture: zm.zone4 ?? 48.0
    };

    stmtInsertTelemetry.run(entry);
    return entry;
  },

  /**
   * Log irrigation start/stop event
   */
  logIrrigation(action, source = 'AUTO', reason = 'SCHEDULE', zoneId = 1, duration = 0, waterLiters = 0.0) {
    const ts = Date.now();
    const entry = {
      timestamp: ts,
      iso_time: new Date(ts).toISOString(),
      action,
      reason,
      source,
      zone_id: zoneId,
      duration_seconds: duration,
      water_liters: waterLiters
    };

    stmtInsertIrrigation.run(entry);
    return entry;
  },

  /**
   * Log system alert / warning
   */
  logAlert(type, category, title, message) {
    const ts = Date.now();
    const entry = {
      timestamp: ts,
      iso_time: new Date(ts).toISOString(),
      type,
      category,
      title,
      message
    };

    stmtInsertAlert.run(entry);
    return entry;
  },

  /**
   * Retrieve recent telemetry records
   */
  getRecentTelemetry(limit = 50) {
    const query = sqlite.prepare(`
      SELECT * FROM telemetry 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return query.all(limit).reverse();
  },

  /**
   * Retrieve telemetry within time range
   */
  getTelemetryRange(startTs, endTs) {
    const query = sqlite.prepare(`
      SELECT * FROM telemetry 
      WHERE timestamp BETWEEN ? AND ? 
      ORDER BY timestamp ASC
    `);
    return query.all(startTs, endTs);
  },

  /**
   * Retrieve irrigation history
   */
  getIrrigationLogs(limit = 50) {
    const query = sqlite.prepare(`
      SELECT * FROM irrigation_events 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return query.all(limit);
  },

  /**
   * Retrieve alerts
   */
  getAlerts(limit = 50) {
    const query = sqlite.prepare(`
      SELECT * FROM alerts 
      ORDER BY timestamp DESC 
      LIMIT ?
    `);
    return query.all(limit);
  },

  /**
   * Retrieve all registered farms
   */
  getFarms() {
    return sqlite.prepare('SELECT * FROM farms').all();
  },

  /**
   * Aggregate 7-day stats for Analytics
   */
  getWeeklyStats() {
    const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const stats = sqlite.prepare(`
      SELECT 
        strftime('%m-%d', timestamp / 1000, 'unixepoch') as day,
        round(avg(soil_moisture), 1) as avg_soil,
        round(avg(temperature), 1) as avg_temp,
        round(avg(humidity), 1) as avg_humidity,
        round(sum(flow_rate) * 2 / 60, 1) as water_usage_liters
      FROM telemetry 
      WHERE timestamp >= ?
      GROUP BY day
      ORDER BY day ASC
    `).all(oneWeekAgo);

    return stats;
  },

  /**
   * Close database gracefully
   */
  close() {
    sqlite.close();
  }
};
