import { getRoadNewsForMexico } from "./transport-news.service.js";
import { getRawWarehouseState, replaceWarehouseState } from "./warehouse.store.js";

const MONITOR_INTERVAL_MS = Number(process.env.TRANSPORT_ROAD_MONITOR_INTERVAL_MS || 7 * 60 * 1000);
const MONITOR_ACTIVE_STATUSES = new Set(["Pendiente", "Asignado", "En camino", "Retorno"]);
const MONITOR_STOP_STATUSES = new Set(["Entregado", "Devuelto", "Cancelado", "Pospuesto"]);

const STOPWORDS = new Set([
  "mexico", "mxico", "mexicana", "mexicano", "estado", "calle", "colonia", "numero", "nmero",
  "interior", "exterior", "cp", "codigo", "cdigo", "san", "santa", "los", "las", "del", "de", "la", "el",
  "y", "en", "con", "por", "sin", "nave", "bodega", "planta",
]);

const INCIDENT_RULES = [
  { kind: "accidente", label: "Accidente", patterns: [/accidente/i, /choque/i, /volcad/i, /atropell/i, /carambola/i] },
  { kind: "bloqueo", label: "Bloqueo / cierre", patterns: [/bloqueo/i, /manifestaci[o]n/i, /cierre vial/i, /carretera cerrada/i, /cerrada/i, /cerrado/i] },
  { kind: "clima", label: "Clima", patterns: [/inundaci[o]n/i, /deslave/i, /lluvia intensa/i, /granizo/i, /neblina/i] },
  { kind: "obra", label: "Obra vial", patterns: [/obra/i, /mantenimiento/i, /reparaci[o]n/i] },
  { kind: "seguridad", label: "Seguridad", patterns: [/asalto/i, /robo/i, /inseguridad/i] },
];

const HIGHWAY_PATTERNS = [
  /\b(m[e]xico|mexico)\s*150\b/i,
  /\b150\s*d?\b/i,
  /\bautopista\b/i,
  /\bcarretera federal\b/i,
  /\bcaseta\b/i,
  /\bcuota\b/i,
  /\blibramiento\b/i,
  /\bperif[e]rico\b/i,
];

function stripAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeToken(value) {
  return stripAccents(String(value || "").toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeText(text, { minLength = 3 } = {}) {
  const normalized = normalizeToken(text);
  if (!normalized) return [];
  const tokens = new Set();
  normalized.split(" ").forEach((part) => {
    if (part.length < minLength || STOPWORDS.has(part)) return;
    tokens.add(part);
  });
  normalized.split(/[,;|/]+/).forEach((chunk) => {
    const piece = normalizeToken(chunk);
    if (piece.length < minLength || STOPWORDS.has(piece)) return;
    tokens.add(piece);
    piece.split(" ").forEach((part) => {
      if (part.length >= minLength && !STOPWORDS.has(part)) tokens.add(part);
    });
  });
  return Array.from(tokens);
}

function getDefaultOriginConfig() {
  const originLabel = String(process.env.TRANSPORT_MONITOR_ORIGIN || "Puebla, Puebla, Mxico").trim();
  return {
    originLabel,
    originTokens: tokenizeText(originLabel, { minLength: 4 }),
  };
}

function resolveAddressForRecord(record, customerAddresses = []) {
  const destination = String(record?.destination || "").trim();
  const areaId = String(record?.areaId || "").trim();
  const normalizedDestination = normalizeToken(destination);

  const match = (Array.isArray(customerAddresses) ? customerAddresses : []).find((entry) => {
    if (String(entry?.areaId || "").trim() !== areaId) return false;
    const candidates = [
      entry?.destination,
      entry?.routeLabel,
      entry?.customerName,
    ].map((value) => normalizeToken(value));
    return candidates.includes(normalizedDestination);
  });

  return {
    destination,
    addressText: String(match?.address || "").trim(),
    routeLabel: String(match?.routeLabel || "").trim(),
    customerName: String(match?.customerName || "").trim(),
  };
}

function buildMonitorSearchProfile(record, customerAddresses = [], originConfig = getDefaultOriginConfig()) {
  const resolved = resolveAddressForRecord(record, customerAddresses);
  const destinationTokens = tokenizeText(resolved.destination, { minLength: 3 });
  const addressTokens = tokenizeText(resolved.addressText, { minLength: 3 });
  const routeTokens = tokenizeText(resolved.routeLabel, { minLength: 3 });
  const corridorTokens = Array.from(new Set([
    ...originConfig.originTokens,
    ...destinationTokens,
    ...addressTokens,
    ...routeTokens,
  ]));

  const regionGuess = pickRegionFromTokens(corridorTokens, resolved.addressText, resolved.destination);
  const highwayHints = extractHighwayHints(`${resolved.addressText} ${resolved.destination} ${resolved.routeLabel}`);

  return {
    destination: resolved.destination,
    addressText: resolved.addressText,
    routeLabel: resolved.routeLabel,
    region: regionGuess,
    corridorTokens,
    highwayHints,
    keyword: [resolved.destination, resolved.routeLabel, highwayHints[0]].filter(Boolean).join(" ").slice(0, 120),
  };
}

function pickRegionFromTokens(tokens, addressText, destination) {
  const haystack = normalizeToken(`${addressText} ${destination} ${tokens.join(" ")}`);
  const regions = [
    "Puebla", "Veracruz", "CDMX", "Estado de Mexico", "Nuevo Leon", "Jalisco",
    "Queretaro", "Guanajuato", "Michoacan", "Chiapas", "Sonora", "Baja California", "Yucatan",
    "Oaxaca", "Tlaxcala", "Hidalgo",
  ];
  for (const region of regions) {
    if (haystack.includes(normalizeToken(region))) return region;
  }
  return "Mxico";
}

function extractHighwayHints(text) {
  const hints = [];
  const source = String(text || "");
  for (const pattern of HIGHWAY_PATTERNS) {
    const match = source.match(pattern);
    if (match) hints.push(normalizeToken(match[0]));
  }
  return Array.from(new Set(hints.filter(Boolean)));
}

function classifyIncident(text) {
  for (const rule of INCIDENT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      return { kind: rule.kind, label: rule.label };
    }
  }
  return { kind: "general", label: "Vialidad" };
}

function scoreNewsAgainstProfile(newsItem, profile) {
  const haystack = normalizeToken(`${newsItem?.title || ""} ${newsItem?.summary || ""}`);
  if (!haystack) return null;

  const incident = classifyIncident(haystack);
  const hasIncident = incident.kind !== "general" || /trafico|trfico|vial|carretera|autopista/i.test(haystack);
  if (!hasIncident) return null;

  const matchedTokens = (profile.corridorTokens || []).filter((token) => {
    if (token.length < 4) return haystack.includes(token);
    return haystack.includes(token);
  });

  const destinationNorm = normalizeToken(profile.destination);
  const destinationInTitle = destinationNorm && haystack.includes(destinationNorm);
  const addressChunks = tokenizeText(profile.addressText, { minLength: 5 });
  const addressHits = addressChunks.filter((token) => haystack.includes(token));

  const highwayHits = (profile.highwayHints || []).filter((hint) => haystack.includes(hint));

  let score = 0;
  if (destinationInTitle) score += 4;
  score += Math.min(4, matchedTokens.length);
  score += Math.min(3, addressHits.length * 1.5);
  score += highwayHits.length >= 1 ? 2 : 0;
  if (incident.kind !== "general") score += 2;

  let confidence = "low";
  if (score >= 7 || (destinationInTitle && incident.kind !== "general")) confidence = "high";
  else if (score >= 4 || matchedTokens.length >= 2) confidence = "medium";
  else if (score >= 2) confidence = "low";
  else return null;

  if (confidence === "low") return null;

  const suggestedAction = buildSuggestedAction(haystack, profile);

  return {
    confidence,
    score,
    incident,
    matchedTokens: Array.from(new Set([...matchedTokens, ...addressHits])).slice(0, 8),
    highwayHits,
    suggestedAction,
  };
}

function buildSuggestedAction(haystack, profile) {
  if (/desv[i]o|alterna|libre por/i.test(haystack)) {
    return "La noticia menciona desvo o va alterna. Confirma en mapas antes de salir.";
  }
  if ((profile.highwayHints || []).length) {
    return `Revisa trfico en ${profile.highwayHints.join(", ")} y considera ruta alterna desde ${profile.region || "origen"}.`;
  }
  return `Verifica ruta hacia ${profile.destination || "destino"} en mapas; podra haber afectacin vial.`;
}

export function normalizeRoadMonitorEntry(raw = {}, record = null, customerAddresses = []) {
  const recordId = String(raw?.recordId || record?.id || "").trim();
  if (!recordId) return null;

  const profile = raw?.searchProfile && typeof raw.searchProfile === "object"
    ? raw.searchProfile
    : buildMonitorSearchProfile(record || raw, customerAddresses);

  return {
    recordId,
    shipmentCode: String(raw?.shipmentCode || record?.shipmentCode || "").trim(),
    destination: String(raw?.destination || record?.destination || profile.destination || "").trim(),
    areaId: String(raw?.areaId || record?.areaId || "").trim(),
    status: String(raw?.status || record?.status || "Pendiente").trim(),
    monitoring: raw?.monitoring !== false,
    startedAt: String(raw?.startedAt || new Date().toISOString()).trim(),
    lastCheckedAt: String(raw?.lastCheckedAt || "").trim() || null,
    searchProfile: profile,
    alerts: Array.isArray(raw?.alerts) ? raw.alerts.slice(0, 30) : [],
    notifiedFingerprints: Array.isArray(raw?.notifiedFingerprints)
      ? raw.notifiedFingerprints.slice(-80)
      : [],
  };
}

export function buildRoadMonitorFromRecord(record, customerAddresses = []) {
  const profile = buildMonitorSearchProfile(record, customerAddresses);
  return normalizeRoadMonitorEntry({
    recordId: record.id,
    shipmentCode: record.shipmentCode,
    destination: record.destination,
    areaId: record.areaId,
    status: record.status,
    monitoring: true,
    startedAt: new Date().toISOString(),
    searchProfile: profile,
    alerts: [],
    notifiedFingerprints: [],
  }, record, customerAddresses);
}

export function shouldMonitorTransportStatus(status) {
  const normalized = String(status || "").trim();
  if (MONITOR_STOP_STATUSES.has(normalized)) return false;
  return MONITOR_ACTIVE_STATUSES.has(normalized);
}

export function syncTransportRoadMonitors(transport = {}) {
  const customerAddresses = Array.isArray(transport.customerAddresses) ? transport.customerAddresses : [];
  const existing = transport.roadMonitors && typeof transport.roadMonitors === "object"
    ? transport.roadMonitors
    : {};
  const activeRecords = Array.isArray(transport.activeRecords) ? transport.activeRecords : [];
  const next = { ...existing };

  for (const record of activeRecords) {
    if (!record?.id) continue;
    if (!shouldMonitorTransportStatus(record.status)) {
      if (next[record.id]) {
        next[record.id] = normalizeRoadMonitorEntry({
          ...next[record.id],
          monitoring: false,
          status: record.status,
        }, record, customerAddresses);
      }
      continue;
    }

    if (!next[record.id]) {
      next[record.id] = buildRoadMonitorFromRecord(record, customerAddresses);
    } else {
      next[record.id] = normalizeRoadMonitorEntry({
        ...next[record.id],
        monitoring: true,
        status: record.status,
        shipmentCode: record.shipmentCode,
        destination: record.destination,
        areaId: record.areaId,
      }, record, customerAddresses);
    }
  }

  for (const recordId of Object.keys(next)) {
    const stillActive = activeRecords.some((entry) => entry.id === recordId);
    if (!stillActive) delete next[recordId];
  }

  return next;
}

function buildAlertFingerprint(newsItem, recordId) {
  return `${recordId}::${String(newsItem?.link || newsItem?.title || "").trim().toLowerCase()}`;
}

async function fetchNewsBundleForProfile(profile) {
  const uniqueTopics = ["general", "bloqueos", "accidentes"];
  const items = [];
  const region = profile.region || "Mxico";

  for (const topic of uniqueTopics) {
    try {
      const result = await getRoadNewsForMexico({
        topic,
        region,
        q: profile.keyword || profile.destination || "",
        hours: 12,
        limit: 15,
      });
      items.push(...(result?.items || []));
    } catch {
      // continue with other topics
    }
  }

  const seen = new Set();
  return items.filter((item) => {
    const key = String(item?.link || item?.title || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function dispatchRoadAlertNotification(monitor, alert) {
  const shipment = monitor.shipmentCode || monitor.destination || "Envo";
  const title = `Alerta vial  ${shipment}`;
  const message = `${alert.incidentLabel}: ${alert.title}`;
  const meta = `${alert.confidence === "high" ? "Alta" : "Media"} confianza  ${alert.destination}`;

  const { publishTransportNotification } = await import("./warehouse.store.js");
  publishTransportNotification({
    type: "transport_road_alert",
    title,
    message,
    meta,
    tone: alert.incidentKind === "accidente" || alert.incidentKind === "bloqueo" ? "danger" : "warning",
    alertMode: "sound-vibration",
    targetPage: "transport",
    recordId: monitor.recordId,
  });
}

export async function runTransportRoadMonitorTick() {
  const state = getRawWarehouseState();
  const transport = state?.transport || {};
  const customerAddresses = Array.isArray(transport.customerAddresses) ? transport.customerAddresses : [];
  let roadMonitors = syncTransportRoadMonitors(transport);
  const monitors = Object.values(roadMonitors).filter((entry) => entry?.monitoring);
  if (!monitors.length) {
    if (JSON.stringify(roadMonitors) !== JSON.stringify(transport.roadMonitors || {})) {
      replaceWarehouseState({
        ...state,
        transport: { ...transport, roadMonitors },
      });
    }
    return { checked: 0, newAlerts: 0 };
  }

  const nowIso = new Date().toISOString();
  let newAlerts = 0;

  for (const monitor of monitors) {
    const profile = monitor.searchProfile || buildMonitorSearchProfile(monitor, customerAddresses);
    let newsItems = [];
    try {
      newsItems = await fetchNewsBundleForProfile(profile);
    } catch {
      monitor.lastCheckedAt = nowIso;
      roadMonitors[monitor.recordId] = monitor;
      continue;
    }

    const notified = new Set(Array.isArray(monitor.notifiedFingerprints) ? monitor.notifiedFingerprints : []);
    const alerts = Array.isArray(monitor.alerts) ? [...monitor.alerts] : [];

    for (const newsItem of newsItems) {
      const scored = scoreNewsAgainstProfile(newsItem, profile);
      if (!scored) continue;

      const fingerprint = buildAlertFingerprint(newsItem, monitor.recordId);
      if (notified.has(fingerprint)) continue;

      const alert = {
        id: `ra-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: newsItem.title,
        summary: newsItem.summary,
        link: newsItem.link,
        source: newsItem.source,
        publishedAt: newsItem.publishedAt,
        incidentKind: scored.incident.kind,
        incidentLabel: scored.incident.label,
        confidence: scored.confidence,
        score: scored.score,
        matchedTokens: scored.matchedTokens,
        suggestedAction: scored.suggestedAction,
        detectedAt: nowIso,
      };

      alerts.unshift(alert);
      notified.add(fingerprint);
      newAlerts += 1;
      await dispatchRoadAlertNotification(monitor, alert);
    }

    monitor.alerts = alerts.slice(0, 20);
    monitor.notifiedFingerprints = Array.from(notified).slice(-80);
    monitor.lastCheckedAt = nowIso;
    roadMonitors[monitor.recordId] = monitor;
  }

  replaceWarehouseState({
    ...state,
    transport: {
      ...transport,
      roadMonitors,
      roadMonitorConfig: {
        ...(transport.roadMonitorConfig || {}),
        ...getDefaultOriginConfig(),
        pollIntervalMinutes: Math.round(MONITOR_INTERVAL_MS / 60000),
        lastTickAt: nowIso,
      },
    },
  });

  if (newAlerts > 0) {
    try {
      const { getIO } = await import("../config/socket.js");
      getIO().emit("transport_road_alert", {
        ts: Date.now(),
        newAlerts,
        checked: monitors.length,
      });
    } catch {
      // socket opcional
    }
  }

  return { checked: monitors.length, newAlerts };
}

export function attachRoadMonitorToTransportState(transport, record, { stop = false } = {}) {
  const customerAddresses = Array.isArray(transport?.customerAddresses) ? transport.customerAddresses : [];
  const roadMonitors = { ...(transport?.roadMonitors || {}) };
  const recordId = String(record?.id || "").trim();
  if (!recordId) return transport;

  if (stop || !shouldMonitorTransportStatus(record.status)) {
    if (roadMonitors[recordId]) {
      roadMonitors[recordId] = normalizeRoadMonitorEntry({
        ...roadMonitors[recordId],
        monitoring: false,
        status: record.status,
      }, record, customerAddresses);
    }
    return { ...transport, roadMonitors };
  }

  roadMonitors[recordId] = buildRoadMonitorFromRecord(record, customerAddresses);
  return {
    ...transport,
    roadMonitors,
    roadMonitorConfig: {
      ...(transport.roadMonitorConfig || {}),
      ...getDefaultOriginConfig(),
      pollIntervalMinutes: Math.round(MONITOR_INTERVAL_MS / 60000),
    },
  };
}

export { MONITOR_INTERVAL_MS };
