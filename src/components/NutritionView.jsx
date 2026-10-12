import React, { useState } from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Sprout, Sparkles, TestTube2, AlertCircle, 
  CheckCircle2, Droplets, Leaf, Thermometer, ShieldCheck,
  Check, X
} from 'lucide-react';

export default function NutritionView() {
  const { temperature, humidity, soilMoisture } = useSensors();
  const [reviewStatus, setReviewStatus] = useState('PENDING_REVIEW'); // 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'

  // VPD calculation (Vapor Pressure Deficit)
  const svp = 0.61078 * Math.exp((17.27 * temperature) / (temperature + 237.3));
  const avp = svp * (humidity / 100);
  const vpd = (svp - avp).toFixed(2);

  const getVpdStatus = (val) => {
    if (val < 0.4) return { label: 'Low Transpiration (High Fungal / Mold Risk)', color: '#0284c7', bg: '#f0f9ff' };
    if (val >= 0.4 && val <= 1.25) return { label: 'Optimal Transpiration & Stomata Zone', color: '#16a34a', bg: '#f0fdf4' };
    return { label: 'High Thermal Stress (Stomata Closure & Wilting)', color: '#dc2626', bg: '#fef2f2' };
  };

  const vpdStatus = getVpdStatus(parseFloat(vpd));

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Crop Nutrition & AI Agronomy Advisory
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          Implements Blueprint Algorithm D (AI Crop-Nutrition Pipeline with Agronomist Human Review Guardrail).
        </p>
      </div>

      {/* Hero Crop Stage Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
        borderRadius: '24px',
        padding: '1.5rem',
        color: '#ffffff',
        marginBottom: '1.5rem',
        boxShadow: '0 8px 24px rgba(20, 83, 45, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#86efac'
          }}>
            <Sprout size={32} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#86efac', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              PRIMARY CROP SPECIES
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              Tomato (Solanum lycopersicum)
            </div>
            <div style={{ fontSize: '0.82rem', color: '#bbf7d0' }}>
              Growth Phase: <strong>Vegetative Stage 3 (Week 4)</strong> • Target EC: 2.0–2.4 mS/cm
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(8px)',
          borderRadius: '14px',
          padding: '0.65rem 1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          textAlign: 'right'
        }}>
          <div style={{ fontSize: '0.72rem', color: '#86efac', fontWeight: 600 }}>Health Index</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }}>98.4%</div>
          <div style={{ fontSize: '0.68rem', color: '#bbf7d0' }}>Bio-Vigor: Strong</div>
        </div>
      </div>

      {/* Blueprint Section 8.6: Traceable AI Advisory Guardrail Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ padding: '0.4rem', borderRadius: '10px', background: '#ecfdf5', color: '#059669' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                AI Fertigation Recommendation #REC-2026-084
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Model: <strong>v1.2-agronomy-baseline</strong> • Generated: Today, 08:00 AM • Expiry: 24h
              </div>
            </div>
          </div>

          <span style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            background: reviewStatus === 'APPROVED' ? '#dcfce7' : (reviewStatus === 'REJECTED' ? '#fee2e2' : '#fef3c7'),
            color: reviewStatus === 'APPROVED' ? '#15803d' : (reviewStatus === 'REJECTED' ? '#b91c1c' : '#b45309')
          }}>
            {reviewStatus === 'APPROVED' ? 'STATUS: AGRONOMIST APPROVED' : (reviewStatus === 'REJECTED' ? 'STATUS: REJECTED' : 'STATUS: PENDING HUMAN REVIEW')}
          </span>
        </div>

        <div style={{
          background: '#f8fafc',
          borderRadius: '14px',
          padding: '1rem',
          border: '1px solid #e2e8f0',
          fontSize: '0.82rem',
          lineHeight: 1.5,
          color: '#334155',
          marginBottom: '1rem'
        }}>
          <strong>Prescription: </strong> Apply <strong>12.5g Calcium Nitrate [15.5-0-0 + 19% Ca]</strong> and <strong>1.2g Fe-EDDHA (6% Iron Chelate)</strong> via Fertigation Venturi Line at 14:00 today.
          <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#64748b' }}>
            <strong>Evidence: </strong> Rapid vegetative internode extension observed; current VPD is within ideal range ({vpd} kPa) ensuring zero tip-burn during calcium translocation.
          </div>
        </div>

        {/* Human in the loop action buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setReviewStatus('APPROVED')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              background: reviewStatus === 'APPROVED' ? '#15803d' : '#ecfdf5',
              color: reviewStatus === 'APPROVED' ? '#ffffff' : '#15803d',
              border: '1px solid #bbf7d0',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <Check size={16} />
            {reviewStatus === 'APPROVED' ? 'Approved & Queued' : 'Approve Dose'}
          </button>

          <button
            onClick={() => setReviewStatus('REJECTED')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '10px',
              background: reviewStatus === 'REJECTED' ? '#ef4444' : '#f8fafc',
              color: reviewStatus === 'REJECTED' ? '#ffffff' : '#64748b',
              border: '1px solid #e2e8f0',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
            Reject / Hold
          </button>
        </div>
      </div>

      {/* VPD Live Physics Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
              TRANSPIRATION PHYSICS (VPD)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', margin: '0.3rem 0' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a' }}>{vpd}</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>kPa</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                background: vpdStatus.bg,
                color: vpdStatus.color,
                marginLeft: '0.5rem'
              }}>
                {vpdStatus.label}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Calculated using ambient temperature ({temperature}°C) & relative humidity ({humidity}%) from DHT11.
            </div>
          </div>

          <div style={{
            background: '#f8fafc',
            borderRadius: '14px',
            padding: '0.75rem 1rem',
            border: '1px solid #e2e8f0',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            maxWidth: '300px'
          }}>
            <strong>Agronomist Target:</strong> 0.80 to 1.10 kPa promotes maximum nutrient flow through xylem capillaries without stomata shutdown.
          </div>
        </div>

        <div style={{ position: 'relative', height: '12px', borderRadius: '9999px', background: 'linear-gradient(to right, #38bdf8 0%, #22c55e 30%, #22c55e 65%, #ef4444 100%)', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute',
            left: `${Math.min(95, Math.max(5, (parseFloat(vpd) / 2.0) * 100))}%`,
            top: 0,
            bottom: 0,
            width: '6px',
            background: '#0f172a',
            borderRadius: '2px',
            boxShadow: '0 0 4px #000000'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#94a3b8', marginTop: '0.35rem' }}>
          <span>0.0 kPa (Wet)</span>
          <span style={{ color: '#16a34a', fontWeight: 700 }}>Ideal Target (0.8–1.1 kPa)</span>
          <span>2.0+ kPa (Extreme Dry)</span>
        </div>
      </div>

      {/* Soil Chemistry & N-P-K Nutrient Balance */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        
        {/* Soil Chemistry (pH & EC) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>
            SOIL CHEMISTRY & SALINITY
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#f0fdf4', padding: '0.85rem', borderRadius: '14px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>Substrate pH</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: '0.2rem 0' }}>6.2</div>
              <div style={{ fontSize: '0.68rem', color: '#16a34a' }}>Target 6.0–6.5 (Optimal)</div>
            </div>

            <div style={{ background: '#f0f9ff', padding: '0.85rem', borderRadius: '14px', border: '1px solid #bae6fd' }}>
              <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>Conductivity (EC)</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0284c7', margin: '0.2rem 0' }}>2.1</div>
              <div style={{ fontSize: '0.68rem', color: '#0284c7' }}>mS/cm (Fertile)</div>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.4 }}>
            Nutrient uptake efficiency for Phosphorus, Magnesium, and Iron is peaked at pH 6.2 with zero salt lock-up.
          </div>
        </div>

        {/* NPK Fertilizer Balance */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>
            N-P-K BIO-DOSING STATUS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { element: 'Nitrogen (N)', ppm: '185 ppm', level: 'Adequate', bar: 75, color: '#10b981' },
              { element: 'Phosphorus (P)', ppm: '58 ppm', level: 'Target', bar: 65, color: '#0284c7' },
              { element: 'Potassium (K)', ppm: '240 ppm', level: 'Optimal', bar: 85, color: '#f59e0b' },
            ].map((item, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                  <span style={{ color: '#0f172a' }}>{item.element}</span>
                  <span style={{ color: item.color }}>{item.ppm} ({item.level})</span>
                </div>
                <div style={{ height: '6px', borderRadius: '9999px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${item.bar}%`, background: item.color, borderRadius: '9999px' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem' }}>
            Next fertigation injection scheduled via Dosing Solenoid B in <strong>18 hours</strong>.
          </div>
        </div>

      </div>

    </div>
  );
}
