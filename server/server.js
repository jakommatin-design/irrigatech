import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { SerialBridge } from './serial-bridge.js';
import { db } from './db.js';
import { initTiDB, tidb } from './tidb.js';

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

// GET /api/farms
app.get('/api/farms', async (req, res) => {
  let farms = await tidb.getFarms();
  if (!farms || farms.length === 0) {
    farms = db.getFarms();
  }
  res.json({ farms });
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
