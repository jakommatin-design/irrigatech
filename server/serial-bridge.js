import { EventEmitter } from 'events';

export class SerialBridge extends EventEmitter {
  constructor() {
    super();
    this.connected = false;
    this.portName = null;
    this.simulated = true;
    this.state = {
      temperature: 28.2,
      humidity: 68.0,
      soilMoisture: 42.0,
      soilPh: 6.2,
      flowRate: 12.0,
      lightLux: 720,
      pump: false,
      ac: false,
      led: false,
      waterTank: 75,
      batterySoc: 78,
      batteryVoltage: 12.4,
      solarWatts: 180,
      uptime: 0
    };
    this.pumpStartTime = null;
    this.simInterval = null;
  }

  async init() {
    const configuredPort = process.env.SERIAL_PORT?.trim();
    const baudRate = Number.parseInt(process.env.SERIAL_BAUD_RATE || '9600', 10);

    try {
      const { SerialPort } = await import('serialport');
      const { ReadlineParser } = await import('@serialport/parser-readline');
      const ports = await SerialPort.list();
      const normalizedConfiguredPort = configuredPort?.toLowerCase();
      const supportedVendorIds = ['2341', '1a86', '10c4', '0403', '303a'];
      const detectedPort = configuredPort
        ? ports.find(port => port.path.toLowerCase() === normalizedConfiguredPort)
        : ports.find(port => {
            const manufacturer = `${port.manufacturer || ''} ${port.friendlyName || ''}`.toLowerCase();
            return supportedVendorIds.includes(String(port.vendorId || '').toLowerCase())
              || ['arduino', 'espressif', 'silicon labs', 'wch', 'ftdi'].some(name => manufacturer.includes(name));
          });

      if (!detectedPort) {
        if (configuredPort) {
          this.simulated = false;
          this.connected = false;
          this.portName = configuredPort;
          console.error(`[SerialBridge] Configured USB device ${configuredPort} was not found. Available ports: ${ports.map(port => port.path).join(', ') || 'none'}`);
          this.emit('status', { connected: false, port: configuredPort, simulated: false });
          return;
        }
        console.log(`[SerialBridge] No supported USB device found. Available ports: ${ports.map(port => port.path).join(', ') || 'none'}. Starting simulator.`);
        this.startSimulation();
        return;
      }

      console.log(`[SerialBridge] Opening USB serial device ${detectedPort.path} at ${baudRate} baud`);
      const serialPort = new SerialPort({ path: detectedPort.path, baudRate, autoOpen: false });
      this.port = serialPort;
      const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));
      parser.on('data', line => this.parseArduinoSerial(line));
      serialPort.on('open', () => {
        this.connected = true;
        this.simulated = false;
        this.portName = detectedPort.path;
        console.log(`[SerialBridge] USB device connected on ${detectedPort.path}`);
        this.emit('status', { connected: true, port: this.portName, simulated: false });
      });
      serialPort.on('error', error => {
        this.connected = false;
        this.simulated = false;
        console.error(`[SerialBridge] USB serial error on ${detectedPort.path}:`, error.message);
        this.emit('status', { connected: false, port: detectedPort.path, simulated: false });
      });
      serialPort.on('close', () => {
        this.connected = false;
        this.simulated = false;
        this.emit('status', { connected: false, port: detectedPort.path, simulated: false });
      });
      serialPort.open(error => {
        if (error) {
          this.connected = false;
          this.simulated = false;
          console.error(`[SerialBridge] Could not open ${detectedPort.path}: ${error.message}`);
          this.emit('status', { connected: false, port: detectedPort.path, simulated: false });
        }
      });
    } catch (error) {
      if (configuredPort) {
        this.connected = false;
        this.simulated = false;
        this.portName = configuredPort;
        console.error(`[SerialBridge] USB serial setup failed: ${error.message}`);
        this.emit('status', { connected: false, port: configuredPort, simulated: false });
        return;
      }
      console.warn(`[SerialBridge] USB serial unavailable (${error.message}); starting simulator.`);
      this.startSimulation();
    }
  }

  parseArduinoSerial(line) {
    // Firmware V2.4 emits JSON: {"temperature":28.0,"humidity":65.1,"soilMoisture":42.0,"soilPh":6.20,"pump":false,...}
    // Legacy firmware used CSV: "T:28.0,H:65.0,S:420,P:0"
    try {
      this.emit('rawSerial', line);
      const prevPump = this.state.pump;

      const trimmed = line.trim();
      if (trimmed.startsWith('{')) {
        // — JSON mode (V2.4 firmware) —
        const parsed = JSON.parse(trimmed);
        if (parsed.ack) return;
        if (parsed.error) {
          console.warn('[SerialBridge] Firmware error:', parsed.error);
          return;
        }
        if (typeof parsed.temperature === 'number')  this.state.temperature  = parseFloat(parsed.temperature.toFixed(1));
        if (typeof parsed.humidity    === 'number')  this.state.humidity     = parseFloat(parsed.humidity.toFixed(1));
        if (typeof parsed.soilMoisture === 'number') this.state.soilMoisture = parseFloat(parsed.soilMoisture.toFixed(1));
        if (typeof parsed.soilPh      === 'number')  this.state.soilPh      = parseFloat(parsed.soilPh.toFixed(2));
        if (typeof parsed.pump        === 'boolean') this.state.pump        = parsed.pump;
        if (typeof parsed.ac          === 'boolean') this.state.ac          = parsed.ac;
        if (typeof parsed.led         === 'boolean') this.state.led         = parsed.led;
      } else {
        // — Legacy CSV mode (older firmware) —
        const parts = trimmed.split(',');
        parts.forEach(part => {
          const [key, val] = part.split(':');
          if (!key || val === undefined) return;
          if (key === 'T')  this.state.temperature  = parseFloat(val);
          if (key === 'H')  this.state.humidity     = parseFloat(val);
          if (key === 'S') {
            const raw = parseInt(val, 10);
            this.state.soilMoisture = parseFloat(((raw / 1023) * 100).toFixed(1));
          }
          if (key === 'PH') this.state.soilPh = parseFloat(val);
          if (key === 'P')  this.state.pump = val.trim() === '1';
        });
      }

      this.checkPumpStateTransition(prevPump, this.state.pump);
      this.emit('telemetry', { ...this.state });
    } catch (err) {
      console.warn('[SerialBridge] Failed parsing serial line:', line, err.message);
    }
  }

  checkPumpStateTransition(prevPump, currentPump) {
    if (!prevPump && currentPump) {
      // Pump started
      this.pumpStartTime = Date.now();
      this.emit('irrigation_started', { startTime: this.pumpStartTime, zoneId: 1 });
    } else if (prevPump && !currentPump) {
      // Pump finished
      const durationSeconds = this.pumpStartTime 
        ? Math.max(10, Math.round((Date.now() - this.pumpStartTime) / 1000))
        : 180;
      const flowRateLpm = this.state.flowRate || 12.0;
      const waterLiters = parseFloat(((durationSeconds / 60) * flowRateLpm).toFixed(1));
      this.pumpStartTime = null;

      this.emit('irrigation_cycle_finished', {
        durationSeconds,
        waterLiters,
        soilPh: this.state.soilPh || 6.2,
        zoneId: 1
      });
    }
  }

  sendCommand(cmd) {
    console.log(`[SerialBridge] Executing command: ${cmd}`);
    const prevPump = this.state.pump;
    if (this.port && this.port.isOpen) {
      this.port.write(`${cmd}\n`, error => {
        if (error) console.error(`[SerialBridge] Failed to send ${cmd}:`, error.message);
      });
    } else if (process.env.SERIAL_PORT?.trim()) {
      console.error(`[SerialBridge] Cannot send ${cmd}; configured USB device ${process.env.SERIAL_PORT} is not open.`);
      return;
    } else {
      // Apply to simulated hardware
      if (cmd === 'PUMP_ON')  { this.state.pump = true;  this.state.led = true; }
      if (cmd === 'PUMP_OFF') { this.state.pump = false; this.state.led = false; }
      if (cmd === 'AC_ON')    { this.state.ac = true; }
      if (cmd === 'AC_OFF')   { this.state.ac = false; }
      if (cmd === 'LED_ON')   { this.state.led = true; }
      if (cmd === 'LED_OFF')  { this.state.led = false; }

      this.checkPumpStateTransition(prevPump, this.state.pump);
      this.emit('telemetry', { ...this.state });
    }
  }

  startSimulation() {
    this.simulated = true;
    this.connected = true;
    this.portName = 'EMULATED_ESP32_PORT';
    this.emit('status', { connected: true, port: this.portName, simulated: true });

    if (this.simInterval) clearInterval(this.simInterval);

    this.simInterval = setInterval(() => {
      this.state.uptime += 2;
      
      // Realistic physical drift
      const drift = (v, min, max, s = 0.4) => parseFloat(Math.min(max, Math.max(min, v + (Math.random() - 0.48) * s)).toFixed(1));
      
      this.state.temperature = drift(this.state.temperature, 22, 34, 0.2);
      this.state.humidity    = drift(this.state.humidity, 45, 85, 0.5);
      
      const prevPump = this.state.pump;

      // If pump is active, soil moisture decreases (becomes wetter), else dries slowly
      if (this.state.pump) {
        this.state.soilMoisture = Math.max(30, this.state.soilMoisture - 2.5);
        this.state.waterTank = Math.max(10, this.state.waterTank - 0.2);
        // Automatic turn off after reaching ideal 38%
        if (this.state.soilMoisture <= 38) {
          this.state.pump = false;
          this.state.led = false;
        }
      } else {
        this.state.soilMoisture = drift(this.state.soilMoisture, 25, 95, 0.6);
        // Automatic firmware threshold logic: if soil > 72% dry, turn pump ON
        if (this.state.soilMoisture > 72) {
          this.state.pump = true;
          this.state.led = true;
        }
      }

      this.checkPumpStateTransition(prevPump, this.state.pump);

      this.state.solarWatts     = drift(this.state.solarWatts, 0, 240, 4);
      this.state.lightLux       = drift(this.state.lightLux, 250, 1100, 20);
      this.state.batterySoc     = drift(this.state.batterySoc, 50, 100, 0.1);
      this.state.batteryVoltage = parseFloat((11.8 + (this.state.batterySoc / 100) * 1.5).toFixed(2));

      this.emit('telemetry', { ...this.state });
    }, 2000);
  }
}
