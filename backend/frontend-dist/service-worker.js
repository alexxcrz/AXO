// Service Worker AXO — Push (mensajes, grupos, videollamadas, transporte)

const VIBRATE_MSG = [200, 100, 200, 100, 200];
const VIBRATE_CALL = [500, 200, 500, 200, 500, 200, 500, 200, 500];
const VIBRATE_TRANSPORT = [300, 120, 300, 120, 300];
const ICON = "/android-chrome-192x192.png";
const BADGE = "/android-chrome-192x192.png";

const DEFAULT_MSG_SOUND = "/sounds/notification-alert.wav";
const DEFAULT_CALL_SOUND = "/sounds/notification-call.wav";

let notificationPrefs = {
  msgSoundUrl: DEFAULT_MSG_SOUND,
  callSoundUrl: DEFAULT_CALL_SOUND,
  msgVibrationEnabled: true,
  callVibrationEnabled: true,
  msgVibratePattern: VIBRATE_MSG,
  callVibratePattern: VIBRATE_CALL,
  transportVibratePattern: VIBRATE_TRANSPORT,
};

const TRANSPORT_PUSH_TYPES = new Set([
  "transport_record_created",
  "transport_record_updated",
  "transport_record_deleted",
  "transport_route_assigned",
  "transport_status_updated",
  "transport_record_postponed",
  "transport_record_reactivated",
  "documentacion_record_created",
  "documentacion_record_updated",
  "documentacion_route_assigned",
  "documentacion_status_updated",
  "transport_road_alert",
  "order_inventory_transfer_created",
  "order_inventory_restock_created",
  "order_inventory_item_created",
]);

function resolveSoundUrl(data, kind) {
  if (data?.soundUrl) return data.soundUrl;
  if (kind === "call") return notificationPrefs.callSoundUrl || DEFAULT_CALL_SOUND;
  return notificationPrefs.msgSoundUrl || DEFAULT_MSG_SOUND;
}

function resolveVibratePattern(kind, fallback) {
  if (kind === "call") {
    if (!notificationPrefs.callVibrationEnabled) return [];
    return notificationPrefs.callVibratePattern || fallback;
  }
  if (kind === "transport") {
    return notificationPrefs.transportVibratePattern || fallback;
  }
  if (!notificationPrefs.msgVibrationEnabled) return [];
  return notificationPrefs.msgVibratePattern || fallback;
}

function buildNotificationOptions({ title: _title, body, tag, data, vibrate, soundUrl: _soundUrl, actions, requireInteraction, vibrateKind = "message" }) {
  const pattern = Array.isArray(vibrate) && vibrate.length ? vibrate : resolveVibratePattern(vibrateKind, VIBRATE_MSG);
  const options = {
    body: body || "",
    icon: data?.icon || ICON,
    badge: BADGE,
    tag,
    renotify: true,
    requireInteraction: Boolean(requireInteraction),
    silent: true,
    actions: actions || [],
    data: data || {},
  };
  // Las notificaciones silenciosas no pueden incluir vibrate (Chrome / spec).
  if (pattern.length > 0) {
    options.vibrate = pattern;
    options.silent = false;
  }
  return options;
}

async function broadcastAppSound(soundUrl) {
  const absoluteSound = new URL(soundUrl || DEFAULT_MSG_SOUND, self.location.origin).href;
  const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
  if (!clientList.length) return;
  clientList.forEach((client) => {
    client.postMessage({ type: "PLAY_APP_SOUND", soundUrl: absoluteSound, volume: 1 });
  });
}

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    (async () => {
      if (TRANSPORT_PUSH_TYPES.has(data.type)) {
        await showTransportNotification(data);
        return;
      }
      switch (data.type) {
        case "call_invite":
          await showCallNotification(data);
          break;
        case "message":
          await showMessageNotification(data);
          break;
        case "group_message":
          await showGroupMessageNotification(data);
          break;
        default:
          break;
      }
    })(),
  );
});

async function showTransportNotification(data) {
  const type = String(data.type || "").trim();
  const isOrderInventory = type.startsWith("order_inventory_");
  if (isOrderInventory) {
    const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    if (clientList.some((client) => client.visibilityState === "visible")) {
      return;
    }
  }

  const tag = data.tag || `transport-${type}-${data.recordId || data.notificationId || Date.now()}`;
  const prev = await self.registration.getNotifications({ tag });
  prev.forEach((n) => n.close());

  const soundUrl = data.soundUrl || DEFAULT_MSG_SOUND;
  await self.registration.showNotification(data.title || "Transporte", buildNotificationOptions({
    title: data.title || "Transporte",
    body: data.body || data.message || "",
    tag,
    vibrateKind: "transport",
    soundUrl,
    data: {
      type: data.type,
      url: data.url || "/transport",
      targetPage: data.targetPage || "",
      targetDomain: data.targetDomain || "",
      recordId: data.recordId || "",
      notificationId: data.notificationId || "",
    },
  }));
  await broadcastAppSound(soundUrl);
}

async function showCallNotification(data) {
  const tag = `call-${data.room}`;
  const prev = await self.registration.getNotifications({ tag });
  prev.forEach((n) => n.close());

  const soundUrl = resolveSoundUrl(data, "call");
  await self.registration.showNotification("Videollamada entrante", buildNotificationOptions({
    title: "Videollamada entrante",
    body: `${data.callerName || data.caller || "Alguien"} te está llamando`,
    tag,
    requireInteraction: true,
    vibrateKind: "call",
    soundUrl,
    actions: [
      { action: "accept", title: "Aceptar" },
      { action: "reject", title: "Rechazar" },
    ],
    data: {
      type: "call_invite",
      room: data.room,
      caller: data.caller || data.callerName,
      callerName: data.callerName || data.caller,
      fromNickname: data.callerName || data.caller,
      url: "/",
    },
  }));
  await broadcastAppSound(soundUrl);
}

async function showMessageNotification(data) {
  const from = data.fromNickname || "Mensaje nuevo";
  const tag = `msg-${from}`;
  const prev = await self.registration.getNotifications({ tag });
  prev.forEach((n) => n.close());

  const body = data.text
    ? (data.text.length > 120 ? `${data.text.slice(0, 117)}...` : data.text)
    : "Nuevo mensaje";

  const actions = [
    { action: "open", title: "Abrir chat" },
    { action: "reply", title: "Responder", type: "text", placeholder: "Escribe un mensaje…" },
  ];

  const soundUrl = resolveSoundUrl(data, "message");
  await self.registration.showNotification(from, buildNotificationOptions({
    title: from,
    body,
    tag,
    soundUrl,
    actions,
    data: {
      type: "message",
      fromNickname: from,
      icon: data.senderPhoto || ICON,
      url: "/",
    },
  }));
  await broadcastAppSound(soundUrl);
}

async function showGroupMessageNotification(data) {
  const tag = `group-${data.groupId}`;
  const prev = await self.registration.getNotifications({ tag });
  prev.forEach((n) => n.close());

  const body = data.text
    ? (data.text.length > 120 ? `${data.text.slice(0, 117)}...` : data.text)
    : "Nuevo mensaje en el grupo";

  const soundUrl = resolveSoundUrl(data, "message");
  await self.registration.showNotification(data.groupName || "Grupo", buildNotificationOptions({
    title: data.groupName || "Grupo",
    body: `${data.fromNickname ? `${data.fromNickname}: ` : ""}${body}`,
    tag,
    soundUrl,
    actions: [{ action: "open", title: "Ver grupo" }],
    data: {
      type: "group_message",
      groupId: data.groupId,
      groupName: data.groupName,
      fromNickname: data.fromNickname,
      url: "/",
    },
  }));
  await broadcastAppSound(soundUrl);
}

async function focusClientAndPost(message) {
  const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clientList) {
    if ("focus" in client) {
      await client.focus();
      client.postMessage(message);
      return true;
    }
  }
  if (clients.openWindow) {
    await clients.openWindow(message.data?.url || "/");
  }
  return false;
}

self.addEventListener("notificationclick", (event) => {
  const { notification, action, reply } = event;
  const data = notification?.data || {};

  if (action === "reject" && data.type === "call_invite") {
    notification.close();
    event.waitUntil(
      focusClientAndPost({
        type: "REJECT_CALL",
        data: {
          room: data.room,
          caller: data.caller || data.callerName,
        },
      }),
    );
    return;
  }

  if (action === "reply" && reply && data.type === "message" && data.fromNickname) {
    notification.close();
    event.waitUntil(
      focusClientAndPost({
        type: "PUSH_REPLY",
        data: {
          fromNickname: data.fromNickname,
          text: String(reply).trim(),
        },
      }),
    );
    return;
  }

  notification.close();

  const clickData = { ...data, action: action || "default" };
  event.waitUntil(
    focusClientAndPost({
      type: "NOTIFICATION_CLICK",
      data: clickData,
    }),
  );
});

self.addEventListener("notificationclose", () => {});

self.addEventListener("message", (event) => {
  const msg = event.data || {};

  if (msg.type === "SET_NOTIFICATION_PREFS") {
    notificationPrefs = {
      msgSoundUrl: msg.msgSoundUrl || DEFAULT_MSG_SOUND,
      callSoundUrl: msg.callSoundUrl || DEFAULT_CALL_SOUND,
      msgVibrationEnabled: msg.msgVibrationEnabled !== false,
      callVibrationEnabled: msg.callVibrationEnabled !== false,
      msgVibratePattern: Array.isArray(msg.msgVibratePattern) && msg.msgVibratePattern.length
        ? msg.msgVibratePattern
        : VIBRATE_MSG,
      callVibratePattern: Array.isArray(msg.callVibratePattern) && msg.callVibratePattern.length
        ? msg.callVibratePattern
        : VIBRATE_CALL,
      transportVibratePattern: Array.isArray(msg.transportVibratePattern) && msg.transportVibratePattern.length
        ? msg.transportVibratePattern
        : VIBRATE_TRANSPORT,
    };
    return;
  }

  if (msg.type === "DISMISS_MESSAGE_NOTIFICATIONS") {
    event.waitUntil(
      self.registration.getNotifications().then((notifs) => {
        notifs.forEach((n) => {
          if (n.tag && (n.tag.startsWith("msg-") || n.tag.startsWith("group-"))) n.close();
        });
      }),
    );
    return;
  }

  if (msg.type === "DISMISS_TAG" && msg.tag) {
    event.waitUntil(
      self.registration.getNotifications({ tag: msg.tag }).then((notifs) => {
        notifs.forEach((n) => n.close());
      }),
    );
    return;
  }

  if (msg.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
