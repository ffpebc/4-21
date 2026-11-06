import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker with auto-update and cache busting for fresh deployments
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/') + 'sw.js';
    navigator.serviceWorker
      .register(swUrl, { updateViaCache: 'none' })
      .then((reg) => {
        // Auto check for updates on load and on tab focus
        reg.update().catch(() => {});
        window.addEventListener('focus', () => reg.update().catch(() => {}));

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            window.location.reload();
          }
        });

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });

        const sendWarmAssets = () => {
          const worker = reg.active || reg.waiting || reg.installing;
          if (!worker) return;
          const urls: string[] = ['/'];
          document
            .querySelectorAll<HTMLScriptElement>('script[src]')
            .forEach((s) => s.src && urls.push(s.src));
          document
            .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href], link[rel="modulepreload"][href]')
            .forEach((l) => l.href && urls.push(l.href));
          worker.postMessage({ type: 'WARM_ASSETS', urls });
        };
        if (reg.active) {
          sendWarmAssets();
        } else {
          navigator.serviceWorker.ready.then(sendWarmAssets).catch(() => {});
        }
      })
      .catch(() => {});
  });
}
