import React, { useState, useMemo, useEffect } from 'react';
import { useSensors } from '../context/SensorContext';
import { useAuth } from '../context/AuthContext';
import { 
  Bell, Battery, Droplets, Thermometer, CheckCircle2, Trash2, X
} from 'lucide-react';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendExternalNotification 
} from '../utils/notifications';

export default function AlertsView() {
  const { 
    temperature, humidity, soilMoisture, waterTank, batterySoc,
    irrigationLogs, connected, mode
  } = useSensors();
  const { getApiUrl, authHeaders, user } = useAuth() || {};
  const dismissedStorageKey = `irrigatech_dismissed_alerts:${user?.id || 'demo'}`;

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'warnings' | 'info'
  const [dbAlerts, setDbAlerts] = useState([]);
  const [notifPerm, setNotifPerm] = useState(getNotificationPermission());
  const [isRequestingNotif, setIsRequestingNotif] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(dismissedStorageKey) || '[]'); } catch { return []; }
  });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try { setDismissedIds(JSON.parse(localStorage.getItem(dismissedStorageKey) || '[]')); }
    catch { setDismissedIds([]); }
  }, [dismissedStorageKey]);

  const handleRequestNotif = async () => {
    setIsRequestingNotif(true);
    setNotice('Waiting for the browser notification permission prompt...');
    try {
      const p = await requestNotificationPermission();
      setNotifPerm(p);
      setNotice(p === 'granted'
        ? 'OS alerts are enabled for this browser. A test notification was requested.'
        : p === 'denied'
          ? 'Notifications are blocked. In Edge, open the lock icon by the address, set Notifications to Allow, then reload this page.'
          : p === 'default'
            ? 'No permission was granted. Allow notifications in the browser prompt, or check this site’s Notifications permission in Edge settings.'
            : 'OS notifications need a supported browser and a secure HTTPS page.');
    } finally {
      setIsRequestingNotif(false);
    }
  };

  const handleTestNotif = async () => {
    if (notifPerm !== 'granted') {
      const p = await requestNotificationPermission();
      setNotifPerm(p);
      if (p !== 'granted') {
        setNotice(p === 'denied'
          ? 'Notifications are blocked for this site. Allow them in your browser’s site settings, then reload.'
          : 'Notifications are unavailable here. Use the deployed HTTPS site in a supported browser.');
        return;
      }
    }
    const sent = await sendExternalNotification('🌱 Irriga-Tech Live Greenhouse Alert', {
      body: 'External OS alert test successful! You will receive critical alerts outside the app.',
      tag: 'test-alert'
    });
    setNotice(sent ? 'Test notification sent. Check this site’s notification permission if it did not appear.' : 'Could not display a system notification. Check browser permission and HTTPS access.');
  };

  // Fetch real alerts from backend
  useEffect(() => {
    const base = typeof getApiUrl === 'function' ? getApiUrl() : 'http://localhost:3000';
    fetch(`${base}/api/alerts`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : { alerts: [] })
      .then(({ alerts: rows = [] }) => {
        const mapped = rows.map(row => ({
          id: `db-${row.id}`,
          type: ['warning', 'critical'].includes(String(row.type).toLowerCase()) ? 'warning' : 'info',
          icon: row.category === 'battery' ? Battery
              : row.category === 'water'   ? Droplets
              : row.category === 'temp'    ? Thermometer
              : CheckCircle2,
          iconBg: ['warning', 'critical'].includes(String(row.type).toLowerCase()) ? '#fef2f2' : '#ecfdf5',
          iconColor: ['warning', 'critical'].includes(String(row.type).toLowerCase()) ? '#dc2626' : '#059669',
          title: row.title,
          description: row.message,
          time: new Date(row.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
          ts: row.timestamp
        }));
        setDbAlerts(mapped);
      })
      .catch(() => {});
  }, [getApiUrl, authHeaders]);

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

    if (connected) list.push({
      id: 'system-online', type: 'info', icon: CheckCircle2,
      iconBg: '#ecfdf5', iconColor: '#059669', title: 'System Online',
      description: mode === 'demo' ? 'Demo sensor feed is active.' : 'Controller is connected.',
      time: 'Just now', ts: now
    });

    return list.sort((a, b) => b.ts - a.ts);
  }, [temperature, humidity, soilMoisture, waterTank, batterySoc, irrigationLogs, connected, mode]);

  // Merge DB alerts with sensor-derived alerts (deduplicate by id)
  const sourceAlerts = useMemo(() => {
    const map = new Map();
    [...alerts, ...dbAlerts].forEach(a => map.set(a.id, a));
    return Array.from(map.values()).sort((a, b) => b.ts - a.ts);
  }, [alerts, dbAlerts]);

  const allAlerts = useMemo(() => sourceAlerts.filter(alert => !dismissedIds.includes(alert.id)), [sourceAlerts, dismissedIds]);

  // Keep saved/server alert dismissals until the user clears them. Drop a dismissed
  // live condition after it has recovered so it can notify again if it recurs later.
  useEffect(() => {
    const recurringIds = new Set(['battery-low', 'water-low', 'temp-high', 'irrigation-done', 'system-online']);
    const activeIds = new Set(sourceAlerts.map(alert => alert.id));
    setDismissedIds(previous => {
      const next = previous.filter(id => !recurringIds.has(id) || activeIds.has(id));
      if (next.length !== previous.length) localStorage.setItem(dismissedStorageKey, JSON.stringify(next));
      return next;
    });
  }, [sourceAlerts, dismissedStorageKey]);

  const dismissAlert = async (id) => {
    const next = [...new Set([...dismissedIds, id])];
    setDismissedIds(next);
    localStorage.setItem(dismissedStorageKey, JSON.stringify(next));
  };

  const clearAlerts = async () => {
    const next = [...new Set([...dismissedIds, ...sourceAlerts.map(alert => alert.id)])];
    setDismissedIds(next);
    localStorage.setItem(dismissedStorageKey, JSON.stringify(next));
    setNotice('Notifications cleared from this account’s view.');
  };

  const filteredAlerts = activeFilter === 'all' 
    ? allAlerts 
    : allAlerts.filter(a => a.type === (activeFilter === 'warnings' ? 'warning' : 'info'));

  const filterTabs = [
    { id: 'all', label: 'All' },
    { id: 'warnings', label: 'Warnings' },
    { id: 'info', label: 'Info' }
  ];

  const warningCount = allAlerts.filter(a => a.type === 'warning').length;

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
          {allAlerts.length > 0 && <button onClick={clearAlerts} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '.35rem', border: '1px solid #fecaca', borderRadius: 9, padding: '.45rem .7rem', background: '#fff1f2', color: '#be123c', fontWeight: 700, cursor: 'pointer' }}><Trash2 size={14} /> Clear notifications</button>}
        </div>
      </div>
      {notice && <div role="status" style={{ marginBottom: '1rem', padding: '.65rem .85rem', borderRadius: 9, background: '#f1f5f9', color: '#475569', fontSize: '.82rem' }}>{notice}</div>}

      {/* External Desktop / OS Notifications Card */}
      <div style={{
        background: notifPerm === 'granted' ? '#f0fdf4' : '#f8fafc',
        border: notifPerm === 'granted' ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: notifPerm === 'granted' ? '#dcfce7' : '#e2e8f0',
            color: notifPerm === 'granted' ? '#15803d' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Bell size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                Outside-App Desktop Notifications
              </span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                background: notifPerm === 'granted' ? '#dcfce7' : notifPerm === 'denied' ? '#fee2e2' : '#fef3c7',
                color: notifPerm === 'granted' ? '#15803d' : notifPerm === 'denied' ? '#dc2626' : '#d97706'
              }}>
                {notifPerm === 'granted' ? 'Active' : notifPerm === 'denied' ? 'Blocked' : notifPerm === 'unsupported' ? 'Unsupported' : 'Available'}
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              {notifPerm === 'granted'
                ? 'System alerts can appear while this site is open or running in the background. Alerts while the site is fully closed require push notifications, which are not configured.'
                : notifPerm === 'denied'
                  ? 'Notifications are blocked. Allow them in this site’s browser settings to enable OS alerts.'
                  : notifPerm === 'unsupported'
                    ? 'Use a supported browser over HTTPS to enable OS alerts.'
                    : 'Allow notifications to show greenhouse alerts outside this page.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {notifPerm === 'default' && (
            <button
              onClick={handleRequestNotif}
              disabled={isRequestingNotif}
              style={{
                background: '#047857',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 0.95rem',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Bell size={14} /> {isRequestingNotif ? 'Waiting for browser...' : 'Enable OS Alerts'}
            </button>
          )}
          <button
            onClick={handleTestNotif}
            disabled={notifPerm === 'unsupported' || notifPerm === 'denied'}
            style={{
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              padding: '0.55rem 0.95rem',
              borderRadius: '10px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Send Test Alert
          </button>
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
              <button
                type="button"
                onClick={() => dismissAlert(alert.id)}
                aria-label={`Clear ${alert.title} notification`}
                title="Clear notification"
                style={{ border: 0, background: 'transparent', color: '#94a3b8', padding: '.25rem', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
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
