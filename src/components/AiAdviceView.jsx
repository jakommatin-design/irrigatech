import React from 'react';
import { useSensors } from '../context/SensorContext';
import { Sparkles, Sprout, AlertCircle, Droplets, Sun, CheckCircle } from 'lucide-react';

export default function AiAdviceView() {
  const { temperature, humidity, soilMoisture } = useSensors();

  // VPD calculation
  // SVP = 0.61078 * exp((17.27 * T) / (T + 237.3))
  // AVP = SVP * (RH / 100)
  // VPD = SVP - AVP
  const svp = 0.61078 * Math.exp((17.27 * temperature) / (temperature + 237.3));
  const avp = svp * (humidity / 100);
  const vpd = (svp - avp).toFixed(2);

  const getVpdStatus = (val) => {
    if (val < 0.4) return { label: 'Low Transpiration (High fungal risk)', color: '#0284c7', bg: '#f0f9ff' };
    if (val >= 0.4 && val <= 1.25) return { label: 'Ideal Transpiration Zone', color: '#16a34a', bg: '#f0fdf4' };
    return { label: 'High Plant Stress (Stomata closure)', color: '#dc2626', bg: '#fef2f2' };
  };

  const vpdStatus = getVpdStatus(parseFloat(vpd));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <Sparkles size={22} color="#059669" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            AI Agronomy Advice
          </h1>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Automated intelligence engine synthesizing greenhouse climate, soil hydration, and transpiration physics.
        </p>
      </div>

      {/* VPD Highlight Card */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
        borderRadius: '24px',
        padding: '1.5rem',
        color: '#ffffff',
        marginBottom: '1.5rem',
        boxShadow: '0 8px 24px rgba(6, 78, 59, 0.25)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Vapor Pressure Deficit (VPD)
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.2rem 0' }}>
              {vpd} <span style={{ fontSize: '1.25rem', fontWeight: 500, color: '#a7f3d0' }}>kPa</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: '#d1fae5' }}>
              Current Status: <strong>{vpdStatus.label}</strong>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '1rem',
            maxWidth: '280px',
            fontSize: '0.78rem',
            lineHeight: 1.45,
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            Optimal target for tomato crops in vegetative phase is <strong>0.80 – 1.10 kPa</strong>. Stomata opening is balanced for nutrient uptake without water stress.
          </div>
        </div>
      </div>

      {/* Recommendations Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Recommendation 1 */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Droplets size={20} color="#0284c7" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Hydration Cycle Recommendation
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
            {soilMoisture > 70 
              ? 'Soil dryness detected above 70%. Immediate 5-minute automated drip cycle recommended to prevent root moisture stress.'
              : 'Current soil moisture levels are well-buffered. Next watering schedule estimated in approximately 3 hours based on current evapotranspiration rates.'}
          </p>
        </div>

        {/* Recommendation 2 */}
        <div style={{
          background: '#ffffff',
          borderRadius: '18px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <Sun size={20} color="#d97706" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Solar & Microclimate Optimization
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
            {temperature > 30 
              ? 'High canopy temperature observed. Activate ventilation fan (Pin 7) and deploy shade mesh to avoid leaf scorch.'
              : 'Ambient temperature is within optimal vegetative growth range (20–30°C). Photosynthesis rates are optimized.'}
          </p>
        </div>

      </div>

    </div>
  );
}
