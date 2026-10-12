import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const DB_CONFIG = {
  host: process.env.TIDB_HOST || 'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
  port: parseInt(process.env.TIDB_PORT || '4000', 10),
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  database: process.env.TIDB_DATABASE || 'irrigatech',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
};

let pool = null;
let isConnected = false;

// ─── 1. Initialize Pool & Schema ───────────────────────────────────────────
export async function initTiDB() {
  if (!DB_CONFIG.password) {
    isConnected = false;
    console.error('[TiDB] TIDB_PASSWORD not set. Skipping TiDB init (SQLite fallback remains active).');
    return;
  }
  if (!DB_CONFIG.user) {
    isConnected = false;
    console.error('[TiDB] TIDB_USER not set. Skipping TiDB init (SQLite fallback remains active).');
    return;
  }

  try {
    console.log(`[TiDB] Connecting to TiDB Cloud cluster at ${DB_CONFIG.host}:${DB_CONFIG.port}...`);
    
    // Create initial connection to ensure database exists
    const initConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
      ssl: DB_CONFIG.ssl
    });

    await initConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\``);
    await initConn.end();

    // Create pool targeting the irrigatech database
    pool = mysql.createPool(DB_CONFIG);

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        iso_time VARCHAR(35) NOT NULL,
        soil_moisture FLOAT,
        temperature FLOAT,
        humidity FLOAT,
        light_lux FLOAT,
        battery_voltage FLOAT,
        battery_soc FLOAT,
        solar_watts FLOAT,
        water_tank FLOAT,
        flow_rate FLOAT DEFAULT 0.0,
        pump TINYINT DEFAULT 0,
        ac TINYINT DEFAULT 0,
        shade_pct INT DEFAULT 20,
        zone1_moisture FLOAT,
        zone2_moisture FLOAT,
        zone3_moisture FLOAT,
        zone4_moisture FLOAT,
        INDEX idx_ts (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS irrigation_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        iso_time VARCHAR(35) NOT NULL,
        action VARCHAR(64) NOT NULL,
        reason VARCHAR(100) DEFAULT 'SCHEDULE',
        source VARCHAR(64) DEFAULT 'ARDUINO_CORE',
        zone_id INT DEFAULT 1,
        duration_seconds INT DEFAULT 0,
        water_liters FLOAT DEFAULT 0.0,
        INDEX idx_irrigation_ts (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        iso_time VARCHAR(35) NOT NULL,
        type VARCHAR(32) NOT NULL,
        category VARCHAR(32),
        title VARCHAR(128) NOT NULL,
        message TEXT NOT NULL,
        acknowledged TINYINT DEFAULT 0,
        INDEX idx_alerts_ts (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS farms (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        crop VARCHAR(128) NOT NULL,
        location VARCHAR(128),
        moisture_min FLOAT DEFAULT 35.0,
        moisture_max FLOAT DEFAULT 50.0,
        target_vpd FLOAT DEFAULT 0.85
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        email VARCHAR(128) NOT NULL,
        role VARCHAR(64) DEFAULT 'Farm Manager',
        phone VARCHAR(32),
        avatar VARCHAR(255),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(64) PRIMARY KEY,
        \`value\` LONGTEXT NOT NULL,
        category VARCHAR(64) DEFAULT 'general',
        updated_at BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Seed default farm facilities if empty
    const [farms] = await pool.query('SELECT count(*) as cnt FROM farms');
    if (farms[0].cnt === 0) {
      await pool.query(`
        INSERT INTO farms (id, name, crop, location, moisture_min, moisture_max, target_vpd) VALUES
        ('farm-tomato', 'Greenhouse 1 (Alpha)', 'Tomato (Vegetative)', 'Nanyuki Agrotech Cluster', 35.0, 50.0, 0.85),
        ('farm-peppers', 'Greenhouse 2 (Beta)', 'Sweet Bell Peppers', 'Zone 2 Automated Bed', 40.0, 55.0, 0.95),
        ('farm-lettuce', 'Greenhouse 3 (Hydro)', 'Butterhead Lettuce', 'Vertical Hydro Bed 3', 45.0, 65.0, 0.75),
        ('farm-herbs', 'Greenhouse 4 (Spices)', 'Basil & Mint', 'High-humidity Herb Zone', 30.0, 45.0, 0.90)
      `);
      console.log('[TiDB] Seeded initial farm profiles.');
    }

    const [users] = await pool.query('SELECT count(*) as cnt FROM users');
    if (users[0].cnt === 0) {
      const now = Date.now();
      await pool.query(`
        INSERT INTO users (id, name, email, role, phone, avatar, created_at, updated_at) VALUES
        ('user-01', 'Farmer John', 'john@irrigatech.io', 'Chief Agronomist & Admin', '+254 712 345 678', '👨‍🌾', ?, ?),
        ('user-02', 'Sarah Muthoni', 'sarah@irrigatech.io', 'Irrigation Engineer', '+254 722 987 654', '👩‍🔬', ?, ?),
        ('user-03', 'David Kibet', 'david@irrigatech.io', 'Greenhouse Technician', '+254 733 112 233', '👷', ?, ?)
      `, [now, now, now, now, now, now]);
      console.log('[TiDB] Seeded team user accounts.');
    }

    const [settings] = await pool.query('SELECT count(*) as cnt FROM settings');
    if (settings[0].cnt === 0) {
      const now = Date.now();
      await pool.query(`
        INSERT INTO settings (\`key\`, \`value\`, category, updated_at) VALUES
        ('general', ?, 'general', ?),
        ('automation', ?, 'automation', ?),
        ('climate', ?, 'climate', ?),
        ('notifications', ?, 'notifications', ?)
      `, [
        JSON.stringify({ farmName: 'Irriga-Tech Smart Facility', location: 'Nanyuki Agrotech Cluster', timezone: 'Africa/Nairobi (UTC+3)', units: 'Metric (°C, L, bar)', language: 'English' }),
        now,
        JSON.stringify({ autoIrrigation: true, maxPumpRunMinutes: 5, minCooldownMinutes: 1, lowWaterCutoffPct: 15 }),
        now,
        JSON.stringify({ fanOnTemp: 30, fanOffTemp: 24, shadeCloseLux: 950, shadeOpenLux: 400, targetHumidityPct: 65 }),
        now,
        JSON.stringify({ emailAlerts: true, smsAlerts: true, criticalOnly: false, phoneRecipient: '+254 712 345 678' }),
        now
      ]);
      console.log('[TiDB] Seeded initial system settings.');
    }

    isConnected = true;
    console.log(`[TiDB] ✅ Successfully connected to TiDB Cloud (${DB_CONFIG.database})!`);
  } catch (err) {
    isConnected = false;
    console.error('[TiDB] ❌ Initialization error:', err.message);
  }
}

// ─── 2. TiDB Operations API ────────────────────────────────────────────────
export const tidb = {
  getStatus() {
    return {
      connected: isConnected,
      cluster: DB_CONFIG.host,
      database: DB_CONFIG.database
    };
  },

  async logTelemetry(reading) {
    if (!pool || !isConnected) return null;
    try {
      const ts = reading.ts || Date.now();
      const zm = reading.zoneMoisture || {};
      const query = `
        INSERT INTO telemetry (
          timestamp, iso_time, soil_moisture, temperature, humidity, light_lux,
          battery_voltage, battery_soc, solar_watts, water_tank, flow_rate,
          pump, ac, shade_pct, zone1_moisture, zone2_moisture, zone3_moisture, zone4_moisture
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        ts,
        new Date(ts).toISOString(),
        reading.soilMoisture ?? zm.zone1 ?? 42.0,
        reading.temperature ?? 28.0,
        reading.humidity ?? 65.0,
        reading.lightLux ?? 720.0,
        reading.batteryVoltage ?? 12.4,
        reading.batterySoc ?? 80.0,
        reading.solarWatts ?? 180.0,
        reading.waterTank ?? 75.0,
        reading.pump ? (reading.flowRate || 1.4) : 0.0,
        reading.pump ? 1 : 0,
        reading.ac ? 1 : 0,
        reading.shadePct ?? 20,
        zm.zone1 ?? reading.soilMoisture ?? 42.0,
        zm.zone2 ?? 44.5,
        zm.zone3 ?? 52.0,
        zm.zone4 ?? 48.0
      ];
      await pool.query(query, values);
    } catch (err) {
      console.error('[TiDB] Error logging telemetry:', err.message);
    }
  },

  async logIrrigation(action, source = 'AUTO', reason = 'SCHEDULE', zoneId = 1, duration = 0, waterLiters = 0.0) {
    if (!pool || !isConnected) return null;
    try {
      const ts = Date.now();
      const query = `
        INSERT INTO irrigation_events (
          timestamp, iso_time, action, reason, source, zone_id, duration_seconds, water_liters
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await pool.query(query, [ts, new Date(ts).toISOString(), action, reason, source, zoneId, duration, waterLiters]);
    } catch (err) {
      console.error('[TiDB] Error logging irrigation:', err.message);
    }
  },

  async logAlert(type, category, title, message) {
    if (!pool || !isConnected) return null;
    try {
      const ts = Date.now();
      const query = `
        INSERT INTO alerts (timestamp, iso_time, type, category, title, message, acknowledged)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `;
      await pool.query(query, [ts, new Date(ts).toISOString(), type, category, title, message]);
    } catch (err) {
      console.error('[TiDB] Error logging alert:', err.message);
    }
  },

  async getRecentTelemetry(limit = 50) {
    if (!pool || !isConnected) return [];
    try {
      const [rows] = await pool.query(
        'SELECT * FROM telemetry ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      return rows.reverse();
    } catch (err) {
      console.error('[TiDB] Error reading telemetry:', err.message);
      return [];
    }
  },

  async getIrrigationLogs(limit = 50) {
    if (!pool || !isConnected) return [];
    try {
      const [rows] = await pool.query(
        'SELECT * FROM irrigation_events ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      return rows;
    } catch (err) {
      console.error('[TiDB] Error reading irrigation logs:', err.message);
      return [];
    }
  },

  async getAlerts(limit = 50) {
    if (!pool || !isConnected) return [];
    try {
      const [rows] = await pool.query(
        'SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?',
        [limit]
      );
      return rows;
    } catch (err) {
      console.error('[TiDB] Error reading alerts:', err.message);
      return [];
    }
  },

  // ─── Farms CRUD ─────────────────────────────────────────────────────────
  async getFarms() {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM farms');
      return rows;
    } catch (err) {
      console.error('[TiDB] Error reading farms:', err.message);
      return null;
    }
  },

  async getFarmById(id) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM farms WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (err) {
      console.error('[TiDB] Error getting farm:', err.message);
      return null;
    }
  },

  async createFarm(farm) {
    if (!pool || !isConnected) return null;
    const id = farm.id || `farm-${Date.now()}`;
    try {
      await pool.query(`
        INSERT INTO farms (id, name, crop, location, moisture_min, moisture_max, target_vpd)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        farm.name || 'New Greenhouse',
        farm.crop || 'Tomato',
        farm.location || 'Local Cluster',
        farm.moisture_min || 35.0,
        farm.moisture_max || 50.0,
        farm.target_vpd || 0.85
      ]);
      return this.getFarmById(id);
    } catch (err) {
      console.error('[TiDB] Error creating farm:', err.message);
      return null;
    }
  },

  async updateFarm(id, farm) {
    if (!pool || !isConnected) return null;
    try {
      await pool.query(`
        UPDATE farms SET
          name = COALESCE(?, name),
          crop = COALESCE(?, crop),
          location = COALESCE(?, location),
          moisture_min = COALESCE(?, moisture_min),
          moisture_max = COALESCE(?, moisture_max),
          target_vpd = COALESCE(?, target_vpd)
        WHERE id = ?
      `, [
        farm.name,
        farm.crop,
        farm.location,
        farm.moisture_min,
        farm.moisture_max,
        farm.target_vpd,
        id
      ]);
      return this.getFarmById(id);
    } catch (err) {
      console.error('[TiDB] Error updating farm:', err.message);
      return null;
    }
  },

  async deleteFarm(id) {
    if (!pool || !isConnected) return false;
    try {
      const [result] = await pool.query('DELETE FROM farms WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('[TiDB] Error deleting farm:', err.message);
      return false;
    }
  },

  // ─── Users / Accounts CRUD ───────────────────────────────────────────────
  async getUsers() {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
      return rows;
    } catch (err) {
      console.error('[TiDB] Error reading users:', err.message);
      return null;
    }
  },

  async getUserById(id) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (err) {
      console.error('[TiDB] Error reading user:', err.message);
      return null;
    }
  },

  async createUser(user) {
    if (!pool || !isConnected) return null;
    const id = user.id || `user-${Date.now()}`;
    const now = Date.now();
    try {
      await pool.query(`
        INSERT INTO users (id, name, email, role, phone, avatar, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        user.name || 'Team Member',
        user.email || `${id}@irrigatech.io`,
        user.role || 'Farm Operator',
        user.phone || '+254 700 000 000',
        user.avatar || '👨‍🌾',
        now,
        now
      ]);
      return this.getUserById(id);
    } catch (err) {
      console.error('[TiDB] Error creating user:', err.message);
      return null;
    }
  },

  async updateUser(id, user) {
    if (!pool || !isConnected) return null;
    const now = Date.now();
    try {
      await pool.query(`
        UPDATE users SET
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          phone = COALESCE(?, phone),
          avatar = COALESCE(?, avatar),
          updated_at = ?
        WHERE id = ?
      `, [
        user.name,
        user.email,
        user.role,
        user.phone,
        user.avatar,
        now,
        id
      ]);
      return this.getUserById(id);
    } catch (err) {
      console.error('[TiDB] Error updating user:', err.message);
      return null;
    }
  },

  async deleteUser(id) {
    if (!pool || !isConnected) return false;
    try {
      const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (err) {
      console.error('[TiDB] Error deleting user:', err.message);
      return false;
    }
  },

  // ─── Settings CRUD ───────────────────────────────────────────────────────
  async getSettings() {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM settings');
      const result = {};
      for (const r of rows) {
        try {
          result[r.key] = JSON.parse(r.value);
        } catch {
          result[r.key] = r.value;
        }
      }
      return result;
    } catch (err) {
      console.error('[TiDB] Error reading settings:', err.message);
      return null;
    }
  },

  async getSetting(key) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM settings WHERE `key` = ?', [key]);
      if (rows.length === 0) return null;
      try {
        return JSON.parse(rows[0].value);
      } catch {
        return rows[0].value;
      }
    } catch (err) {
      console.error('[TiDB] Error reading setting:', err.message);
      return null;
    }
  },

  async updateSetting(key, value, category = 'general') {
    if (!pool || !isConnected) return null;
    const now = Date.now();
    const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    try {
      await pool.query(`
        INSERT INTO settings (\`key\`, \`value\`, category, updated_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`value\` = VALUES(\`value\`),
          category = VALUES(category),
          updated_at = VALUES(updated_at)
      `, [key, strVal, category, now]);
      return this.getSetting(key);
    } catch (err) {
      console.error('[TiDB] Error updating setting:', err.message);
      return null;
    }
  },

  async updateSettingsBatch(settingsObj) {
    if (!pool || !isConnected) return null;
    for (const [key, val] of Object.entries(settingsObj)) {
      await this.updateSetting(key, val);
    }
    return this.getSettings();
  },

  async getWeeklyStats() {
    if (!pool || !isConnected) return [];
    try {
      const oneWeekAgo = Date.now() - 7 * 24 * 3600 * 1000;
      const [rows] = await pool.query(`
        SELECT 
          FROM_UNIXTIME(timestamp / 1000, '%m-%d') as day,
          ROUND(AVG(soil_moisture), 1) as avg_soil,
          ROUND(AVG(temperature), 1) as avg_temp,
          ROUND(AVG(humidity), 1) as avg_humidity,
          ROUND(SUM(flow_rate) * 2 / 60, 1) as water_usage_liters
        FROM telemetry 
        WHERE timestamp >= ?
        GROUP BY day
        ORDER BY day ASC
      `, [oneWeekAgo]);
      return rows;
    } catch (err) {
      console.error('[TiDB] Error reading weekly stats:', err.message);
      return [];
    }
  }
};
