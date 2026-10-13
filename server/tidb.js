import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env.local') });
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

// Network-level error codes that should trip the circuit breaker
const FATAL_NET_CODES = new Set([
  'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND',
  'PROTOCOL_CONNECTION_LOST', 'PROTOCOL_SEQUENCE_TIMEOUT',
  'ER_QUERY_INTERRUPTED'
]);

function handleQueryError(err, label = 'query') {
  if (FATAL_NET_CODES.has(err.code) || FATAL_NET_CODES.has(err.errno)) {
    if (isConnected) {
      isConnected = false;
      console.warn(`[TiDB] ⚠️  Circuit breaker tripped on ${label} (${err.code}). Falling back to SQLite.`);
    }
    // silent — suppress repeated log spam
  } else {
    console.error(`[TiDB] Error in ${label}:`, err.message);
  }
}

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
        soil_ph FLOAT DEFAULT 6.2,
        fertilizer_advice TEXT,
        INDEX idx_irrigation_ts (timestamp)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Add safe column migrations in case table exists
    try { await pool.query(`ALTER TABLE irrigation_events ADD COLUMN soil_ph FLOAT DEFAULT 6.2`); } catch (e) {}
    try { await pool.query(`ALTER TABLE irrigation_events ADD COLUMN fertilizer_advice TEXT`); } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sms_messages (
        id VARCHAR(64) PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        iso_time VARCHAR(35) NOT NULL,
        recipient VARCHAR(32) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(32) DEFAULT 'NOTIFICATION',
        status VARCHAR(32) DEFAULT 'DELIVERED',
        gateway VARCHAR(32) DEFAULT 'Simulated',
        INDEX idx_sms_ts (timestamp)
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
        owner_id VARCHAR(64) NOT NULL DEFAULT 'user-01',
        connection_code VARCHAR(32) UNIQUE,
        name VARCHAR(128) NOT NULL,
        crop VARCHAR(128) NOT NULL,
        location VARCHAR(128),
        moisture_min FLOAT DEFAULT 35.0,
        moisture_max FLOAT DEFAULT 50.0,
        target_vpd FLOAT DEFAULT 0.85
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS farm_user_access (
        farm_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        granted_by VARCHAR(64),
        created_at BIGINT NOT NULL,
        PRIMARY KEY (farm_id, user_id),
        INDEX idx_farm_access_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS farm_connection_requests (
        id VARCHAR(96) PRIMARY KEY,
        farm_id VARCHAR(64) NOT NULL,
        requester_id VARCHAR(64) NOT NULL,
        requester_owner_id VARCHAR(64) NOT NULL,
        target_owner_id VARCHAR(64) NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        UNIQUE KEY uniq_farm_connection (farm_id, requester_id),
        INDEX idx_farm_requests_target (target_owner_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(64) NOT NULL DEFAULT 'user-01',
        name VARCHAR(128) NOT NULL,
        email VARCHAR(128) NOT NULL,
        password_hash VARCHAR(255) NULL,
        role VARCHAR(64) DEFAULT 'Farm Manager',
        phone VARCHAR(32),
        avatar VARCHAR(255),
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure password_hash column exists on existing TiDB tables
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL`);
    } catch (e) {
      // Column already exists or table freshly created
    }
    try { await pool.query(`ALTER TABLE farms ADD COLUMN owner_id VARCHAR(64) NOT NULL DEFAULT 'user-01'`); } catch (e) {}
    try { await pool.query(`ALTER TABLE farms ADD COLUMN connection_code VARCHAR(32) NULL UNIQUE`); } catch (e) {}
    try { await pool.query(`ALTER TABLE users ADD COLUMN owner_id VARCHAR(64) NOT NULL DEFAULT 'user-01'`); } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(64) PRIMARY KEY,
        \`value\` LONGTEXT NOT NULL,
        category VARCHAR(64) DEFAULT 'general',
        updated_at BIGINT NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const [farmsWithoutCodes] = await pool.query("SELECT id FROM farms WHERE connection_code IS NULL OR connection_code = ''");
    for (const farm of farmsWithoutCodes) {
      const code = `GH-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      try { await pool.query("UPDATE farms SET connection_code = ? WHERE id = ? AND (connection_code IS NULL OR connection_code = '')", [code, farm.id]); } catch (e) {}
    }

    // Seed default farm facilities if empty
    const [farms] = await pool.query('SELECT count(*) as cnt FROM farms');
    if (farms[0].cnt === 0) {
      await pool.query(`
        INSERT INTO farms (id, owner_id, connection_code, name, crop, location, moisture_min, moisture_max, target_vpd) VALUES
        ('farm-tomato', 'user-01', 'GH-TOMATO1', 'Greenhouse 1 (Alpha)', 'Tomato (Vegetative)', 'Nanyuki Agrotech Cluster', 35.0, 50.0, 0.85),
        ('farm-peppers', 'user-01', 'GH-PEPPER2', 'Greenhouse 2 (Beta)', 'Sweet Bell Peppers', 'Zone 2 Automated Bed', 40.0, 55.0, 0.95),
        ('farm-lettuce', 'user-01', 'GH-LETTUCE3', 'Greenhouse 3 (Hydro)', 'Butterhead Lettuce', 'Vertical Hydro Bed 3', 45.0, 65.0, 0.75),
        ('farm-herbs', 'user-01', 'GH-HERBS004', 'Greenhouse 4 (Spices)', 'Basil & Mint', 'High-humidity Herb Zone', 30.0, 45.0, 0.90)
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

    const seededAccessAt = Date.now();
    for (const [farmId, userId] of [['farm-tomato', 'user-01'], ['farm-peppers', 'user-02'], ['farm-lettuce', 'user-03'], ['farm-herbs', 'user-04']]) {
      try { await pool.query('INSERT IGNORE INTO farm_user_access (farm_id, user_id, granted_by, created_at) VALUES (?, ?, ?, ?)', [farmId, userId, userId, seededAccessAt]); } catch (e) {}
    }
    try { await pool.query(`INSERT IGNORE INTO farm_user_access (farm_id, user_id, granted_by, created_at) SELECT f.id, u.id, u.id, ? FROM farms f JOIN users u ON u.id = f.owner_id WHERE f.id NOT IN ('farm-peppers', 'farm-lettuce', 'farm-herbs')`, [seededAccessAt]); } catch (e) {}

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
      handleQueryError(err, 'logTelemetry');
    }
  },

  async logIrrigation(action, source = 'AUTO', reason = 'SCHEDULE', zoneId = 1, duration = 0, waterLiters = 0.0, soilPh = 6.2, fertilizerAdvice = null) {
    if (!pool || !isConnected) return null;
    try {
      const ts = Date.now();
      const adviceStr = typeof fertilizerAdvice === 'object' ? JSON.stringify(fertilizerAdvice) : fertilizerAdvice;
      const query = `
        INSERT INTO irrigation_events (
          timestamp, iso_time, action, reason, source, zone_id, duration_seconds, water_liters, soil_ph, fertilizer_advice
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await pool.query(query, [ts, new Date(ts).toISOString(), action, reason, source, zoneId, duration, waterLiters, soilPh, adviceStr]);
    } catch (err) {
      handleQueryError(err, 'logIrrigation');
    }
  },

  async logSms(sms) {
    if (!pool || !isConnected) return null;
    try {
      const query = `
        INSERT INTO sms_messages (id, timestamp, iso_time, recipient, message, type, status, gateway)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await pool.query(query, [
        sms.id || `sms-${Date.now()}`,
        sms.timestamp || Date.now(),
        sms.isoTime || new Date().toISOString(),
        sms.recipient || '+254712345678',
        sms.message || '',
        sms.type || 'NOTIFICATION',
        sms.status || 'DELIVERED',
        sms.gateway || 'Simulated'
      ]);
    } catch (err) {
      handleQueryError(err, 'logSms');
    }
  },

  async getSmsLogs(limit = 50) {
    if (!pool || !isConnected) return [];
    try {
      const [rows] = await pool.query(`SELECT * FROM sms_messages ORDER BY timestamp DESC LIMIT ?`, [limit]);
      return rows;
    } catch (err) {
      handleQueryError(err, 'getSmsLogs');
      return [];
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
      handleQueryError(err, 'logAlert');
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
      handleQueryError(err, 'getRecentTelemetry');
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
      handleQueryError(err, 'getIrrigationLogs');
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
      handleQueryError(err, 'getAlerts');
      return [];
    }
  },

  async deleteAlert(id) {
    if (!pool || !isConnected) return false;
    try {
      const [result] = await pool.query('DELETE FROM alerts WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (err) {
      handleQueryError(err, 'deleteAlert');
      return false;
    }
  },

  async deleteAlerts() {
    if (!pool || !isConnected) return 0;
    try {
      const [result] = await pool.query('DELETE FROM alerts');
      return result.affectedRows || 0;
    } catch (err) {
      handleQueryError(err, 'deleteAlerts');
      return 0;
    }
  },

  // ─── Farms CRUD ─────────────────────────────────────────────────────────
  async getFarmsForUser(userId) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT f.* FROM farms f JOIN farm_user_access a ON a.farm_id = f.id WHERE a.user_id = ? ORDER BY f.name', [userId]);
      return rows;
    } catch (err) { handleQueryError(err, 'getFarmsForUser'); return null; }
  },

  async getFarmForUser(id, userId) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT f.* FROM farms f JOIN farm_user_access a ON a.farm_id = f.id WHERE f.id = ? AND a.user_id = ?', [id, userId]);
      return rows[0] || null;
    } catch (err) { handleQueryError(err, 'getFarmForUser'); return null; }
  },

  async getFarmByConnectionCode(code) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM farms WHERE UPPER(connection_code) = UPPER(?)', [String(code || '').trim()]);
      return rows[0] || null;
    } catch (err) { handleQueryError(err, 'getFarmByConnectionCode'); return null; }
  },

  async grantFarmAccess(farmId, userId, grantedBy = userId) {
    if (!pool || !isConnected) return false;
    try {
      await pool.query('INSERT IGNORE INTO farm_user_access (farm_id, user_id, granted_by, created_at) VALUES (?, ?, ?, ?)', [farmId, userId, grantedBy, Date.now()]);
      return true;
    } catch (err) { handleQueryError(err, 'grantFarmAccess'); return false; }
  },

  async createFarmConnectionRequest(request) {
    if (!pool || !isConnected) return null;
    const now = Date.now();
    try {
      await pool.query(`INSERT INTO farm_connection_requests (id, farm_id, requester_id, requester_owner_id, target_owner_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?) ON DUPLICATE KEY UPDATE status = IF(status = 'DECLINED', 'PENDING', status), updated_at = VALUES(updated_at)`, [request.id, request.farm_id, request.requester_id, request.requester_owner_id, request.target_owner_id, now, now]);
      const [rows] = await pool.query('SELECT r.*, f.name AS farm_name FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id WHERE r.farm_id = ? AND r.requester_id = ?', [request.farm_id, request.requester_id]);
      return rows[0] || null;
    } catch (err) { handleQueryError(err, 'createFarmConnectionRequest'); return null; }
  },

  async getFarmConnectionRequestsForUser(userId) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT r.*, f.name AS farm_name FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id WHERE r.requester_id = ? ORDER BY r.created_at DESC', [userId]);
      return rows;
    } catch (err) { handleQueryError(err, 'getFarmConnectionRequestsForUser'); return null; }
  },

  async getPendingFarmConnectionRequests(ownerId) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query(`SELECT r.*, f.name AS farm_name, u.name AS requester_name, u.email AS requester_email FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id LEFT JOIN users u ON u.id = r.requester_id WHERE r.target_owner_id = ? AND r.status = 'PENDING' ORDER BY r.created_at ASC`, [ownerId]);
      return rows;
    } catch (err) { handleQueryError(err, 'getPendingFarmConnectionRequests'); return null; }
  },

  async decideFarmConnectionRequest(requestId, ownerId, decision, reviewedBy) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query("SELECT r.* FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id WHERE r.id = ? AND r.target_owner_id = ? AND f.owner_id = ? AND r.status = 'PENDING'", [requestId, ownerId, ownerId]);
      const request = rows[0];
      if (!request) return null;
      const [result] = await pool.query("UPDATE farm_connection_requests SET status = ?, updated_at = ? WHERE id = ? AND status = 'PENDING'", [decision, Date.now(), requestId]);
      if (!result.affectedRows) return null;
      if (decision === 'APPROVED' && !(await this.grantFarmAccess(request.farm_id, request.requester_id, reviewedBy))) return null;
      const [updated] = await pool.query('SELECT r.*, f.name AS farm_name FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id WHERE r.id = ?', [requestId]);
      return updated[0] || null;
    } catch (err) { handleQueryError(err, 'decideFarmConnectionRequest'); return null; }
  },

  async getFarms(ownerId = 'user-01') {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM farms WHERE owner_id = ?', [ownerId]);
      return rows;
    } catch (err) {
      handleQueryError(err, 'getFarms');
      return null;
    }
  },

  async getFarmById(id, ownerId = 'user-01') {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM farms WHERE id = ? AND owner_id = ?', [id, ownerId]);
      return rows[0] || null;
    } catch (err) {
      handleQueryError(err, 'getFarmById');
      return null;
    }
  },

  async createFarm(farm) {
    if (!pool || !isConnected) return null;
    const id = farm.id || `farm-${Date.now()}`;
    try {
      await pool.query(`
        INSERT INTO farms (id, owner_id, connection_code, name, crop, location, moisture_min, moisture_max, target_vpd)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        farm.owner_id || 'user-01',
        farm.connection_code || `GH-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        farm.name || 'New Greenhouse',
        farm.crop || 'Tomato',
        farm.location || 'Local Cluster',
        farm.moisture_min ?? 35.0,
        farm.moisture_max ?? 50.0,
        farm.target_vpd ?? 0.85
      ]);
      return this.getFarmById(id, farm.owner_id || 'user-01');
    } catch (err) {
      handleQueryError(err, 'createFarm');
      return null;
    }
  },

  async updateFarm(id, farm, ownerId = 'user-01') {
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
        WHERE id = ? AND owner_id = ?
      `, [
        farm.name,
        farm.crop,
        farm.location,
        farm.moisture_min,
        farm.moisture_max,
        farm.target_vpd,
        id,
        ownerId
      ]);
      return this.getFarmById(id, ownerId);
    } catch (err) {
      handleQueryError(err, 'updateFarm');
      return null;
    }
  },

  async deleteFarm(id, ownerId = 'user-01') {
    if (!pool || !isConnected) return false;
    try {
      await pool.query('DELETE FROM farm_user_access WHERE farm_id = ?', [id]);
      await pool.query('DELETE FROM farm_connection_requests WHERE farm_id = ?', [id]);
      const [result] = await pool.query('DELETE FROM farms WHERE id = ? AND owner_id = ?', [id, ownerId]);
      return result.affectedRows > 0;
    } catch (err) {
      handleQueryError(err, 'deleteFarm');
      return false;
    }
  },

  // ─── Users / Accounts CRUD ───────────────────────────────────────────────
  async getUsers(ownerId = 'user-01') {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE owner_id = ? ORDER BY created_at ASC', [ownerId]);
      return rows;
    } catch (err) {
      handleQueryError(err, 'getUsers');
      return null;
    }
  },

  async getUserById(id) {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      return rows[0] || null;
    } catch (err) {
      handleQueryError(err, 'getUserById');
      return null;
    }
  },

  async getUserByEmail(email) {
    if (!pool || !isConnected || !email) return null;
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
      return rows[0] || null;
    } catch (err) {
      handleQueryError(err, 'getUserByEmail');
      return null;
    }
  },

  async createUserWithAuth(user) {
    if (!pool || !isConnected) return null;
    const id = user.id || `user-${Date.now()}`;
    const now = Date.now();
    try {
      await pool.query(`
        INSERT INTO users (id, owner_id, name, email, password_hash, role, phone, avatar, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        user.owner_id || user.id || id,
        user.name || 'Farmer',
        user.email ? user.email.trim().toLowerCase() : `${id}@irrigatech.io`,
        user.password_hash || null,
        user.role || 'Farm Manager',
        user.phone || '+254 700 000 000',
        user.avatar || '👨‍🌾',
        now,
        now
      ]);
      return this.getUserById(id);
    } catch (err) {
      handleQueryError(err, 'createUserWithAuth');
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
      handleQueryError(err, 'createUser');
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
          password_hash = COALESCE(?, password_hash),
          role = COALESCE(?, role),
          phone = COALESCE(?, phone),
          avatar = COALESCE(?, avatar),
          updated_at = ?
        WHERE id = ?
      `, [
        user.name,
        user.email,
        user.password_hash,
        user.role,
        user.phone,
        user.avatar,
        now,
        id
      ]);
      return this.getUserById(id);
    } catch (err) {
      handleQueryError(err, 'updateUser');
      return null;
    }
  },

  async deleteUser(id) {
    if (!pool || !isConnected) return false;
    try {
      await pool.query('DELETE FROM farm_user_access WHERE user_id = ?', [id]);
      await pool.query('DELETE FROM farm_connection_requests WHERE requester_id = ?', [id]);
      const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (err) {
      handleQueryError(err, 'deleteUser');
      return false;
    }
  },

  // ─── Settings CRUD ───────────────────────────────────────────────────────
  async getSettings(ownerId = 'user-01') {
    if (!pool || !isConnected) return null;
    try {
      const [rows] = ownerId === 'user-01'
        ? await pool.query("SELECT * FROM settings WHERE `key` NOT LIKE '%:%'")
        : await pool.query('SELECT * FROM settings WHERE `key` LIKE ?', [`${ownerId}:%`]);
      const result = {};
      for (const r of rows) {
        const key = ownerId === 'user-01' ? r.key : r.key.slice(`${ownerId}:`.length);
        try {
          result[key] = JSON.parse(r.value);
        } catch {
          result[key] = r.value;
        }
      }
      return result;
    } catch (err) {
      handleQueryError(err, 'getSettings');
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
      handleQueryError(err, 'getSetting');
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
      handleQueryError(err, 'updateSetting');
      return null;
    }
  },

  async updateSettingsBatch(settingsObj, ownerId = 'user-01') {
    if (!pool || !isConnected) return null;
    for (const [key, val] of Object.entries(settingsObj)) {
      await this.updateSetting(ownerId === 'user-01' ? key : `${ownerId}:${key}`, val);
    }
    return this.getSettings(ownerId);
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
      handleQueryError(err, 'getWeeklyStats');
      return [];
    }
  }
};
