// 离线缓存：有网先取新版（3 秒超时），没网用缓存
const CACHE = 'liangdi-v15';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // 汇率接口、xlsx 库直接走网络
  const key = e.request.mode === 'navigate' ? './index.html' : e.request;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(e.request, { cache: 'no-cache' }).then(r => {
      if (r.ok) cache.put(key, r.clone());
      return r;
    });
    const timeout = new Promise(res => setTimeout(res, 3000));
    try {
      const r = await Promise.race([net, timeout]);
      if (r) return r;
    } catch (err) {}
    const hit = await cache.match(key, { ignoreSearch: true });
    return hit || net;
  })());
});
