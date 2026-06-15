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

export function showOrderInventoryTransferNotification(movement, performedByName = "", options = {}) {
  const destination = [movement?.warehouse, movement?.storageLocation]
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .join(" · ") || "destino";
  const title = "📦 Transferencia de insumos para pedidos";
  const body = `${movement?.quantity || 0} ${movement?.unitLabel || "pzas"} de ${movement?.itemName || "insumo"} → ${destination}`;
  const performerSuffix = performedByName ? ` · por ${performedByName}` : "";

  return showTransportNotification(title, {
    body: `${body}${performerSuffix}`,
    tag: `order-inv-transfer-${movement?.id || Date.now()}`,
    alertMode: options?.alertMode || "sound-vibration",
    ...options,
  });
}

export function showOrderInventoryRestockNotification(movement, performedByName = "", options = {}) {
  const location = String(movement?.storageLocation || "").trim();
  const locationSuffix = location ? ` · ${location}` : "";
  const title = "📥 Surtido de insumos para pedidos";
  const body = `+${movement?.quantity || 0} ${movement?.unitLabel || "pzas"} de ${movement?.itemName || "insumo"}${locationSuffix}`;
  const performerSuffix = performedByName ? ` · por ${performedByName}` : "";

  return showTransportNotification(title, {
    body: `${body}${performerSuffix}`,
    tag: `order-inv-restock-${movement?.id || Date.now()}`,
    alertMode: options?.alertMode || "sound-vibration",
    ...options,
  });
}

export function showOrderInventoryItemCreatedNotification(item, performedByName = "", options = {}) {
  const stockUnits = Math.max(0, Number(item?.stockUnits || 0));
  const stockSuffix = stockUnits > 0
    ? ` · stock inicial: ${stockUnits} ${item?.unitLabel || "pzas"}`
    : "";
  const title = "🆕 Nuevo insumo para pedidos";
  const body = `${item?.code || "sin código"} · ${item?.name || "insumo"}${stockSuffix}`;
  const performerSuffix = performedByName ? ` · por ${performedByName}` : "";

  return showTransportNotification(title, {
    body: `${body}${performerSuffix}`,
    tag: `order-inv-item-${item?.id || Date.now()}`,
    alertMode: options?.alertMode || "sound-vibration",
    ...options,
  });
}
