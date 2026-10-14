import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { SerialBridge } from './serial-bridge.js';
import { db } from './db.js';
import { initTiDB, tidb } from './tidb.js';
import { aiAgronomy } from './ai-service.js';
import { UssdService } from './ussd-service.js';
import { weatherService } from './weather-service.js';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured in production.');
}
const JWT_SECRET = process.env.JWT_SECRET || 'irrigatech-development-only-secret';

function sanitizeUser(user) {
  if (!user) return null;
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const currentUser = db.getUserById(decoded.id) || await tidb.getUserById(decoded.id);
    if (!currentUser) return res.status(401).json({ error: 'Account is no longer active' });
    req.auth = { ...decoded, email: currentUser.email || decoded.email, role: currentUser.role, ownerId: currentUser.owner_id || decoded.ownerId || currentUser.id };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

function requireFarmAdmin(req, res, next) {
  const role = String(req.auth?.role || '').toLowerCase();
  if (!['farm owner & operator', 'chief agronomist & admin', 'chief agronomist', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'Farm administrator permission required' });
  }
  return next();
}

function validFarm(farm) {
  const min = Number(farm.moisture_min ?? 35);
  const max = Number(farm.moisture_max ?? 50);
  const vpd = Number(farm.target_vpd ?? 0.85);
  return Boolean(String(farm.name || '').trim() && String(farm.crop || '').trim())
    && Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max <= 100 && min <= max
    && Number.isFinite(vpd) && vpd >= 0 && vpd <= 10;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Local secrets live in .env.local; platform environment variables take precedence.
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

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

// Telemetry may be public to read, but actuator commands require a signed-in operator.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, JWT_SECRET);
    const currentUser = db.getUserById(decoded.id) || await tidb.getUserById(decoded.id);
    if (!currentUser) return next(new Error('Account is no longer active'));
    socket.data.auth = { ...decoded, role: currentUser.role, ownerId: currentUser.owner_id || decoded.ownerId || currentUser.id };
    socket.join(`owner:${socket.data.auth.ownerId}`);
    return next();
  } catch {
    return next(new Error('Invalid or expired authentication token'));
  }
});

app.use(cors());
app.use(express.json());

if (distDir) {
  console.log(`[Frontend] Serving React Dashboard from: ${distDir}`);
  app.use(express.static(distDir));
}

const bridge = new SerialBridge();
const ussd = new UssdService(bridge, db, tidb, aiAgronomy);

// Hosted ESP32 devices authenticate with a server-only shared token. Never expose it to the browser.
const deviceToken = process.env.DEVICE_API_TOKEN || '';
const deviceOwnerId = process.env.DEVICE_OWNER_ID || '';
let lastCloudDeviceTelemetryAt = 0;
let pendingDeviceCommands = [];
function authenticateDevice(req, res, next) {
  const provided = req.get('x-device-token') || '';
  const expectedBytes = Buffer.from(deviceToken);
  const providedBytes = Buffer.from(provided);
  if (!deviceToken || expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
    return res.status(401).json({ error: 'Invalid device credentials' });
  }
  if (!deviceOwnerId) return res.status(503).json({ error: 'DEVICE_OWNER_ID is not configured on the server' });
  return next();
}

const telemetryRanges = {
  temperature: [-40, 100], humidity: [0, 100], soilMoisture: [0, 100], soilPh: [0, 14],
  lightLux: [0, 200000], batterySoc: [0, 100], batteryVoltage: [0, 100], solarWatts: [0, 100000],
  waterTank: [0, 100], flowRate: [0, 10000], shadePct: [0, 100], uptime: [0, Number.MAX_SAFE_INTEGER]
};

function validateDeviceTelemetry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'JSON telemetry object required';
  if (body.deviceId !== deviceConfig.deviceId) return 'Unknown deviceId';
  for (const [key, value] of Object.entries(body)) {
    if (key in telemetryRanges) {
      const [min, max] = telemetryRanges[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return `Invalid ${key}`;
    }
  }
  for (const key of ['pump', 'ac', 'led']) {
    if (key in body && typeof body[key] !== 'boolean') return `Invalid ${key}`;
  }
  if (!('temperature' in body) || !('humidity' in body) || !('soilMoisture' in body)) return 'temperature, humidity and soilMoisture are required';
  return null;
}

app.post('/api/device/telemetry', authenticateDevice, async (req, res) => {
  const error = validateDeviceTelemetry(req.body);
  if (error) return res.status(400).json({ error });
  if (bridge.simulated && bridge.simInterval) {
    clearInterval(bridge.simInterval);
    bridge.simInterval = null;
    bridge.simulated = false;
  }
  const state = {
    ...bridge.state,
    ...req.body,
    mode: 'live', connected: true, simulated: false,
    deviceId: deviceConfig.deviceId, receivedAt: Date.now()
  };
  Object.assign(bridge.state, state);
  bridge.connected = true;
  bridge.simulated = false;
  bridge.portName = 'cloud-device';
  lastCloudDeviceTelemetryAt = state.receivedAt;
  await tidb.logTelemetry(state);
  db.logTelemetry(state);
  io.to(`owner:${deviceOwnerId}`).emit('status', { connected: true, mode: 'live', source: 'cloud', deviceId: deviceConfig.deviceId });
  io.to(`owner:${deviceOwnerId}`).emit('telemetry', state);
  return res.status(202).json({ accepted: true, deviceId: deviceConfig.deviceId, receivedAt: state.receivedAt });
});

app.get('/api/device/commands', authenticateDevice, (req, res) => {
  return res.json({ commands: pendingDeviceCommands.map(({ id, cmd, zoneId, duration, pct }) => ({ id, cmd, zoneId, duration, pct })) });
});

app.post('/api/device/commands/:id/ack', authenticateDevice, (req, res) => {
  const index = pendingDeviceCommands.findIndex(command => command.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Command not found or already acknowledged' });
  const [command] = pendingDeviceCommands.splice(index, 1);
  io.to(`owner:${deviceOwnerId}`).emit('device_command_ack', { id: command.id, cmd: command.cmd, success: req.body?.success !== false });
  return res.json({ acknowledged: true });
});

// Issue a per-user Cloudinary upload signature; the API secret stays server-side.
app.post('/api/cloudinary/profile-signature', authenticateToken, (req, res) => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({ error: 'Profile photo uploads are not configured on this server.' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'irrigatech/profile-photos';
  const userId = String(req.auth.id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (!userId) return res.status(400).json({ error: 'Account identifier is invalid.' });
  const publicId = `${userId}-${randomBytes(6).toString('hex')}`;
  const params = { folder, overwrite: 'true', public_id: publicId, timestamp };
  const signingText = Object.keys(params).sort().map(key => `${key}=${params[key]}`).join('&');
  const signature = createHash('sha1').update(`${signingText}${apiSecret}`).digest('hex');

  return res.json({ cloudName, apiKey, timestamp, folder, publicId, overwrite: true, signature });
});

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
    const role = String(socket.data.auth?.role || '').toLowerCase();
    if (!['farm owner & operator', 'chief agronomist & admin', 'chief agronomist', 'admin', 'farm operator', 'irrigation engineer'].includes(role)) {
      socket.emit('command_error', { error: 'Operator permission required' });
      return;
    }
    if (!data || typeof data.cmd !== 'string' || !/^(PUMP_ON|PUMP_OFF|AC_ON|AC_OFF|LED_ON|LED_OFF|SET_SHADE)$/.test(data.cmd)) {
      socket.emit('command_error', { error: 'Unsupported command' });
      return;
    }
    if (data.cmd === 'SET_SHADE' && ((bridge.connected && !bridge.simulated) || (lastCloudDeviceTelemetryAt && Date.now() - lastCloudDeviceTelemetryAt < 45000))) {
      socket.emit('command_error', { error: 'Shade control is not wired in the current physical device firmware.' });
      return;
    }
    console.log('[Socket.io] Received command:', data);
    const { cmd, zoneId = 1, duration = 300 } = data;
    if (bridge.connected && !bridge.simulated && bridge.portName !== 'cloud-device') {
      bridge.sendCommand(cmd);
    } else if (deviceToken && lastCloudDeviceTelemetryAt && Date.now() - lastCloudDeviceTelemetryAt < 45000) {
      if ((socket.data.auth?.ownerId || socket.data.auth?.id) !== deviceOwnerId) {
        socket.emit('command_error', { error: 'This device is not assigned to your greenhouse account.' });
        return;
      }
      if (pendingDeviceCommands.length >= 20) {
        socket.emit('command_error', { error: 'Device command queue is full; wait for the device to reconnect.' });
        return;
      }
      pendingDeviceCommands.push({ id: randomBytes(12).toString('hex'), cmd, zoneId, duration, pct: data.pct, queuedAt: Date.now() });
    } else if (bridge.simulated) {
      bridge.sendCommand(cmd);
    } else {
      socket.emit('command_error', { error: 'No live USB or hosted device is connected. Command was not sent.' });
      return;
    }
    
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

setInterval(() => {
  if (lastCloudDeviceTelemetryAt && Date.now() - lastCloudDeviceTelemetryAt > 45000) {
    const cloudWasTheActiveSource = bridge.portName === 'cloud-device' || bridge.simulated;
    lastCloudDeviceTelemetryAt = 0;
    pendingDeviceCommands = [];
    if (cloudWasTheActiveSource) {
      bridge.connected = false;
      bridge.simulated = false;
      bridge.portName = null;
      bridge.state.connected = false;
      bridge.state.simulated = false;
      bridge.state.mode = 'offline';
      io.to(`owner:${deviceOwnerId}`).emit('status', { connected: false, mode: 'offline', source: 'cloud', deviceId: deviceConfig.deviceId });
    }
  }
}, 15000).unref();

// Post-Irrigation Automated Notification & AI Agronomy Advisory Pipeline
bridge.on('irrigation_cycle_finished', async (data) => {
  const { durationSeconds = 180, waterLiters = 36.0, soilPh = null, zoneId = 1 } = data;
  console.log(`[Irrigation Complete] Duration: ${durationSeconds}s | Water: ${waterLiters}L | Soil pH: ${soilPh}`);

  try {
    // 1. Fetch farmer settings & phone recipient
    let settings = await tidb.getSettings();
    if (!settings || !settings.notifications) settings = db.getSettings();
    const phoneRecipient = settings?.notifications?.phoneRecipient || process.env.FARMER_PHONE || '+254712345678';
    const crop = deviceConfig.crop || 'Tomato (Solanum lycopersicum)';

    // 2. Synthesize AI Agronomy advice (Soil pH, fertilizer recommendation & optimal timing)
    const report = await aiAgronomy.generatePostIrrigationAdvice({
      crop,
      cropStage: 'Vegetative Phase',
      durationSeconds,
      waterLiters,
      soilPh,
      soilMoisture: bridge.state.soilMoisture || 48.0,
      temperature: bridge.state.temperature ?? null,
      humidity: bridge.state.humidity ?? null
    });

    // 3. Persist irrigation event with pH & fertilizer prescription in TiDB Cloud & SQLite
    await tidb.logIrrigation('PUMP_CYCLE_COMPLETE', 'AUTO_OR_MANUAL', 'HYDRATION_REACHED', zoneId, durationSeconds, waterLiters, soilPh, report.recommendation);
    db.logIrrigation('PUMP_CYCLE_COMPLETE', 'AUTO_OR_MANUAL', 'HYDRATION_REACHED', zoneId, durationSeconds, waterLiters, soilPh, report.recommendation);

    // 4. Record high-visibility alert for smartphone dashboard
    const alertTitle = `💧 Irrigation Finished: ${waterLiters}L Used (Zone ${zoneId})`;
    const alertMsg = `Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Water: ${waterLiters}L. Substrate pH: ${soilPh} (${report.irrigationSummary.phStatus}). Fertilizer Advice: ${report.recommendation.fertilizer} (${report.recommendation.timing}).`;

    await tidb.logAlert('info', 'irrigation', alertTitle, alertMsg);
    db.logAlert('info', 'irrigation', alertTitle, alertMsg);

    // 5. Automatically dispatch SMS to farmer's phone (both smartphone and button/feature phone)
    const smsResult = await ussd.dispatchPostIrrigationSms(report, phoneRecipient);
    if (smsResult) {
      await tidb.logSms(smsResult);
      db.logSms(smsResult);
    }

    // 6. Broadcast real-time event to Web Dashboard & Mobile clients
    io.emit('irrigation_completed', report);
    io.emit('alert', {
      type: 'info',
      category: 'irrigation',
      title: alertTitle,
      message: alertMsg,
      timestamp: Date.now()
    });
    io.emit('sms_dispatched', smsResult);
  } catch (err) {
    console.error('[Irrigation Post-Process Error]:', err);
  }
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
    device: {
      id: deviceConfig.deviceId,
      cloudIngestionConfigured: Boolean(deviceToken && deviceOwnerId),
      cloudConnected: Boolean(lastCloudDeviceTelemetryAt && Date.now() - lastCloudDeviceTelemetryAt < 45000),
      lastCloudTelemetryAt: lastCloudDeviceTelemetryAt || null,
      queuedCommands: pendingDeviceCommands.length
    },
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
app.get('/api/alerts', authenticateToken, async (req, res) => {
  let alerts = await tidb.getAlerts(50);
  if (!alerts || alerts.length === 0) {
    alerts = db.getAlerts(50);
  }
  res.json({ alerts });
});

// ─── 1. Farms CRUD Endpoints ─────────────────────────────────────────────
// GET /api/farms
app.get('/api/farms', authenticateToken, async (req, res) => {
  let farms = await tidb.getFarmsForUser(req.auth.id);
  if (!farms) farms = db.getFarmsForUser(req.auth.id);
  res.json({ farms: farms || [] });
});

// Users can request another greenhouse by its owner-shared connection code.
app.post('/api/farm-connections', authenticateToken, async (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,32}$/.test(code)) return res.status(400).json({ error: 'Enter a valid greenhouse connection code.' });
  const farm = await tidb.getFarmByConnectionCode(code) || db.getFarmByConnectionCode(code);
  if (!farm) return res.status(404).json({ error: 'No greenhouse was found for that connection code.' });
  if (await tidb.getFarmForUser(farm.id, req.auth.id) || db.getFarmForUser(farm.id, req.auth.id)) {
    return res.status(409).json({ error: 'This greenhouse is already connected to your account.' });
  }
  const request = {
    id: `fcr-${randomBytes(12).toString('hex')}`,
    farm_id: farm.id,
    requester_id: req.auth.id,
    requester_owner_id: req.auth.ownerId || req.auth.id,
    target_owner_id: farm.owner_id,
  };
  const cloudRequest = await tidb.createFarmConnectionRequest(request);
  const localRequest = db.createFarmConnectionRequest(request);
  const created = cloudRequest || localRequest;
  if (!created) return res.status(500).json({ error: 'Could not create greenhouse connection request.' });
  res.status(201).json({ request: created });
});

app.get('/api/farm-connections', authenticateToken, async (req, res) => {
  let mine = await tidb.getFarmConnectionRequestsForUser(req.auth.id);
  if (!mine) mine = db.getFarmConnectionRequestsForUser(req.auth.id);
  let pending = [];
  if (['farm owner & operator', 'chief agronomist & admin', 'chief agronomist', 'admin'].includes(String(req.auth.role || '').toLowerCase())) {
    pending = await tidb.getPendingFarmConnectionRequests(req.auth.ownerId || req.auth.id);
    if (!pending) pending = db.getPendingFarmConnectionRequests(req.auth.ownerId || req.auth.id);
  }
  res.json({ mine: mine || [], pending: pending || [] });
});

app.post('/api/farm-connections/:id/decision', authenticateToken, requireFarmAdmin, async (req, res) => {
  const decision = String(req.body?.decision || '').toUpperCase();
  if (!['APPROVED', 'DECLINED'].includes(decision)) return res.status(400).json({ error: 'Decision must be APPROVED or DECLINED.' });
  const ownerId = req.auth.ownerId || req.auth.id;
  const cloudResult = await tidb.decideFarmConnectionRequest(req.params.id, ownerId, decision, req.auth.id);
  const localResult = db.decideFarmConnectionRequest(req.params.id, ownerId, decision, req.auth.id);
  const request = cloudResult || localResult;
  if (!request) return res.status(404).json({ error: 'Pending greenhouse request not found.' });
  if (decision === 'APPROVED') await tidb.grantFarmAccess(request.farm_id, request.requester_id, req.auth.id);
  res.json({ request });
});

// GET /api/farms/:id
app.get('/api/farms/:id', authenticateToken, async (req, res) => {
  let farm = await tidb.getFarmForUser(req.params.id, req.auth.id);
  if (!farm) farm = db.getFarmForUser(req.params.id, req.auth.id);
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  res.json({ farm });
});

// POST /api/farms
app.post('/api/farms', authenticateToken, requireFarmAdmin, async (req, res) => {
  const farmData = { ...req.body, id: `farm-${randomBytes(10).toString('hex')}`, connection_code: `GH-${randomBytes(5).toString('hex').toUpperCase()}`, owner_id: req.auth.ownerId || req.auth.id };
  if (!validFarm(farmData)) return res.status(400).json({ error: 'Provide a farm name and crop, valid 0–100 moisture thresholds, and a non-negative VPD target.' });
  const cloudCreated = await tidb.createFarm(farmData);
  const localCreated = db.createFarm(farmData);
  let created = cloudCreated || localCreated;
  await tidb.grantFarmAccess(created.id, req.auth.id, req.auth.id);
  db.grantFarmAccess(created.id, req.auth.id, req.auth.id);
  io.to(`owner:${req.auth.ownerId || req.auth.id}`).emit('farms_updated', { action: 'create', farm: created });
  res.status(201).json({ farm: created });
});

// PUT /api/farms/:id
app.put('/api/farms/:id', authenticateToken, requireFarmAdmin, async (req, res) => {
  const { id } = req.params;
  const ownerId = req.auth.ownerId || req.auth.id;
  const existing = await tidb.getFarmById(id, ownerId) || db.getFarmById(id, ownerId);
  if (!existing) return res.status(404).json({ error: 'Farm not found' });
  const farmData = req.body;
  if (!validFarm({ ...existing, ...farmData })) return res.status(400).json({ error: 'Provide valid farm details and moisture thresholds.' });
  let updated = await tidb.updateFarm(id, farmData, ownerId);
  const localUpdated = db.updateFarm(id, farmData, ownerId);
  if (!updated) updated = localUpdated;
  io.to(`owner:${req.auth.ownerId || req.auth.id}`).emit('farms_updated', { action: 'update', farm: updated });
  res.json({ farm: updated });
});

// DELETE /api/farms/:id
app.delete('/api/farms/:id', authenticateToken, requireFarmAdmin, async (req, res) => {
  const { id } = req.params;
  const ownerId = req.auth.ownerId || req.auth.id;
  const existing = await tidb.getFarmById(id, ownerId) || db.getFarmById(id, ownerId);
  if (!existing) return res.status(404).json({ error: 'Farm not found' });
  await tidb.deleteFarm(id, ownerId);
  db.deleteFarm(id, ownerId);
  io.to(`owner:${ownerId}`).emit('farms_updated', { action: 'delete', id });
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
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
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
      owner_id: userId,
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
        id: `farm-${randomBytes(10).toString('hex')}`,
        connection_code: `GH-${randomBytes(5).toString('hex').toUpperCase()}`,
        owner_id: userId,
        name: farmName.trim(),
        crop: 'Tomato (Vegetative Phase)',
        location: 'Automated Facility',
        moisture_min: 35.0,
        moisture_max: 50.0,
        target_vpd: 0.85
      };
      const cloudFarm = await tidb.createFarm(farmPayload);
      const localFarm = db.createFarm(farmPayload);
      createdFarm = cloudFarm || localFarm;
      await tidb.grantFarmAccess(createdFarm.id, userId, userId);
      db.grantFarmAccess(createdFarm.id, userId, userId);
      io.to(`owner:${userId}`).emit('farms_updated', { action: 'create', farm: createdFarm });
    }

    const token = jwt.sign(
      { id: createdUser.id, ownerId: createdUser.owner_id || createdUser.id, email: createdUser.email, role: createdUser.role, name: createdUser.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    io.to(`owner:${userId}`).emit('users_updated', { action: 'create', user: sanitizeUser(createdUser) });

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

    if (!user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, ownerId: user.owner_id || user.id, email: user.email, role: user.role, name: user.name },
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

// DELETE /api/auth/account - Permanently delete current authenticated account
app.delete('/api/auth/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.auth.id;
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user token' });
    }

    await tidb.deleteUser(userId);
    db.deleteUser(userId);

    io.to(`owner:${req.auth.ownerId || userId}`).emit('users_updated', { action: 'delete', id: userId });

    return res.json({ success: true, message: 'Account permanently deleted' });
  } catch (err) {
    console.error('[Delete Account Error]:', err);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ─── 2. Accounts & Users CRUD Endpoints ──────────────────────────────────
// GET /api/users
app.get(['/api/users', '/api/accounts'], authenticateToken, requireFarmAdmin, async (req, res) => {
  const ownerId = req.auth.ownerId || req.auth.id;
  let users = await tidb.getUsers(ownerId);
  if (!users || users.length === 0) {
    users = db.getUsers(ownerId);
  }
  res.json({ users: (users || []).map(sanitizeUser) });
});

// GET /api/users/:id
app.get(['/api/users/:id', '/api/accounts/:id'], authenticateToken, async (req, res) => {
  if (req.params.id !== req.auth.id && !['farm owner & operator', 'chief agronomist & admin', 'chief agronomist', 'admin'].includes(String(req.auth.role || '').toLowerCase())) {
    return res.status(403).json({ error: 'You can only view your own account' });
  }
  let user = await tidb.getUserById(req.params.id);
  if (!user) user = db.getUserById(req.params.id);
  if (!user || user.owner_id !== (req.auth.ownerId || req.auth.id)) return res.status(404).json({ error: 'Account not found' });
  res.json({ user: sanitizeUser(user) });
});

// POST /api/users
app.post(['/api/users', '/api/accounts'], authenticateToken, requireFarmAdmin, async (req, res) => {
  const userData = req.body;
  if (!userData.name || !userData.email || !userData.password) {
    return res.status(400).json({ error: 'Name, email, and an initial password are required' });
  }
  const email = String(userData.email).trim().toLowerCase();
  if (String(userData.password).length < 8) return res.status(400).json({ error: 'Initial password must be at least 8 characters' });
  if (await tidb.getUserByEmail(email) || db.getUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists' });
  const userPayload = {
    ...userData,
    id: undefined,
    owner_id: req.auth.ownerId || req.auth.id,
    email,
    password_hash: await bcrypt.hash(String(userData.password), 10)
  };
  delete userPayload.password;
  let created = await tidb.createUserWithAuth(userPayload);
  const localCreated = db.createUserWithAuth(userPayload);
  if (!created) created = localCreated;
  const safeCreated = sanitizeUser(created);
  io.to(`owner:${req.auth.ownerId || req.auth.id}`).emit('users_updated', { action: 'create', user: safeCreated });
  res.status(201).json({ user: safeCreated });
});

// PUT /api/users/:id
app.put(['/api/users/:id', '/api/accounts/:id'], authenticateToken, async (req, res) => {
  const { id } = req.params;
  const targetUser = await tidb.getUserById(id) || db.getUserById(id);
  if (!targetUser || targetUser.owner_id !== (req.auth.ownerId || req.auth.id)) return res.status(404).json({ error: 'Account not found' });
  const isSelf = id === req.auth.id;
  const isAdmin = ['farm owner & operator', 'chief agronomist & admin', 'chief agronomist', 'admin'].includes(String(req.auth.role || '').toLowerCase());
  if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Farm administrator permission required' });
  const userData = isSelf
    ? { name: req.body.name, email: req.body.email, phone: req.body.phone, avatar: req.body.avatar }
    : { name: req.body.name, email: req.body.email, phone: req.body.phone, avatar: req.body.avatar, role: req.body.role };
  if (userData.email) {
    userData.email = String(userData.email).trim().toLowerCase();
    const existing = await tidb.getUserByEmail(userData.email) || db.getUserByEmail(userData.email);
    if (existing && existing.id !== id) return res.status(409).json({ error: 'An account with this email already exists' });
  }
  if (req.body.password) {
    if (String(req.body.password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    userData.password_hash = await bcrypt.hash(String(req.body.password), 10);
  }
  let updated = await tidb.updateUser(id, userData);
  const localUpdated = db.updateUser(id, userData);
  if (!updated) updated = localUpdated;
  if (!updated) return res.status(404).json({ error: 'Account not found' });
  io.to(`owner:${req.auth.ownerId || req.auth.id}`).emit('users_updated', { action: 'update', user: sanitizeUser(updated) });
  res.json({ user: sanitizeUser(updated) });
});

// DELETE /api/users/:id
app.delete(['/api/users/:id', '/api/accounts/:id'], authenticateToken, requireFarmAdmin, async (req, res) => {
  const { id } = req.params;
  if (id === req.auth.id) return res.status(400).json({ error: 'Use account deletion to remove your own account' });
  const targetUser = await tidb.getUserById(id) || db.getUserById(id);
  if (!targetUser || targetUser.owner_id !== (req.auth.ownerId || req.auth.id)) return res.status(404).json({ error: 'Account not found' });
  await tidb.deleteUser(id);
  db.deleteUser(id);
  io.to(`owner:${req.auth.ownerId || req.auth.id}`).emit('users_updated', { action: 'delete', id });
  res.json({ success: true, id });
});

// ─── 3. Settings CRUD Endpoints ──────────────────────────────────────────
// GET /api/settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  const ownerId = req.auth.ownerId || req.auth.id;
  let settings = await tidb.getSettings(ownerId);
  if (!settings || Object.keys(settings).length === 0) {
    settings = db.getSettings(ownerId);
  }
  res.json({ settings });
});

// PUT /api/settings
app.put('/api/settings', authenticateToken, requireFarmAdmin, async (req, res) => {
  const settingsData = req.body;
  if (!settingsData || typeof settingsData !== 'object') {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }
  const ownerId = req.auth.ownerId || req.auth.id;
  await tidb.updateSettingsBatch(settingsData, ownerId);
  const localSettings = db.updateSettingsBatch(settingsData, ownerId);
  io.to(`owner:${ownerId}`).emit('settings_updated', localSettings);
  res.json({ success: true, settings: localSettings });
});

// GET /api/stats/weekly
app.get('/api/stats/weekly', authenticateToken, async (req, res) => {
  let stats = await tidb.getWeeklyStats();
  if (!stats || stats.length === 0) {
    stats = db.getWeeklyStats();
  }
  res.json({ stats });
});

// POST /api/command
app.post(['/api/command', '/api/v1/commands'], authenticateToken, (req, res, next) => {
  const role = String(req.auth?.role || '').toLowerCase();
  if (!['farm owner & operator', 'chief agronomist & admin', 'chief agronomist', 'admin', 'farm operator', 'irrigation engineer'].includes(role)) {
    return res.status(403).json({ error: 'Operator permission required' });
  }
  return next();
}, async (req, res) => {
  const { cmd, zoneId = 1, duration = 300 } = req.body;
  if (typeof cmd !== 'string' || !/^(PUMP_ON|PUMP_OFF|AC_ON|AC_OFF|LED_ON|LED_OFF|SET_SHADE)$/.test(cmd)) {
    return res.status(400).json({ error: 'Unsupported command' });
  }
  bridge.sendCommand(cmd);
  
  await tidb.logIrrigation(cmd, 'REST_API', 'MANUAL_TRIGGER', zoneId, duration);
  db.logIrrigation(cmd, 'REST_API', 'MANUAL_TRIGGER', zoneId, duration);
  
  res.json({ success: true, cmd, state: bridge.state });
});

// ─── 4. USSD Gateway & Automated SMS Endpoints ───────────────────────────
// POST /api/ussd - Africa's Talking / Telco Gateway Webhook
app.post('/api/ussd', async (req, res) => {
  try {
    const { 
      sessionId = `sess-${Date.now()}`, 
      serviceCode = '*384*4744#', 
      phoneNumber = '+254712345678', 
      text = '' 
    } = req.body;
    
    const ussdResponse = await ussd.handleUssdRequest({ sessionId, serviceCode, phoneNumber, text });
    res.setHeader('Content-Type', 'text/plain');
    res.send(ussdResponse);
  } catch (err) {
    console.error('[USSD Gateway Error]:', err);
    res.setHeader('Content-Type', 'text/plain');
    res.send('END Huduma haipatikani kwa sasa. Jaribu tena baadaye.');
  }
});

// POST /api/ussd/simulate - Interactive In-App USSD Phone Dial Simulator
app.post('/api/ussd/simulate', authenticateToken, async (req, res) => {
  try {
    const { 
      sessionId = 'browser-sim-session', 
      serviceCode = '*384*4744#', 
      phoneNumber = '+254 712 345 678', 
      text = '' 
    } = req.body;

    const rawResponse = await ussd.handleUssdRequest({ sessionId, serviceCode, phoneNumber, text });
    const isContinue = rawResponse.startsWith('CON ');
    const displayMenu = rawResponse.replace(/^(CON |END )/, '');

    res.json({
      status: isContinue ? 'CON' : 'END',
      message: displayMenu,
      raw: rawResponse,
      phoneNumber,
      serviceCode
    });
  } catch (err) {
    res.status(500).json({ error: 'USSD Simulation failed', details: err.message });
  }
});

// GET /api/ussd/sms-logs - Fetch Outgoing SMS Notifications Log
app.get('/api/ussd/sms-logs', authenticateToken, async (req, res) => {
  let logs = await tidb.getSmsLogs(50);
  if (!logs || logs.length === 0) {
    logs = db.getSmsLogs(50);
  }
  if (!logs || logs.length === 0) {
    logs = ussd.getSmsLogs();
  }
  res.json({ smsLogs: logs || [] });
});

// ─── 5. AI Agronomy Advisory & Integration Endpoints ──────────────────────
// POST /api/ai/advice - Trigger on-demand AI post-irrigation advisory
app.post('/api/ai/advice', authenticateToken, async (req, res) => {
  try {
    const userEmail = (req.auth?.email || '').toLowerCase();
    const isSimAccount = [
      'john@irrigatech.io',
      'sarah@irrigatech.io',
      'david@irrigatech.io',
      'demo.farmer@irrigatech.io',
      'francis@irriga-tech.farm'
    ].includes(userEmail);

    // Real user accounts strictly require real live hardware telemetry
    if (!isSimAccount) {
      if (!bridge.connected || bridge.simulated) {
        return res.status(400).json({
          error: 'Real accounts require live hardware. Connect physical sensor hardware to generate real-data AI agronomy advice.'
        });
      }
    }

    const { 
      crop = deviceConfig.crop, 
      cropStage = 'Vegetative Phase', 
      durationSeconds = 180, 
      waterLiters = 36.0, 
      soilPh = bridge.state.soilPh ?? null, 
      soilMoisture = bridge.state.soilMoisture || 48.0,
      temperature = bridge.state.temperature || 27.5,
      humidity = bridge.state.humidity || 65.0
    } = req.body;

    const advice = await aiAgronomy.generatePostIrrigationAdvice({
      crop,
      cropStage,
      durationSeconds,
      waterLiters,
      soilPh,
      soilMoisture,
      temperature: Number(temperature),
      humidity: Number(humidity)
    });

    res.json({ success: true, aiMode: advice.aiMode || 'rules', advice });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate AI agronomy advice', details: err.message });
  }
});

// ─── 6. Weather & Solar Forecast Endpoint ──────────────────────────────────
// GET /api/weather - Live Open-Meteo forecast with energy-aware irrigation advisory
app.get('/api/weather', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || undefined;
    const lon = parseFloat(req.query.lon) || undefined;
    const forecast = await weatherService.getForecast(lat, lon);
    res.json({ success: true, forecast });
  } catch (err) {
    res.status(500).json({ error: 'Weather forecast unavailable', details: err.message });
  }
});

// POST /api/ai/config - Set Gemini API Key or AI Model parameters
app.post('/api/ai/config', authenticateToken, requireFarmAdmin, (req, res) => {
  const { apiKey } = req.body;
  if (apiKey) {
    aiAgronomy.setApiKey(apiKey);
    return res.json({ success: true, message: 'Google Gemini API key successfully configured.' });
  }
  res.status(400).json({ error: 'Gemini API key is required' });
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
