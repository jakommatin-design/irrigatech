import { createContext, useContext, useEffect, useReducer, useRef } from 'react';

// ─── Initial sensor state matching Blueprint Schema 7.2 ─────────────────────
const initialState = {
  temperature: 28.4,
  humidity: 67.0,
  soilMoisture: 42.0,
  zoneMoisture: {
    zone1: 42.0, // Tomatoes (Primary)
    zone2: 44.5, // Bell Peppers
    zone3: 52.0, // Lettuce
    zone4: 48.0  // Herbs
  },
  lightLux: 720,
  pump: false,
  activeZone: 1,
  ac: false, // Ventilation Fans
  led: false,
  shadePct: 20, // Motorized shade cloth %
  waterTank: 75,
  batterySoc: 78,
  batteryVoltage: 12.4,
  solarWatts: 180,
  solarDailyKwh: 3.4,
  uptime: 142,
  flowRate: 0.0,
  connected: false,
  mode: 'live',
  currentReasonCode: 'SOIL_DRY_ENERGY_OK',
  thresholds: {
    moistureStart: 35, // Trigger irrigation when soil falls below this
    moistureStop: 50,  // Stop irrigation when soil reaches this target
    tempHighLimit: 30, // Turn on fans
    tempLowLimit: 18,
    shadeCloseLux: 950
  },
  history: [
    { ts: Date.now() - 3600000, soilMoisture: 48, temperature: 26.5, humidity: 62, solarWatts: 160 },
    { ts: Date.now() - 3000000, soilMoisture: 46, temperature: 27.1, humidity: 64, solarWatts: 175 },
    { ts: Date.now() - 2400000, soilMoisture: 45, temperature: 27.8, humidity: 65, solarWatts: 185 },
    { ts: Date.now() - 1800000, soilMoisture: 44, temperature: 28.2, humidity: 66, solarWatts: 190 },
    { ts: Date.now() - 1200000, soilMoisture: 43, temperature: 28.4, humidity: 67, solarWatts: 180 },
    { ts: Date.now() - 600000,  soilMoisture: 42, temperature: 28.3, humidity: 67, solarWatts: 178 },
  ],
  irrigationLogs: [
    { action: 'STOP: moisture target reached', reason: 'MOISTURE_OK', source: 'ARDUINO_CORE', isoTime: new Date(Date.now() - 900000).toLocaleTimeString() },
    { action: 'START: Zone 1 (Tomatoes)', reason: 'SOIL_DRY_ENERGY_OK', source: 'ARDUINO_CORE', isoTime: new Date(Date.now() - 1200000).toLocaleTimeString() }
  ]
};

// ─── Reducer ─────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE_SENSORS': {
      const payload = action.payload || {};
      const zm = payload.zoneMoisture || state.zoneMoisture;
      const reading = {
        ts: Date.now(),
        soilMoisture: payload.soilMoisture ?? state.soilMoisture,
        temperature: payload.temperature ?? state.temperature,
        humidity: payload.humidity ?? state.humidity,
        solarWatts: payload.solarWatts ?? state.solarWatts,
        batteryVoltage: payload.batteryVoltage ?? state.batteryVoltage
      };
      const history = [...state.history, reading].slice(-30);
      return { 
        ...state, 
        ...payload, 
        zoneMoisture: { ...state.zoneMoisture, ...zm },
        history,
        flowRate: (payload.pump ?? state.pump) ? 1.4 : 0.0
      };
    }
    case 'SET_STATUS':
      return { ...state, connected: action.payload.connected, mode: action.payload.mode };
    case 'SET_ACTUATOR':
      return { 
        ...state, 
        [action.key]: action.value,
        flowRate: (action.key === 'pump' && action.value) ? 1.4 : (action.key === 'pump' && !action.value ? 0.0 : state.flowRate)
      };
    case 'SET_THRESHOLDS':
      return { ...state, thresholds: { ...state.thresholds, ...action.payload } };
    case 'SET_ACTIVE_ZONE':
      return { ...state, activeZone: action.payload };
    case 'SET_SHADE':
      return { ...state, shadePct: action.payload };
    case 'ADD_LOG':
      return { 
        ...state, 
        irrigationLogs: [action.payload, ...state.irrigationLogs].slice(0, 30) 
      };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
const SensorContext = createContext(null);
export const useSensors = () => useContext(SensorContext);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function SensorProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef(null);
  const demoRef = useRef(null);
  const demoState = useRef({ ...initialState });

  function startDemo() {
    if (demoRef.current) return;
    dispatch({ type: 'SET_STATUS', payload: { connected: false, mode: 'demo' } });
    
    demoRef.current = setInterval(() => {
      const s = demoState.current;
      s.uptime += 2;
      
      const drift = (v, min, max, step = 0.4) => {
        const d = (Math.random() - 0.48) * step;
        return parseFloat(Math.min(max, Math.max(min, v + d)).toFixed(1));
      };

      s.temperature = drift(s.temperature, 21, 35, 0.2);
      s.humidity = drift(s.humidity, 45, 85, 0.5);

      // Multi-zone drift
      s.zoneMoisture.zone1 = drift(s.zoneMoisture.zone1, 28, 65, 0.3);
      s.zoneMoisture.zone2 = drift(s.zoneMoisture.zone2, 32, 68, 0.3);
      s.zoneMoisture.zone3 = drift(s.zoneMoisture.zone3, 35, 75, 0.3);
      s.zoneMoisture.zone4 = drift(s.zoneMoisture.zone4, 30, 60, 0.3);
      s.soilMoisture = s.zoneMoisture.zone1;

      // Energy Aware Irrigation Policy (Algorithm B)
      if (s.pump) {
        s.zoneMoisture.zone1 = Math.min(52, parseFloat((s.zoneMoisture.zone1 + 0.8).toFixed(1)));
        s.soilMoisture = s.zoneMoisture.zone1;
        s.waterTank = Math.max(10, Math.round((s.waterTank - 0.05) * 10) / 10);
        
        // Hysteresis stop threshold
        if (s.soilMoisture >= s.thresholds.moistureStop) {
          s.pump = false;
          s.led = false;
          s.currentReasonCode = 'MOISTURE_OK';
        }
      } else {
        // If soil falls below moistureStart and battery is safe
        if (s.soilMoisture < s.thresholds.moistureStart) {
          if (s.waterTank <= 15) {
            s.currentReasonCode = 'WATER_LOW';
          } else if (s.batterySoc >= 50) {
            s.pump = true;
            s.led = true;
            s.currentReasonCode = 'SOIL_DRY_ENERGY_OK';
          } else {
            s.currentReasonCode = 'WAIT_SOLAR_WINDOW';
          }
        } else {
          s.currentReasonCode = 'MOISTURE_OK';
        }
      }

      s.solarWatts = drift(s.solarWatts, 0, 240, 4);
      s.lightLux = drift(s.lightLux, 250, 1150, 15);
      s.batterySoc = drift(s.batterySoc, 50, 100, 0.1);
      s.batteryVoltage = parseFloat((11.8 + (s.batterySoc / 100) * 1.5).toFixed(2));
      
      // Automatic climate fans & shade
      s.ac = s.temperature >= s.thresholds.tempHighLimit;
      s.shadePct = s.lightLux > s.thresholds.shadeCloseLux ? 60 : 20;

      demoState.current = { ...s };
      dispatch({ type: 'UPDATE_SENSORS', payload: { ...s } });
    }, 2000);
  }

  function stopDemo() {
    if (demoRef.current) {
      clearInterval(demoRef.current);
      demoRef.current = null;
    }
  }

  function sendCommand(cmd, params = {}) {
    const logItem = { 
      action: cmd, 
      reason: params.reason || 'USER_OVERRIDE',
      source: 'USER_INTERFACE', 
      isoTime: new Date().toLocaleTimeString() 
    };
    dispatch({ type: 'ADD_LOG', payload: logItem });

    if (socketRef.current?.connected) {
      socketRef.current.emit('command', { cmd, ...params });
    } else {
      if (cmd === 'PUMP_ON') {
        demoState.current.pump = true;
        demoState.current.led = true;
        demoState.current.currentReasonCode = 'CROP_CRITICAL_OVERRIDE';
        dispatch({ type: 'SET_ACTUATOR', key: 'pump', value: true });
        dispatch({ type: 'SET_ACTUATOR', key: 'led', value: true });
      } else if (cmd === 'PUMP_OFF') {
        demoState.current.pump = false;
        demoState.current.led = false;
        demoState.current.currentReasonCode = 'MOISTURE_OK';
        dispatch({ type: 'SET_ACTUATOR', key: 'pump', value: false });
        dispatch({ type: 'SET_ACTUATOR', key: 'led', value: false });
      } else if (cmd === 'AC_ON') {
        demoState.current.ac = true;
        dispatch({ type: 'SET_ACTUATOR', key: 'ac', value: true });
      } else if (cmd === 'AC_OFF') {
        demoState.current.ac = false;
        dispatch({ type: 'SET_ACTUATOR', key: 'ac', value: false });
      } else if (cmd === 'SET_SHADE') {
        demoState.current.shadePct = params.pct ?? 50;
        dispatch({ type: 'SET_SHADE', payload: demoState.current.shadePct });
      }
    }
  }

  function setThreshold(key, value) {
    dispatch({ type: 'SET_THRESHOLDS', payload: { [key]: value } });
    if (demoState.current.thresholds) {
      demoState.current.thresholds[key] = value;
    }
  }

  function setActiveZone(zoneId) {
    dispatch({ type: 'SET_ACTIVE_ZONE', payload: zoneId });
  }

  useEffect(() => {
    const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

    async function tryConnect() {
      try {
        const { io } = await import('socket.io-client');
        const socket = io(SERVER, { 
          transports: ['websocket', 'polling'], 
          timeout: 4000, 
          reconnectionAttempts: 10,
          reconnectionDelay: 2000
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          stopDemo();
          dispatch({ type: 'SET_STATUS', payload: { connected: true, mode: 'live' } });
        });

        socket.on('status', (stat) => {
          dispatch({ type: 'SET_STATUS', payload: { connected: stat.connected, mode: stat.mode || 'live' } });
        });

        socket.on('telemetry', (data) => {
          dispatch({ type: 'UPDATE_SENSORS', payload: { ...data, mode: 'live' } });
        });

        socket.on('disconnect', () => {
          dispatch({ type: 'SET_STATUS', payload: { connected: false, mode: 'demo' } });
          startDemo();
        });

        socket.on('connect_error', () => {
          if (!demoRef.current) startDemo();
        });
      } catch {
        startDemo();
      }
    }

    tryConnect();
    return () => {
      stopDemo();
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SensorContext.Provider value={{
      ...state,
      sendCommand,
      setThreshold,
      setActiveZone
    }}>
      {children}
    </SensorContext.Provider>
  );
}
