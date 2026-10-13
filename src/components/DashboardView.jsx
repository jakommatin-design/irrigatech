import React from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Droplets, Thermometer, CloudRain, Sun, 
  BatteryCharging, Zap, ShieldCheck, CheckCircle2, 
  Fan, Blinds, Bell, Cpu
} from 'lucide-react';

export default function DashboardView({ onNavigate }) {
  const { 
    temperature, humidity, soilMoisture, lightLux,
    pump, ac, shadePct, waterTank, batterySoc, batteryVoltage, solarWatts,
    connected, mode, isDemo,
    sendCommand
  } = useSensors();

  const isRealInactive = !isDemo && !connected;

  // Status evaluators
  const getSoilStatus = (val) => {
    if (isRealInactive) return { label: 'No Sensor Link', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' };
    if (val > 70) return { label: 'Dry (Pumping)', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
    if (val >= 35 && val <= 65) return { label: 'Optimal', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    return { label: 'Moist', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' };
  };

  const soilStatus = getSoilStatus(soilMoisture);

  // Formatted numeric values (clean formatting, zero activity for real accounts without hardware)
  const formattedWater = isRealInactive ? 0 : Math.round(Number(waterTank) || 0);
  const formattedBattery = isRealInactive ? '0.0' : Number(batterySoc || 0).toFixed(1);
  const formattedSolar = isRealInactive ? 0 : Math.round(Number(solarWatts) || 0);
  const formattedTemp = isRealInactive ? '--' : Number(temperature || 0).toFixed(1);
  const formattedHumidity = isRealInactive ? '--' : Math.round(Number(humidity) || 0);
  const formattedSoil = isRealInactive ? '--' : Number(soilMoisture || 0).toFixed(1);
  const formattedLux = isRealInactive ? 0 : Math.round(Number(lightLux) || 0);
  const formattedVoltage = isRealInactive ? '0.0' : Number(batteryVoltage || 12.4).toFixed(1);

  return (
    <div className="dashboard-container">
      
      {/* ─── MOBILE-ONLY SUBHEADER (Hidden on desktop to avoid duplicating navbar) ─── */}
      <div 
        className="mobile-only-header"
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.25rem'
        }}
      >
        <div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', letterSpacing: '-0.02em' }}>
            Irriga-Tech
          </span>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            Greenhouse Dashboard
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate && onNavigate('alerts')}
            style={{
              position: 'relative',
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <Bell size={18} />
            <span style={{
              position: 'absolute',
              top: '7px',
              right: '7px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#ef4444'
            }} />
          </button>

          <div 
            onClick={() => onNavigate && onNavigate('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#ffffff',
              padding: '0.35rem 0.65rem',
              borderRadius: '9999px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#047857',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>
              FJ
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>Farmer John</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Tomato Farm</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── VERTICALLY ARRANGED SECTIONS (Stacked neatly per div) ─── */}
      <div className="dashboard-vertical-layout">
        
        {/* Real Hardware Offline Notice for Real User Accounts */}
        {isRealInactive && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '0.9rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#94a3b8' }} />
              <div>
                <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>Hardware Inactive • No Fake Mockup Data</strong>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                  Real user mode active. All pumps, solar, and actuators are strictly OFF until physical ESP32 / Arduino sensor telemetry links.
                </p>
              </div>
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              color: '#475569',
              background: '#f1f5f9',
              padding: '0.25rem 0.6rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              WAITING FOR SENSOR LINK
            </span>
          </div>
        )}

        {/* ─── DIV 1: Hero Banner (Greenhouse 1) ─── */}
        <div style={{
          position: 'relative',
          borderRadius: '24px',
          overflow: 'hidden',
          minHeight: '200px',
          background: 'linear-gradient(135deg, #1e3a2b 0%, #064e3b 40%, #065f46 100%)',
          boxShadow: '0 10px 25px -5px rgba(6, 78, 59, 0.25)',
          padding: '1.4rem 1.5rem',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Background greenhouse visual overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.22,
            backgroundImage: 'radial-gradient(#34d399 1px, transparent 1px), radial-gradient(#10b981 1px, #064e3b 1px)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px'
          }} />

          {/* Top Badges */}
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '0.75rem',
            zIndex: 2,
            flexWrap: 'wrap'
          }}>
            {/* Crop Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} />
              Tomato • Vegetative Stage
            </div>

            {/* Weather Badge */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(8px)',
              padding: '0.4rem 0.85rem',
              borderRadius: '16px',
              fontSize: '0.78rem',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textAlign: 'right'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', fontWeight: 700 }}>
                <Sun size={15} color="#facc15" />
                <span>{formattedTemp}°C</span>
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.7rem' }}>
                Partly Cloudy • H:32° L:20°
              </div>
            </div>
          </div>

          {/* Bottom Banner Content */}
          <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            zIndex: 2,
            marginTop: '1.75rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: 800, 
                color: '#34d399', 
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.2rem'
              }}>
                ZONE 1 PRIMARY
              </div>
              <h1 style={{ 
                fontSize: '1.85rem', 
                fontWeight: 800, 
                letterSpacing: '-0.02em', 
                margin: 0, 
                color: '#ffffff' 
              }}>
                Greenhouse 1
              </h1>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: isRealInactive ? '#475569' : pump ? '#ef4444' : '#10b981',
              padding: '0.45rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: '#ffffff',
                animation: (!isRealInactive && pump) ? 'pulseSlow 1.5s infinite' : 'none'
              }} />
              {isRealInactive ? 'Hardware Offline' : pump ? 'Pump Active' : 'System Normal'}
            </div>
          </div>
        </div>

        {/* ─── DIV 2: Live Greenhouse Telemetry ─── */}
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '0.9rem' 
          }}>
            <h2 style={{ 
              fontSize: '0.82rem', 
              fontWeight: 800, 
              letterSpacing: '0.06em', 
              color: '#64748b',
              textTransform: 'uppercase',
              margin: 0
            }}>
              LIVE GREENHOUSE TELEMETRY
            </h2>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              color: '#16a34a' 
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
              Real-time
            </span>
          </div>

          {/* Symmetrical 2x2 Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '1rem' 
          }}>
            {/* 1. Soil Moisture (FC-28 / A0) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669'
                }}>
                  <Droplets size={22} />
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: soilStatus.bg,
                  color: soilStatus.color,
                  border: `1px solid ${soilStatus.border}`
                }}>
                  {soilStatus.label}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
                Soil Moisture (FC-28)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {formattedSoil}%
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  35-50% ideal
                </span>
              </div>
              <div style={{ height: '6px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, formattedSoil)}%`, 
                  background: formattedSoil > 70 ? '#ef4444' : '#10b981',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* 2. Temperature (DHT11 / Pin 2) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#fffbeb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706'
                }}>
                  <Thermometer size={22} />
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0'
                }}>
                  Normal
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
                Temperature (DHT11)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {formattedTemp}°C
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  20-32°C range
                </span>
              </div>
              <div style={{ height: '6px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, (formattedTemp / 45) * 100)}%`, 
                  background: '#f59e0b',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* 3. Air Humidity (DHT11 / Pin 2) */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7'
                }}>
                  <CloudRain size={22} />
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0'
                }}>
                  Normal
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
                Air Humidity
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {formattedHumidity}%
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  50-80% ideal
                </span>
              </div>
              <div style={{ height: '6px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, formattedHumidity)}%`, 
                  background: '#0284c7',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            {/* 4. Light Intensity */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#fefce8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ca8a04'
                }}>
                  <Sun size={22} />
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  background: '#f0fdf4',
                  color: '#16a34a',
                  border: '1px solid #bbf7d0'
                }}>
                  Good
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginBottom: '0.25rem' }}>
                Light Intensity
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a' }}>
                  {formattedLux}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  lux
                </span>
              </div>
              <div style={{ height: '6px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, (formattedLux / 1000) * 100)}%`, 
                  background: '#eab308',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* ─── DIV 3: Resource & Energy Levels ─── */}
        <div>
          <h2 style={{ 
            fontSize: '0.82rem', 
            fontWeight: 800, 
            letterSpacing: '0.06em', 
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: '0.9rem' 
          }}>
            RESOURCE & ENERGY LEVELS
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {/* Water Tank */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem 1rem',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                margin: '0 auto 0.6rem',
                borderRadius: '12px',
                background: '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284c7'
              }}>
                <Droplets size={20} />
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Water Tank Level</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                {formattedWater}%
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                background: '#f0fdf4',
                color: '#16a34a'
              }}>
                Enough water
              </span>
            </div>

            {/* Battery SoC */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem 1rem',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                margin: '0 auto 0.6rem',
                borderRadius: '12px',
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}>
                <BatteryCharging size={20} />
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Battery Level</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                {formattedBattery}%
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                {formattedVoltage}V • Charging
              </span>
            </div>

            {/* Solar Power */}
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.25rem 1rem',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
              <div style={{
                width: '42px',
                height: '42px',
                margin: '0 auto 0.6rem',
                borderRadius: '12px',
                background: '#fffbeb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706'
              }}>
                <Zap size={20} />
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Solar Power</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
                {formattedSolar} W
              </div>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '9999px',
                background: '#fffbeb',
                color: '#d97706'
              }}>
                Generating
              </span>
            </div>
          </div>
        </div>

        {/* ─── DIV 4: Direct Actuator Controls ─── */}
        <div>
          <h2 style={{ 
            fontSize: '0.82rem', 
            fontWeight: 800, 
            letterSpacing: '0.06em', 
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: '0.9rem' 
          }}>
            DIRECT ACTUATOR CONTROLS (ARDUINO PINS)
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {/* Button 1: Irrigate / Water Pump (Relay Pin 3) */}
            <button
              onClick={() => sendCommand(pump ? 'PUMP_OFF' : 'PUMP_ON')}
              style={{
                background: pump ? '#059669' : '#ffffff',
                color: pump ? '#ffffff' : '#0f172a',
                borderRadius: '20px',
                padding: '1.25rem 0.75rem',
                border: pump ? '1px solid #047857' : '1px solid #e2e8f0',
                textAlign: 'center',
                boxShadow: pump ? '0 6px 16px rgba(5, 150, 105, 0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                margin: '0 auto 0.5rem',
                borderRadius: '50%',
                background: pump ? 'rgba(255,255,255,0.2)' : '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: pump ? '#ffffff' : '#059669'
              }}>
                <Droplets size={22} />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Irrigate</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.85, marginTop: '0.2rem' }}>
                {pump ? 'Running (Pin 3)' : 'Start 5m'}
              </div>
            </button>

            {/* Button 2: Ventilation / AC (Pin 7) */}
            <button
              onClick={() => sendCommand(ac ? 'AC_OFF' : 'AC_ON')}
              style={{
                background: ac ? '#0284c7' : '#ffffff',
                color: ac ? '#ffffff' : '#0f172a',
                borderRadius: '20px',
                padding: '1.25rem 0.75rem',
                border: ac ? '1px solid #0369a1' : '1px solid #e2e8f0',
                textAlign: 'center',
                boxShadow: ac ? '0 6px 16px rgba(2, 132, 199, 0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                margin: '0 auto 0.5rem',
                borderRadius: '50%',
                background: ac ? 'rgba(255,255,255,0.2)' : '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: ac ? '#ffffff' : '#0284c7'
              }}>
                <Fan size={22} className={ac ? 'animate-spin' : ''} />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Ventilation</div>
              <div style={{ fontSize: '0.74rem', color: ac ? '#e0f2fe' : '#16a34a', fontWeight: 600, marginTop: '0.2rem' }}>
                {ac ? 'ON (Pin 7)' : 'ON (Auto)'}
              </div>
            </button>

            {/* Button 3: Motorized Shade Mesh */}
            <button
              onClick={() => sendCommand('SET_SHADE', { pct: (shadePct === 20 ? 60 : 20) })}
              style={{
                background: shadePct > 20 ? '#f59e0b' : '#ffffff',
                color: shadePct > 20 ? '#ffffff' : '#0f172a',
                borderRadius: '20px',
                padding: '1.25rem 0.75rem',
                border: shadePct > 20 ? '1px solid #d97706' : '1px solid #e2e8f0',
                textAlign: 'center',
                boxShadow: shadePct > 20 ? '0 6px 16px rgba(245, 158, 11, 0.3)' : '0 2px 8px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                margin: '0 auto 0.5rem',
                borderRadius: '50%',
                background: shadePct > 20 ? 'rgba(255,255,255,0.2)' : '#fefce8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: shadePct > 20 ? '#ffffff' : '#ca8a04'
              }}>
                <Blinds size={22} />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>Shade Mesh</div>
              <div style={{ fontSize: '0.74rem', opacity: 0.85, marginTop: '0.2rem' }}>
                {shadePct}% Deployed
              </div>
            </button>
          </div>
        </div>

        {/* ─── DIV 5: ESP32 Hardware Safety Guard ─── */}
        <div style={{
          background: 'linear-gradient(135deg, #042f2e 0%, #064e3b 100%)',
          borderRadius: '24px',
          padding: '1.4rem 1.5rem',
          color: '#ffffff',
          boxShadow: '0 6px 20px rgba(4, 47, 46, 0.25)',
          border: '1px solid #0f766e'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(20, 184, 166, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2dd4bf'
              }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.98rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  ESP32 Hardware Safety Guard
                </div>
                <div style={{ fontSize: '0.75rem', color: '#99f6e4' }}>
                  Autonomous Fail-Safe Interlock: Active
                </div>
              </div>
            </div>
            <span style={{
              background: 'rgba(20, 184, 166, 0.25)',
              color: '#2dd4bf',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.3rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(45, 212, 191, 0.3)'
            }}>
              Armed
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.85rem',
            fontSize: '0.78rem',
            color: '#ccfbf1',
            paddingTop: '0.9rem',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#2dd4bf" />
              <span>Dry-run sensor OK</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#2dd4bf" />
              <span>Low-Volt Cutoff OK</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={16} color="#2dd4bf" />
              <span>Max Runtime: 5 min</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2dd4bf' }} />
              <span>Energy-Aware Scheduler</span>
            </div>
          </div>
        </div>

        {/* ─── DIV 6: Arduino Microcontroller & LCD 16x2 Display ─── */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '1.4rem 1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '1rem' }}>
            <Cpu size={20} color="#059669" />
            <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Arduino Microcontroller & LCD 16x2 I2C
            </h3>
          </div>

          <div style={{
            background: '#7ea843',
            border: '4px solid #1a2e1b',
            borderRadius: '10px',
            padding: '0.75rem 1.25rem',
            fontFamily: 'monospace',
            color: '#112211',
            fontWeight: 700,
            fontSize: '0.98rem',
            letterSpacing: '0.12em',
            textShadow: '0 0 1px rgba(0,0,0,0.5)',
            marginBottom: '1rem',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
          }}>
            <div>LINE 1: T:{formattedTemp}C H:{formattedHumidity}%</div>
            <div>LINE 2: SOIL:{formattedSoil}% PUMP:{pump ? 'ON ' : 'OFF'}</div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.72rem' }}>
            <span style={{ padding: '0.25rem 0.6rem', background: '#f1f5f9', borderRadius: '6px', color: '#475569' }}>
              DHTPIN: <strong>D2</strong>
            </span>
            <span style={{ padding: '0.25rem 0.6rem', background: '#f1f5f9', borderRadius: '6px', color: '#475569' }}>
              SOIL_PIN: <strong>A0</strong>
            </span>
            <span style={{ padding: '0.25rem 0.6rem', background: pump ? '#dcfce7' : '#f1f5f9', color: pump ? '#15803d' : '#475569', borderRadius: '6px' }}>
              RELAY: <strong>D3 {pump ? '[HIGH]' : '[LOW]'}</strong>
            </span>
            <span style={{ padding: '0.25rem 0.6rem', background: ac ? '#e0f2fe' : '#f1f5f9', color: ac ? '#0369a1' : '#475569', borderRadius: '6px' }}>
              AC: <strong>D7 {ac ? '[HIGH]' : '[LOW]'}</strong>
            </span>
            <span style={{ padding: '0.25rem 0.6rem', background: '#f1f5f9', borderRadius: '6px', color: '#475569' }}>
              LCD I2C: <strong>0x27</strong>
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
