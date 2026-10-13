// System-level OS / Browser Notifications outside the application
export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
};

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      sendExternalNotification('🌱 Irriga-Tech Alerts Enabled', {
        body: 'You will now receive real-time greenhouse alerts outside the browser even when minimized.',
        tag: 'irrigatech-welcome'
      });
    }
    return permission;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return 'denied';
  }
};

// Send native notification visible outside the application on Desktop / Mobile OS
export const sendExternalNotification = (title, options = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notif = new Notification(title, {
      body: options.body || '',
      icon: '/assets/site_logo.jpeg',
      badge: '/assets/site_logo.jpeg',
      tag: options.tag || `irrigatech-${Date.now()}`,
      renotify: true,
      requireInteraction: options.critical || false,
      ...options
    });

    notif.onclick = () => {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.warn('Failed to dispatch external notification:', err);
    return null;
  }
};
