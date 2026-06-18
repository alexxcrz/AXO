if (import.meta.env.DEV) {
  const suppressReactDevToolsAd = (method) => {
    const original = console[method]?.bind(console);
    if (!original) return;
    console[method] = (...args) => {
      const first = args[0];
      if (typeof first === "string" && first.includes("Download the React DevTools")) return;
      original(...args);
    };
  };
  suppressReactDevToolsAd("log");
  suppressReactDevToolsAd("info");
}

import { bootstrapUiPreferencesFromStorage, bindViewportHeightCssVar } from './app/uiPreferencesBootstrap.js'

bootstrapUiPreferencesFromStorage()
bindViewportHeightCssVar()

import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './app/uiThemeExtensions.css'
import './components/modals.css'
import App from './App.jsx'
import ReunionGuestJoin from './components/ReunionGuestJoin.jsx'
import copmecLogo from './assets/axo-logo.png'
import { syncNotificationPrefsToServiceWorker } from './utils/pushBridge.js'
import { preloadCoreUiWebFonts } from './app/uiPreferencesConfig.js'
import { bindMobileDocumentShell, isStandaloneApp } from './app/mobileAppShell.js'
import './app/mobileShell.css'

export function RootWithSplash() {
  const [showStandaloneSplash, setShowStandaloneSplash] = useState(() => isStandaloneApp());

  useEffect(() => {
    document.documentElement.lang = "es-MX";
    void preloadCoreUiWebFonts();
    return bindMobileDocumentShell();
  }, []);

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
    {(() => {
      const match = window.location.pathname.match(/^\/reunion\/join\/([a-zA-Z0-9]+)\/?$/);
      if (match) return <ReunionGuestJoin token={match[1]} />;
      return <RootWithSplash />;
    })()}
  </StrictMode>,
)

// ─── Registrar Service Worker para notificaciones push ─────────────────────
if ('serviceWorker' in navigator) {
  (async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');

      reg.addEventListener('updatefound', () => {
        const nextWorker = reg.installing;
        if (!nextWorker) return;
        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
            nextWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      await syncNotificationPrefsToServiceWorker();
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

