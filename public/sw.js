self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = clientsList.find((client) => 'focus' in client);
    if (existing) return existing.focus();
    if (self.clients.openWindow) return self.clients.openWindow('/');
    return undefined;
  })());
});
