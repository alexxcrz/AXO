// Notificación de Transporte con Sonido y Vibración

export function initNotificationService() {
  // Solicitar permiso para notificaciones push
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function playNotificationSound() {
  try {
    const audio = new Audio("/sounds/notification-alert.wav");
    audio.preload = "auto";
    audio.volume = 1.0;
    audio.play().catch((err) => {
      // Fallback: tono breve por WebAudio si falla el archivo
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) throw new Error("no_audio_context");
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;
        osc.type = "sine";
        osc.frequency.setValueAtTime(900, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.24);
        window.setTimeout(() => {
          ctx.close().catch(() => {});
        }, 320);
      } catch (fallbackErr) {
        console.debug("[notification-sound] play/fallback error:", fallbackErr?.message || err?.message);
      }
    });
  } catch (error) {
    console.debug("[notification-sound] error:", error?.message);
  }
}

export function triggerVibration() {
  try {
    if ("vibrate" in navigator) {
      // Patrón de vibración: [duración ON, duración OFF, duración ON, ...]
      // Vibración fuerte: 200ms ON, 100ms OFF, 200ms ON, 100ms OFF, 200ms ON
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  } catch (error) {
    console.debug("[vibration] error:", error?.message);
  }
}

export function showTransportNotification(title, options = {}) {
  try {
    const explicitAlertMode = String(options?.alertMode || "").trim().toLowerCase();
    const resolvedAlertMode = explicitAlertMode
      || (options?.playAlert === false ? "none" : "sound-vibration");
    const shouldPlaySound = resolvedAlertMode === "sound-vibration" || resolvedAlertMode === "sound-only";
    const shouldVibrate = resolvedAlertMode === "sound-vibration" || resolvedAlertMode === "vibration-only";

    if (shouldPlaySound) {
      playNotificationSound();
    }
    if (shouldVibrate) {
      triggerVibration();
    }

    // Mostrar notificación push si tiene permiso
    if ("Notification" in window && Notification.permission === "granted") {
      const { playAlert: _playAlert, alertMode: _alertMode, ...notificationOptions } = options || {};
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "transport-notification",
        requireInteraction: true, // La notificación requiere acción del usuario
        ...notificationOptions,
      });

      // Al hacer click en la notificación
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClickNavigate) {
          options.onClickNavigate();
        }
      };

      return notification;
    } else {
      // Fallback: mostrar alert si no hay permiso
      console.log(`[Notification] ${title}`);
    }
  } catch (error) {
    console.error("[notification] error:", error?.message);
  }
}

export function showTransportNotificationForNewRecord(record, options = {}) {
  const title = `📦 Nuevo Envío - ${record?.areaId}`;
  const body = `${record?.destination || "Sin destino"} | ${record?.boxes || 0} cajas, ${record?.pieces || 0} piezas`;

  return showTransportNotification(title, {
    body,
    tag: `transport-record-${record?.id}`,
    ...options,
  });
}

export function showTransportNotificationForAssignment(record, driverName, options = {}) {
  const title = "🚗 Ruta Asignada";
  const body = `${driverName} tomó la ruta a ${record?.destination || "sin destino"}`;

  return showTransportNotification(title, {
    body,
    tag: `transport-assigned-${record?.id}`,
    ...options,
  });
}

export function showTransportNotificationForStatusUpdate(record, newStatus, options = {}) {
  const title = `🔄 Estado Actualizado`;
  let statusLabel = newStatus;
  if (newStatus === "En camino") statusLabel = "🚗 En camino";
  if (newStatus === "Entregado") statusLabel = "✅ Entregado";

  const body = `Ruta a ${record?.destination || "sin destino"}: ${statusLabel}`;

  return showTransportNotification(title, {
    body,
    tag: `transport-status-${record?.id}`,
    ...options,
  });
}
