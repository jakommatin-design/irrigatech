import React, { useState, useEffect } from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Droplets, Play, Square, Clock, AlertTriangle, 
  CheckCircle2, Gauge, Shield, ArrowDownRight, RefreshCw,
  Zap, Sun, ChevronRight
} from 'lucide-react';

export default function IrrigationView() {
  const { 
    zoneMoisture, pump, waterTank, flowRate, batterySoc, solarWatts,
    thresholds, sendCommand, setThreshold, irrigationLogs,
    currentReasonCode, activeZone, setActiveZone
  } = useSensors();

  const [moistureStart, setMoistureStart] = useState(thresholds?.moistureStart || 35);
  const [moistureStop, setMoistureStop] = useState(thresholds?.moistureStop || 50);
  const [countdown, setCountdown] = useState(0);

  const zones = [
    { id: 1, name: 'Zone 1 (Primary)', crop: 'Tomatoes (Vegetative)', moisture: zoneMoisture?.zone1 || 42, target: '35–50%' },
    { id: 2, name: 'Zone 2', crop: 'Sweet Bell Peppers', moisture: zoneMoisture?.zone2 || 44.5, target: '40–55%' },
    { id: 3, name: 'Zone 3', crop: 'Butterhead Lettuce', moisture: zoneMoisture?.zone3 || 52, target: '45–65%' },
    { id: 4, name: 'Zone 4', crop: 'Culinary Herbs (Basil & Mint)', moisture: zoneMoisture?.zone4 || 48, target: '30–45%' },
  ];

  // 5-minute timer effect when pump is started
  useEffect(() => {
    let interval = null;
    if (pump) {
      if (countdown === 0) setCountdown(300); // 5 minutes (300s) hard limit
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            sendCommand('PUMP_OFF');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(0);
    }
    return () => clearInterval(interval);
  }, [pump]);

  const handleStartSlider = (e) => {
    const val = parseInt(e.target.value, 10);
    setMoistureStart(val);
    setThreshold('moistureStart', val);
  };

  const handleStopSlider = (e) => {
    const val = parseInt(e.target.value, 10);
    setMoistureStop(val);
    setThreshold('moistureStop', val);
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getReasonBadge = (code) => {
    switch (code) {
      case 'SOIL_DRY_ENERGY_OK':
        return { label: 'SOIL_DRY_ENERGY_OK: Adequate Solar/Battery Energy', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
      case 'WAIT_SOLAR_WINDOW':
        return { label: 'WAIT_SOLAR_WINDOW: Low Battery, Waiting for Solar Peak', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
      case 'CROP_CRITICAL_OVERRIDE':
        return { label: 'CROP_CRITICAL_OVERRIDE: Urgent Water Need Triggered', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
      case 'WATER_LOW':
        return { label: 'WATER_LOW: Reservoir Empty, Pump Inhibited', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
      default:
        return { label: 'MOISTURE_OK: Soil Hydration Satisfied', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
    }
  };

  const reasonInfo = getReasonBadge(currentReasonCode);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Multi-Zone Irrigation & Energy-Aware Scheduling
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          Implements Blueprint Algorithm B (Energy-Aware Irrigation Priority) and Section 8.3 hysteresis control.
        </p>
      </div>

      {/* Blueprint Algorithm B Reason Code Banner */}
      <div style={{
        background: reasonInfo.bg,
        border: `1px solid ${reasonInfo.border}`,
        borderRadius: '16px',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Shield size={20} color={reasonInfo.color} />
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              Algorithm B Policy State (Blueprint Appendix A2)
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: reasonInfo.color }}>
              {reasonInfo.label}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#475569', fontWeight: 600 }}>
          <span>Battery: {batterySoc}%</span> • 
          <span>Solar: {solarWatts}W</span> • 
          <span>Tank: {waterTank}%</span>
        </div>
      </div>

      {/* Main Status & Quick Trigger Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Pump Status & Manual Control */}
        <div style={{
          background: pump ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)' : '#ffffff',
          color: pump ? '#ffffff' : '#0f172a',
          borderRadius: '20px',
          padding: '1.25rem',
          border: pump ? '1px solid #059669' : '1px solid #e2e8f0',
          boxShadow: pump ? '0 10px 25px -5px rgba(5, 150, 105, 0.4)' : '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: pump ? 'rgba(255,255,255,0.2)' : '#ecfdf5',
                color: pump ? '#ffffff' : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Droplets size={22} />
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                background: pump ? '#ef4444' : '#dcfce7',
                color: pump ? '#ffffff' : '#15803d'
              }}>
                {pump ? `ZONE ${activeZone} IRRIGATING` : 'STANDBY (IDLE)'}
              </span>
            </div>

            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: pump ? '#a7f3d0' : '#64748b' }}>
              Submersible Pump (Relay Pin D3)
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0.2rem 0' }}>
              {pump ? `Active: ${formatTimer(countdown)} left` : 'System Idle'}
            </div>
            <div style={{ fontSize: '0.75rem', color: pump ? '#d1fae5' : '#94a3b8' }}>
              Target: {moistureStop}% • Hard Timeout: 5 min
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button
              onClick={() => sendCommand('PUMP_ON', { zoneId: activeZone })}
              disabled={pump}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '12px',
                background: pump ? 'rgba(255,255,255,0.2)' : '#15803d',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                cursor: pump ? 'not-allowed' : 'pointer'
              }}
            >
              <Play size={16} />
              Start 5m Cycle
            </button>

            <button
              onClick={() => sendCommand('PUMP_OFF')}
              disabled={!pump}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '12px',
                background: !pump ? '#f1f5f9' : '#ef4444',
                color: !pump ? '#94a3b8' : '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                cursor: !pump ? 'not-allowed' : 'pointer'
              }}
            >
              <Square size={16} />
              Emergency Stop
            </button>
          </div>
        </div>

        {/* Real-Time Water Metrics */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>
              FLOW METRICS & RESERVOIR
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: '#f0f9ff', padding: '0.75rem', borderRadius: '14px', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>Drip Flow Rate</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0284c7', margin: '0.2rem 0' }}>
                  {flowRate} L/min
                </div>
                <div style={{ fontSize: '0.68rem', color: '#0284c7' }}>Solenoid Active</div>
              </div>

              <div style={{ background: '#ecfdf5', padding: '0.75rem', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#065f46', fontWeight: 600 }}>Tank Reservoir</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', margin: '0.2rem 0' }}>
                  {waterTank}%
                </div>
                <div style={{ fontSize: '0.68rem', color: '#059669' }}>1,500 L Available</div>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Dry-Run float switch: Adequate head pressure</span>
            </div>
          </div>
        </div>

      </div>

      {/* Multi-Zone Overview per Blueprint Section 2.1 & 8.4 */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              4-Zone Irrigation Beds (3 m × 4 m Prototype)
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0' }}>
              Sequential zone watering (Section 8.4: avoid watering multiple zones concurrently to protect hydraulic pressure).
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
            Zone {activeZone} Selected
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {zones.map((z) => {
            const isSelected = activeZone === z.id;
            const isIrrigatingThis = pump && isSelected;
            return (
              <div 
                key={z.id}
                onClick={() => setActiveZone(z.id)}
                style={{
                  borderRadius: '16px',
                  padding: '1rem',
                  border: isIrrigatingThis ? '2px solid #10b981' : (isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0'),
                  background: isIrrigatingThis ? '#ecfdf5' : (isSelected ? '#f0f9ff' : '#ffffff'),
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>{z.name}</span>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    background: isIrrigatingThis ? '#10b981' : '#f1f5f9',
                    color: isIrrigatingThis ? '#ffffff' : '#64748b'
                  }}>
                    {isIrrigatingThis ? 'Active' : 'Standby'}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.6rem' }}>{z.crop}</div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{z.moisture}%</span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Target: {z.target}</span>
                </div>

                <div style={{ height: '6px', borderRadius: '9999px', background: '#e2e8f0', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, z.moisture)}%`,
                    background: z.moisture < 35 ? '#ef4444' : '#10b981',
                    borderRadius: '9999px'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Blueprint Section 8.3: Hysteresis Thresholds */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.3rem' }}>
          Hysteresis Bounds (Blueprint Section 8.3)
        </h2>
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 1.25rem' }}>
          "Do not use a single threshold to start and stop the pump. Define at least MOISTURE_START and MOISTURE_STOP with a gap between them."
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {/* Slider 1: MOISTURE_START */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <span style={{ color: '#0f172a' }}>MOISTURE_START (Trigger Run)</span>
              <span style={{ color: '#dc2626' }}>&lt; {moistureStart}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="45"
              value={moistureStart}
              onChange={handleStartSlider}
              style={{ width: '100%', accentColor: '#dc2626', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              Irrigation begins when soil moisture drops below this level.
            </div>
          </div>

          {/* Slider 2: MOISTURE_STOP */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              <span style={{ color: '#0f172a' }}>MOISTURE_STOP (Target Cutoff)</span>
              <span style={{ color: '#16a34a' }}>&gt;= {moistureStop}%</span>
            </div>
            <input
              type="range"
              min="46"
              max="70"
              value={moistureStop}
              onChange={handleStopSlider}
              style={{ width: '100%', accentColor: '#16a34a', cursor: 'pointer' }}
            />
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
              Pump halts when soil moisture attains this saturated target.
            </div>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem' }}>
          Recent Irrigation Audit Trail (With Decision Reason Codes)
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {irrigationLogs.map((log, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: log.action.includes('START') || log.action.includes('ON') ? '#16a34a' : '#64748b'
                }} />
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{log.action}</span>
                {log.reason && (
                  <span style={{ fontSize: '0.68rem', color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                    {log.reason}
                  </span>
                )}
              </div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{log.isoTime}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
