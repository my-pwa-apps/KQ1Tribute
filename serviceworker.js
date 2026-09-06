// Crown Quest: A Fantasy Adventure - Service Worker
// BUMP VERSION on every code change to invalidate the cache.
const VERSION = 'v1.3.1';
const CACHE_NAME = `crownquest-${VERSION}`;

const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './js/palette.js',
    './js/engine.js',
    './js/registry.js',
    './js/art.js',
    './js/actors.js',
    './js/icons.js',
    './js/cutscenes.js',
    './js/rooms/act1.js',
    './js/rooms/act2.js',
    './js/rooms/act3.js',
    './js/game.js',
    './js/sound.js',
    './js/vr.js',
    './js/vendor/three.core.min.js',
    './js/vendor/three.module.min.js',
    './js/content.js',
    './js/register-sw.js',
    './icons/crown-192.svg',
    './icons/crown-512.svg',
    './icons/crown-maskable-512.svg',
    './fonts/vt323-latin-400-normal.woff2'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.filter((k) => k.startsWith('crownquest-') && k !== CACHE_NAME)
                .map((k) => caches.delete(k))
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    const isAppShell = url.origin === self.location.origin &&
        (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));

    event.respondWith(
        (isAppShell ? networkFirst(req) : cacheFirst(req))
    );
});

function cacheResponse(req, res) {
    if (!res || res.status !== 200 || res.type !== 'basic') return;
    const clone = res.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
}

function networkFirst(req) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    return fetch(req, { signal: controller.signal }).then((res) => {
        cacheResponse(req, res);
        return res;
    }).catch(async () => {
        const cached = await caches.match(req) || await caches.match('./index.html');
        return cached || new Response('Crown Quest is unavailable offline until it has been opened once.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }).finally(() => clearTimeout(timeout));
}

function cacheFirst(req) {
    return caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
            cacheResponse(req, res);
            return res;
        }).catch(() => new Response('Asset unavailable offline.', {
            status: 504,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }));
    });
}
