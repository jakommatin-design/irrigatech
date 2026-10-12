import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSensors } from '../context/SensorContext';
import { 
  User, Building2, Cpu, Cloud, Shield, 
  Sliders, HelpCircle, ChevronRight, Check,
  Sparkles, Bell, Globe, Key, LogOut
} from 'lucide-react';
import AccountPortal from './AccountPortal';

export default function SettingsView({ onNavigate }) {
  const { user, logout, settings, updateSettings, farms } = useAuth();
  const { mode, connected, thresholds, setThreshold } = useSensors();

  const [activeSubModal, setActiveSubModal] = useState(null); // 'account' | 'greenhouse' | 'devices' | 'cloud' | 'security' | 'preferences' | 'help' | null
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings?.notifications?.emailAlerts ?? true);
  const [tempUnit, setTempUnit] = useState(settings?.general?.units?.includes('F') ? 'fahrenheit' : 'celsius');
  const [language, setLanguage] = useState(settings?.general?.language || 'English');

  const settingsItems = [
    {
      id: 'greenhouse',
      icon: Building2,
      iconBg: '#ecfdf5',
      iconColor: '#059669',
      title: 'Greenhouse Details',
      subtitle: 'Location, crop, setup',
      badge: user?.selectedFarm || 'Greenhouse 1'
    },
    {
      id: 'devices',
      icon: Cpu,
      iconBg: '#eff6ff',
      iconColor: '#2563eb',
      title: 'Device Management',
      subtitle: 'ESP32, sensors, actuators',
      badge: mode === 'live' ? 'Online' : 'Simulation'
    },
    {
      id: 'cloud',
      icon: Cloud,
      iconBg: '#f0fdf4',
      iconColor: '#16a34a',
      title: 'Firebase & Cloud',
      subtitle: 'Connection status, sync',
      badge: 'Synchronized'
    },
    {
      id: 'security',
      icon: Shield,
      iconBg: '#fef2f2',
      iconColor: '#dc2626',
      title: 'Security',
      subtitle: 'Authentication, permissions',
      badge: '2FA Enabled'
    },
    {
      id: 'preferences',
      icon: Sliders,
      iconBg: '#f0f9ff',
      iconColor: '#0284c7',
      title: 'App Preferences',
      subtitle: 'Notifications, language, units',
      badge: null
    },
    {
      id: 'help',
      icon: HelpCircle,
      iconBg: '#faf5ff',
      iconColor: '#9333ea',
      title: 'Help & Support',
      subtitle: 'FAQs, contact us',
      badge: '24/7 Agro Support'
    }
  ];

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '1.25rem 1rem 5rem' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Settings
        </h1>
      </div>

      {/* User / Farmer Profile Header - matches Screen 9 of layout.png */}
      <div 
        onClick={() => setActiveSubModal('account')}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '1.15rem 1.25rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            fontWeight: 800,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
          }}>
            FJ
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {user?.name || 'Farmer John'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>
              {user?.email || 'farmer@irriga-tech.com'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
          <span style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: '#ecfdf5',
            color: '#059669'
          }}>
            Manage
          </span>
          <ChevronRight size={18} />
        </div>
      </div>

      {/* Settings Navigation List - matches layout.png Screen 9 */}
      <div style={{
        background: '#ffffff',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
      }}>
        {settingsItems.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === settingsItems.length - 1;
          return (
            <div
              key={item.id}
              onClick={() => setActiveSubModal(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.05rem 1.25rem',
                borderBottom: isLast ? 'none' : '1px solid #f1f5f9',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: item.iconBg,
                  color: item.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={20} />
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                    {item.subtitle}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {item.badge && (
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: '#64748b',
                    background: '#f1f5f9',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '6px'
                  }}>
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Logout Row */}
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <button
          onClick={logout}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '12px',
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <LogOut size={16} />
          Sign Out of Account
        </button>
      </div>

      {/* SUB-MODALS */}
      {activeSubModal === 'account' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: '#f8fafc',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            position: 'relative'
          }}>
            <button
              onClick={() => setActiveSubModal(null)}
              style={{
                position: 'sticky',
                top: 0,
                float: 'right',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              ✕
            </button>
            <AccountPortal />
          </div>
        </div>
      )}

      {/* SubModal for Preferences */}
      {activeSubModal === 'preferences' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                App Preferences
              </h3>
              <button 
                onClick={() => setActiveSubModal(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Push notifications */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>Push Notifications</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Receive instant alerts for dry soil and frost</div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  style={{ width: '20px', height: '20px', accentColor: '#15803d' }}
                />
              </div>

              {/* Units */}
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Temperature Unit</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['celsius', 'fahrenheit'].map(unit => (
                    <button
                      key={unit}
                      onClick={() => setTempUnit(unit)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: tempUnit === unit ? '#ecfdf5' : '#ffffff',
                        color: tempUnit === unit ? '#059669' : '#64748b'
                      }}
                    >
                      {unit === 'celsius' ? '°C (Celsius)' : '°F (Fahrenheit)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language */}
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>Language</div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="English">English</option>
                  <option value="Swahili">Swahili</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                </select>
              </div>

              <button
                onClick={async () => {
                  await updateSettings({
                    general: {
                      ...(settings?.general || {}),
                      language,
                      units: tempUnit === 'celsius' ? 'Metric (°C, L, bar)' : 'Imperial (°F, gal, psi)'
                    },
                    notifications: {
                      ...(settings?.notifications || {}),
                      emailAlerts: notificationsEnabled
                    }
                  });
                  setActiveSubModal(null);
                }}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  background: '#15803d',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SubModal for Devices / Details */}
      {(activeSubModal === 'devices' || activeSubModal === 'greenhouse' || activeSubModal === 'cloud' || activeSubModal === 'security' || activeSubModal === 'help') && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'capitalize' }}>
                {activeSubModal} Settings
              </h3>
              <button 
                onClick={() => setActiveSubModal(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
              {activeSubModal === 'devices' && (
                <div>
                  <p><strong>Primary Controller:</strong> Arduino / ESP32 Node</p>
                  <p><strong>Interface:</strong> Live Hardware Serial Bridge & WebSockets</p>
                  <p><strong>Actuators Connected:</strong> Water Pump Relay, Ventilation Fan, Motorized Shade</p>
                  <p><strong>Telemetry Frequency:</strong> 2000 ms telemetry cadence</p>
                  <p><strong>Mode:</strong> {mode === 'live' ? '🟢 Live Hardware Connected' : '🔵 Hardware Simulation Active'}</p>
                </div>
              )}
              {activeSubModal === 'greenhouse' && (
                <div>
                  <p><strong>Active Facility:</strong> {user?.activeFarm || 'Greenhouse 1 (Alpha)'}</p>
                  <p><strong>Total Facilities:</strong> {farms?.length || 4} Managed Greenhouses</p>
                  <p><strong>Active Crop:</strong> {user?.crops?.find(c => c.id === user?.selectedCrop)?.name || 'Tomato'}</p>
                  <button
                    onClick={() => { setActiveSubModal(null); onNavigate?.('account'); }}
                    style={{
                      marginTop: '0.75rem',
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '10px',
                      background: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Manage Facilities & Crops in Portal →
                  </button>
                </div>
              )}
              {activeSubModal === 'cloud' && (
                <div>
                  <p><strong>Cloud Distributed SQL:</strong> TiDB Cloud Serverless (MySQL-Compatible)</p>
                  <p><strong>Cluster:</strong> gateway01.ap-northeast-1.prod.aws.tidbcloud.com</p>
                  <p><strong>Local Edge Database:</strong> SQLite3 (WAL Mode, zero-loss fallback)</p>
                  <p><strong>Production Host:</strong> Railway Production Container</p>
                  <p><strong>Dual-Persistence:</strong> Active (Syncing all telemetry & irrigation events)</p>
                </div>
              )}
              {activeSubModal === 'security' && (
                <div>
                  <p><strong>Role:</strong> Administrator / Head Agronomist</p>
                  <p><strong>Encryption:</strong> AES-256 local serial token verification</p>
                  <p><strong>Audit Log:</strong> Autonomous fail-safe logging enabled</p>
                </div>
              )}
              {activeSubModal === 'help' && (
                <div>
                  <p><strong>Irriga-Tech Support Hotline:</strong> +254 700 123 456</p>
                  <p><strong>Email Support:</strong> support@irriga-tech.io</p>
                  <p><strong>Firmware Version:</strong> v2.4 Production Release</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveSubModal(null)}
              style={{
                width: '100%',
                marginTop: '1.25rem',
                padding: '0.75rem',
                borderRadius: '12px',
                background: '#15803d',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
