(function () {
  window.deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    window.deferredPrompt = event;
    window.dispatchEvent(new Event('app-ready-to-install'));
  });
  window.addEventListener('appinstalled', function () {
    window.deferredPrompt = null;
    window.dispatchEvent(new Event('app-installed'));
  });
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js', {scope: '/', updateViaCache: 'none'}).catch(function () {});
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    window.dispatchEvent(new Event('app-updated'));
  });
})();
