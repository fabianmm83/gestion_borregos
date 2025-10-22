const CACHE_NAME = 'borregos-moreno-v1.4';
const urlsToCache = [
    '/',
    '/index.html',
    './js/app.js',
    './js/animals.js',
    './js/sales.js',
    './js/feeds.js',
    './js/inventory.js',
    './js/purchases.js',
    './js/reports.js',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 🚀 INSTALACIÓN - Forzar activación inmediata
self.addEventListener('install', (event) => {
    console.log('🔄 Service Worker instalando...');
    self.skipWaiting(); // Forzar activación inmediata
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Cache abierto:', CACHE_NAME);
                return cache.addAll(urlsToCache);
            })
    );
});

// 🔥 ACTIVACIÓN - Limpiar caches antiguos
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activado');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Tomar control inmediato de todas las pestañas
            return self.clients.claim();
        })
    );
});

// 🌐 FETCH - Estrategia de cache mejorada
self.addEventListener('fetch', (event) => {
    // Excluir llamadas a la API del cache
    if (event.request.url.includes('/api/') || event.request.url.includes('/auth/')) {
        return fetch(event.request);
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                
                // Clonar la request porque es un stream
                const fetchRequest = event.request.clone();
                
                return fetch(fetchRequest).then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clonar la response porque es un stream
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                });
            })
    );
});

// 📱 Manejar mensajes para actualizaciones
self.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});