// Notificación de Transporte con Sonido y Vibración

import { playAppSoundById } from "../utils/appSoundPlayer.js";
import { getSoundPref } from "../utils/notificationSounds.js";
import { triggerAppVibration } from "../utils/vibrationPrefs.js";

export function initNotificationService() {
  // Solicitar permiso para notificaciones push
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function playNotificationSound() {
  playAppSoundById(getSoundPref(), { kind: "message", volume: 1 });
}

export function triggerVibration(kind = "message") {
  triggerAppVibration(kind);
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
      triggerAppVibration("message", { rhythm: "urgent", intensity: "strong", enabled: true });
    }

    // Mostrar notificación push si tiene permiso (silent: evita tono del sistema)
    if ("Notification" in window && Notification.permission === "granted") {
      const { playAlert: _playAlert, alertMode: _alertMode, ...notificationOptions } = options || {};
      const notification = new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: "transport-notification",
        requireInteraction: true,
        silent: true,
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
