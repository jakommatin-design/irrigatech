import React, { useState } from 'react';
import { 
  Home, Activity, Droplets, Sprout, MoreHorizontal, 
  Sun, Fan, Bell, BarChart2, Settings, Terminal, Phone, X, Building2
} from 'lucide-react';

export default function BottomNav({ currentTab, setCurrentTab }) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'monitor', label: 'Monitor', icon: Activity },
    { id: 'irrigation', label: 'Irrigation', icon: Droplets },
    { id: 'nutrition', label: 'AI & Nutrition', icon: Sprout },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  const moreItems = [
    { id: 'ussd', label: 'USSD (*384*4744#)', icon: Phone, color: '#059669', bg: '#ecfdf5' },
    { id: 'solar', label: 'Solar & Battery', icon: Sun, color: '#f59e0b', bg: '#fef3c7' },
    { id: 'climate', label: 'Climate Control', icon: Fan, color: '#0284c7', bg: '#e0f2fe' },
    { id: 'alerts', label: 'Alerts & Notifications', icon: Bell, color: '#dc2626', bg: '#fee2e2' },
    { id: 'analytics', label: 'Analytics & History', icon: BarChart2, color: '#16a34a', bg: '#dcfce7' },
    { id: 'settings', label: 'Settings', icon: Settings, color: '#64748b', bg: '#f1f5f9' },
    { id: 'account', label: 'Farm & Accounts', icon: Building2, color: '#15803d', bg: '#dcfce7' },
    { id: 'terminal', label: 'Hardware Terminal', icon: Terminal, color: '#475569', bg: '#f1f5f9' },
  ];

  const isMoreActive = moreItems.some(item => item.id === currentTab);

  const handleTabClick = (tabId) => {
    if (tabId === 'more') {
      setShowMoreMenu(prev => !prev);
    } else {
      setShowMoreMenu(false);
      setCurrentTab(tabId);
    }
  };

  const handleMoreSelect = (tabId) => {
    setCurrentTab(tabId);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* "More" Drawer for Mobile */}
      {showMoreMenu && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(3px)',
          zIndex: 49,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
          onClick={() => setShowMoreMenu(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '1.25rem 1.25rem calc(60px + 1rem)',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.1)',
              animation: 'slideUp 0.2s ease-out'
            }}
          >
            <div style={{
              width: '40px',
              height: '4px',
              background: '#cbd5e1',
              borderRadius: '9999px',
              margin: '0 auto 1.25rem'
            }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                Additional Modules
              </span>
              <button 
                onClick={() => setShowMoreMenu(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {moreItems.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMoreSelect(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '16px',
                      background: isActive ? '#ecfdf5' : '#f8fafc',
                      border: isActive ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: item.bg,
                      color: item.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={18} />
                    </div>
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#065f46' : '#1e293b'
                    }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar matching layout.png */}
      <div 
        className="bottom-nav-mobile"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '0.5rem 0.6rem',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 50,
          boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
        }}
      >
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === 'more' ? isMoreActive || showMoreMenu : currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.2rem',
                color: isActive ? '#15803d' : '#94a3b8',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '10px',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span style={{ 
                fontSize: '0.65rem', 
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '-0.01em'
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
