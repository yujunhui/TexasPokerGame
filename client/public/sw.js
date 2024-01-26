self.addEventListener('install', function(event) {
  // 在安装事件中什么也不做
});

self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});
