import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/modals.css'
import App from './App.jsx'
import copmecLogo from './assets/axo-logo.png'

function isStandaloneApp() {
  return globalThis.matchMedia?.('(display-mode: standalone)').matches || globalThis.navigator?.standalone === true;
}

function RootWithSplash() {
  const [showStandaloneSplash, setShowStandaloneSplash] = useState(() => isStandaloneApp());

  useEffect(() => {
    const lowEnd = (Number(globalThis.navigator?.hardwareConcurrency || 0) > 0 && Number(globalThis.navigator.hardwareConcurrency) <= 4)
      || (Number(globalThis.navigator?.deviceMemory || 0) > 0 && Number(globalThis.navigator.deviceMemory) <= 4);
    if (!lowEnd) return;
    document.documentElement.classList.add('low-end-device');
    return () => document.documentElement.classList.remove('low-end-device');
  }, []);

  useEffect(() => {
    if (!showStandaloneSplash) return;
    const timer = globalThis.setTimeout(() => setShowStandaloneSplash(false), 1400);
    return () => globalThis.clearTimeout(timer);
  }, [showStandaloneSplash]);

  return (
    <>
      {showStandaloneSplash ? (
        <div className="copmec-standalone-splash" aria-hidden="true">
          <img src={copmecLogo} alt="" className="copmec-standalone-splash-logo" />
        </div>
      ) : null}
      <App />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootWithSplash />
  </StrictMode>,
)

// ─── Registrar Service Worker para notificaciones push ─────────────────────
if ('serviceWorker' in navigator) {
  (async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      // Solicitar permisos de notificación
      if ('Notification' in globalThis && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notificaciones:', permission);
      }
    } catch (err) {
      console.error('Error en ciclo de Service Worker:', err);
    }
  })();
}

