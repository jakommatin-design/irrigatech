import React, { useState, useEffect, useRef } from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Terminal, Cpu, Play, Square, Send, 
  RotateCcw, Sliders, CheckCircle2, AlertCircle
} from 'lucide-react';

export default function TerminalView() {
  const { 
    temperature, humidity, soilMoisture, lightLux,
    pump, ac, led, connected, mode, uptime,
    sendCommand
  } = useSensors();

  const [inputCmd, setInputCmd] = useState('');
  const [logs, setLogs] = useState([
    `[INIT] Serial bridge initialized at 9600 baud.`,
    `[FIRMWARE] DHT11 initialized on digital pin 2.`,
    `[FIRMWARE] FC-28 analog sensor attached to pin A0.`,
    `[FIRMWARE] 4-Channel Relay attached: Pump=D3, AC=D7, LED=D8.`,
    `[LCD] I2C 16x2 Display online at address 0x27.`
  ]);

  const logEndRef = useRef(null);

  // Append new serial telemetry lines periodically
  useEffect(() => {
    const rawLine = `[TX] T:${temperature}C | H:${humidity}% | SOIL:${soilMoisture}% (A0:${Math.round((soilMoisture/100)*1023)}) | PUMP:${pump ? '1' : '0'} | AC:${ac ? '1' : '0'} | LED:${led ? '1' : '0'}`;
    setLogs((prev) => [...prev.slice(-30), rawLine]);
  }, [temperature, humidity, soilMoisture, pump, ac, led]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;
    sendCommand(inputCmd.trim().toUpperCase());
    setLogs((prev) => [...prev, `[CMD_SENT] > ${inputCmd.trim().toUpperCase()}`]);
    setInputCmd('');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Hardware Terminal & Arduino Pinout Diagnostics
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          Real-time serial communications monitor (9600 baud) and low-level microcontroller pin states.
        </p>
      </div>

      {/* Pin State Matrix */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Cpu size={20} color="#15803d" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Microcontroller GPIO Pinout Matrix
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { pin: 'D2 (Digital)', component: 'DHT11 Sensor', state: `${temperature}°C / ${humidity}%`, active: true, color: '#0284c7', bg: '#f0f9ff' },
            { pin: 'A0 (Analog)', component: 'FC-28 Soil Moisture', state: `${soilMoisture}% (${Math.round((soilMoisture/100)*1023)})`, active: true, color: '#16a34a', bg: '#f0fdf4' },
            { pin: 'D3 (Relay)', component: 'Water Pump Relay', state: pump ? 'HIGH (Closed / Pump ON)' : 'LOW (Open / Standby)', active: pump, color: pump ? '#ef4444' : '#64748b', bg: pump ? '#fef2f2' : '#f8fafc' },
            { pin: 'D7 (Digital)', component: 'Cooling AC / Fan', state: ac ? 'HIGH (AC Active)' : 'LOW (Off)', active: ac, color: ac ? '#0284c7' : '#64748b', bg: ac ? '#f0f9ff' : '#f8fafc' },
            { pin: 'D8 (Digital)', component: 'Buzzer & Alarm LED', state: led ? 'HIGH (Alarm Sounding)' : 'LOW (Silent)', active: led, color: led ? '#f59e0b' : '#64748b', bg: led ? '#fffbeb' : '#f8fafc' },
            { pin: 'I2C (0x27)', component: 'LCD 16x2 Display', state: 'SDA / SCL Initialized', active: true, color: '#059669', bg: '#ecfdf5' },
          ].map((item, idx) => (
            <div key={idx} style={{
              background: item.bg,
              borderRadius: '14px',
              padding: '0.85rem',
              border: `1px solid ${item.active ? item.color : '#e2e8f0'}`
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: item.color }}>{item.pin}</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0' }}>{item.component}</div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>{item.state}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Realistic Green LCD 16x2 Preview */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.85rem' }}>
          Physical 16x2 HD44780 LCD Output (I2C 0x27)
        </h2>

        <div style={{
          background: '#7ea843',
          border: '6px solid #1a2e1b',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          fontFamily: 'monospace',
          color: '#112211',
          fontWeight: 700,
          fontSize: '1.15rem',
          letterSpacing: '0.12em',
          textShadow: '0 0 1px rgba(0,0,0,0.5)',
          boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.35)'
        }}>
          <div>LINE 1: T:{temperature}C  H:{humidity}%</div>
          <div>LINE 2: SOIL:{soilMoisture}% PUMP:{pump ? 'ON ' : 'OFF'}</div>
        </div>
      </div>

      {/* Live Serial Console */}
      <div style={{
        background: '#0f172a',
        borderRadius: '20px',
        padding: '1.25rem',
        border: '1px solid #1e293b',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        color: '#f8fafc'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
            <Terminal size={18} color="#38bdf8" />
            <span>Serial Monitor (9600 Baud)</span>
          </div>
          <button
            onClick={() => setLogs([])}
            style={{
              padding: '0.3rem 0.65rem',
              borderRadius: '6px',
              background: '#334155',
              color: '#94a3b8',
              fontSize: '0.72rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <RotateCcw size={12} /> Clear
          </button>
        </div>

        {/* Scrollable Log Area */}
        <div style={{
          height: '240px',
          overflowY: 'auto',
          background: '#020617',
          borderRadius: '10px',
          padding: '0.75rem',
          fontFamily: 'monospace',
          fontSize: '0.78rem',
          lineHeight: 1.5,
          color: '#38bdf8',
          marginBottom: '0.75rem',
          border: '1px solid #1e293b'
        }}>
          {logs.map((l, i) => (
            <div key={i} style={{ color: l.includes('CMD') ? '#facc15' : (l.includes('TX') ? '#4ade80' : '#38bdf8') }}>
              {l}
            </div>
          ))}
          <div ref={logEndRef} />
        </div>

        {/* Command Input Form */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={inputCmd}
            onChange={(e) => setInputCmd(e.target.value)}
            placeholder="Send command: PUMP_ON, PUMP_OFF, AC_ON, AC_OFF, LED_ON, LED_OFF..."
            style={{
              flex: 1,
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              color: '#ffffff',
              fontSize: '0.82rem',
              outline: 'none',
              fontFamily: 'monospace'
            }}
          />
          <button
            type="submit"
            style={{
              background: '#15803d',
              color: '#ffffff',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Send size={15} /> Send
          </button>
        </form>

        {/* Quick Command Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
          {['PUMP_ON', 'PUMP_OFF', 'AC_ON', 'AC_OFF', 'LED_ON', 'LED_OFF'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => {
                sendCommand(cmd);
                setLogs((prev) => [...prev, `[CMD_SENT] > ${cmd}`]);
              }}
              style={{
                background: '#1e293b',
                color: '#cbd5e1',
                padding: '0.3rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: '1px solid #334155'
              }}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
