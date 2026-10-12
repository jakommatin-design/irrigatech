import React, { useState } from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Fan, Blinds, Thermometer, Droplets, 
  ToggleLeft, ToggleRight, Settings2, CloudRain
} from 'lucide-react';

export default function ClimateControlView() {
  const { 
    temperature, humidity, ac, shadePct, 
    thresholds, sendCommand, setThreshold
  } = useSensors();

  const [autoMode, setAutoMode] = useState(true);

  const handleToggleFans = () => {
    sendCommand(ac ? 'AC_OFF' : 'AC_ON');
  };

  const handleToggleShade = () => {
    sendCommand('SET_SHADE', { pct: shadePct > 30 ? 20 : 70 });
  };

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '1.25rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '1.25rem 1rem 5rem' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Climate Control
        </h1>
      </div>

      {/* 2x2 Grid - Ventilation, Shade, Temperature, Humidity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        
        {/* Ventilation Fans */}
        <div style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '1.5rem 1rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
          onClick={handleToggleFans}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: ac ? '#ecfdf5' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ac ? '#059669' : '#94a3b8',
            marginBottom: '0.85rem',
            transition: 'all 0.2s ease'
          }}>
            <Fan size={28} className={ac ? 'animate-spin' : ''} />
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
            Ventilation Fans
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 800, 
            color: ac ? '#059669' : '#0f172a',
            marginBottom: '0.25rem'
          }}>
            {ac ? 'ON' : 'OFF'}
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: ac ? '#ecfdf5' : '#f1f5f9',
            color: ac ? '#16a34a' : '#94a3b8'
          }}>
            {autoMode ? 'Auto mode' : 'Manual'}
          </span>
        </div>

        {/* Shade Curtain */}
        <div style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '1.5rem 1rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
          onClick={handleToggleShade}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: shadePct > 30 ? '#f0f9ff' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: shadePct > 30 ? '#0284c7' : '#94a3b8',
            marginBottom: '0.85rem',
            transition: 'all 0.2s ease'
          }}>
            <Blinds size={28} />
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
            Shade Curtain
          </div>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: 800, 
            color: shadePct > 30 ? '#0284c7' : '#0f172a',
            marginBottom: '0.25rem'
          }}>
            {shadePct > 30 ? 'CLOSED' : 'OPEN'}
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: '#f0f9ff',
            color: '#0284c7'
          }}>
            {shadePct}% shade
          </span>
        </div>

        {/* Temperature Control */}
        <div style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '1.5rem 1rem'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#ecfdf5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#059669',
            marginBottom: '0.85rem'
          }}>
            <Thermometer size={28} />
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
            Temperature Control
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
            {temperature}°C
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: '#ecfdf5',
            color: '#16a34a'
          }}>
            Target: {thresholds.tempLowLimit}–{thresholds.tempHighLimit}°C
          </span>
        </div>

        {/* Humidity Control */}
        <div style={{
          ...cardStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '1.5rem 1rem'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#f0f9ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0284c7',
            marginBottom: '0.85rem'
          }}>
            <CloudRain size={28} />
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
            Humidity Control
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
            {humidity}%
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: '#f0f9ff',
            color: '#0284c7'
          }}>
            Target: 50–80%
          </span>
        </div>
      </div>

      {/* Auto Mode Toggle - matches layout.png screen 6 */}
      <div style={{
        ...cardStyle,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>
            Auto Mode
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
            System adjusts based on sensor data and weather forecast.
          </div>
        </div>
        <button 
          onClick={() => setAutoMode(!autoMode)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: autoMode ? '#15803d' : '#94a3b8',
            transition: 'color 0.2s ease'
          }}
        >
          {autoMode ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}
        </button>
      </div>

      {/* Climate Thresholds */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Settings2 size={16} color="#64748b" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
            Climate Thresholds
          </span>
        </div>

        {/* Temp High Limit */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Fan Activation Temperature</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{thresholds.tempHighLimit}°C</span>
          </div>
          <input
            type="range"
            min={25}
            max={38}
            value={thresholds.tempHighLimit}
            onChange={(e) => setThreshold('tempHighLimit', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#15803d' }}
          />
        </div>

        {/* Shade Lux Limit */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Shade Close Threshold</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{thresholds.shadeCloseLux} lux</span>
          </div>
          <input
            type="range"
            min={500}
            max={1200}
            step={50}
            value={thresholds.shadeCloseLux}
            onChange={(e) => setThreshold('shadeCloseLux', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#15803d' }}
          />
        </div>

        {/* Temp Low Limit */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Low Temperature Alert</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{thresholds.tempLowLimit}°C</span>
          </div>
          <input
            type="range"
            min={10}
            max={22}
            value={thresholds.tempLowLimit}
            onChange={(e) => setThreshold('tempLowLimit', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#15803d' }}
          />
        </div>
      </div>
    </div>
  );
}
