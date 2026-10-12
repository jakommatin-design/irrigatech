import React from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Sun, BatteryCharging, Zap, ArrowRight, 
  TrendingUp, Leaf, DollarSign, Activity, Cpu
} from 'lucide-react';

export default function SolarView() {
  const { 
    solarWatts, batterySoc, batteryVoltage, solarDailyKwh, pump, ac, uptime 
  } = useSensors();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Solar Microgrid & Battery Energy Storage
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          Autonomous 12V off-grid solar power management for greenhouse relays, pump, and IoT node.
        </p>
      </div>

      {/* Main Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Solar Generation */}
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
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sun size={22} />
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              background: '#fffbeb',
              color: '#d97706',
              border: '1px solid #fde68a'
            }}>
              MPPT Active
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Solar Array Output</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {solarWatts} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8' }}>Watts</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
            Daily Generation: <strong>{solarDailyKwh || 3.4} kWh</strong>
          </div>
        </div>

        {/* Battery State of Charge */}
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
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BatteryCharging size={22} />
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #bbf7d0'
            }}>
              Charging (Float)
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Battery Storage (12V)</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {batterySoc}% <span style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8' }}>SoC</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: 600 }}>
            Bus Voltage: <strong>{batteryVoltage} V</strong> • Health: 99.2%
          </div>
        </div>

        {/* System Load */}
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
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={22} />
            </div>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              background: pump ? '#fef2f2' : '#f0f9ff',
              color: pump ? '#dc2626' : '#2563eb',
              border: `1px solid ${pump ? '#fecaca' : '#bfdbfe'}`
            }}>
              {pump ? 'High Draw (Pump Running)' : 'Nominal Load'}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Current Power Consumption</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {pump ? '65.2' : (ac ? '32.0' : '4.8')} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8' }}>Watts</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Surplus to Battery: <strong>+{Math.max(0, solarWatts - (pump ? 65 : 5)).toFixed(0)} W</strong>
          </div>
        </div>

      </div>

      {/* Energy Flow Diagram */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1.25rem' }}>
          Microgrid Energy Distribution
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'center'
        }}>
          {/* Node 1: PV Panels */}
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', padding: '1rem', textAlign: 'center' }}>
            <Sun size={24} color="#d97706" style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#92400e' }}>2x 150W PV Solar</div>
            <div style={{ fontSize: '0.75rem', color: '#b45309' }}>Generating {solarWatts}W</div>
          </div>

          {/* Node 2: MPPT Controller */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '1rem', textAlign: 'center' }}>
            <Activity size={24} color="#16a34a" style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#166534' }}>MPPT Charge Controller</div>
            <div style={{ fontSize: '0.75rem', color: '#15803d' }}>Efficiency: 98.6%</div>
          </div>

          {/* Node 3: 12V Battery Bank */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '16px', padding: '1rem', textAlign: 'center' }}>
            <BatteryCharging size={24} color="#0284c7" style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0369a1' }}>12V 100Ah LiFePO4</div>
            <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>{batterySoc}% ({batteryVoltage}V)</div>
          </div>

          {/* Node 4: Loads (Relays & Pump) */}
          <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '1rem', textAlign: 'center' }}>
            <Cpu size={24} color="#9333ea" style={{ margin: '0 auto 0.4rem' }} />
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#6b21a8' }}>ESP32 & DC Pump</div>
            <div style={{ fontSize: '0.75rem', color: '#7e22ce' }}>{pump ? '65W Draw' : 'Idle Standby'}</div>
          </div>
        </div>
      </div>

      {/* Sustainability & Cost Savings Strip */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px',
        padding: '1.5rem',
        color: '#ffffff',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)' }}>
            <Leaf size={22} color="#4ade80" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>CO2 Offset to Date</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>142.6 kg</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)' }}>
            <DollarSign size={22} color="#38bdf8" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Clean Energy Saved</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>$184.20</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.1)' }}>
            <Activity size={22} color="#fbbf24" />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Grid Independence</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>100% Off-Grid</div>
          </div>
        </div>
      </div>

    </div>
  );
}
