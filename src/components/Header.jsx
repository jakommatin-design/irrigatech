import React, { useState } from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Home, Activity, Droplets, Sprout, Sun, 
  Fan, Bell, BarChart2, Settings, Terminal, Phone,
  ChevronDown
} from 'lucide-react';
import logoImg from '../assets/site_logo.jpeg';

export default function Header({ currentTab, setCurrentTab }) {
  const { mode } = useSensors();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Core primary tabs (kept concise to prevent navbar flooding)
  const mainNav = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'monitor', label: 'Monitoring', icon: Activity },
    { id: 'irrigation', label: 'Irrigation', icon: Droplets },
    { id: 'nutrition', label: 'Nutrition', icon: Sprout },
    { id: 'solar', label: 'Solar', icon: Sun },
  ];

  // Secondary modules accessible cleanly via "More" dropdown
  const moreNav = [
    { id: 'ussd', label: 'USSD (*384*4744#)', icon: Phone },
    { id: 'climate', label: 'Climate Control', icon: Fan },
    { id: 'alerts', label: 'Alerts & Notifications', icon: Bell },
    { id: 'analytics', label: 'Analytics & History', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'account', label: 'Farm & Accounts', icon: Settings },
    { id: 'terminal', label: 'Hardware Terminal', icon: Terminal },
  ];

  const isMoreActive = moreNav.some(item => item.id === currentTab);

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.6rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'nowrap', // Never wrap onto a second row
        gap: '1rem'
      }}>
        {/* Brand with Logo */}
        <div 
          onClick={() => setCurrentTab('home')}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.65rem', 
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <img 
            src={logoImg} 
            alt="Irriga-Tech Logo" 
            style={{ 
              height: '38px', 
              width: '38px', 
              objectFit: 'contain',
              borderRadius: '9px',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.2)'
            }} 
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ 
                fontWeight: 800, 
                fontSize: '1.15rem', 
                color: '#0f172a',
                letterSpacing: '-0.02em',
                lineHeight: 1
              }}>
                Irriga<span style={{ color: '#0284c7' }}>-Tech</span>
              </span>
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '5px',
                border: '1px solid #bbf7d0'
              }}>
                V2.4
              </span>
            </div>
            <p style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, margin: '0.1rem 0 0' }}>
              Smart Greenhouse IoT
            </p>
          </div>
        </div>

        {/* Clean, Non-Flooded Navigation Bar */}
        <nav 
          className="desktop-nav-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: '#f8fafc',
            padding: '0.2rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            flexShrink: 0
          }}
        >
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setShowMoreMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.42rem 0.75rem',
                  borderRadius: '9px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#15803d' : '#64748b',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} color={isActive ? '#15803d' : '#94a3b8'} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Clean "More" dropdown for additional modules */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMoreMenu(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.42rem 0.75rem',
                borderRadius: '9px',
                fontSize: '0.8rem',
                fontWeight: isMoreActive ? 700 : 500,
                background: isMoreActive ? '#ffffff' : 'transparent',
                color: isMoreActive ? '#15803d' : '#64748b',
                boxShadow: isMoreActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <span>More</span>
              <ChevronDown size={13} />
            </button>

            {showMoreMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '0.45rem',
                minWidth: '200px',
                zIndex: 60
              }}>
                {moreNav.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentTab(item.id);
                        setShowMoreMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '9px',
                        fontSize: '0.8rem',
                        fontWeight: isActive ? 700 : 500,
                        background: isActive ? '#ecfdf5' : 'transparent',
                        color: isActive ? '#15803d' : '#334155',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Icon size={16} color={isActive ? '#15803d' : '#64748b'} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Right Status Actions (All on same line, cleanly aligned) */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.65rem',
          flexShrink: 0 
        }}>
          {/* Alerts shortcut */}
          <button
            onClick={() => setCurrentTab('alerts')}
            title="Alerts & Notifications"
            style={{
              position: 'relative',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: currentTab === 'alerts' ? '#ecfdf5' : '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: currentTab === 'alerts' ? '#15803d' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            <Bell size={16} />
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#ef4444'
            }} />
          </button>


          {/* Online status badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.74rem',
            fontWeight: 700,
            background: mode === 'live' ? '#ecfdf5' : '#f0f9ff',
            color: mode === 'live' ? '#15803d' : '#0284c7',
            border: `1px solid ${mode === 'live' ? '#bbf7d0' : '#bae6fd'}`,
            whiteSpace: 'nowrap'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: mode === 'live' ? '#22c55e' : '#0284c7',
              boxShadow: `0 0 6px ${mode === 'live' ? '#22c55e' : '#0284c7'}`
            }} />
            {mode === 'live' ? 'ESP32 Online' : 'Simulation'}
          </div>

          {/* Farmer profile avatar */}
          <button
            onClick={() => setCurrentTab('settings')}
            title="Settings & Farm Profile"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#047857',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.82rem',
              fontWeight: 800,
              border: (currentTab === 'settings' || currentTab === 'account') ? '2px solid #34d399' : 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(4, 120, 87, 0.25)',
              flexShrink: 0
            }}
          >
            FJ
          </button>
        </div>
      </div>
    </header>
  );
}
