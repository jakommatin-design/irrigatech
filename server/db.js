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
    zone4_moisture REAL,
    soil_ph REAL DEFAULT 6.2
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
    water_liters REAL DEFAULT 0.0,
    soil_ph REAL DEFAULT 6.2,
    fertilizer_advice TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_irrigation_timestamp ON irrigation_events(timestamp);

  CREATE TABLE IF NOT EXISTS sms_messages (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    iso_time TEXT NOT NULL,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'NOTIFICATION',
    status TEXT DEFAULT 'DELIVERED',
    gateway TEXT DEFAULT 'Simulated'
  );

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
    owner_id TEXT NOT NULL DEFAULT 'user-01',
    connection_code TEXT UNIQUE,
    name TEXT NOT NULL,
    crop TEXT NOT NULL,
    location TEXT,
    moisture_min REAL DEFAULT 35.0,
    moisture_max REAL DEFAULT 50.0,
    target_vpd REAL DEFAULT 0.85
  );

  CREATE TABLE IF NOT EXISTS farm_user_access (
    farm_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    granted_by TEXT,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (farm_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS farm_connection_requests (
    id TEXT PRIMARY KEY,
    farm_id TEXT NOT NULL,
    requester_id TEXT NOT NULL,
    requester_owner_id TEXT NOT NULL,
    target_owner_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (farm_id, requester_id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL DEFAULT 'user-01',
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'Farm Manager',
    phone TEXT,
    avatar TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS device_thresholds (
    key TEXT PRIMARY KEY,
    value REAL NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

// Migration: ensure password_hash column exists on existing databases
try {
  sqlite.exec(`ALTER TABLE users ADD COLUMN password_hash TEXT;`);
} catch (e) {
  // column already exists
}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN owner_id TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE farms ADD COLUMN owner_id TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE farms ADD COLUMN connection_code TEXT;`); } catch (e) {}
sqlite.exec(`UPDATE users SET owner_id = 'user-01' WHERE owner_id IS NULL OR owner_id = '';`);
sqlite.exec(`UPDATE farms SET owner_id = 'user-01' WHERE owner_id IS NULL OR owner_id = '';`);
sqlite.exec(`UPDATE farms SET connection_code = 'GH-' || substr(hex(randomblob(4)), 1, 8) WHERE connection_code IS NULL OR connection_code = '';`);

// Each demo account starts with its own assigned greenhouse; other access is opt-in.
const seedFarmAccess = sqlite.prepare(`INSERT OR IGNORE INTO farm_user_access (farm_id, user_id, granted_by, created_at) VALUES (?, ?, ?, ?)`);
const farmAccessSeedTime = Date.now();
for (const [farmId, userId] of [['farm-tomato', 'user-01'], ['farm-peppers', 'user-02'], ['farm-lettuce', 'user-03'], ['farm-herbs', 'user-04']]) {
  seedFarmAccess.run(farmId, userId, userId, farmAccessSeedTime);
}
sqlite.prepare(`INSERT OR IGNORE INTO farm_user_access (farm_id, user_id, granted_by, created_at) SELECT f.id, u.id, u.id, ? FROM farms f JOIN users u ON u.id = f.owner_id WHERE f.id NOT IN ('farm-peppers', 'farm-lettuce', 'farm-herbs')`).run(farmAccessSeedTime);

// ─── 2. Seed Default Data if empty ──────────────────────────────────────────
const farmCount = sqlite.prepare('SELECT count(*) as cnt FROM farms').get().cnt;
if (farmCount === 0) {
  const insertFarm = sqlite.prepare(`
    INSERT INTO farms (id, owner_id, connection_code, name, crop, location, moisture_min, moisture_max, target_vpd)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFarm.run('farm-tomato', 'user-01', 'GH-TOMATO1', 'Greenhouse 1 (Alpha)', 'Tomato (Vegetative)', 'Nanyuki Agrotech Cluster', 35.0, 50.0, 0.85);
  insertFarm.run('farm-peppers', 'user-01', 'GH-PEPPER2', 'Greenhouse 2 (Beta)', 'Sweet Bell Peppers', 'Zone 2 Automated Bed', 40.0, 55.0, 0.95);
  insertFarm.run('farm-lettuce', 'user-01', 'GH-LETTUCE3', 'Greenhouse 3 (Hydro)', 'Butterhead Lettuce', 'Vertical Hydro Bed 3', 45.0, 65.0, 0.75);
  insertFarm.run('farm-herbs', 'user-01', 'GH-HERBS004', 'Greenhouse 4 (Spices)', 'Basil & Mint', 'High-humidity Herb Zone', 30.0, 45.0, 0.90);
}

const userCount = sqlite.prepare('SELECT count(*) as cnt FROM users').get().cnt;
if (userCount === 0) {
  // Pre-computed bcrypt hashes (cost 10) matching the demo credentials table:
  //   john@irrigatech.io   → admin123
  //   sarah@irrigatech.io  → engineer123
  //   david@irrigatech.io  → technician123
  const insertUser = sqlite.prepare(`
    INSERT INTO users (id, owner_id, name, email, password_hash, role, phone, avatar, created_at, updated_at)
    VALUES (?, 'user-01', ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  insertUser.run('user-01', 'Farmer John',   'john@irrigatech.io',  '$2b$10$jzLWqJgEJZKXyn6P4L9fx.pfOsAuUdhpqLZ90WSJP4igqCGvvfLxW', 'Chief Agronomist & Admin', '+254 712 345 678', '👨‍🌾', now, now);
  insertUser.run('user-02', 'Sarah Muthoni', 'sarah@irrigatech.io', '$2b$10$s7jnMCKH1p9vVcfFAG/IpuZz/b9atdwTomA5IFysgt102ppH1uH7C', 'Irrigation Engineer',      '+254 722 987 654', '👩‍🔬', now, now);
  insertUser.run('user-03', 'David Kibet',   'david@irrigatech.io', '$2b$10$xDcKzJvmcY0yWuOsQYV4JugUUfQ1JnXxu4SkOmjUWuBRMyT.M5PCa', 'Greenhouse Technician',    '+254 733 112 233', '👷',   now, now);
}

const settingsCount = sqlite.prepare('SELECT count(*) as cnt FROM settings').get().cnt;
if (settingsCount === 0) {
  const insertSetting = sqlite.prepare(`
    INSERT INTO settings (key, value, category, updated_at) VALUES (?, ?, ?, ?)
  `);
  const now = Date.now();
  insertSetting.run('general', JSON.stringify({
    farmName: 'Irriga-Tech Smart Facility',
    location: 'Nanyuki Agrotech Cluster',
    timezone: 'Africa/Nairobi (UTC+3)',
    units: 'Metric (°C, L, bar)',
    language: 'English'
  }), 'general', now);
  insertSetting.run('automation', JSON.stringify({
    autoIrrigation: true,
    maxPumpRunMinutes: 5,
    minCooldownMinutes: 1,
    lowWaterCutoffPct: 15
  }), 'automation', now);
  insertSetting.run('climate', JSON.stringify({
    fanOnTemp: 30,
    fanOffTemp: 24,
    shadeCloseLux: 950,
    shadeOpenLux: 400,
    targetHumidityPct: 65
  }), 'climate', now);
  insertSetting.run('notifications', JSON.stringify({
    emailAlerts: true,
    smsAlerts: true,
    criticalOnly: false,
    phoneRecipient: '+254 712 345 678'
  }), 'notifications', now);
}

// ─── Schema Migrations for New Columns ─────────────────────────────────────
try { sqlite.exec(`ALTER TABLE irrigation_events ADD COLUMN soil_ph REAL DEFAULT 6.2;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE irrigation_events ADD COLUMN fertilizer_advice TEXT;`); } catch (e) {}
try { sqlite.exec(`ALTER TABLE telemetry ADD COLUMN soil_ph REAL DEFAULT 6.2;`); } catch (e) {}

// ─── 3. Prepared Statements ────────────────────────────────────────────────
const stmtInsertTelemetry = sqlite.prepare(`
  INSERT INTO telemetry (
    timestamp, iso_time, soil_moisture, temperature, humidity, light_lux,
    battery_voltage, battery_soc, solar_watts, water_tank, flow_rate,
    pump, ac, shade_pct, zone1_moisture, zone2_moisture, zone3_moisture, zone4_moisture, soil_ph
  ) VALUES (
    @timestamp, @iso_time, @soil_moisture, @temperature, @humidity, @light_lux,
    @battery_voltage, @battery_soc, @solar_watts, @water_tank, @flow_rate,
    @pump, @ac, @shade_pct, @zone1_moisture, @zone2_moisture, @zone3_moisture, @zone4_moisture, @soil_ph
  )
`);

const stmtInsertIrrigation = sqlite.prepare(`
  INSERT INTO irrigation_events (
    timestamp, iso_time, action, reason, source, zone_id, duration_seconds, water_liters, soil_ph, fertilizer_advice
  ) VALUES (
    @timestamp, @iso_time, @action, @reason, @source, @zone_id, @duration_seconds, @water_liters, @soil_ph, @fertilizer_advice
  )
`);

const stmtInsertAlert = sqlite.prepare(`
  INSERT INTO alerts (
    timestamp, iso_time, type, category, title, message, acknowledged
  ) VALUES (
    @timestamp, @iso_time, @type, @category, @title, @message, 0
  )
`);

const stmtInsertSms = sqlite.prepare(`
  INSERT INTO sms_messages (
    id, timestamp, iso_time, recipient, message, type, status, gateway
  ) VALUES (
    @id, @timestamp, @iso_time, @recipient, @message, @type, @status, @gateway
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
      soil_ph: reading.soilPh ?? 6.2,
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
   * Log irrigation start/stop event with pH & fertilizer advice
   */
  logIrrigation(action, source = 'AUTO', reason = 'SCHEDULE', zoneId = 1, duration = 0, waterLiters = 0.0, soilPh = 6.2, fertilizerAdvice = null) {
    const ts = Date.now();
    const entry = {
      timestamp: ts,
      iso_time: new Date(ts).toISOString(),
      action,
      reason,
      source,
      zone_id: zoneId,
      duration_seconds: duration,
      water_liters: waterLiters,
      soil_ph: soilPh,
      fertilizer_advice: typeof fertilizerAdvice === 'object' ? JSON.stringify(fertilizerAdvice) : fertilizerAdvice
    };

    stmtInsertIrrigation.run(entry);
    return entry;
  },

  /**
   * Log SMS message
   */
  logSms(sms) {
    const entry = {
      id: sms.id || `sms-${Date.now()}`,
      timestamp: sms.timestamp || Date.now(),
      iso_time: sms.isoTime || new Date().toISOString(),
      recipient: sms.recipient || '+254712345678',
      message: sms.message || '',
      type: sms.type || 'NOTIFICATION',
      status: sms.status || 'DELIVERED',
      gateway: sms.gateway || 'Simulated'
    };
    stmtInsertSms.run(entry);
    return entry;
  },

  getSmsLogs(limit = 50) {
    return sqlite.prepare(`SELECT * FROM sms_messages ORDER BY timestamp DESC LIMIT ?`).all(limit);
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

  deleteAlert(id) {
    return sqlite.prepare('DELETE FROM alerts WHERE id = ?').run(id).changes > 0;
  },

  deleteAlerts() {
    return sqlite.prepare('DELETE FROM alerts').run().changes;
  },

  /**
   * Retrieve all registered farms
   */
  getFarmsForUser(userId) {
    return sqlite.prepare(`SELECT f.* FROM farms f JOIN farm_user_access a ON a.farm_id = f.id WHERE a.user_id = ? ORDER BY f.name`).all(userId);
  },

  getFarmForUser(id, userId) {
    return sqlite.prepare(`SELECT f.* FROM farms f JOIN farm_user_access a ON a.farm_id = f.id WHERE f.id = ? AND a.user_id = ?`).get(id, userId);
  },

  getFarmByConnectionCode(code) {
    return sqlite.prepare('SELECT * FROM farms WHERE UPPER(connection_code) = UPPER(?)').get(String(code || '').trim());
  },

  grantFarmAccess(farmId, userId, grantedBy = userId) {
    sqlite.prepare(`INSERT OR IGNORE INTO farm_user_access (farm_id, user_id, granted_by, created_at) VALUES (?, ?, ?, ?)`).run(farmId, userId, grantedBy, Date.now());
    return this.getFarmForUser(farmId, userId);
  },

  createFarmConnectionRequest(request) {
    const now = Date.now();
    const id = request.id || `fcr-${now}-${Math.random().toString(36).slice(2, 8)}`;
    sqlite.prepare(`INSERT INTO farm_connection_requests (id, farm_id, requester_id, requester_owner_id, target_owner_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?) ON CONFLICT(farm_id, requester_id) DO UPDATE SET status = CASE WHEN farm_connection_requests.status = 'DECLINED' THEN 'PENDING' ELSE farm_connection_requests.status END, updated_at = excluded.updated_at`).run(id, request.farm_id, request.requester_id, request.requester_owner_id, request.target_owner_id, now, now);
    return sqlite.prepare(`SELECT r.*, f.name AS farm_name FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id WHERE r.farm_id = ? AND r.requester_id = ?`).get(request.farm_id, request.requester_id);
  },

  getFarmConnectionRequestsForUser(userId) {
    return sqlite.prepare(`SELECT r.*, f.name AS farm_name FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id WHERE r.requester_id = ? ORDER BY r.created_at DESC`).all(userId);
  },

  getPendingFarmConnectionRequests(ownerId) {
    return sqlite.prepare(`SELECT r.*, f.name AS farm_name, u.name AS requester_name, u.email AS requester_email FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id LEFT JOIN users u ON u.id = r.requester_id WHERE r.target_owner_id = ? AND r.status = 'PENDING' ORDER BY r.created_at ASC`).all(ownerId);
  },

  decideFarmConnectionRequest(requestId, ownerId, decision, reviewedBy) {
    const row = sqlite.prepare(`SELECT r.* FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id WHERE r.id = ? AND r.target_owner_id = ? AND f.owner_id = ?`).get(requestId, ownerId, ownerId);
    if (!row || row.status !== 'PENDING') return null;
    const now = Date.now();
    sqlite.prepare('UPDATE farm_connection_requests SET status = ?, updated_at = ? WHERE id = ?').run(decision, now, requestId);
    if (decision === 'APPROVED') this.grantFarmAccess(row.farm_id, row.requester_id, reviewedBy);
    return sqlite.prepare(`SELECT r.*, f.name AS farm_name FROM farm_connection_requests r JOIN farms f ON f.id = r.farm_id WHERE r.id = ?`).get(requestId);
  },

  getFarms(ownerId = 'user-01') {
    return sqlite.prepare('SELECT * FROM farms WHERE owner_id = ?').all(ownerId);
  },

  getFarmById(id, ownerId = 'user-01') {
    return sqlite.prepare('SELECT * FROM farms WHERE id = ? AND owner_id = ?').get(id, ownerId);
  },

  createFarm(farm) {
    const id = farm.id || `farm-${Date.now()}`;
    sqlite.prepare(`
      INSERT INTO farms (id, owner_id, connection_code, name, crop, location, moisture_min, moisture_max, target_vpd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      farm.owner_id || 'user-01',
      farm.connection_code || `GH-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      farm.name || 'New Greenhouse',
      farm.crop || 'Tomato',
      farm.location || 'Local Cluster',
      farm.moisture_min ?? 35.0,
      farm.moisture_max ?? 50.0,
      farm.target_vpd ?? 0.85
    );
    return this.getFarmById(id, farm.owner_id || 'user-01');
  },

  updateFarm(id, farm, ownerId = 'user-01') {
    sqlite.prepare(`
      UPDATE farms SET
        name = COALESCE(?, name),
        crop = COALESCE(?, crop),
        location = COALESCE(?, location),
        moisture_min = COALESCE(?, moisture_min),
        moisture_max = COALESCE(?, moisture_max),
        target_vpd = COALESCE(?, target_vpd)
      WHERE id = ? AND owner_id = ?
    `).run(
      farm.name,
      farm.crop,
      farm.location,
      farm.moisture_min,
      farm.moisture_max,
      farm.target_vpd,
      id,
      ownerId
    );
    return this.getFarmById(id, ownerId);
  },

  deleteFarm(id, ownerId = 'user-01') {
    const farm = this.getFarmById(id, ownerId);
    if (!farm) return false;
    sqlite.prepare('DELETE FROM farm_user_access WHERE farm_id = ?').run(id);
    sqlite.prepare('DELETE FROM farm_connection_requests WHERE farm_id = ?').run(id);
    const result = sqlite.prepare('DELETE FROM farms WHERE id = ? AND owner_id = ?').run(id, ownerId);
    return result.changes > 0;
  },

  // ─── Users / Accounts CRUD ───────────────────────────────────────────────
  getUsers(ownerId = 'user-01') {
    return sqlite.prepare('SELECT * FROM users WHERE owner_id = ? ORDER BY created_at ASC').all(ownerId);
  },

  getUserById(id) {
    return sqlite.prepare('SELECT * FROM users WHERE id = ?').get(id);
  },

  getUserByEmail(email) {
    if (!email) return null;
    return sqlite.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  },

  createUserWithAuth(user) {
    const id = user.id || `user-${Date.now()}`;
    const now = Date.now();
    sqlite.prepare(`
      INSERT INTO users (id, owner_id, name, email, password_hash, role, phone, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
    );
    return this.getUserById(id);
  },

  createUser(user) {
    const id = user.id || `user-${Date.now()}`;
    const now = Date.now();
    sqlite.prepare(`
      INSERT INTO users (id, name, email, role, phone, avatar, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      user.name || 'Team Member',
      user.email || `${id}@irrigatech.io`,
      user.role || 'Farm Operator',
      user.phone || '+254 700 000 000',
      user.avatar || '👨‍🌾',
      now,
      now
    );
    return this.getUserById(id);
  },

  updateUser(id, user) {
    const now = Date.now();
    sqlite.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        email = COALESCE(?, email),
        password_hash = COALESCE(?, password_hash),
        role = COALESCE(?, role),
        phone = COALESCE(?, phone),
        avatar = COALESCE(?, avatar),
        updated_at = ?
      WHERE id = ?
    `).run(
      user.name,
      user.email,
      user.password_hash,
      user.role,
      user.phone,
      user.avatar,
      now,
      id
    );
    return this.getUserById(id);
  },

  deleteUser(id) {
    sqlite.prepare('DELETE FROM farm_user_access WHERE user_id = ?').run(id);
    sqlite.prepare('DELETE FROM farm_connection_requests WHERE requester_id = ?').run(id);
    const result = sqlite.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  },

  // ─── Settings CRUD ───────────────────────────────────────────────────────
  getSettings(ownerId = 'user-01') {
    const prefix = `${ownerId}:`;
    const rows = ownerId === 'user-01'
      ? sqlite.prepare("SELECT * FROM settings WHERE instr(key, ':') = 0").all()
      : sqlite.prepare('SELECT * FROM settings WHERE key LIKE ?').all(`${prefix}%`);
    const result = {};
    for (const r of rows) {
      const key = ownerId === 'user-01' ? r.key : r.key.slice(prefix.length);
      try {
        result[key] = JSON.parse(r.value);
      } catch (e) {
        result[key] = r.value;
      }
    }
    return result;
  },

  getSetting(key) {
    const row = sqlite.prepare('SELECT * FROM settings WHERE key = ?').get(key);
    if (!row) return null;
    try {
      return JSON.parse(row.value);
    } catch {
      return row.value;
    }
  },

  updateSetting(key, value, category = 'general') {
    const now = Date.now();
    const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    sqlite.prepare(`
      INSERT INTO settings (key, value, category, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        category = excluded.category,
        updated_at = excluded.updated_at
    `).run(key, strVal, category, now);
    return this.getSetting(key);
  },

  updateSettingsBatch(settingsObj, ownerId = 'user-01') {
    for (const [key, val] of Object.entries(settingsObj)) {
      this.updateSetting(ownerId === 'user-01' ? key : `${ownerId}:${key}`, val);
    }
    return this.getSettings(ownerId);
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
