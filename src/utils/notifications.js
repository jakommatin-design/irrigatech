// System-level OS / Browser Notifications outside the application
export const isNotificationSupported = () => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  const localDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  return window.isSecureContext || localDevelopment;
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
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
      await sendExternalNotification('🌱 Irriga-Tech Alerts Enabled', {
        body: 'System alerts are enabled while this site is open or running in the background.',
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
export const sendExternalNotification = async (title, options = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const notificationOptions = {
      body: options.body || '',
      icon: '/site_logo.jpeg',
      badge: '/site_logo.jpeg',
      tag: options.tag || `irrigatech-${Date.now()}`,
      renotify: true,
      requireInteraction: options.critical || false,
      ...options
    };

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration('/') || await navigator.serviceWorker.register('/sw.js');
        if (registration?.showNotification) {
          await registration.showNotification(title, notificationOptions);
          return true;
        }
      } catch (err) {
        console.warn('Service worker notification failed; using browser notification fallback:', err);
      }
    }

    const notif = new Notification(title, notificationOptions);

    notif.onclick = () => {
      if (typeof window !== 'undefined') {
        window.focus();
      }
      notif.close();
    };

    return true;
  } catch (err) {
    console.warn('Failed to dispatch external notification:', err);
    return false;
  }
};
