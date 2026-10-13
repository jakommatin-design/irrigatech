import React, { useState, useMemo, useEffect } from 'react';
import { useSensors } from '../context/SensorContext';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart, Legend
} from 'recharts';
import { 
  TrendingUp, Droplets, Zap, Thermometer, Sprout, Activity
} from 'lucide-react';

export default function AnalyticsView() {
  const { history, soilMoisture, solarWatts, solarDailyKwh } = useSensors();
  const { getApiUrl } = useAuth() || {};

  const [activeCategory, setActiveCategory] = useState('overview');
  const [timeRange, setTimeRange] = useState('7days');

  const categories = [
    { id: 'overview', label: 'Overview' },
    { id: 'irrigation', label: 'Irrigation' },
    { id: 'energy', label: 'Energy' },
    { id: 'crop', label: 'Crop' }
  ];

  const timeRanges = [
    { id: '7days', label: '7 Days' },
    { id: '30days', label: '30 Days' },
    { id: '3months', label: '3 Months' },
    { id: 'custom', label: 'Custom' }
  ];

  // Generate fallback simulated data
  const simulatedWeeklyData = useMemo(() => {
    const days = ['Apr 21', 'Apr 22', 'Apr 23', 'Apr 24', 'Apr 25', 'Apr 26', 'Apr 27'];
    return days.map((day) => ({
      day,
      soilZone1: 35 + Math.random() * 20,
      soilZone2: 38 + Math.random() * 18,
      waterUsage: 12 + Math.random() * 10,
      solarGen: 2.5 + Math.random() * 2,
      temp: 24 + Math.random() * 8,
      humidity: 55 + Math.random() * 20,
    }));
  }, []);

  const [weeklyData, setWeeklyData] = useState(simulatedWeeklyData);

  // Fetch real weekly stats from backend
  useEffect(() => {
    const base = typeof getApiUrl === 'function' ? getApiUrl() : 'http://localhost:3000';
    fetch(`${base}/api/stats/weekly`)
      .then(r => r.ok ? r.json() : { stats: [] })
      .then(({ stats = [] }) => {
        if (stats.length > 0) {
          const mapped = stats.map(row => ({
            day: new Date(row.date_bucket || row.day || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            soilZone1: parseFloat(row.avg_soil_zone1 ?? row.avg_soil ?? 42),
            soilZone2: parseFloat(row.avg_soil_zone2 ?? 44),
            waterUsage: parseFloat(row.water_liters ?? row.water_usage ?? 15),
            solarGen: parseFloat(row.solar_kwh ?? row.solar_gen ?? 3.5),
            temp: parseFloat(row.avg_temp ?? 28),
            humidity: parseFloat(row.avg_humidity ?? 65),
          }));
          setWeeklyData(mapped);
        }
      })
      .catch(() => {});
  }, [getApiUrl]);

  const trendData = history.map((h) => ({
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

  // Weekly totals
  const totalWaterUsage = Math.round(weeklyData.reduce((sum, d) => sum + d.waterUsage, 0));
  const avgWater = (totalWaterUsage / 7).toFixed(0);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.25rem 1rem 5rem' }}>

      {/* Title */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Analytics & History
        </h1>
      </div>

      {/* Category Tabs - matching layout.png screen 8 */}
      <div style={{ 
        display: 'flex', 
        gap: '0.35rem', 
        marginBottom: '1rem',
        background: '#f1f5f9',
        padding: '0.3rem',
        borderRadius: '12px',
        overflowX: 'auto'
      }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: activeCategory === cat.id ? '#15803d' : 'transparent',
              color: activeCategory === cat.id ? '#ffffff' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease'
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Time Range Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.35rem', 
        marginBottom: '1.5rem',
        background: '#f1f5f9',
        padding: '0.25rem',
        borderRadius: '10px',
        width: 'fit-content'
      }}>
        {timeRanges.map(tr => (
          <button
            key={tr.id}
            onClick={() => setTimeRange(tr.id)}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: timeRange === tr.id ? '#0f172a' : 'transparent',
              color: timeRange === tr.id ? '#ffffff' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tr.label}
          </button>
        ))}
      </div>

      {/* Soil Moisture Trend Chart */}
      <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Droplets size={16} color="#059669" />
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
              Soil Moisture Trend
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.85rem', fontSize: '0.72rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
              Zone 1
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0284c7' }} />
              Zone 2
            </span>
          </div>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="soilGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="soilGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit="%" domain={[20, 80]} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: '0.78rem'
                }} 
              />
              <Area type="monotone" dataKey="soilZone1" stroke="#10b981" fill="url(#soilGrad1)" strokeWidth={2.5} name="Zone 1" />
              <Area type="monotone" dataKey="soilZone2" stroke="#0284c7" fill="url(#soilGrad2)" strokeWidth={2.5} name="Zone 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Water Usage - matching layout.png */}
      <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
            Water Usage
          </span>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.5rem',
            borderRadius: '8px',
            background: '#ecfdf5',
            color: '#059669'
          }}>
            ↑ 28%
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.15rem' }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{totalWaterUsage} L</span>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>vs last week</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '1rem' }}>Total this week</div>

        <div style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit="L" />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: '1px solid #e2e8f0',
                  fontSize: '0.78rem'
                }} 
              />
              <Bar dataKey="waterUsage" fill="#0284c7" radius={[6, 6, 0, 0]} name="Water (L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Energy & Solar Chart */}
      {(activeCategory === 'overview' || activeCategory === 'energy') && (
        <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Zap size={16} color="#d97706" />
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
              Solar Generation (kWh/day)
            </span>
          </div>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" unit="kWh" />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    fontSize: '0.78rem'
                  }}
                />
                <Bar dataKey="solarGen" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Solar (kWh)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Temperature & Humidity History */}
      {(activeCategory === 'overview' || activeCategory === 'crop') && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Activity size={16} color="#7c3aed" />
            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
              Climate History
            </span>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    fontSize: '0.78rem'
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.72rem' }} />
                <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} name="Temp (°C)" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="humidity" stroke="#0284c7" strokeWidth={2} name="Humidity (%)" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
