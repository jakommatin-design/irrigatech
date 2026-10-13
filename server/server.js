import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { SerialBridge } from './serial-bridge.js';
import { db } from './db.js';
import { initTiDB, tidb } from './tidb.js';

const JWT_SECRET = process.env.JWT_SECRET || 'irrigatech-jwt-secret-key-2026';

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect built React frontend distribution
const distCandidates = [
  path.resolve(__dirname, '../dist'),
  path.resolve(__dirname, './dist'),
  path.resolve('/app/dist')
];
const distDir = distCandidates.find(d => fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html')));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

if (distDir) {
  console.log(`[Frontend] Serving React Dashboard from: ${distDir}`);
  app.use(express.static(distDir));
}

const bridge = new SerialBridge();

// System configuration per Blueprint Section 6.2 & 7.1
const deviceConfig = {
  configVersion: 4,
  deviceId: "GH001-ESP32-01",
  siteId: "GREENHOUSE_ALPHA",
  crop: "Tomato (Solanum lycopersicum)",
  database: "TiDB Cloud Serverless (MySQL-compatible)",
  cluster: "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
  zones: [
    { id: 1, name: "Zone 1 - Tomatoes", crop: "Tomatoes", moistureStart: 35.0, moistureStop: 50.0, maxRunSeconds: 300 },
    { id: 2, name: "Zone 2 - Sweet Peppers", crop: "Bell Peppers", moistureStart: 40.0, moistureStop: 55.0, maxRunSeconds: 240 },
    { id: 3, name: "Zone 3 - Lettuce", crop: "Butterhead", moistureStart: 45.0, moistureStop: 65.0, maxRunSeconds: 180 },
    { id: 4, name: "Zone 4 - Herbs", crop: "Basil & Mint", moistureStart: 30.0, moistureStop: 45.0, maxRunSeconds: 150 },
  ],
  safetyLimits: {
    maxPumpRunMs: 300000, // 5 min hard safety limit
    minCooldownMs: 60000, // 1 min cooldown
    lowWaterLimitPct: 15.0,
    fanOnTempC: 30.0,
    fanOffTempC: 24.0,
    shadeCloseLux: 950,
    shadeOpenLux: 400
  }
};

// Socket.io handlers
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.emit('status', {
    connected: bridge.connected,
    mode: bridge.simulated ? 'demo' : 'live',
    port: bridge.portName,
    tidb: tidb.getStatus()
  });
  socket.emit('telemetry', bridge.state);
  socket.emit('device_config', deviceConfig);

  socket.on('command', async (data) => {
    console.log('[Socket.io] Received command:', data);
    const { cmd, zoneId = 1, duration = 300 } = data;
    bridge.sendCommand(cmd);
    
    // Log to both TiDB Cloud and local SQLite
    await tidb.logIrrigation(cmd, 'CLIENT_OVERRIDE', 'USER_ACTION', zoneId, duration);
    db.logIrrigation(cmd, 'CLIENT_OVERRIDE', 'USER_ACTION', zoneId, duration);
    
    io.emit('telemetry', bridge.state);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

bridge.on('telemetry', async (state) => {
  // Dual-persistence: TiDB Cloud + Local SQLite
  await tidb.logTelemetry(state);
  db.logTelemetry(state);
  io.emit('telemetry', state);
});

bridge.on('status', (status) => {
  io.emit('status', {
    connected: status.connected,
    mode: status.simulated ? 'demo' : 'live',
    port: status.port,
    tidb: tidb.getStatus()
  });
});

// REST Endpoints & Railway Health Check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Irriga-Tech Server V2.4', 
    database: 'TiDB Cloud (Serverless Distributed SQL)',
    tidb: tidb.getStatus(),
    sqlite: true,
    frontend: distDir ? 'unified-react-dashboard' : 'api-only',
    timestamp: Date.now() 
  });
});

// GET /api/v1/telemetry & GET /api/telemetry
app.get(['/api/telemetry', '/api/v1/telemetry'], async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  
  // Try TiDB Cloud first, fallback to SQLite if offline
  let history = await tidb.getRecentTelemetry(limit);
  if (!history || history.length === 0) {
    history = db.getRecentTelemetry(limit);
  }

  res.json({
    deviceId: deviceConfig.deviceId,
    configVersion: deviceConfig.configVersion,
    current: bridge.state,
    history,
    source: tidb.getStatus().connected ? 'TiDB Cloud' : 'Local SQLite'
  });
});

// GET /api/v1/device-config
app.get(['/api/device-config', '/api/v1/device-config'], (req, res) => {
  res.json(deviceConfig);
});

// GET /api/v1/events & GET /api/logs
app.get(['/api/logs', '/api/v1/events'], async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  
  let events = await tidb.getIrrigationLogs(limit);
  if (!events || events.length === 0) {
    events = db.getIrrigationLogs(limit);
  }

  res.json({ events, source: tidb.getStatus().connected ? 'TiDB Cloud' : 'Local SQLite' });
});

// GET /api/alerts
app.get('/api/alerts', async (req, res) => {
  let alerts = await tidb.getAlerts(50);
  if (!alerts || alerts.length === 0) {
    alerts = db.getAlerts(50);
  }
  res.json({ alerts });
});

// ─── 1. Farms CRUD Endpoints ─────────────────────────────────────────────
// GET /api/farms
app.get('/api/farms', async (req, res) => {
  let farms = await tidb.getFarms();
  if (!farms || farms.length === 0) {
    farms = db.getFarms();
  }
  res.json({ farms });
});

// GET /api/farms/:id
app.get('/api/farms/:id', async (req, res) => {
  let farm = await tidb.getFarmById(req.params.id);
  if (!farm) farm = db.getFarmById(req.params.id);
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  res.json({ farm });
});

// POST /api/farms
app.post('/api/farms', async (req, res) => {
  const farmData = req.body;
  if (!farmData.name) return res.status(400).json({ error: 'Farm name is required' });
  let created = await tidb.createFarm(farmData);
  const localCreated = db.createFarm(farmData);
  if (!created) created = localCreated;
  io.emit('farms_updated', { action: 'create', farm: created });
  res.status(201).json({ farm: created });
});

// PUT /api/farms/:id
app.put('/api/farms/:id', async (req, res) => {
  const { id } = req.params;
  const farmData = req.body;
  let updated = await tidb.updateFarm(id, farmData);
  const localUpdated = db.updateFarm(id, farmData);
  if (!updated) updated = localUpdated;
  io.emit('farms_updated', { action: 'update', farm: updated });
  res.json({ farm: updated });
});

// DELETE /api/farms/:id
app.delete('/api/farms/:id', async (req, res) => {
  const { id } = req.params;
  await tidb.deleteFarm(id);
  db.deleteFarm(id);
  io.emit('farms_updated', { action: 'delete', id });
  res.json({ success: true, id });
});

// ─── Authentication Endpoints ────────────────────────────────────────────
// POST /api/auth/register - Register a new farmer account
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, farmName, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing email in TiDB Cloud and SQLite
    let existing = await tidb.getUserByEmail(cleanEmail);
    if (!existing) existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user-${Date.now()}`;

    const userPayload = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      password_hash: passwordHash,
      role: 'Farm Owner & Operator',
      phone: phone || '+254 700 000 000',
      avatar: '👨‍🌾'
    };

    let createdUser = await tidb.createUserWithAuth(userPayload);
    const localUser = db.createUserWithAuth(userPayload);
    if (!createdUser) createdUser = localUser;

    // If farmName was provided during registration, automatically register their greenhouse
    let createdFarm = null;
    if (farmName && farmName.trim()) {
      const farmPayload = {
        id: `farm-${Date.now()}`,
        name: farmName.trim(),
        crop: 'Tomato (Vegetative Phase)',
        location: 'Automated Facility',
        moisture_min: 35.0,
        moisture_max: 50.0,
        target_vpd: 0.85
      };
      createdFarm = await tidb.createFarm(farmPayload);
      if (!createdFarm) createdFarm = db.createFarm(farmPayload);
      io.emit('farms_updated', { action: 'create', farm: createdFarm });
    }

    const token = jwt.sign(
      { id: createdUser.id, email: createdUser.email, role: createdUser.role, name: createdUser.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    io.emit('users_updated', { action: 'create', user: sanitizeUser(createdUser) });

    return res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(createdUser),
      farm: createdFarm
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: 'Internal server error while registering account' });
  }
});

// POST /api/auth/login - Authenticate existing user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await tidb.getUserByEmail(cleanEmail);
    if (!user) user = db.getUserByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    } else {
      // Seed user with no initial password hash: store password hash on first successful sign in
      const passwordHash = await bcrypt.hash(password, 10);
      try {
        db.updateUser(user.id, { password_hash: passwordHash });
      } catch (e) {}
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: 'Internal server error while logging in' });
  }
});

// GET /api/auth/me - Verify JWT token and return authenticated profile
app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    let user = await tidb.getUserById(decoded.id);
    if (!user) user = db.getUserById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
});

// ─── 2. Accounts & Users CRUD Endpoints ──────────────────────────────────
// GET /api/users
app.get(['/api/users', '/api/accounts'], async (req, res) => {
  let users = await tidb.getUsers();
  if (!users || users.length === 0) {
    users = db.getUsers();
  }
  res.json({ users: (users || []).map(sanitizeUser) });
});

// GET /api/users/:id
app.get(['/api/users/:id', '/api/accounts/:id'], async (req, res) => {
  let user = await tidb.getUserById(req.params.id);
  if (!user) user = db.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: sanitizeUser(user) });
});

// POST /api/users
app.post(['/api/users', '/api/accounts'], async (req, res) => {
  const userData = req.body;
  if (!userData.name || !userData.email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  let created = await tidb.createUser(userData);
  const localCreated = db.createUser(userData);
  if (!created) created = localCreated;
  io.emit('users_updated', { action: 'create', user: created });
  res.status(201).json({ user: created });
});

// PUT /api/users/:id
app.put(['/api/users/:id', '/api/accounts/:id'], async (req, res) => {
  const { id } = req.params;
  const userData = req.body;
  let updated = await tidb.updateUser(id, userData);
  const localUpdated = db.updateUser(id, userData);
  if (!updated) updated = localUpdated;
  io.emit('users_updated', { action: 'update', user: updated });
  res.json({ user: updated });
});

// DELETE /api/users/:id
app.delete(['/api/users/:id', '/api/accounts/:id'], async (req, res) => {
  const { id } = req.params;
  await tidb.deleteUser(id);
  db.deleteUser(id);
  io.emit('users_updated', { action: 'delete', id });
  res.json({ success: true, id });
});

// ─── 3. Settings CRUD Endpoints ──────────────────────────────────────────
// GET /api/settings
app.get('/api/settings', async (req, res) => {
  let settings = await tidb.getSettings();
  if (!settings || Object.keys(settings).length === 0) {
    settings = db.getSettings();
  }
  res.json({ settings });
});

// PUT /api/settings
app.put('/api/settings', async (req, res) => {
  const settingsData = req.body;
  if (!settingsData || typeof settingsData !== 'object') {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }
  await tidb.updateSettingsBatch(settingsData);
  const localSettings = db.updateSettingsBatch(settingsData);
  io.emit('settings_updated', localSettings);
  res.json({ success: true, settings: localSettings });
});

// GET /api/stats/weekly
app.get('/api/stats/weekly', async (req, res) => {
  let stats = await tidb.getWeeklyStats();
  if (!stats || stats.length === 0) {
    stats = db.getWeeklyStats();
  }
  res.json({ stats });
});

// POST /api/command
app.post(['/api/command', '/api/v1/commands'], async (req, res) => {
  const { cmd, zoneId = 1, duration = 300 } = req.body;
  if (!cmd) return res.status(400).json({ error: 'Command missing' });
  bridge.sendCommand(cmd);
  
  await tidb.logIrrigation(cmd, 'REST_API', 'MANUAL_TRIGGER', zoneId, duration);
  db.logIrrigation(cmd, 'REST_API', 'MANUAL_TRIGGER', zoneId, duration);
  
  res.json({ success: true, cmd, state: bridge.state });
});

// SPA Fallback for client-side routing & unified frontend
if (distDir) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'Irriga-Tech Server V2.4 (API Only)', 
      database: 'TiDB Cloud (Serverless Distributed SQL)',
      tidb: tidb.getStatus(),
      sqlite: true,
      timestamp: Date.now() 
    });
  });
}

// Process-level uncaught exception safety for containers
process.on('uncaughtException', (err) => {
  console.error('[Process Fatal] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Fatal] Unhandled Rejection:', reason);
});

const PORT = parseInt(process.env.PORT || '3000', 10);
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`===============================================`);
  console.log(`🌱 Irriga-Tech IoT Backend Server Running`);
  console.log(`☁️ Cloud DB: TiDB Cloud (gateway01.ap-northeast-1.prod.aws.tidbcloud.com)`);
  console.log(`🗄️ Local DB: SQLite3 (server/irrigatech.db)`);
  console.log(`📡 URL: http://0.0.0.0:${PORT}`);
  console.log(`⚡ WebSocket: ws://0.0.0.0:${PORT}`);
  console.log(`===============================================`);
  
  try {
    // Initialize TiDB Cloud connection pool & tables
    await initTiDB();
  } catch (err) {
    console.error('[Startup Warning] TiDB init error:', err.message);
  }

  try {
    await bridge.init();
  } catch (err) {
    console.error('[Startup Warning] SerialBridge init error:', err.message);
  }
});
