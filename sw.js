// Service Worker cơ bản để đáp ứng yêu cầu PWA của Chrome/Android
const CACHE_NAME = 'pm-viettel-cache-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Chỉ cần xử lý fetch event là đủ để Chrome coi đây là App cài đặt được
  // Chiến lược: Network First, fallback to Cache (đơn giản)
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});