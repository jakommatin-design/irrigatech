import React, { useState } from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Droplets, Thermometer, CloudRain, Sun, Wind, 
  Waves, Beaker, TrendingUp, Activity, ArrowLeft
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';

export default function MonitorView() {
  const { 
    temperature, humidity, soilMoisture, lightLux, 
    waterTank, solarWatts, history 
  } = useSensors();

  const [viewMode, setViewMode] = useState('live'); // 'live' | 'trends'

  // Simulated CO₂ level (300-800 ppm range for greenhouse)
  const co2Level = Math.round(380 + (temperature - 25) * 8 + (humidity - 60) * 2);

  const getCo2Status = (val) => {
    if (val >= 300 && val <= 800) return { label: 'Normal (300–800 ppm)', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    if (val > 800) return { label: 'High', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
    return { label: 'Low', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
  };

  const getTempStatus = (val) => {
    if (val >= 20 && val <= 32) return { label: 'Normal (20–32°C)', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    return { label: 'Warning', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  };

  const getHumidityStatus = (val) => {
    if (val >= 50 && val <= 80) return { label: 'Normal (50–80%)', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    return { label: 'Out of Range', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  };

  const getLightStatus = (val) => {
    if (val >= 500 && val <= 1000) return { label: 'Good (500–1000 lux)', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    return { label: 'Adjust Needed', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  };

  const getWaterStatus = (val) => {
    if (val >= 50) return { label: 'Enough water', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    if (val >= 25) return { label: 'Low', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    return { label: 'Critical', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  };

  const getSoilStatus = (val) => {
    if (val >= 30 && val <= 60) return { label: 'Optimal (30–60%)', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    return { label: 'Needs Attention', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  };

  const trendData = history.map((h, i) => ({
    time: new Date(h.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    soil: h.soilMoisture,
    temp: h.temperature,
    humidity: h.humidity,
    solar: h.solarWatts
  }));

  const cardStyle = {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '1.25rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  };

  const iconBoxStyle = (bg, color) => ({
    width: '44px',
    height: '44px',
    borderRadius: '14px',
    background: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: color
  });

  const statusBadge = (status) => ({
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.2rem 0.6rem',
    borderRadius: '9999px',
    background: status.bg,
    color: status.color,
    border: `1px solid ${status.border}`
  });

  const readings = [
    {
      icon: Droplets, label: 'Soil Moisture', value: `${soilMoisture}%`, status: getSoilStatus(soilMoisture),
      iconBg: '#ecfdf5', iconColor: '#059669', sub: '±2%'
    },
    {
      icon: Thermometer, label: 'Temperature', value: `${temperature}°C`, status: getTempStatus(temperature),
      iconBg: '#fffbeb', iconColor: '#d97706', sub: null
    },
    {
      icon: CloudRain, label: 'Humidity', value: `${humidity}%`, status: getHumidityStatus(humidity),
      iconBg: '#f0f9ff', iconColor: '#0284c7', sub: null
    },
    {
      icon: Sun, label: 'Light Intensity', value: `${lightLux} lux`, status: getLightStatus(lightLux),
      iconBg: '#fefce8', iconColor: '#ca8a04', sub: null
    },
    {
      icon: Wind, label: 'CO₂ Level', value: `${co2Level} ppm`, status: getCo2Status(co2Level),
      iconBg: '#f5f3ff', iconColor: '#7c3aed', sub: null
    },
    {
      icon: Waves, label: 'Water Level', value: `${waterTank}%`, status: getWaterStatus(waterTank),
      iconBg: '#f0f9ff', iconColor: '#0284c7', sub: null
    },
  ];

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '1.25rem 1rem 5rem' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Greenhouse Monitoring
        </h1>
      </div>

      {/* Live Data / Trends Toggle - matching layout.png */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        background: '#f1f5f9',
        padding: '0.3rem',
        borderRadius: '12px',
        width: 'fit-content'
      }}>
        <button 
          onClick={() => setViewMode('live')}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 700,
            background: viewMode === 'live' ? '#15803d' : 'transparent',
            color: viewMode === 'live' ? '#ffffff' : '#64748b',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Live Data
        </button>
        <button 
          onClick={() => setViewMode('trends')}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontWeight: 700,
            background: viewMode === 'trends' ? '#15803d' : 'transparent',
            color: viewMode === 'trends' ? '#ffffff' : '#64748b',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Trends
        </button>
      </div>

      {viewMode === 'live' ? (
        /* LIVE READINGS - matches layout screen 2 */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {readings.map((r, i) => {
            const Icon = r.icon;
            return (
              <div key={i} style={{
                ...cardStyle,
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.15rem'
              }}>
                <div style={iconBoxStyle(r.iconBg, r.iconColor)}>
                  <Icon size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, marginBottom: '0.15rem' }}>
                    {r.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                      {r.value}
                    </span>
                    {r.sub && <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{r.sub}</span>}
                  </div>
                </div>
                <span style={statusBadge(r.status)}>
                  {r.status.label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        /* TRENDS VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Soil Moisture Trend */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <Droplets size={16} color="#059669" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Soil Moisture Trend</span>
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[20, 70]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="soil" stroke="#10b981" fill="url(#soilGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Temperature Trend */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <Thermometer size={16} color="#d97706" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Temperature Trend</span>
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[18, 40]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="temp" stroke="#f59e0b" fill="url(#tempGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Humidity Trend */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
              <CloudRain size={16} color="#0284c7" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Humidity Trend</span>
            </div>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" domain={[30, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="humidity" stroke="#0284c7" fill="url(#humGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
