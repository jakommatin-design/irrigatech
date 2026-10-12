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
    this.simInterval = null;
  }

  async init() {
    // Attempt real serialport if installed, otherwise fallback to software simulator
    try {
      const { SerialPort } = await import('serialport');
      const { ReadlineParser } = await import('@serialport/parser-readline');
      
      const ports = await SerialPort.list();
      const arduinoPort = ports.find(p => 
        (p.manufacturer && p.manufacturer.toLowerCase().includes('arduino')) ||
        (p.friendlyName && p.friendlyName.toLowerCase().includes('arduino')) ||
        (p.vendorId && ['2341', '1a86'].includes(p.vendorId.toLowerCase()))
      );

      if (arduinoPort) {
        console.log(`[SerialBridge] Found Arduino at ${arduinoPort.path}`);
        this.port = new SerialPort({ path: arduinoPort.path, baudRate: 9600 });
        const parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        
        this.port.on('open', () => {
          this.connected = true;
          this.simulated = false;
          this.portName = arduinoPort.path;
          this.emit('status', { connected: true, port: this.portName, simulated: false });
        });

        parser.on('data', (line) => {
          this.parseArduinoSerial(line);
        });

        this.port.on('error', (err) => {
          console.warn('[SerialBridge] Serial error, falling back to simulator:', err.message);
          this.startSimulation();
        });
        return;
      }
    } catch (e) {
      // serialport package not present or native build skipped, start simulation
    }

    console.log('[SerialBridge] No physical Arduino detected on COM ports. Running Hardware Emulation mode.');
    this.startSimulation();
  }

  parseArduinoSerial(line) {
    // Arduino outputs format: e.g., "T:28.0,H:65.0,S:420,P:0"
    try {
      this.emit('rawSerial', line);
      const parts = line.split(',');
      parts.forEach(part => {
        const [key, val] = part.split(':');
        if (key === 'T') this.state.temperature = parseFloat(val);
        if (key === 'H') this.state.humidity = parseFloat(val);
        if (key === 'S') {
          // Analog 0-1023 mapped to percentage
          const raw = parseInt(val, 10);
          this.state.soilMoisture = parseFloat(((raw / 1023) * 100).toFixed(1));
        }
        if (key === 'P') this.state.pump = val.trim() === '1';
      });
      this.emit('telemetry', { ...this.state });
    } catch (err) {
      console.warn('Failed parsing serial line:', line);
    }
  }

  sendCommand(cmd) {
    console.log(`[SerialBridge] Executing command: ${cmd}`);
    if (this.port && this.port.isOpen) {
      this.port.write(`${cmd}\n`);
    } else {
      // Apply to simulated hardware
      if (cmd === 'PUMP_ON')  { this.state.pump = true;  this.state.led = true; }
      if (cmd === 'PUMP_OFF') { this.state.pump = false; this.state.led = false; }
      if (cmd === 'AC_ON')    { this.state.ac = true; }
      if (cmd === 'AC_OFF')   { this.state.ac = false; }
      if (cmd === 'LED_ON')   { this.state.led = true; }
      if (cmd === 'LED_OFF')  { this.state.led = false; }
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

      this.state.solarWatts     = drift(this.state.solarWatts, 0, 240, 4);
      this.state.lightLux       = drift(this.state.lightLux, 250, 1100, 20);
      this.state.batterySoc     = drift(this.state.batterySoc, 50, 100, 0.1);
      this.state.batteryVoltage = parseFloat((11.8 + (this.state.batterySoc / 100) * 1.5).toFixed(2));

      this.emit('telemetry', { ...this.state });
    }, 2000);
  }
}
