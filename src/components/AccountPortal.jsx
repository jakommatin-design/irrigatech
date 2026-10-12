import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSensors } from '../context/SensorContext';
import { 
  User, Building2, Sprout, ShieldCheck, Key, 
  LogOut, CheckCircle2, ChevronRight, Plus, Droplets,
  Sparkles, Settings2, RefreshCw
} from 'lucide-react';

export default function AccountPortal() {
  const { user, switchFarm, switchCrop, logout } = useAuth();
  const { setThreshold } = useSensors();
  const [copiedKey, setCopiedKey] = useState(false);

  const selectedCropObj = user.crops.find(c => c.id === user.selectedCrop) || user.crops[0];

  const handleApplyCrop = (crop) => {
    switchCrop(crop.id);
    // Automatically update controller thresholds to match crop biology!
    setThreshold('moistureStart', crop.moistureMin);
    setThreshold('moistureStop', crop.moistureMax);
  };

  const handleCopyKey = () => {
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem 5rem' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Farm & Account Management Portal
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
          Manage multi-greenhouse facilities, tailored plant profiles, and agricultural IoT credentials.
        </p>
      </div>

      {/* User Profile Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontWeight: 800,
            boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)'
          }}>
            FJ
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {user.name}
              </h2>
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                border: '1px solid #bbf7d0'
              }}>
                Verified Agronomist
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0' }}>
              {user.email} • {user.role}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1rem',
            borderRadius: '12px',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

      {/* Multi-Plant Biological Profiles Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sprout size={20} color="#15803d" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Active Plant Species & Irrigation Formula
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0' }}>
              Switching plants dynamically applies crop-specific soil hydration targets and nutrient thresholds to the ESP32.
            </p>
          </div>

          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            background: '#ecfdf5',
            color: '#059669',
            border: '1px solid #bbf7d0'
          }}>
            Active: {selectedCropObj.name}
          </span>
        </div>

        {/* Crops Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {user.crops.map((crop) => {
            const isCurrent = user.selectedCrop === crop.id;
            return (
              <div
                key={crop.id}
                onClick={() => handleApplyCrop(crop)}
                style={{
                  borderRadius: '16px',
                  padding: '1.15rem',
                  border: isCurrent ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: isCurrent ? '#f0fdf4' : '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {isCurrent && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    color: '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    <CheckCircle2 size={16} /> Active
                  </div>
                )}

                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                  {crop.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  {crop.stage}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.45rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>Soil Target</div>
                    <div style={{ fontWeight: 800, color: '#0284c7' }}>{crop.moistureMin}–{crop.moistureMax}%</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.45rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.68rem' }}>EC / pH</div>
                    <div style={{ fontWeight: 800, color: '#16a34a' }}>{crop.ecTarget} / {crop.phTarget}</div>
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: isCurrent ? '#16a34a' : '#64748b'
                  }}>
                    {isCurrent ? 'Formula Applied ✓' : 'Select Crop →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Greenhouse Facility Switcher */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} color="#0284c7" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Greenhouse Facilities
            </h2>
          </div>

          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.8rem',
            borderRadius: '10px',
            background: '#f0f9ff',
            color: '#0284c7',
            border: '1px solid #bae6fd',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}>
            <Plus size={14} /> Add Greenhouse
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {user.farms.map((farm) => {
            const isActive = user.activeFarm.includes(farm.name) || farm.id === 'gh1';
            return (
              <div
                key={farm.id}
                onClick={() => switchFarm(farm.id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderRadius: '16px',
                  border: isActive ? '2px solid #0284c7' : '1px solid #e2e8f0',
                  background: isActive ? '#f0f9ff' : '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{farm.name}</span>
                    {isActive && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '9999px', background: '#0284c7', color: '#ffffff' }}>
                        Connected
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {farm.location} • {farm.crop} • {farm.zones} Controlled Zones
                  </div>
                </div>

                <ChevronRight size={18} color={isActive ? '#0284c7' : '#94a3b8'} />
              </div>
            );
          })}
        </div>
      </div>

      {/* IoT Device Security & API Key */}
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        padding: '1.5rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Key size={18} color="#d97706" />
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Device Security & REST API Credentials
          </h2>
        </div>

        <div style={{
          background: '#f8fafc',
          borderRadius: '14px',
          padding: '1rem',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>DEVICE AUTHENTICATION TOKEN</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
              gh_live_9f82a17cb3490018d45ef209
            </div>
          </div>

          <button
            onClick={handleCopyKey}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: copiedKey ? '#dcfce7' : '#ffffff',
              color: copiedKey ? '#15803d' : '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {copiedKey ? 'Copied ✓' : 'Copy API Key'}
          </button>
        </div>
      </div>

    </div>
  );
}
