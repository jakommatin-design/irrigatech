import React, { useState } from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Cpu, Cloud, Droplets, Activity, CheckCircle2, 
  Wifi, Shield, ArrowRight, TrendingUp, DollarSign,
  Sprout, Gauge, Zap, Bell, Server, RefreshCw
} from 'lucide-react';

export default function ArchitectureView() {
  const { 
    temperature, humidity, soilMoisture, lightLux, 
    pump, ac, led, waterTank, batterySoc 
  } = useSensors();

  const [activeLayer, setActiveLayer] = useState(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      
      {/* Title Header matching imgtwo.png */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ 
          fontSize: '1.85rem', 
          fontWeight: 800, 
          color: '#0f172a', 
          letterSpacing: '-0.02em',
          marginBottom: '0.4rem'
        }}>
          Smart Watering System – Final Status
        </h1>
        <p style={{ 
          fontSize: '0.9rem', 
          color: '#64748b', 
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem'
        }}>
          <span>Fully Integrated</span> • 
          <span>Automated</span> • 
          <span>Data-Driven</span> • 
          <span>Efficient</span>
        </p>
      </div>

      {/* Main Diagram & Status Split */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        
        {/* LEFT / CENTER: The 5-Layer Interactive Diagram */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          
          {/* Top Row: Cloud & Data Layer */}
          <div 
            onClick={() => setActiveLayer('cloud')}
            style={{
              borderRadius: '18px',
              border: '2px solid #818cf8',
              background: '#f5f3ff',
              padding: '1.15rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeLayer === 'cloud' ? '0 0 0 3px rgba(129, 140, 248, 0.3)' : 'none'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. CLOUD & DATA LAYER
              </span>
              <div style={{ fontSize: '0.72rem', color: '#6366f1' }}>Storage, Analytics & Remote Access</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
              {[
                { icon: <Server size={18} />, title: 'Cloud Database', desc: 'Time Series' },
                { icon: <TrendingUp size={18} />, title: 'Data Analytics', desc: '& Visualization' },
                { icon: <Activity size={18} />, title: 'Remote Monitor', desc: 'Web Dashboard' },
                { icon: <Bell size={18} />, title: 'Alerts', desc: '& Push Events' },
              ].map((item, idx) => (
                <div key={idx} style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '0.6rem 0.4rem',
                  textAlign: 'center',
                  border: '1px solid #e0e7ff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ color: '#4f46e5', display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}>
                    {item.icon}
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1e1b4b' }}>{item.title}</div>
                  <div style={{ fontSize: '0.65rem', color: '#6366f1' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Middle Row: Sensing Layer -> Edge Controller -> Plant -> Irrigation Layer */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 1.2fr) minmax(180px, 1.2fr) minmax(140px, 1fr) minmax(180px, 1.2fr)',
            gap: '1rem',
            alignItems: 'center'
          }}>
            
            {/* 1. SENSING LAYER */}
            <div 
              onClick={() => setActiveLayer('sensing')}
              style={{
                borderRadius: '18px',
                border: '2px solid #86efac',
                background: '#f0fdf4',
                padding: '1rem',
                cursor: 'pointer',
                boxShadow: activeLayer === 'sensing' ? '0 0 0 3px rgba(134, 239, 172, 0.4)' : 'none'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
                  1. SENSING LAYER
                </span>
                <div style={{ fontSize: '0.68rem', color: '#16a34a' }}>Field Data Collection</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { name: 'Soil Moisture FC-28', val: `${soilMoisture}%`, note: 'Volumetric water content' },
                  { name: 'Temp & Humidity DHT11', val: `${temperature}°C | ${humidity}%`, note: 'Microclimate' },
                  { name: 'Light Intensity (LDR)', val: `${lightLux} lux`, note: 'Sunlight exposure' },
                  { name: 'Rain Sensor', val: 'Dry', note: 'Rainfall events' },
                  { name: 'Water Flow Sensor', val: '1.2 L/min', note: 'Flow rate' },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: '#ffffff',
                    borderRadius: '10px',
                    padding: '0.45rem 0.6rem',
                    border: '1px solid #dcfce7',
                    fontSize: '0.7rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                      <span>{s.name}</span>
                      <span style={{ color: '#16a34a' }}>{s.val}</span>
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#64748b' }}>{s.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. EDGE CONTROLLER (ESP32) */}
            <div 
              onClick={() => setActiveLayer('edge')}
              style={{
                borderRadius: '18px',
                border: '2px solid #93c5fd',
                background: '#eff6ff',
                padding: '1rem',
                cursor: 'pointer',
                boxShadow: activeLayer === 'edge' ? '0 0 0 3px rgba(147, 197, 253, 0.4)' : 'none'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
                  2. EDGE CONTROLLER
                </span>
                <div style={{ fontSize: '0.68rem', color: '#2563eb' }}>Decision & Control Unit</div>
              </div>

              <div style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '0.75rem',
                border: '1px solid #dbeafe',
                textAlign: 'center',
                marginBottom: '0.6rem'
              }}>
                <div style={{ 
                  width: '46px', 
                  height: '46px', 
                  margin: '0 auto 0.4rem', 
                  background: '#dbeafe', 
                  borderRadius: '10px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#1d4ed8' 
                }}>
                  <Cpu size={24} />
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e3a8a' }}>
                  ESP32 / Arduino Uno
                </div>
                <div style={{ fontSize: '0.65rem', color: '#2563eb' }}>Firmware Loop Active</div>
              </div>

              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: 0, 
                fontSize: '0.68rem', 
                color: '#334155', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.25rem' 
              }}>
                <li>• Data acquisition (A0, D2)</li>
                <li>• Local processing & LCD</li>
                <li>• Control execution (D3, D7, D8)</li>
                <li>• Connectivity (Wi-Fi/Serial)</li>
                <li>• Failsafe operation (5m limit)</li>
              </ul>
            </div>

            {/* Plant Center Graphic */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '90px',
                height: '90px',
                margin: '0 auto',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(34, 197, 94, 0.25)',
                border: '3px solid #ffffff'
              }}>
                <Sprout size={48} color="#15803d" />
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#15803d', marginTop: '0.5rem' }}>
                Healthy Crops
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                Target: 45% Moisture
              </div>
            </div>

            {/* 4. IRRIGATION LAYER */}
            <div 
              onClick={() => setActiveLayer('irrigation')}
              style={{
                borderRadius: '18px',
                border: '2px solid #fde047',
                background: '#fefce8',
                padding: '1rem',
                cursor: 'pointer',
                boxShadow: activeLayer === 'irrigation' ? '0 0 0 3px rgba(253, 224, 71, 0.4)' : 'none'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a16207', textTransform: 'uppercase' }}>
                  4. IRRIGATION LAYER
                </span>
                <div style={{ fontSize: '0.68rem', color: '#ca8a04' }}>Water Delivery System</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { name: 'Water Pump (Relay)', status: pump ? 'Active (Pumping)' : 'Standby (Ready)', active: pump },
                  { name: 'Solenoid Valve', status: 'Zone 1 Open', active: pump },
                  { name: 'Drip Irrigation', status: 'Uniform delivery', active: true },
                ].map((act, i) => (
                  <div key={i} style={{
                    background: '#ffffff',
                    borderRadius: '10px',
                    padding: '0.5rem 0.6rem',
                    border: '1px solid #fef08a',
                    fontSize: '0.7rem'
                  }}>
                    <div style={{ fontWeight: 700, color: '#713f12' }}>{act.name}</div>
                    <div style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 600,
                      color: act.active ? '#15803d' : '#854d0e' 
                    }}>
                      {act.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Row: 5. FEEDBACK LOOP */}
          <div 
            onClick={() => setActiveLayer('feedback')}
            style={{
              borderRadius: '18px',
              border: '2px solid #93c5fd',
              background: '#eff6ff',
              padding: '1rem',
              cursor: 'pointer',
              boxShadow: activeLayer === 'feedback' ? '0 0 0 3px rgba(147, 197, 253, 0.3)' : 'none'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d4ed8', textTransform: 'uppercase' }}>
                5. FEEDBACK LOOP
              </span>
              <div style={{ fontSize: '0.68rem', color: '#2563eb' }}>Continuous Optimization & Closed Loop Control</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[
                { title: 'Data Feedback', desc: 'Moisture delta check' },
                { title: 'Model Update', desc: 'Adaptive thresholds' },
                { title: 'Watering Adjustment', desc: 'Auto pulse modulation' },
                { title: 'Improved Efficiency', desc: 'Zero run-off wastage' }
              ].map((step, idx) => (
                <div key={idx} style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '0.6rem',
                  textAlign: 'center',
                  border: '1px solid #bfdbfe'
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1e3a8a' }}>{step.title}</div>
                  <div style={{ fontSize: '0.65rem', color: '#3b82f6' }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: SYSTEM FINAL STATUS matching imgtwo.png */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '2px solid #86efac',
          padding: '1.25rem',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.05)'
        }}>
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            color: '#15803d',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid #dcfce7'
          }}>
            SYSTEM FINAL STATUS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {[
              {
                title: 'Fully Functional',
                desc: 'All components integrated and working reliably in real conditions.',
                color: '#16a34a',
                bg: '#f0fdf4',
                icon: <CheckCircle2 size={18} color="#16a34a" />
              },
              {
                title: 'Smart & Adaptive',
                desc: 'Watering decisions based on real-time data and environmental conditions.',
                color: '#0284c7',
                bg: '#f0f9ff',
                icon: <TrendingUp size={18} color="#0284c7" />
              },
              {
                title: 'Water Efficient',
                desc: 'Up to 45–60% reduction in water consumption compared to traditional methods.',
                color: '#0284c7',
                bg: '#f0f9ff',
                icon: <Droplets size={18} color="#0284c7" />
              },
              {
                title: 'Healthy Plants',
                desc: 'Maintains optimal soil moisture and environmental conditions for plant health.',
                color: '#d97706',
                bg: '#fffbeb',
                icon: <Sprout size={18} color="#d97706" />
              },
              {
                title: 'Remote Monitoring',
                desc: 'Real-time data, alerts, and control from anywhere via web dashboard.',
                color: '#059669',
                bg: '#ecfdf5',
                icon: <Activity size={18} color="#059669" />
              },
              {
                title: 'Reliable & Safe',
                desc: 'Failsafe modes, error handling, and data logging ensure robust operation.',
                color: '#2563eb',
                bg: '#eff6ff',
                icon: <Shield size={18} color="#2563eb" />
              }
            ].map((card, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.75rem',
                borderRadius: '14px',
                background: card.bg,
                border: '1px solid rgba(0,0,0,0.04)'
              }}>
                <div style={{ flexShrink: 0, marginTop: '2px' }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.15rem' }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.35 }}>
                    {card.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* BOTTOM BAR: KEY OUTCOMES matching imgtwo.png */}
      <div style={{
        marginTop: '1.75rem',
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {/* Badge */}
        <div style={{
          background: '#15803d',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '0.78rem',
          padding: '0.6rem 1rem',
          borderRadius: '12px',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0
        }}>
          KEY OUTCOMES
        </div>

        {/* 5 Outcome items */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem'
        }}>
          {[
            {
              icon: <Droplets size={18} color="#0284c7" />,
              title: 'Optimized Water Usage',
              sub: 'Save water, reduce waste'
            },
            {
              icon: <Sprout size={18} color="#16a34a" />,
              title: 'Improved Plant Growth',
              sub: 'Better care, better yield'
            },
            {
              icon: <Zap size={18} color="#d97706" />,
              title: 'Automated Operation',
              sub: 'Less manual work'
            },
            {
              icon: <Cloud size={18} color="#0284c7" />,
              title: 'Data-Driven Insights',
              sub: 'Smarter decisions'
            },
            {
              icon: <DollarSign size={18} color="#16a34a" />,
              title: 'Cost Effective',
              sub: 'Lower water & labor costs'
            }
          ].map((item, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ flexShrink: 0 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f172a' }}>{item.title}</div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
