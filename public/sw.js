// KrishiMitra Service Worker - Enhanced for Offline Agriculture Data
const CACHE_VERSION = 'v2';
const CACHE_NAME = `krishimitra-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `krishimitra-data-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API endpoints to cache for offline access
const CACHEABLE_API_PATTERNS = [
  '/v1/schemes',
  '/v1/knowledge',
];

// Offline fallback data for critical features
const OFFLINE_DATA = {
  weather: {
    ok: true,
    _offline: true,
    location: 'Offline Mode',
    current: {
      temp: '--',
      feels_like: '--',
      condition: 'Data unavailable',
      icon: '☁️',
      humidity: '--',
      wind: '--',
    },
    advisory: {
      farming: 'Weather data will be available when online.',
      irrigation: 'Please check weather when connected.',
    },
    alerts: [],
  },
  schemes: {
    ok: true,
    _offline: true,
    results: [
      {
        scheme_id: 'pm-kisan',
        scheme_name: 'PM-KISAN',
        nameHi: 'पीएम-किसान',
        description: '₹6,000 per year direct income support',
        benefits: 'Rs. 6000 per year in 3 installments',
        official_portal: 'pmkisan.gov.in',
      },
      {
        scheme_id: 'pmfby',
        scheme_name: 'PM Fasal Bima Yojana',
        nameHi: 'पीएम फसल बीमा योजना',
        description: 'Crop insurance at nominal premium',
        benefits: 'Insurance coverage for crop loss',
        official_portal: 'pmfby.gov.in',
      },
      {
        scheme_id: 'kcc',
        scheme_name: 'Kisan Credit Card',
        nameHi: 'किसान क्रेडिट कार्ड',
        description: 'Credit up to Rs. 3 lakh at 4% interest',
        benefits: 'Agricultural credit at low interest',
        official_portal: 'Any bank branch',
      },
    ],
  },
  chatbot: {
    ok: true,
    _offline: true,
    response: 'You are currently offline. Here are some helpful tips:\n\n' +
      '🌾 **Wheat Sowing (Oct-Nov)**\n' +
      '• Seed rate: 100 kg/ha\n' +
      '• First irrigation at 21 days\n' +
      '• NPK: 120:60:40 kg/ha\n\n' +
      '📋 **Important Helplines**\n' +
      '• Kisan Call Center: 1800-180-1551\n' +
      '• PM-KISAN: 155261',
  },
  market: {
    ok: true,
    _offline: true,
    results: [
      { commodity: 'wheat', commodityName: 'Wheat', emoji: '🌾', modalPrice: 2150, msp: 2275, state: 'Punjab', mandi: 'Offline Data' },
      { commodity: 'rice', commodityName: 'Rice', emoji: '🍚', modalPrice: 1940, msp: 2300, state: 'Haryana', mandi: 'Offline Data' },
    ],
    message: 'Showing cached prices. Connect to internet for live rates.',
  },
  disease: {
    ok: true,
    _offline: true,
    detected: false,
    message: 'Disease detection requires internet connection.',
  },
};

// Helper function to check if request should be cached
function shouldCacheApiResponse(url) {
  return CACHEABLE_API_PATTERNS.some(pattern => url.includes(pattern));
}

// Helper function to get offline fallback
function getOfflineFallback(url) {
  if (url.includes('/v1/weather')) return OFFLINE_DATA.weather;
  if (url.includes('/v1/schemes')) return OFFLINE_DATA.schemes;
  if (url.includes('/v1/chatbot')) return OFFLINE_DATA.chatbot;
  if (url.includes('/v1/market')) return OFFLINE_DATA.market;
  if (url.includes('/v1/disease')) return OFFLINE_DATA.disease;
  return { error: 'offline', message: 'This feature requires internet connection' };
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    // For POST requests to chatbot, return offline response
    if (request.method === 'POST' && url.pathname.includes('/v1/chatbot')) {
      event.respondWith(
        fetch(request).catch(() => {
          return new Response(
            JSON.stringify(OFFLINE_DATA.chatbot),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
      );
    }
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/v1/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses for offline use
          if (response.ok && shouldCacheApiResponse(url.pathname)) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try to get from cache first
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            console.log('[SW] Returning cached API response for:', url.pathname);
            return cachedResponse;
          }
          
          // Return offline fallback data
          console.log('[SW] Returning offline fallback for:', url.pathname);
          const fallbackData = getOfflineFallback(url.pathname);
          return new Response(
            JSON.stringify(fallbackData),
            { 
              headers: { 
                'Content-Type': 'application/json',
                'X-Offline': 'true',
              } 
            }
          );
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update cache in background (stale-while-revalidate)
        event.waitUntil(
          fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {})
        );
        return cachedResponse;
      }

      // Not in cache, fetch from network
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  // Implement background sync logic here
  console.log('Background sync triggered');
}

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New update from KrishiMitra',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: 'explore', title: 'Open' },
      { action: 'close', title: 'Close' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('KrishiMitra', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('/'));
  }
});
