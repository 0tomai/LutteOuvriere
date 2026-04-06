/**
 * Service Worker pour Mes Recettes
 * Mode offline - Cache les ressources statiques
 */

const CACHE_NAME = 'mes-recettes-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/recipes.html',
    '/add.html',
    '/view.html',
    '/styles.css',
    '/app.js',
    '/manifest.json'
];

// Installation - mise en cache des ressources statiques
self.addEventListener('install', (event) => {
    console.log('[SW] Installation du service worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Mise en cache des ressources statiques');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Installation terminée');
                return self.skipWaiting();
            })
    );
});

// Activation - nettoyage des anciens caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation du service worker...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Suppression de l\'ancien cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation terminée');
                return self.clients.claim();
            })
    );
});

// Interception des requêtes fetch
self.addEventListener('fetch', (event) => {
    // Ignorer les requêtes non-GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignorer les requêtes externes (API, etc.)
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // Retourner la version en cache
                    console.log('[SW] Ressource trouvée dans le cache:', event.request.url);
                    return cachedResponse;
                }

                // Sinon, aller chercher sur le réseau
                console.log('[SW] Ressource non trouvée dans le cache, fetch:', event.request.url);
                return fetch(event.request)
                    .then((networkResponse) => {
                        // Vérifier que la réponse est valide
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Cloner la réponse pour la mettre en cache
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[SW] Erreur de fetch:', error);
                        // Retourner une page offline personnalisée si disponible
                        return caches.match('/index.html');
                    });
            })
    );
});

// Message pour forcer la mise à jour du cache
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
