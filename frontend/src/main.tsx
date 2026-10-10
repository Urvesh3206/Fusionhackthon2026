import React from 'react';
import ReactDOM from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/common/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Intelligent Service Worker Lifecycle Management
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // In Production: Register Service Worker for offline PWA operations
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[ResQGrid PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[ResQGrid PWA] Service Worker registration failed:', err);
        });
    });
  } else {
    // In Development (Vite Dev Server):
    // Stale module caching by service workers causes "Blank Screen" errors due to HMR/chunk mismatch.
    // Ensure development requests always hit the live Vite server directly.
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          // If a stale SW was previously registered, unregister it in dev mode
          reg.unregister().then(() => {
            console.log('[ResQGrid Dev] Unregistered dev-interfering SW:', reg.scope);
          });
        }
      });
    });
  }
}

