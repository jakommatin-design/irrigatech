import React, { useState, useMemo } from 'react';
import { useSensors } from '../context/SensorContext';
import { 
  Bell, AlertTriangle, Battery, Droplets, 
  Thermometer, CheckCircle2, Sprout, Info, 
  Filter, X
} from 'lucide-react';

export default function AlertsView() {
  const { 
    temperature, humidity, soilMoisture, waterTank, batterySoc,
    irrigationLogs
  } = useSensors();

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'warnings' | 'info'

  // Generate alerts from current sensor state + recent logs
  const alerts = useMemo(() => {
    const list = [];
    const now = Date.now();

    // Battery low alert
    if (batterySoc < 30) {
      list.push({
        id: 'battery-low',
        type: 'warning',
        icon: Battery,
        iconBg: '#fef2f2',
        iconColor: '#dc2626',
        title: 'Low Battery',
        description: `Battery level is ${batterySoc}%.`,
        time: '2 hours ago',
        ts: now - 7200000
      });
    }

    // Water tank low
    if (waterTank < 30) {
      list.push({
        id: 'water-low',
        type: 'warning',
        icon: Droplets,
        iconBg: '#fef2f2',
        iconColor: '#dc2626',
        title: 'Water Tank Low',
        description: `Water level is ${waterTank}%.`,
        time: '4 hours ago',
        ts: now - 14400000
      });
    }

    // High temperature
    if (temperature > 32) {
      list.push({
        id: 'temp-high',
        type: 'warning',
        icon: Thermometer,
        iconBg: '#fffbeb',
        iconColor: '#d97706',
        title: 'High Temperature',
        description: `Greenhouse temperature is ${temperature}°C.`,
        time: '6 hours ago',
        ts: now - 21600000
      });
    }

    // Irrigation completed (from recent logs)
    const recentIrrigate = irrigationLogs.find(l => l.action.includes('STOP'));
    if (recentIrrigate) {
      list.push({
        id: 'irrigation-done',
        type: 'info',
        icon: CheckCircle2,
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        title: 'Irrigation Completed',
        description: 'Zone 1 watered successfully.',
        time: `Today, ${recentIrrigate.isoTime}`,
        ts: now - 900000
      });
    }

    // AI Recommendation ready
    list.push({
      id: 'ai-ready',
      type: 'info',
      icon: Sprout,
      iconBg: '#f5f3ff',
      iconColor: '#7c3aed',
      title: 'AI Recommendation Ready',
      description: 'New fertilizer recommendation available.',
      time: 'Today, 05:30 AM',
      ts: now - 43200000
    });

    // System status
    list.push({
      id: 'system-normal',
      type: 'info',
      icon: CheckCircle2,
      iconBg: '#ecfdf5',
      iconColor: '#059669',
      title: 'System Online',
      description: 'All sensors reporting normally. ESP32 connected.',
      time: 'Just now',
      ts: now
    });

    // Simulated past warnings for a richer feed
    list.push({
      id: 'battery-warn-past',
      type: 'warning',
      icon: Battery,
      iconBg: '#fffbeb',
      iconColor: '#d97706',
      title: 'Low Battery',
      description: 'Battery level was at 22%.',
      time: '2 hours ago',
      ts: now - 7200000
    });

    list.push({
      id: 'water-warn-past',
      type: 'warning',
      icon: Droplets,
      iconBg: '#fffbeb',
      iconColor: '#d97706',
      title: 'Water Tank Low',
      description: 'Water level was 15%.',
      time: '4 hours ago',
      ts: now - 14400000
    });

    list.push({
      id: 'temp-warn-past',
      type: 'warning',
      icon: Thermometer,
      iconBg: '#fef2f2',
      iconColor: '#dc2626',
      title: 'High Temperature',
      description: 'Greenhouse temperature was 34°C.',
      time: '6 hours ago',
      ts: now - 21600000
    });

    return list.sort((a, b) => b.ts - a.ts);
  }, [temperature, humidity, soilMoisture, waterTank, batterySoc, irrigationLogs]);

  const filteredAlerts = activeFilter === 'all' 
    ? alerts 
    : alerts.filter(a => a.type === (activeFilter === 'warnings' ? 'warning' : 'info'));

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'warnings', label: 'Warnings' },
    { id: 'info', label: 'Info' }
  ];

  const warningCount = alerts.filter(a => a.type === 'warning').length;

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '1.25rem 1rem 5rem' }}>

      {/* Title */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Alerts & Notifications
          </h1>
          {warningCount > 0 && (
            <span style={{
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              minWidth: '22px',
              textAlign: 'center'
            }}>
              {warningCount}
            </span>
          )}
        </div>
      </div>

      {/* Filter Tabs - matching layout.png screen 7 */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '1.5rem',
        background: '#f1f5f9',
        padding: '0.3rem',
        borderRadius: '12px'
      }}>
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            style={{
              flex: 1,
              padding: '0.55rem 0.75rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: activeFilter === tab.id ? '#15803d' : 'transparent',
              color: activeFilter === tab.id ? '#ffffff' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alert Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {filteredAlerts.map((alert) => {
          const Icon = alert.icon;
          const isWarning = alert.type === 'warning';
          return (
            <div key={alert.id} style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1rem 1.15rem',
              border: `1px solid ${isWarning ? '#fecaca' : '#e2e8f0'}`,
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              borderLeft: `4px solid ${isWarning ? '#dc2626' : '#10b981'}`,
              transition: 'all 0.2s ease'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: alert.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: alert.iconColor,
                flexShrink: 0
              }}>
                <Icon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '0.88rem', 
                  fontWeight: 700, 
                  color: '#0f172a', 
                  marginBottom: '0.15rem' 
                }}>
                  {alert.title}
                </div>
                <div style={{ 
                  fontSize: '0.78rem', 
                  color: '#64748b', 
                  lineHeight: 1.4 
                }}>
                  {alert.description}
                </div>
              </div>
              <span style={{ 
                fontSize: '0.68rem', 
                color: '#94a3b8', 
                fontWeight: 600,
                whiteSpace: 'nowrap',
                marginTop: '0.1rem'
              }}>
                {alert.time}
              </span>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#94a3b8',
            fontSize: '0.88rem'
          }}>
            <Bell size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
            <div>No {activeFilter} alerts at this time</div>
          </div>
        )}
      </div>
    </div>
  );
}
