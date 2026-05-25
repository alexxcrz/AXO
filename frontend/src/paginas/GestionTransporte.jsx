import { useEffect, useMemo, useRef, useState } from "react";
import { uploadFileToCloudinary } from "../services/upload.service";
import { ExternalLink, FileText, MapPin, Plus, RefreshCw } from "lucide-react";
import { TransportAssignmentsTab, TransportMyRoutesTab, TransportPostponedTab } from "./TransportTabs";
import DashboardDateRangePicker from "../components/DashboardDateRangePicker";
import { SpanishDateInput } from "../components/SpanishDateInput";

function toPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function inferCalendarGroupingFromRange(startDateKey, endDateKey) {
  const startMs = parseDateKeyToMs(startDateKey);
  const endMs = parseDateKeyToMs(endDateKey);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return "mes";

  const minMs = Math.min(startMs, endMs);
  const maxMs = Math.max(startMs, endMs);
  const days = Math.floor((maxMs - minMs) / 86400000) + 1;
  if (days <= 7) return "semana";
  return "mes";
}

function extractDateKey(record, fallbackDateKey = "") {
  const fromRecord = String(record?.dateKey || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromRecord)) return fromRecord;
  const fromCreatedAt = String(record?.createdAt || "").trim();
  if (fromCreatedAt.length >= 10) {
    const key = fromCreatedAt.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  }
  return String(fallbackDateKey || "").trim();
}

function resolveDateMs(value) {
  const ms = Date.parse(value || "");
  return Number.isFinite(ms) ? ms : null;
}

function isPostponedReady(record, nowMs = Date.now()) {
  if (String(record?.status || "").trim() !== "Pospuesto") return false;
  const postponedUntilMs = resolveDateMs(record?.postponedUntil || record?.updatedAt);
  if (postponedUntilMs === null) return true;
  return postponedUntilMs <= nowMs;
}

function getWeekBucketsForMonth(monthKey) {
  const [yearRaw, monthRaw] = String(monthKey || "").split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return [];

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const buckets = [];
  for (let start = 1; start <= daysInMonth; start += 7) {
    const end = Math.min(start + 6, daysInMonth);
    buckets.push({
      start,
      end,
      label: `Semana ${buckets.length + 1} (${start}-${end})`,
    });
  }
  return buckets;
}

function parseDateKeyToMs(dateKey) {
  const normalized = String(dateKey || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const ms = Date.parse(`${normalized}T12:00:00`);
  return Number.isFinite(ms) ? ms : null;
}

function toDateKeyFromDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthBuckets(monthKeys = []) {
  return monthKeys.map((monthKey) => {
    const [yearRaw, monthRaw] = String(monthKey || "").split("-");
    const year = Number(yearRaw);
    const monthIndex = Number(monthRaw) - 1;
    if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
      return null;
    }

    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0);
    const startMs = parseDateKeyToMs(toDateKeyFromDate(startDate));
    const endMs = parseDateKeyToMs(toDateKeyFromDate(endDate));
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;

    return {
      key: monthKey,
      label: monthKey,
      shortLabel: `${String(monthIndex + 1).padStart(2, "0")}/${String(year).slice(-2)}`,
      startMs,
      endMs,
    };
  }).filter(Boolean);
}

function getConsolidatedRangeModel({
  rangeType,
  selectedDateKey,
  selectedDateFrom,
  selectedDateTo,
  selectedCalendarGrouping,
  selectedMonth,
  selectedYear,
  selectedMonthSpan,
  principalMonthOptions,
}) {
  const normalizedRangeType = String(rangeType || "mes").trim();
  const todayKey = toDateKeyFromDate(new Date());
  const safeDateKey = /^\d{4}-\d{2}-\d{2}$/.test(String(selectedDateKey || "")) ? String(selectedDateKey || "") : todayKey;
  const safeDateMs = parseDateKeyToMs(safeDateKey) || parseDateKeyToMs(todayKey) || Date.now();
  const safeDate = new Date(safeDateMs);

  const monthCandidates = Array.isArray(principalMonthOptions) ? principalMonthOptions : [];
  const monthFallback = monthCandidates[0] || `${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, "0")}`;
  const safeMonth = String(selectedMonth || monthFallback);

  const yearFallback = Number(String(safeMonth).slice(0, 4)) || safeDate.getFullYear();
  const safeYear = Number(selectedYear) || yearFallback;
  const safeSpan = Math.max(2, Math.min(12, Number(selectedMonthSpan) || 3));
  const safeDateFrom = /^\d{4}-\d{2}-\d{2}$/.test(String(selectedDateFrom || "")) ? String(selectedDateFrom || "") : safeDateKey;
  const safeDateTo = /^\d{4}-\d{2}-\d{2}$/.test(String(selectedDateTo || "")) ? String(selectedDateTo || "") : safeDateKey;
  const safeCalendarGrouping = ["semana", "mes", "anio"].includes(String(selectedCalendarGrouping || ""))
    ? String(selectedCalendarGrouping)
    : "mes";

  const toBucket = (key, label, shortLabel, startKey, endKey) => {
    const startMs = parseDateKeyToMs(startKey);
    const endMs = parseDateKeyToMs(endKey);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
    return { key, label, shortLabel, startMs, endMs };
  };

  if (normalizedRangeType === "dia") {
    const bucket = toBucket(safeDateKey, safeDateKey, "Día", safeDateKey, safeDateKey);
    return {
      rangeType: normalizedRangeType,
      rangeLabel: `Día ${safeDateKey}`,
      unitLabel: "día",
      buckets: bucket ? [bucket] : [],
    };
  }

  if (normalizedRangeType === "dias") {
    const fromMsRaw = parseDateKeyToMs(safeDateFrom);
    const toMsRaw = parseDateKeyToMs(safeDateTo);
    const startMs = Math.min(Number(fromMsRaw || 0), Number(toMsRaw || 0));
    const endMs = Math.max(Number(fromMsRaw || 0), Number(toMsRaw || 0));
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs <= 0 || endMs <= 0) {
      return {
        rangeType: normalizedRangeType,
        rangeLabel: "Rango de días",
        unitLabel: safeCalendarGrouping === "semana" ? "día" : safeCalendarGrouping === "anio" ? "mes" : "semana",
        buckets: [],
      };
    }

    const startDate = new Date(startMs);
    const endDate = new Date(endMs);
    const buckets = [];

    if (safeCalendarGrouping === "semana") {
      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const dateKey = toDateKeyFromDate(cursor);
        const dayToken = dateKey.slice(8, 10);
        const monthToken = dateKey.slice(5, 7);
        const bucket = toBucket(`dia-${dateKey}`, dateKey, `${dayToken}/${monthToken}`, dateKey, dateKey);
        if (bucket) buckets.push(bucket);
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (safeCalendarGrouping === "anio") {
      const monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const monthLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      while (monthCursor <= monthLimit) {
        const year = monthCursor.getFullYear();
        const month = monthCursor.getMonth();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const rangeStart = monthStart < startDate ? startDate : monthStart;
        const rangeEnd = monthEnd > endDate ? endDate : monthEnd;

        const startKey = toDateKeyFromDate(rangeStart);
        const endKey = toDateKeyFromDate(rangeEnd);
        const mm = String(month + 1).padStart(2, "0");
        const yy = String(year).slice(-2);
        const bucket = toBucket(`mes-${year}-${mm}`, `${year}-${mm}`, `${mm}/${yy}`, startKey, endKey);
        if (bucket) buckets.push(bucket);
        monthCursor.setMonth(monthCursor.getMonth() + 1);
      }
    } else {
      const cursor = new Date(startDate);
      let bucketIndex = 1;
      while (cursor <= endDate) {
        const bucketStart = new Date(cursor);
        const bucketEnd = new Date(cursor);
        bucketEnd.setDate(bucketEnd.getDate() + 6);
        if (bucketEnd > endDate) {
          bucketEnd.setTime(endDate.getTime());
        }

        const startKey = toDateKeyFromDate(bucketStart);
        const endKey = toDateKeyFromDate(bucketEnd);
        const startDay = String(bucketStart.getDate()).padStart(2, "0");
        const endDay = String(bucketEnd.getDate()).padStart(2, "0");
        const startMonth = String(bucketStart.getMonth() + 1).padStart(2, "0");
        const endMonth = String(bucketEnd.getMonth() + 1).padStart(2, "0");

        const label = `${startKey} a ${endKey}`;
        const shortLabel = startMonth === endMonth
          ? `Sem ${bucketIndex} (${startDay}-${endDay}/${startMonth})`
          : `Sem ${bucketIndex} (${startDay}/${startMonth}-${endDay}/${endMonth})`;

        const bucket = toBucket(`sem-rango-${bucketIndex}`, label, shortLabel, startKey, endKey);
        if (bucket) buckets.push(bucket);
        cursor.setDate(cursor.getDate() + 7);
        bucketIndex += 1;
      }
    }

    const groupingLabel = safeCalendarGrouping === "semana" ? "días" : safeCalendarGrouping === "anio" ? "meses" : "semanas";

    return {
      rangeType: normalizedRangeType,
      rangeLabel: buckets.length ? `Rango ${safeDateFrom} a ${safeDateTo} (${buckets.length} ${groupingLabel})` : "Rango de días",
      unitLabel: safeCalendarGrouping === "semana" ? "día" : safeCalendarGrouping === "anio" ? "mes" : "semana",
      buckets,
    };
  }

  if (normalizedRangeType === "semana") {
    const weekStart = new Date(safeDateMs);
    const weekDay = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - weekDay);

    const buckets = [];
    for (let index = 0; index < 7; index += 1) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + index);
      const key = toDateKeyFromDate(dayDate);
      const dayToken = key.slice(8, 10);
      const monthToken = key.slice(5, 7);
      const bucket = toBucket(key, key, `${dayToken}/${monthToken}`, key, key);
      if (bucket) buckets.push(bucket);
    }

    return {
      rangeType: normalizedRangeType,
      rangeLabel: buckets.length ? `Semana ${buckets[0].label} a ${buckets.at(-1)?.label || buckets[0].label}` : "Semana",
      unitLabel: "día",
      buckets,
    };
  }

  if (normalizedRangeType === "quincena") {
    const year = safeDate.getFullYear();
    const monthIndex = safeDate.getMonth();
    const day = safeDate.getDate();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const segmentStart = day <= 15 ? 1 : 16;
    const segmentEnd = day <= 15 ? 15 : daysInMonth;
    const buckets = [];

    for (let start = segmentStart; start <= segmentEnd; start += 7) {
      const end = Math.min(start + 6, segmentEnd);
      const startKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(start).padStart(2, "0")}`;
      const endKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(end).padStart(2, "0")}`;
      const key = `${startKey}:${endKey}`;
      const bucket = toBucket(key, `${start}-${end}`, `${start}-${end}`, startKey, endKey);
      if (bucket) buckets.push(bucket);
    }

    return {
      rangeType: normalizedRangeType,
      rangeLabel: `Quincena ${segmentStart}-${segmentEnd} de ${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      unitLabel: "bloque",
      buckets,
    };
  }

  if (normalizedRangeType === "mes") {
    const weeks = getWeekBucketsForMonth(safeMonth);
    const [yearRaw, monthRaw] = String(safeMonth || "").split("-");
    const year = Number(yearRaw);
    const monthToken = String(monthRaw || "").padStart(2, "0");
    const buckets = weeks.map((week, index) => {
      const startKey = `${year}-${monthToken}-${String(week.start).padStart(2, "0")}`;
      const endKey = `${year}-${monthToken}-${String(week.end).padStart(2, "0")}`;
      return toBucket(`sem-${index + 1}`, week.label, `Sem ${index + 1}`, startKey, endKey);
    }).filter(Boolean);

    return {
      rangeType: normalizedRangeType,
      rangeLabel: `Mes ${safeMonth}`,
      unitLabel: "semana",
      buckets,
    };
  }

  if (normalizedRangeType === "meses") {
    const selectedMonthIndex = monthCandidates.indexOf(safeMonth);
    let monthWindow;
    if (selectedMonthIndex >= 0) {
      monthWindow = monthCandidates.slice(selectedMonthIndex, selectedMonthIndex + safeSpan).reverse();
    } else {
      monthWindow = [safeMonth];
    }
    const buckets = buildMonthBuckets(monthWindow);
    const fromLabel = buckets[0]?.label || safeMonth;
    const toLabel = buckets.at(-1)?.label || safeMonth;

    return {
      rangeType: normalizedRangeType,
      rangeLabel: `${buckets.length} meses (${fromLabel} a ${toLabel})`,
      unitLabel: "mes",
      buckets,
    };
  }

  const yearMonthKeys = Array.from({ length: 12 }, (_, monthIndex) => (
    `${safeYear}-${String(monthIndex + 1).padStart(2, "0")}`
  ));

  return {
    rangeType: "anio",
    rangeLabel: `Año ${safeYear}`,
    unitLabel: "mes",
    buckets: buildMonthBuckets(yearMonthKeys),
  };
}

function isImageEvidence(evidence) {
  const type = String(evidence?.type || "").toLowerCase();
  return type.startsWith("image");
}

function isVideoEvidence(evidence) {
  const type = String(evidence?.type || "").toLowerCase();
  return type.startsWith("video");
}

function createTransportModalState(areaId = "") {
  return {
    open: false,
    mode: "create",
    recordId: "",
    areaId,
    destination: "",
    boxes: "",
    pieces: "",
    notes: "",
    evidence: null,
    isScheduled: false,
    scheduledDate: "",
    scheduledTime: "",
    remindBeforeMinutes: "60",
  };
}

function createDocModalState() {
  return {
    open: false,
    mode: "create",
    recordId: "",
    ubicacion: "SONATA",
    area: "",
    dirigidoA: "",
    notas: "",
    evidence: null,
  };
}

function createPostponeModalState() {
  return {
    open: false,
    recordId: "",
    destination: "",
    postponedDate: "",
    postponedTime: "",
    remindBeforeMinutes: "60",
  };
}

function createDeleteTransportModalState() {
  return {
    open: false,
    recordId: "",
    destination: "",
    submitting: false,
    error: "",
  };
}

function createTransportLogisticsAddressDraft() {
  return {
    destination: "",
    customerName: "",
    address: "",
    contactName: "",
    phone: "",
    areaId: "",
    serviceType: "otro",
    notes: "",
  };
}

const TRANSPORT_SERVICE_TYPE_OPTIONS = [
  { value: "local", label: "Local" },
  { value: "foraneo", label: "Foráneo" },
  { value: "paqueteria", label: "Paquetería" },
  { value: "traslado", label: "Traslado" },
  { value: "otro", label: "Otro" },
];

const TRANSPORT_ROAD_NEWS_TOPIC_OPTIONS = [
  { value: "general", label: "General" },
  { value: "accidentes", label: "Accidentes" },
  { value: "bloqueos", label: "Bloqueos y cierres" },
  { value: "clima", label: "Clima" },
  { value: "seguridad", label: "Seguridad" },
  { value: "obras", label: "Obras y mantenimiento" },
];

const TRANSPORT_ROAD_NEWS_REGION_OPTIONS = [
  "México",
  "Nacional",
  "CDMX",
  "Estado de México",
  "Puebla",
  "Veracruz",
  "Nuevo León",
  "Jalisco",
  "Querétaro",
  "Guanajuato",
  "Michoacán",
  "Chiapas",
  "Sonora",
  "Baja California",
  "Yucatán",
];

function createRoadNewsFiltersDraft() {
  return {
    topic: "general",
    region: "México",
    q: "",
    hours: "24",
    limit: "20",
  };
}

function inferServiceTypeByArea(areaId) {
  const id = String(areaId || "").trim();
  if (id === "locales") return "local";
  if (id === "foraneas") return "foraneo";
  if (id === "pedidos") return "paqueteria";
  if (id === "inventarioTraslados") return "traslado";
  return "otro";
}

function normalizeServiceType(serviceType, fallback = "otro") {
  const value = String(serviceType || "").trim().toLowerCase();
  return TRANSPORT_SERVICE_TYPE_OPTIONS.some((entry) => entry.value === value) ? value : fallback;
}

function getDestinationMissingFields(entry = {}) {
  const missing = [];
  if (!String(entry?.customerName || "").trim()) missing.push("cliente");
  if (!String(entry?.address || "").trim()) missing.push("dirección");
  if (!String(entry?.contactName || "").trim()) missing.push("contacto");
  if (!String(entry?.phone || "").trim()) missing.push("teléfono");
  return missing;
}

function buildAddressNavigationHref(addressEntry = {}) {
  const query = String(addressEntry?.address || addressEntry?.destination || "").trim();
  if (!query) return "";
  return `geo:0,0?q=${encodeURIComponent(query)}`;
}

const TRANSPORT_ROAD_NEWS_ALERT_STYLES = {
  accidente: { chipClass: "danger", label: "Accidentes" },
  bloqueo: { chipClass: "warning", label: "Bloqueos" },
  clima: { chipClass: "", label: "Clima" },
  obra: { chipClass: "", label: "Obras" },
  seguridad: { chipClass: "warning", label: "Seguridad" },
  general: { chipClass: "", label: "General" },
};

function TransportAddressNavigateButton({ address }) {
  const href = buildAddressNavigationHref(address);
  const fullAddress = String(address?.address || address?.destination || "").trim();

  if (!href) {
    return <span className="subtle-line">-</span>;
  }

  return (
    <a
      href={href}
      className="transport-map-button"
      title={fullAddress || "Abrir ubicación en mapas"}
      aria-label={fullAddress ? `Abrir en mapas: ${fullAddress}` : "Abrir en mapas"}
    >
      <MapPin size={15} aria-hidden="true" />
      <span>Mapa</span>
    </a>
  );
}

function formatRoadNewsRelativeTime(value) {
  const ms = Date.parse(value || "");
  if (!Number.isFinite(ms)) return "";
  const diffMinutes = Math.round((Date.now() - ms) / 60000);
  if (diffMinutes < 1) return "Hace un momento";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) return `Hace ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `Hace ${diffDays} d`;
}

function createTransportLogisticsExpenseDraft() {
  return {
    dateKey: new Date().toISOString().slice(0, 10),
    expenseType: "combustible",
    amount: "",
    description: "",
    areaId: "",
    routeLabel: "",
    reference: "",
  };
}

function createTransportUnitDraft() {
  return {
    unitName: "",
    unitCode: "",
    plate: "",
    model: "",
    areaId: "",
    notes: "",
    photo: null,
  };
}

function createTransportUnitServiceDraft() {
  return {
    unitId: "",
    dateKey: new Date().toISOString().slice(0, 10),
    serviceLabel: "",
    kmBefore: "",
    kmAfter: "",
    notes: "",
  };
}

const TRANSPORT_CHECKLIST_STRUCTURE = [
  {
    section: "Sistema de luces",
    items: [
      { key: "luzDelanteraDerecha", label: "Luz delantera derecha" },
      { key: "luzDelanteraIzquierda", label: "Luz delantera izquierda" },
      { key: "luzTraseraDerecha", label: "Luz trasera derecha" },
      { key: "luzTraseraIzquierda", label: "Luz trasera izquierda" },
      { key: "luzPlaca", label: "Luz de placa" },
      { key: "lucesEmergencia", label: "Luces de emergencia" },
      { key: "cuartos", label: "Cuartos" },
      { key: "direccionalDelantera", label: "Luz direccional delantera" },
      { key: "direccionalTrasera", label: "Luz direccional trasera" },
      { key: "luzInteriorCaja", label: "Luz interior de caja" },
    ],
  },
  {
    section: "Parte externa",
    items: [
      { key: "limpiaParabrisas", label: "Limpia parabrisas" },
      { key: "espejosRetrovisores", label: "Espejos retrovisores" },
      { key: "parabrisas", label: "Parabrisas" },
      { key: "defensasLaterales", label: "Defensas laterales" },
      { key: "cajaExterior", label: "Caja" },
      { key: "rampa", label: "Rampa" },
      { key: "camaraReversa", label: "Cámara de reversa" },
    ],
  },
  {
    section: "Parte interna",
    items: [
      { key: "estadoTablero", label: "Estado del tablero / indicadores operativos" },
      { key: "velocimetroTacometro", label: "Velocímetro y tacómetro" },
      { key: "frenoServicio", label: "Freno de servicio" },
      { key: "frenoEmergencia", label: "Freno de estacionamiento" },
      { key: "cinturonCopiloto", label: "Cinturón de seguridad copiloto" },
      { key: "cinturonConductor", label: "Cinturón de seguridad conductor" },
      { key: "ordenCabinaCaja", label: "Orden y limpieza de cabina y caja" },
      { key: "claxon", label: "Claxon" },
    ],
  },
  {
    section: "Estado de llantas",
    items: [
      { key: "llantaDelanteraDerecha", label: "Llanta delantera derecha" },
      { key: "llantaDelanteraIzquierda", label: "Llanta delantera izquierda" },
      { key: "llantaTraseraDerecha", label: "Llanta trasera derecha" },
      { key: "llantaTraseraIzquierda", label: "Llanta trasera izquierda" },
      { key: "llantaRefaccion", label: "Llanta de refacción" },
    ],
  },
  {
    section: "Accesorios de seguridad",
    items: [
      { key: "trianguloSeguridad", label: "Triángulo de seguridad" },
      { key: "extintor", label: "Extintor" },
      { key: "alarmaRetroceso", label: "Alarma de retroceso" },
      { key: "alarmaCabina", label: "Alarma de cabina" },
      { key: "chalecoReflejante", label: "Chaleco reflejante" },
      { key: "botiquin", label: "Botiquín" },
    ],
  },
  {
    section: "Tapas y otros",
    items: [
      { key: "tapaTanqueCombustible", label: "Tapa de tanque de combustible" },
      { key: "tapasAceite", label: "Tapas de aceite" },
      { key: "herramientasGato", label: "Herramientas y gato" },
      { key: "sogasCuerdas", label: "Sogas y cuerdas" },
      { key: "gata", label: "Gata" },
      { key: "llavesRuedas", label: "Llaves de ruedas" },
    ],
  },
  {
    section: "Documentación",
    items: [
      { key: "tarjetaPropiedad", label: "Tarjeta de propiedad" },
      { key: "polizaSeguro", label: "Póliza de seguro" },
      { key: "licenciaConductor", label: "Licencia de conductor" },
    ],
  },
  {
    section: "Carrocería y observaciones",
    items: [
      { key: "golpesRaspaduras", label: "Golpes exteriores / raspaduras" },
      { key: "tapaHidraulica", label: "Desgaste de tapa hidráulica por uso y maniobras" },
      { key: "canastillaGomasCaja", label: "Desprendimiento de gomas en puertas de la caja" },
    ],
  },
];

const TRANSPORT_CHECKLIST_ITEM_INDEX = TRANSPORT_CHECKLIST_STRUCTURE.reduce((acc, group) => {
  group.items.forEach((item) => {
    acc[item.key] = { label: item.label, section: group.section };
  });
  return acc;
}, {});

const TRANSPORT_CHECKLIST_SECTION_ORDER = TRANSPORT_CHECKLIST_STRUCTURE.reduce((acc, group, index) => {
  acc[group.section] = index;
  return acc;
}, {});

const TRANSPORT_CHECKLIST_ITEM_ORDER = TRANSPORT_CHECKLIST_STRUCTURE.reduce((acc, group) => {
  group.items.forEach((item, index) => {
    acc[item.key] = index;
  });
  return acc;
}, {});

function createTransportChecklistCustomKey() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isTransportChecklistBaseKey(key) {
  return Boolean(TRANSPORT_CHECKLIST_ITEM_INDEX[String(key || "")]);
}

function createTransportChecklistItemsDraft() {
  return Object.entries(TRANSPORT_CHECKLIST_ITEM_INDEX).reduce((acc, [key, meta]) => {
    acc[key] = {
      status: "good",
      label: meta.label,
      section: meta.section,
      notes: "",
      evidence: null,
    };
    return acc;
  }, {});
}

function createTransportChecklistItemsDraftFromTemplate(templateChecks) {
  const source = templateChecks && typeof templateChecks === "object" ? templateChecks : null;
  if (!source || !Object.keys(source).length) {
    return createTransportChecklistItemsDraft();
  }

  return Object.entries(source).reduce((acc, [key, item]) => {
    const baseMeta = TRANSPORT_CHECKLIST_ITEM_INDEX[key] || {};
    acc[key] = {
      status: "good",
      label: String(item?.label || baseMeta.label || key).trim() || key,
      section: String(item?.section || baseMeta.section || "General").trim() || "General",
      notes: "",
      evidence: null,
    };
    return acc;
  }, {});
}

function buildTransportChecklistTemplateFromChecks(checks) {
  return Object.entries(checks || {}).reduce((acc, [key, item]) => {
    const baseMeta = TRANSPORT_CHECKLIST_ITEM_INDEX[key] || {};
    acc[key] = {
      label: String(item?.label || baseMeta.label || key).trim() || key,
      section: String(item?.section || baseMeta.section || "General").trim() || "General",
    };
    return acc;
  }, {});
}

function resolveChecklistItemStatus(item) {
  if (item && typeof item === "object") {
    const status = String(item.status || "").trim().toLowerCase();
    if (["good", "bad", "na"].includes(status)) return status;
    if (typeof item.ok === "boolean") return item.ok ? "good" : "bad";
  }
  if (typeof item === "boolean") return item ? "good" : "bad";
  return "good";
}

function resolveChecklistItemEvidence(item) {
  if (!item || typeof item !== "object") return null;
  return item.evidence && typeof item.evidence === "object" ? item.evidence : null;
}

function createTransportUnitChecklistDraft({ unitId = "", templateChecks = null } = {}) {
  return {
    unitId: String(unitId || ""),
    dateKey: new Date().toISOString().slice(0, 10),
    notes: "",
    checks: createTransportChecklistItemsDraftFromTemplate(templateChecks),
  };
}

function renderRouteStatusChip(statusValue, assignedToName) {
  const status = String(statusValue || "Pendiente").trim() || "Pendiente";
  const assignee = String(assignedToName || "").trim();
  const styles = {
    Pendiente: { bg: "#fff3cd", color: "#856404" },
    Pospuesto: { bg: "#ece8ff", color: "#493d8a" },
    Asignado: { bg: "#cfe2ff", color: "#084298" },
    "En camino": { bg: "#d1ecf1", color: "#0c5460" },
    Retorno: { bg: "#ffe8cc", color: "#7a4100" },
    Entregado: { bg: "#dbe7f2", color: "#1d384f" },
    Devuelto: { bg: "#f8d7da", color: "#842029" },
    Cancelado: { bg: "#e2e3e5", color: "#41464b" },
  };
  const style = styles[status] || { bg: "#e2e3e5", color: "#383d41" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.25rem" }}>
      <span
        className="chip"
        style={{
          background: style.bg,
          color: style.color,
          fontSize: "0.78rem",
          fontWeight: 600,
        }}
      >
        {status}
      </span>
      {assignee ? (
        <span style={{ fontSize: "0.72rem", color: "#315753", fontWeight: 600 }}>
          {assignee}
        </span>
      ) : null}
    </div>
  );
}

export default function GestionTransporte({ contexto }) {
  const {
    state,
    setState,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
    transportState,
    users,
    createTransportRecord,
    updateTransportRecord,
    requestJson,
    actionPermissions,
    Modal,
    formatDateTime,
    documentacionState,
    createDocumentacionRecord,
    updateDocumentacionRecord,
    addDocumentacionArea,
    applyRemoteWarehouseState,
    navTransportSection,
    navTransportTab,
    pendingOpenTransportRecordId,
    setPendingOpenTransportRecordId,
  } = contexto;

  const usersById = useMemo(() => {
    const map = new Map();
    (Array.isArray(users) ? users : []).forEach((user) => {
      const id = String(user?.id || "").trim();
      if (!id) return;
      const resolvedName = String(user?.name || user?.username || "").trim();
      if (resolvedName) map.set(id, resolvedName);
    });
    return map;
  }, [users]);

  const canDeleteHistoryTransportRecords = Boolean(
    String(contexto.currentUser?.role || "").trim() === "Lead"
    && (
      !actionPermissions
      || typeof actionPermissions !== "object"
      || !("deleteTransportRecord" in actionPermissions)
      || Boolean(actionPermissions.deleteTransportRecord)
    ),
  );

  const resolveAssignedName = (record) => {
    const inlineName = String(record?.assignedToName || "").trim();
    if (inlineName) return inlineName;
    const assignedId = String(record?.assignedTo || "").trim();
    if (!assignedId) return "";
    return usersById.get(assignedId) || "";
  };

  const getTransportPermissionIds = (areaId) => {
    const normalizedAreaId = String(areaId || "").trim();
    if (normalizedAreaId === "foraneas" || normalizedAreaId === "locales") {
      return { view: "viewTransportRetail", manage: "manageTransportRetail" };
    }
    if (normalizedAreaId === "pedidos") {
      return { view: "viewTransportPedidos", manage: "manageTransportPedidos" };
    }
    if (normalizedAreaId === "inventarioTraslados") {
      return { view: "viewTransportInventario", manage: "manageTransportInventario" };
    }
    return { view: "", manage: "" };
  };

  const canViewTransportArea = (areaId) => {
    const ids = getTransportPermissionIds(areaId);
    if (!ids.view) return false;
    return Boolean(actionPermissions?.[ids.view]);
  };

  const canManageTransportArea = (areaId) => {
    const ids = getTransportPermissionIds(areaId);
    if (!ids.manage) return false;
    return Boolean(actionPermissions?.[ids.manage]);
  };

  const hasActionPermission = (permissionId, fallbackValue = false) => {
    const key = String(permissionId || "").trim();
    if (!key) return fallbackValue;
    if (!actionPermissions || typeof actionPermissions !== "object") return fallbackValue;
    if (!(key in actionPermissions)) return fallbackValue;
    return Boolean(actionPermissions[key]);
  };

  const areaConfig = (Array.isArray(transportState?.config) ? transportState.config : []).filter((area) => canViewTransportArea(area.id));
  const retailAreaIds = ["foraneas", "locales"];
  const pedidosAreaIds = ["pedidos"];
  const inventarioAreaIds = ["inventarioTraslados"];
  const hasRetailAccess = retailAreaIds.some((id) => canViewTransportArea(id));
  const hasPedidosAccess = pedidosAreaIds.some((id) => canViewTransportArea(id));
  const hasInventarioAccess = inventarioAreaIds.some((id) => canViewTransportArea(id));
  const hasRetailManage = retailAreaIds.some((id) => canManageTransportArea(id));
  const hasPedidosManage = pedidosAreaIds.some((id) => canManageTransportArea(id));
  const hasInventarioManage = inventarioAreaIds.some((id) => canManageTransportArea(id));
  const hasAnyTransportManageAccess = hasRetailManage || hasPedidosManage || hasInventarioManage;
  const hasTransportOnlyAccess = Boolean(
    hasActionPermission("viewTransportDocumentacion", false)
    || hasActionPermission("manageTransportDocumentacion", false)
    || hasActionPermission("viewTransportAssignments", false)
    || hasActionPermission("manageTransportAssignments", false)
    || hasActionPermission("viewTransportPostponed", false)
    || hasActionPermission("manageTransportPostponed", false)
    || hasActionPermission("viewTransportMyRoutes", false)
    || hasActionPermission("viewTransportLogistics", false)
    || hasActionPermission("manageTransportLogistics", false)
    || hasActionPermission("viewTransportConsolidated", false)
  );
  const canSeeDocumentacionTab = hasTransportOnlyAccess
    && hasActionPermission("viewTransportDocumentacion", false);
  const canSeeAssignmentsTab = hasTransportOnlyAccess
    && hasActionPermission("viewTransportAssignments", false);
  const canSeePostponedTab = hasTransportOnlyAccess
    && hasActionPermission("viewTransportPostponed", false);
  const canSeeMyRoutesTab = hasTransportOnlyAccess
    && hasActionPermission("viewTransportMyRoutes", false);
  const canSeeLogisticsTab = hasTransportOnlyAccess
    && (hasActionPermission("viewTransportLogistics", false) || hasActionPermission("manageTransportLogistics", false));
  const canManageLogisticsTab = hasActionPermission("manageTransportLogistics", false);
  const canSeeConsolidatedTab = hasTransportOnlyAccess
    && hasActionPermission("viewTransportConsolidated", false);
  const canCreateTransportIncidencia = hasActionPermission("createIncidencia", false);
  const canEditTransportIncidencia = hasActionPermission("editIncidencia", false);
  const canDeleteTransportIncidencia = hasActionPermission("deleteIncidencia", false);
  const canManageIncidencias = canCreateTransportIncidencia || canEditTransportIncidencia || canDeleteTransportIncidencia;
  const canSeeTransportIncidenciasTab = hasTransportOnlyAccess && (
    hasActionPermission("viewTransportIncidencias", false)
    || hasActionPermission("scopeTransporteIncidencias", false)
    || canManageIncidencias
  );
  const canManageDocumentacionTab = hasActionPermission("manageTransportDocumentacion", false);
  const canDeleteTransportRecord = hasAnyTransportManageAccess
    && hasActionPermission("deleteTransportRecord", hasAnyTransportManageAccess);

  const shippingTabOptions = useMemo(() => {
    const tabs = [];
    if (hasRetailAccess) tabs.push({ id: "area-retail", label: "Retail", shortLabel: "Retail", icon: "🛍️", accent: "#1f486b", soft: "rgba(31, 72, 107, 0.12)" });
    if (hasPedidosAccess) tabs.push({ id: "area-pedidos", label: "Pedidos", shortLabel: "Pedidos", icon: "📦", accent: "#b45309", soft: "rgba(180, 83, 9, 0.12)" });
    if (hasInventarioAccess) tabs.push({ id: "area-inventario", label: "Inventario", shortLabel: "Inv.", icon: "🏷️", accent: "#0e7490", soft: "rgba(14, 116, 144, 0.12)" });
    return tabs;
  }, [hasInventarioAccess, hasPedidosAccess, hasRetailAccess]);

  const transportAdminTabOptions = useMemo(() => {
    const tabs = [];
    if (canSeeDocumentacionTab) tabs.push({ id: "documentacion", label: "Documentación", shortLabel: "Doc.", icon: "📄", accent: "#6d28d9", soft: "rgba(109, 40, 217, 0.12)" });
    if (canSeeAssignmentsTab) tabs.push({ id: "asignaciones", label: "Asignaciones", shortLabel: "Asig.", icon: "🚚", accent: "#2563eb", soft: "rgba(37, 99, 235, 0.12)" });
    if (canSeePostponedTab) tabs.push({ id: "pospuestos", label: "Pospuestos y programados", shortLabel: "Prog.", icon: "⏰", accent: "#b45309", soft: "rgba(180, 83, 9, 0.12)" });
    if (canSeeMyRoutesTab) tabs.push({ id: "mis-rutas", label: "Mis rutas", shortLabel: "Rutas", icon: "🛣️", accent: "#3f678f", soft: "rgba(34, 77, 115, 0.12)" });
    if (canSeeTransportIncidenciasTab) tabs.push({ id: "incidencias-transporte", label: "Incidencias transporte", shortLabel: "Incidencias", icon: "🚨", accent: "#b91c1c", soft: "rgba(185, 28, 28, 0.12)" });
    if (canSeeLogisticsTab) tabs.push({ id: "logistica", label: "Direcciones y gastos", shortLabel: "Dir./Gts.", icon: "🧭", accent: "#7c3aed", soft: "rgba(124, 58, 237, 0.12)" });
    if (canSeeConsolidatedTab) tabs.push({ id: "consolidado", label: "Consolidado", shortLabel: "Consol.", icon: "📊", accent: "#355f88", soft: "rgba(15, 118, 110, 0.12)" });
    return tabs;
  }, [
    canSeeDocumentacionTab,
    canSeeAssignmentsTab,
    canSeeConsolidatedTab,
    canSeeTransportIncidenciasTab,
    canSeeMyRoutesTab,
    canSeePostponedTab,
    canSeeLogisticsTab,
  ]);

  const transportDashboardTabOptions = useMemo(() => {
    if (!canSeeConsolidatedTab) return [];
    return [{ id: "dashboard-transporte", label: "Dashboard", shortLabel: "Dashboard", icon: "📈", accent: "#355f88", soft: "rgba(15, 118, 110, 0.12)" }];
  }, [canSeeConsolidatedTab]);

  const mainTabOptions = useMemo(
    () => ([...shippingTabOptions, ...transportAdminTabOptions, ...transportDashboardTabOptions]),
    [shippingTabOptions, transportAdminTabOptions, transportDashboardTabOptions],
  );

  const transportSectionOptions = useMemo(() => {
    const sections = [];
    const hasControlTransporteTabs = transportAdminTabOptions.some((tab) => ["asignaciones", "pospuestos", "mis-rutas"].includes(tab.id));
    const hasIncidenciasTab = transportAdminTabOptions.some((tab) => tab.id === "incidencias-transporte");
    const hasConsolidadoTab = transportAdminTabOptions.some((tab) => tab.id === "consolidado");
    const hasLogisticaTab = transportAdminTabOptions.some((tab) => tab.id === "logistica");
    if (shippingTabOptions.length || canSeeDocumentacionTab) sections.push({ id: "registros-envios", label: "Registros de envíos" });
    if (hasControlTransporteTabs) sections.push({ id: "control-transporte", label: "Control transporte" });
    if (hasIncidenciasTab) sections.push({ id: "incidencias-transporte", label: "Incidencias transporte" });
    if (hasConsolidadoTab) sections.push({ id: "consolidados", label: "Consolidados" });
    if (transportDashboardTabOptions.length) sections.push({ id: "dashboard-transporte", label: "Dashboard" });
    if (hasLogisticaTab) sections.push({ id: "direcciones-gastos", label: "Direcciones y gastos" });
    return sections;
  }, [shippingTabOptions, canSeeDocumentacionTab, transportAdminTabOptions, transportDashboardTabOptions]);

  const firstAreaId = areaConfig[0]?.id || "";
  const [selectedAreaId, setSelectedAreaId] = useState(firstAreaId);
  const [selectedViewTab, setSelectedViewTab] = useState("active");
  const [areaHistorySearch, setAreaHistorySearch] = useState("");
  const [areaHistoryStatusFilter, setAreaHistoryStatusFilter] = useState("all");
  const [selectedTransportSection, setSelectedTransportSection] = useState(() => (shippingTabOptions.length ? "registros-envios" : "control-transporte"));
  const [selectedMainTab, setSelectedMainTab] = useState(() => mainTabOptions[0]?.id || "documentacion");
  const [selectedPrincipalMonth, setSelectedPrincipalMonth] = useState(() => String(transportState?.activeDateKey || new Date().toISOString().slice(0, 10)).slice(0, 7));
  const [selectedConsolidatedRange] = useState("dias");
  const [selectedPrincipalDate, setSelectedPrincipalDate] = useState(() => String(transportState?.activeDateKey || new Date().toISOString().slice(0, 10)).slice(0, 10));
  const [selectedPrincipalDateFrom, setSelectedPrincipalDateFrom] = useState(() => String(transportState?.activeDateKey || new Date().toISOString().slice(0, 10)).slice(0, 10));
  const [selectedPrincipalDateTo, setSelectedPrincipalDateTo] = useState(() => String(transportState?.activeDateKey || new Date().toISOString().slice(0, 10)).slice(0, 10));
  const [selectedCalendarGrouping, setSelectedCalendarGrouping] = useState("mes");
  const [selectedPrincipalYear, setSelectedPrincipalYear] = useState(() => Number(String(transportState?.activeDateKey || "").slice(0, 4)) || new Date().getFullYear());
  const [selectedPrincipalMonthSpan] = useState(3);
  const [selectedConsolidatedPlayerId, setSelectedConsolidatedPlayerId] = useState("all");
  const [selectedConsolidatedAreaId, setSelectedConsolidatedAreaId] = useState("all");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [transportModal, setTransportModal] = useState(createTransportModalState(firstAreaId));
  const [transportModalError, setTransportModalError] = useState("");
  const [postponeModal, setPostponeModal] = useState(createPostponeModalState());
  const [deleteTransportModal, setDeleteTransportModal] = useState(createDeleteTransportModalState());
  const [logisticsAddressDraft, setLogisticsAddressDraft] = useState(createTransportLogisticsAddressDraft());
  const [logisticsExpenseDraft, setLogisticsExpenseDraft] = useState(createTransportLogisticsExpenseDraft());
  const [logisticsViewTab, setLogisticsViewTab] = useState("direcciones");
  const [logisticsUnitDraft, setLogisticsUnitDraft] = useState(createTransportUnitDraft());
  const [logisticsUnitServiceDraft, setLogisticsUnitServiceDraft] = useState(createTransportUnitServiceDraft());
  const [logisticsUnitChecklistDraft, setLogisticsUnitChecklistDraft] = useState(createTransportUnitChecklistDraft());
  const [logisticsAddressEditId, setLogisticsAddressEditId] = useState("");
  const [logisticsAddressSearch, setLogisticsAddressSearch] = useState("");
  const [logisticsAddressCompletenessFilter, setLogisticsAddressCompletenessFilter] = useState("all");
  const [roadNewsFilters, setRoadNewsFilters] = useState(createRoadNewsFiltersDraft());
  const [roadNewsItems, setRoadNewsItems] = useState([]);
  const [roadNewsError, setRoadNewsError] = useState("");
  const [roadNewsWarning, setRoadNewsWarning] = useState("");
  const [roadNewsStale, setRoadNewsStale] = useState(false);
  const [roadNewsAlertSummary, setRoadNewsAlertSummary] = useState({});
  const [roadNewsLoading, setRoadNewsLoading] = useState(false);
  const [roadNewsLoadedAt, setRoadNewsLoadedAt] = useState("");
  const [checklistCustomItemDraft, setChecklistCustomItemDraft] = useState({
    section: TRANSPORT_CHECKLIST_STRUCTURE[0]?.section || "General",
    label: "",
  });
  const [logisticsAddressModalOpen, setLogisticsAddressModalOpen] = useState(false);
  const [logisticsExpenseModalOpen, setLogisticsExpenseModalOpen] = useState(false);
  const [logisticsUnitModalOpen, setLogisticsUnitModalOpen] = useState(false);
  const [logisticsUnitServiceModalOpen, setLogisticsUnitServiceModalOpen] = useState(false);
  const [logisticsUnitChecklistModalOpen, setLogisticsUnitChecklistModalOpen] = useState(false);
  const [isChecklistEditMode, setIsChecklistEditMode] = useState(false);
  const [uploadingUnitPhoto, setUploadingUnitPhoto] = useState(false);
  const [uploadingUnitChecklistEvidence, setUploadingUnitChecklistEvidence] = useState(false);
  const checklistCameraInputRefs = useRef({});
  const checklistUploadInputRefs = useRef({});
  const [logisticsSaving, setLogisticsSaving] = useState(false);
  const [logisticsBanner, setLogisticsBanner] = useState({ tone: "", message: "" });
  const logisticsError = logisticsBanner.message;
  const setLogisticsError = (message) => setLogisticsBanner({ tone: message ? "danger" : "", message: String(message || "") });
  const setLogisticsWarning = (message) => setLogisticsBanner({ tone: message ? "warning" : "", message: String(message || "") });
  const setLogisticsSuccess = (message) => setLogisticsBanner({ tone: message ? "success" : "", message: String(message || "") });
  const unitPhotoInputRef = useRef(null);
  const [evidenceViewer, setEvidenceViewer] = useState({ open: false, evidence: null, title: "" });
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Documentación state
  const [docModal, setDocModal] = useState(createDocModalState());
  const [docAreaMode, setDocAreaMode] = useState("select");
  const [docEvidenceViewer, setDocEvidenceViewer] = useState({ open: false, evidence: null, title: "" });
  const [uploadingDocEvidence, setUploadingDocEvidence] = useState(false);
  const docEvidenceInputRef = useRef(null);
  const docEvidenceCameraRef = useRef(null);
  const [selectedDocViewTab, setSelectedDocViewTab] = useState("active");
  const [docFilterUbicacion, setDocFilterUbicacion] = useState("ALL");
  const [docFilterArea, setDocFilterArea] = useState("ALL");
  const [incidenciasSearch, setIncidenciasSearch] = useState("");
  const [incidenciasStatusFilter, setIncidenciasStatusFilter] = useState("all");
  const [incidenciasPriorityFilter, setIncidenciasPriorityFilter] = useState("all");
  const [incidenciaModalOpen, setIncidenciaModalOpen] = useState(false);
  const [incidenciaSaving, setIncidenciaSaving] = useState(false);
  const [incidenciaError, setIncidenciaError] = useState("");
  const [incidenciaEditId, setIncidenciaEditId] = useState(null);
  const [incidenciaDeleteId, setIncidenciaDeleteId] = useState(null);
  const [incidenciaDraft, setIncidenciaDraft] = useState({
    title: "",
    description: "",
    area: "",
    priority: "media",
    status: "abierta",
  });

  const checklistGroupsForModal = useMemo(() => {
    const checks = logisticsUnitChecklistDraft.checks || {};
    const sectionMap = new Map();

    Object.entries(checks).forEach(([key, item]) => {
      const baseMeta = TRANSPORT_CHECKLIST_ITEM_INDEX[key] || {};
      const label = String(item?.label || baseMeta.label || "").trim() || "Check personalizado";
      const section = String(item?.section || baseMeta.section || "").trim() || "General";
      if (!sectionMap.has(section)) {
        sectionMap.set(section, { section, items: [] });
      }
      sectionMap.get(section).items.push({
        key,
        label,
        custom: !isTransportChecklistBaseKey(key),
      });
    });

    return Array.from(sectionMap.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((left, right) => {
          const leftBase = isTransportChecklistBaseKey(left.key);
          const rightBase = isTransportChecklistBaseKey(right.key);
          if (leftBase && rightBase) {
            return (TRANSPORT_CHECKLIST_ITEM_ORDER[left.key] || 0) - (TRANSPORT_CHECKLIST_ITEM_ORDER[right.key] || 0);
          }
          if (leftBase !== rightBase) return leftBase ? -1 : 1;
          return left.label.localeCompare(right.label, "es-MX");
        }),
      }))
      .sort((left, right) => {
        const leftOrder = Number.isInteger(TRANSPORT_CHECKLIST_SECTION_ORDER[left.section]) ? TRANSPORT_CHECKLIST_SECTION_ORDER[left.section] : 999;
        const rightOrder = Number.isInteger(TRANSPORT_CHECKLIST_SECTION_ORDER[right.section]) ? TRANSPORT_CHECKLIST_SECTION_ORDER[right.section] : 999;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left.section.localeCompare(right.section, "es-MX");
      });
  }, [logisticsUnitChecklistDraft.checks]);

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNowMs(Date.now()), 10000);
    return () => globalThis.clearInterval(timer);
  }, []);

  const selectedAreaOptions = useMemo(() => {
    if (selectedMainTab === "area-retail") {
      return areaConfig.filter((area) => retailAreaIds.includes(String(area?.id || "").trim()));
    }
    if (selectedMainTab === "area-pedidos") {
      return areaConfig.filter((area) => pedidosAreaIds.includes(String(area?.id || "").trim()));
    }
    if (selectedMainTab === "area-inventario") {
      return areaConfig.filter((area) => inventarioAreaIds.includes(String(area?.id || "").trim()));
    }
    return [];
  }, [areaConfig, selectedMainTab]);

  const selectedArea = useMemo(
    () => selectedAreaOptions.find((item) => item.id === selectedAreaId) || selectedAreaOptions[0] || areaConfig[0] || null,
    [areaConfig, selectedAreaId, selectedAreaOptions],
  );
  const canManageSelectedArea = canManageTransportArea(selectedArea?.id);

  useEffect(() => {
    if (!transportSectionOptions.length) return;
    if (transportSectionOptions.some((section) => section.id === selectedTransportSection)) return;
    setSelectedTransportSection(transportSectionOptions[0].id);
  }, [selectedTransportSection, transportSectionOptions]);

  useEffect(() => {
    if (!navTransportSection) return;
    if (!transportSectionOptions.some((s) => s.id === navTransportSection)) return;
    setSelectedTransportSection(navTransportSection);
  }, [navTransportSection, transportSectionOptions]);

  useEffect(() => {
    const recordId = String(pendingOpenTransportRecordId || "").trim();
    if (!recordId || typeof setPendingOpenTransportRecordId !== "function") return;
    const timer = window.setTimeout(() => {
      const rowElement = document.querySelector(`[data-transport-record-id="${recordId}"]`);
      if (rowElement) {
        rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
        const previousBackground = rowElement.style.background;
        rowElement.style.background = "rgba(14, 165, 233, 0.14)";
        window.setTimeout(() => {
          rowElement.style.background = previousBackground;
        }, 3200);
      }
      setPendingOpenTransportRecordId("");
    }, 180);
    return () => window.clearTimeout(timer);
  }, [pendingOpenTransportRecordId, selectedTransportSection, selectedViewTab, setPendingOpenTransportRecordId]);

  const visibleMainTabOptions = useMemo(() => {
    if (selectedTransportSection === "registros-envios") {
      const documentacionTab = transportAdminTabOptions.find((tab) => tab.id === "documentacion");
      return documentacionTab ? [...shippingTabOptions, documentacionTab] : shippingTabOptions;
    }
    if (selectedTransportSection === "control-transporte") {
      return transportAdminTabOptions.filter((tab) => ["asignaciones", "pospuestos", "mis-rutas"].includes(tab.id));
    }
    if (selectedTransportSection === "incidencias-transporte") {
      return transportAdminTabOptions.filter((tab) => tab.id === "incidencias-transporte");
    }
    if (selectedTransportSection === "consolidados") {
      return transportAdminTabOptions.filter((tab) => tab.id === "consolidado");
    }
    if (selectedTransportSection === "dashboard-transporte") {
      return transportDashboardTabOptions;
    }
    if (selectedTransportSection === "direcciones-gastos") {
      return transportAdminTabOptions.filter((tab) => tab.id === "logistica");
    }
    return transportAdminTabOptions;
  }, [selectedTransportSection, shippingTabOptions, transportAdminTabOptions, transportDashboardTabOptions]);

  useEffect(() => {
    if (!navTransportTab) return;
    if (!visibleMainTabOptions.some((tab) => tab.id === navTransportTab)) return;
    setSelectedMainTab(navTransportTab);
  }, [navTransportTab, visibleMainTabOptions]);

  useEffect(() => {
    if (!visibleMainTabOptions.length) return;
    if (visibleMainTabOptions.some((tab) => tab.id === selectedMainTab)) return;
    setSelectedMainTab(visibleMainTabOptions[0].id);
  }, [selectedMainTab, visibleMainTabOptions]);

  useEffect(() => {
    if (!selectedAreaOptions.length) return;
    if (selectedAreaOptions.some((entry) => entry.id === selectedAreaId)) return;
    setSelectedAreaId(selectedAreaOptions[0].id);
  }, [selectedAreaId, selectedAreaOptions]);

  useEffect(() => {
    if (selectedMainTab !== "logistica" || logisticsViewTab !== "noticias") return;
    if (roadNewsLoading) return;
    loadTransportRoadNews();
  }, [selectedMainTab, logisticsViewTab]);

  useEffect(() => {
    if (selectedMainTab !== "logistica" || logisticsViewTab !== "noticias") return undefined;
    const refreshTimer = window.setInterval(() => {
      loadTransportRoadNews();
    }, 10 * 60 * 1000);
    return () => window.clearInterval(refreshTimer);
  }, [selectedMainTab, logisticsViewTab]);

  const activeRecords = useMemo(
    () => (Array.isArray(transportState?.activeRecords) ? transportState.activeRecords : [])
      .filter((record) => record.areaId === selectedArea?.id),
    [selectedArea?.id, transportState?.activeRecords],
  );

  const historyRecords = useMemo(
    () => (Array.isArray(transportState?.historyRecords) ? transportState.historyRecords : [])
      .filter((record) => record.areaId === selectedArea?.id),
    [selectedArea?.id, transportState?.historyRecords],
  );

  const filteredHistoryRecords = useMemo(() => {
    const normalizedSearch = String(areaHistorySearch || "").trim().toLowerCase();
    const normalizedStatusFilter = String(areaHistoryStatusFilter || "all").trim().toLowerCase();

    return historyRecords.filter((record) => {
      const status = String(record?.status || "").trim();
      if (normalizedStatusFilter !== "all" && status.toLowerCase() !== normalizedStatusFilter) {
        return false;
      }

      if (!normalizedSearch) return true;
      const searchableText = [
        record?.shipmentCode,
        record?.dateKey,
        record?.destination,
        record?.notes,
        record?.createdByName,
        record?.assignedToName,
        status,
      ].map((value) => String(value || "").toLowerCase()).join(" ");
      return searchableText.includes(normalizedSearch);
    });
  }, [areaHistorySearch, areaHistoryStatusFilter, historyRecords]);

  const visibleAreaRecords = selectedViewTab === "history" ? filteredHistoryRecords : activeRecords;

  const transportRecordsAll = useMemo(
    () => [
      ...(Array.isArray(transportState?.historyRecords) ? transportState.historyRecords : []),
      ...(Array.isArray(transportState?.activeRecords) ? transportState.activeRecords : []),
    ],
    [transportState?.activeRecords, transportState?.historyRecords],
  );

  const customerAddresses = useMemo(
    () => (Array.isArray(transportState?.customerAddresses) ? transportState.customerAddresses : []),
    [transportState?.customerAddresses],
  );

  const transportExpenses = useMemo(
    () => (Array.isArray(transportState?.transportExpenses) ? transportState.transportExpenses : []),
    [transportState?.transportExpenses],
  );

  const transportUnits = useMemo(
    () => (Array.isArray(transportState?.transportUnits) ? transportState.transportUnits : []),
    [transportState?.transportUnits],
  );

  const transportUnitServiceLogs = useMemo(
    () => (Array.isArray(transportState?.transportUnitServiceLogs) ? transportState.transportUnitServiceLogs : []),
    [transportState?.transportUnitServiceLogs],
  );

  const transportRoadMonitors = useMemo(
    () => (transportState?.roadMonitors && typeof transportState.roadMonitors === "object"
      ? transportState.roadMonitors
      : {}),
    [transportState?.roadMonitors],
  );

  const activeTransportRoadAlerts = useMemo(() => {
    const rows = [];
    Object.values(transportRoadMonitors).forEach((monitor) => {
      if (!monitor?.monitoring) return;
      (Array.isArray(monitor.alerts) ? monitor.alerts : []).forEach((alert) => {
        rows.push({
          ...alert,
          recordId: monitor.recordId,
          shipmentCode: monitor.shipmentCode,
          destination: monitor.destination,
        });
      });
    });
    return rows.sort((left, right) => Date.parse(right.detectedAt || 0) - Date.parse(left.detectedAt || 0)).slice(0, 6);
  }, [transportRoadMonitors]);

  const normalizedCustomerAddresses = useMemo(
    () => customerAddresses.map((entry) => ({
      ...entry,
      destination: String(entry?.destination || entry?.routeLabel || entry?.customerName || "").trim(),
      serviceType: normalizeServiceType(entry?.serviceType, inferServiceTypeByArea(entry?.areaId)),
      _seed: false,
    })),
    [customerAddresses],
  );

  const inferredDestinationSeedRows = useMemo(() => {
    const existingKeys = new Set(
      normalizedCustomerAddresses
        .map((entry) => `${String(entry?.areaId || "").trim()}::${String(entry?.destination || "").trim().toLowerCase()}`)
        .filter((value) => !value.endsWith("::")),
    );
    const rows = [];

    const pushSeed = (areaId, destination) => {
      const normalizedAreaId = String(areaId || "").trim();
      const normalizedDestination = String(destination || "").trim();
      if (!normalizedAreaId || !normalizedDestination) return;
      const key = `${normalizedAreaId}::${normalizedDestination.toLowerCase()}`;
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      rows.push({
        id: `seed-${normalizedAreaId}-${normalizedDestination.toLowerCase().replace(/\s+/g, "-")}`,
        areaId: normalizedAreaId,
        destination: normalizedDestination,
        customerName: normalizedDestination,
        address: "",
        contactName: "",
        phone: "",
        routeLabel: null,
        notes: null,
        serviceType: normalizeServiceType("", inferServiceTypeByArea(normalizedAreaId)),
        _seed: true,
      });
    };

    areaConfig.forEach((area) => {
      (Array.isArray(area?.destinations) ? area.destinations : []).forEach((destination) => {
        pushSeed(area.id, destination);
      });
    });

    transportRecordsAll.forEach((record) => {
      pushSeed(record?.areaId, record?.destination);
    });

    return rows;
  }, [areaConfig, normalizedCustomerAddresses, transportRecordsAll]);

  const destinationDirectoryRows = useMemo(
    () => [...normalizedCustomerAddresses, ...inferredDestinationSeedRows].map((entry) => {
      const missingFields = getDestinationMissingFields(entry);
      return {
        ...entry,
        missingFields,
        isComplete: missingFields.length === 0,
      };
    }),
    [inferredDestinationSeedRows, normalizedCustomerAddresses],
  );

  const destinationDirectorySummary = useMemo(() => {
    const total = destinationDirectoryRows.length;
    const pending = destinationDirectoryRows.filter((entry) => !entry.isComplete).length;
    const complete = Math.max(0, total - pending);
    return { total, pending, complete };
  }, [destinationDirectoryRows]);

  const filteredDestinationDirectoryRows = useMemo(() => {
    let list = [...destinationDirectoryRows];

    const search = String(logisticsAddressSearch || "").trim().toLowerCase();
    if (search) {
      list = list.filter((entry) => {
        const destination = String(entry?.destination || "").toLowerCase();
        const customerName = String(entry?.customerName || "").toLowerCase();
        const address = String(entry?.address || "").toLowerCase();
        const contact = String(entry?.contactName || "").toLowerCase();
        const phone = String(entry?.phone || "").toLowerCase();
        return destination.includes(search)
          || customerName.includes(search)
          || address.includes(search)
          || contact.includes(search)
          || phone.includes(search);
      });
    }

    if (logisticsAddressCompletenessFilter === "pending") {
      list = list.filter((entry) => !entry.isComplete);
    } else if (logisticsAddressCompletenessFilter === "complete") {
      list = list.filter((entry) => entry.isComplete);
    }

    return list.sort((left, right) => {
      if (left.isComplete !== right.isComplete) {
        return left.isComplete ? 1 : -1;
      }
      return String(left.destination || "").localeCompare(String(right.destination || ""), "es");
    });
  }, [destinationDirectoryRows, logisticsAddressCompletenessFilter, logisticsAddressSearch]);

  const destinationDirectoryGroupsByServiceType = useMemo(
    () => TRANSPORT_SERVICE_TYPE_OPTIONS.map((type) => ({
      serviceType: type.value,
      label: type.label,
      rows: filteredDestinationDirectoryRows.filter((entry) => entry.serviceType === type.value),
    })),
    [filteredDestinationDirectoryRows],
  );

  const destinationMenuGroupsByArea = useMemo(() => {
    const groupsMap = new Map();

    areaConfig.forEach((area) => {
      const areaId = String(area?.id || "").trim();
      if (!areaId) return;
      groupsMap.set(areaId, new Map());
      (Array.isArray(area?.destinations) ? area.destinations : []).forEach((destination) => {
        const serviceType = inferServiceTypeByArea(areaId);
        const typeMap = groupsMap.get(areaId);
        if (!typeMap.has(serviceType)) typeMap.set(serviceType, new Set());
        typeMap.get(serviceType).add(String(destination || "").trim());
      });
    });

    normalizedCustomerAddresses.forEach((entry) => {
      const areaId = String(entry?.areaId || "").trim();
      const destination = String(entry?.destination || "").trim();
      if (!areaId || !destination) return;
      if (!groupsMap.has(areaId)) groupsMap.set(areaId, new Map());
      const type = normalizeServiceType(entry?.serviceType, inferServiceTypeByArea(areaId));
      const typeMap = groupsMap.get(areaId);
      if (!typeMap.has(type)) typeMap.set(type, new Set());
      typeMap.get(type).add(destination);
    });

    const result = {};
    groupsMap.forEach((typeMap, areaId) => {
      result[areaId] = TRANSPORT_SERVICE_TYPE_OPTIONS
        .map((entry) => ({
          serviceType: entry.value,
          label: entry.label,
          destinations: Array.from(typeMap.get(entry.value) || []).sort((a, b) => a.localeCompare(b, "es")),
        }))
        .filter((group) => group.destinations.length > 0);
    });
    return result;
  }, [areaConfig, normalizedCustomerAddresses]);

  const transportIncidencias = useMemo(() => {
    const list = Array.isArray(state?.incidencias) ? state.incidencias : [];
    return list
      .filter((item) => String(item?.category || "").toLowerCase() === "transporte")
      .sort((a, b) => String(b?.reportedAt || b?.createdAt || "").localeCompare(String(a?.reportedAt || a?.createdAt || "")));
  }, [state?.incidencias]);

  const filteredTransportIncidencias = useMemo(() => {
    let list = [...transportIncidencias];
    const query = String(incidenciasSearch || "").trim().toLowerCase();
    if (query) {
      list = list.filter((item) => (
        String(item?.title || "").toLowerCase().includes(query)
        || String(item?.description || "").toLowerCase().includes(query)
        || String(item?.area || "").toLowerCase().includes(query)
      ));
    }
    if (incidenciasStatusFilter !== "all") {
      list = list.filter((item) => String(item?.status || "") === incidenciasStatusFilter);
    }
    if (incidenciasPriorityFilter !== "all") {
      list = list.filter((item) => String(item?.priority || "") === incidenciasPriorityFilter);
    }
    return list;
  }, [transportIncidencias, incidenciasSearch, incidenciasStatusFilter, incidenciasPriorityFilter]);

  function openTransportIncidenciaCreateModal() {
    setIncidenciaError("");
    setIncidenciaEditId(null);
    setIncidenciaDraft({
      title: "",
      description: "",
      area: selectedArea?.label || "",
      priority: "media",
      status: "abierta",
    });
    setIncidenciaModalOpen(true);
  }

  function openTransportIncidenciaEditModal(item) {
    setIncidenciaError("");
    setIncidenciaEditId(item?.id || null);
    setIncidenciaDraft({
      title: String(item?.title || ""),
      description: String(item?.description || ""),
      area: String(item?.area || ""),
      priority: String(item?.priority || "media"),
      status: String(item?.status || "abierta"),
    });
    setIncidenciaModalOpen(true);
  }

  async function saveTransportIncidencia() {
    const title = String(incidenciaDraft.title || "").trim();
    if (!title) {
      setIncidenciaError("El título es obligatorio.");
      return;
    }

    setIncidenciaSaving(true);
    setIncidenciaError("");
    try {
      const payload = {
        title,
        description: String(incidenciaDraft.description || "").trim(),
        area: String(incidenciaDraft.area || "").trim(),
        priority: incidenciaDraft.priority,
        status: incidenciaDraft.status,
        category: "Transporte",
      };
      const method = incidenciaEditId ? "PATCH" : "POST";
      const url = incidenciaEditId ? `/warehouse/incidencias/${incidenciaEditId}` : "/warehouse/incidencias";
      const response = await requestJson(url, { method, body: JSON.stringify(payload) });
      if (response?.data?.state) {
        setState(response.data.state);
      }
      setIncidenciaModalOpen(false);
    } catch (error) {
      setIncidenciaError(error?.message || "No se pudo guardar la incidencia.");
    } finally {
      setIncidenciaSaving(false);
    }
  }

  async function removeTransportIncidencia(incidenciaId) {
    if (!incidenciaId) return;
    try {
      const response = await requestJson(`/warehouse/incidencias/${incidenciaId}`, { method: "DELETE" });
      if (response?.data?.state) {
        setState(response.data.state);
      }
      setIncidenciaDeleteId(null);
    } catch (error) {
      setIncidenciaError(error?.message || "No se pudo eliminar la incidencia.");
    }
  }

  const latestUnitActivityByUnitId = useMemo(() => {
    const map = new Map();
    transportUnitServiceLogs.forEach((log) => {
      const unitId = String(log?.unitId || "").trim();
      if (!unitId) return;
      const current = map.get(unitId);
      const nextStamp = String(log?.createdAt || "").trim() || String(log?.dateKey || "").trim();
      const currentStamp = String(current?.createdAt || "").trim() || String(current?.dateKey || "").trim();
      if (!current || nextStamp >= currentStamp) {
        map.set(unitId, log);
      }
    });
    return map;
  }, [transportUnitServiceLogs]);

  const transportLogisticsAreaOptions = useMemo(
    () => areaConfig.filter((area) => Boolean(area?.id)).map((area) => ({ value: area.id, label: area.label })),
    [areaConfig],
  );

  const persistWarehouseState = async (nextTransportState) => {
    const result = await requestJson("/warehouse/transport/logistics", {
      method: "PATCH",
      body: JSON.stringify({
        customerAddresses: nextTransportState?.customerAddresses,
        transportExpenses: nextTransportState?.transportExpenses,
        transportUnits: nextTransportState?.transportUnits,
        transportUnitServiceLogs: nextTransportState?.transportUnitServiceLogs,
      }),
    });

    const resolvedState = result?.data?.state || result?.state || null;
    if (resolvedState) {
      applyRemoteWarehouseState(resolvedState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    }

    return resolvedState;
  };

  const loadTransportRoadNews = async () => {
    const params = new URLSearchParams();
    params.set("topic", String(roadNewsFilters.topic || "general"));
    params.set("region", String(roadNewsFilters.region || "México"));
    params.set("hours", String(roadNewsFilters.hours || "24"));
    params.set("limit", String(roadNewsFilters.limit || "20"));
    const keyword = String(roadNewsFilters.q || "").trim();
    if (keyword) params.set("q", keyword);

    setRoadNewsLoading(true);
    setRoadNewsError("");
    setRoadNewsWarning("");
    setRoadNewsStale(false);
    try {
      const result = await requestJson(`/warehouse/transport/news?${params.toString()}`);
      const items = Array.isArray(result?.data?.items) ? result.data.items : [];
      setRoadNewsItems(items);
      setRoadNewsLoadedAt(String(result?.data?.generatedAt || new Date().toISOString()));
      setRoadNewsWarning(String(result?.data?.warning || ""));
      setRoadNewsStale(Boolean(result?.data?.stale));
      setRoadNewsAlertSummary(result?.data?.alertSummary && typeof result.data.alertSummary === "object"
        ? result.data.alertSummary
        : {});
      if (!items.length && !result?.data?.stale) {
        setRoadNewsWarning((current) => current || "No hay noticias recientes para estos filtros. Prueba ampliar las horas o cambiar el tema.");
      }
    } catch (error) {
      setRoadNewsError(error?.message || "No se pudieron cargar las noticias viales.");
      setRoadNewsItems([]);
      setRoadNewsAlertSummary({});
    } finally {
      setRoadNewsLoading(false);
    }
  };

  function openTransportAddressCreateModal() {
    setLogisticsError("");
    setLogisticsAddressEditId("");
    setLogisticsAddressDraft(createTransportLogisticsAddressDraft());
    setLogisticsAddressModalOpen(true);
  }

  function openTransportAddressEditModal(address) {
    const areaId = String(address?.areaId || "").trim();
    const destination = String(address?.destination || address?.routeLabel || address?.customerName || "").trim();
    setLogisticsError("");
    setLogisticsAddressEditId(String(address?.id || "").trim());
    setLogisticsAddressDraft({
      destination,
      customerName: String(address?.customerName || destination).trim(),
      address: String(address?.address || "").trim(),
      contactName: String(address?.contactName || "").trim(),
      phone: String(address?.phone || "").trim(),
      areaId,
      serviceType: normalizeServiceType(address?.serviceType, inferServiceTypeByArea(areaId)),
      notes: String(address?.notes || "").trim(),
    });
    setLogisticsAddressModalOpen(true);
  }

  function addTransportAddress(event) {
    event?.preventDefault?.();
    const destination = String(logisticsAddressDraft.destination || "").trim();
    const customerName = String(logisticsAddressDraft.customerName || "").trim();
    const address = String(logisticsAddressDraft.address || "").trim();
    const areaId = String(logisticsAddressDraft.areaId || "").trim() || null;
    const serviceType = normalizeServiceType(logisticsAddressDraft.serviceType, inferServiceTypeByArea(areaId));
    if (!destination || !customerName || !address) {
      setLogisticsWarning("Debes capturar destino, cliente y dirección.");
      return;
    }

    const normalizedDestination = destination.toLowerCase();
    const isEditing = Boolean(logisticsAddressEditId);
    const replacingId = String(logisticsAddressEditId || "").trim();

    const nextAddressEntry = {
      id: replacingId && !replacingId.startsWith("seed-") ? replacingId : `taddr-${Date.now()}`,
      destination,
      customerName,
      address,
      contactName: String(logisticsAddressDraft.contactName || "").trim(),
      phone: String(logisticsAddressDraft.phone || "").trim(),
      areaId,
      serviceType,
      routeLabel: null,
      notes: String(logisticsAddressDraft.notes || "").trim() || null,
      createdById: contexto.currentUser?.id || null,
      createdByName: contexto.currentUser?.name || contexto.currentUser?.username || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let nextAddresses = [];
    if (isEditing && replacingId && !replacingId.startsWith("seed-")) {
      nextAddresses = customerAddresses.map((entry) => (
        String(entry?.id || "").trim() === replacingId
          ? { ...entry, ...nextAddressEntry, createdAt: entry?.createdAt || nextAddressEntry.createdAt }
          : entry
      ));
    } else {
      const existingIndex = customerAddresses.findIndex((entry) => {
        const entryArea = String(entry?.areaId || "").trim();
        const entryDestination = String(entry?.destination || entry?.routeLabel || entry?.customerName || "").trim().toLowerCase();
        return entryArea === String(areaId || "") && entryDestination === normalizedDestination;
      });
      if (existingIndex >= 0) {
        nextAddresses = customerAddresses.map((entry, index) => (
          index === existingIndex
            ? { ...entry, ...nextAddressEntry, id: entry.id, createdAt: entry?.createdAt || nextAddressEntry.createdAt }
            : entry
        ));
      } else {
        nextAddresses = [nextAddressEntry, ...customerAddresses];
      }
    }

    void (async () => {
      setLogisticsSaving(true);
      setLogisticsError("");
      try {
        await persistWarehouseState({
          ...(transportState || {}),
          customerAddresses: nextAddresses,
          transportExpenses,
        });
        setLogisticsAddressDraft(createTransportLogisticsAddressDraft());
        setLogisticsAddressEditId("");
        setLogisticsAddressModalOpen(false);
        setLogisticsSuccess(isEditing ? "Destino actualizado correctamente." : "Destino guardado correctamente.");
      } catch (error) {
        setLogisticsError(error?.message || "No se pudo guardar el destino.");
      } finally {
        setLogisticsSaving(false);
      }
    })();
  }

  function addTransportExpense(event) {
    event?.preventDefault?.();
    const description = String(logisticsExpenseDraft.description || "").trim();
    const amount = Number(logisticsExpenseDraft.amount);
    if (!description || !Number.isFinite(amount) || amount <= 0) {
      setLogisticsWarning("Debes capturar concepto y un importe válido.");
      return;
    }

    const nextExpenses = [
      {
        id: `texp-${Date.now()}`,
        dateKey: String(logisticsExpenseDraft.dateKey || new Date().toISOString().slice(0, 10)).trim(),
        expenseType: String(logisticsExpenseDraft.expenseType || "").trim() || "gasto",
        amount,
        description,
        areaId: String(logisticsExpenseDraft.areaId || "").trim() || null,
        routeLabel: String(logisticsExpenseDraft.routeLabel || "").trim() || null,
        reference: String(logisticsExpenseDraft.reference || "").trim() || null,
        createdById: contexto.currentUser?.id || null,
        createdByName: contexto.currentUser?.name || contexto.currentUser?.username || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...transportExpenses,
    ];

    void (async () => {
      setLogisticsSaving(true);
      setLogisticsError("");
      try {
        await persistWarehouseState({
          ...(transportState || {}),
          customerAddresses,
          transportExpenses: nextExpenses,
        });
        setLogisticsExpenseDraft(createTransportLogisticsExpenseDraft());
        setLogisticsExpenseModalOpen(false);
        setLogisticsSuccess("Gasto guardado correctamente.");
      } catch (error) {
        setLogisticsError(error?.message || "No se pudo guardar el gasto.");
      } finally {
        setLogisticsSaving(false);
      }
    })();
  }

  function removeTransportAddress(addressId) {
    if (!canManageLogisticsTab) {
      setLogisticsWarning("No cuentas con permisos para eliminar destinos.");
      return;
    }
    const nextAddresses = customerAddresses.filter((address) => address.id !== addressId);
    void (async () => {
      setLogisticsSaving(true);
      setLogisticsError("");
      try {
        await persistWarehouseState({
          ...(transportState || {}),
          customerAddresses: nextAddresses,
          transportExpenses,
        });
        setLogisticsSuccess("Destino eliminado correctamente.");
      } catch (error) {
        setLogisticsError(error?.message || "No se pudo eliminar el destino.");
      } finally {
        setLogisticsSaving(false);
      }
    })();
  }

  function removeTransportExpense(expenseId) {
    const nextExpenses = transportExpenses.filter((expense) => expense.id !== expenseId);
    void (async () => {
      setLogisticsSaving(true);
      setLogisticsError("");
      try {
        await persistWarehouseState({
          ...(transportState || {}),
          customerAddresses,
          transportExpenses: nextExpenses,
        });
        setLogisticsSuccess("Gasto eliminado correctamente.");
      } catch (error) {
        setLogisticsError(error?.message || "No se pudo eliminar el gasto.");
      } finally {
        setLogisticsSaving(false);
      }
    })();
  }

  async function handleUploadUnitPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingUnitPhoto(true);
    try {
      const uploaded = await uploadFileToCloudinary(file);
      setLogisticsUnitDraft((current) => ({
        ...current,
        photo: {
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
          name: uploaded.originalName || file.name,
          type: uploaded.resourceType || file.type || "image",
        },
      }));
    } finally {
      setUploadingUnitPhoto(false);
      event.target.value = "";
    }
  }

  async function handleUploadUnitChecklistEvidence(event, checkKey) {
    const file = event.target.files?.[0];
    if (!file || !checkKey) return;
    setUploadingUnitChecklistEvidence(true);
    try {
      const uploaded = await uploadFileToCloudinary(file);
      setLogisticsUnitChecklistDraft((current) => ({
        ...current,
        checks: {
          ...(current.checks || {}),
          [checkKey]: {
            ...(current.checks?.[checkKey] || {}),
            evidence: {
              url: uploaded.url,
              thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
              name: uploaded.originalName || file.name,
              type: uploaded.resourceType || file.type || "image",
            },
          },
        },
      }));
    } finally {
      setUploadingUnitChecklistEvidence(false);
      event.target.value = "";
    }
  }

  function addTransportUnit() {
    const unitName = String(logisticsUnitDraft.unitName || "").trim();
    if (!unitName) {
      setLogisticsWarning("Debes capturar el nombre de la unidad.");
      return;
    }

    const nextUnits = [
      {
        id: `tunit-${Date.now()}`,
        unitName,
        unitCode: String(logisticsUnitDraft.unitCode || "").trim() || null,
        plate: String(logisticsUnitDraft.plate || "").trim() || null,
        model: String(logisticsUnitDraft.model || "").trim() || null,
        areaId: String(logisticsUnitDraft.areaId || "").trim() || null,
        notes: String(logisticsUnitDraft.notes || "").trim() || null,
        photo: logisticsUnitDraft.photo || null,
        checklistTemplate: buildTransportChecklistTemplateFromChecks(createTransportChecklistItemsDraft()),
        createdById: contexto.currentUser?.id || null,
        createdByName: contexto.currentUser?.name || contexto.currentUser?.username || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...transportUnits,
    ];

    void (async () => {
      setLogisticsSaving(true);
      setLogisticsError("");
      try {
        await persistWarehouseState({
          ...(transportState || {}),
          customerAddresses,
          transportExpenses,
          transportUnits: nextUnits,
          transportUnitServiceLogs,
        });
        setLogisticsUnitDraft(createTransportUnitDraft());
        setLogisticsUnitModalOpen(false);
        setLogisticsSuccess("Unidad guardada correctamente.");
      } catch (error) {
        setLogisticsError(error?.message || "No se pudo guardar la unidad.");
      } finally {
        setLogisticsSaving(false);
      }
    })();
  }

  function openTransportUnitServiceModal(unitId) {
    setLogisticsError("");
    setLogisticsUnitServiceDraft({ ...createTransportUnitServiceDraft(), unitId: String(unitId || "") });
    setLogisticsUnitServiceModalOpen(true);
  }

  function addTransportUnitServiceLog() {
    const unitId = String(logisticsUnitServiceDraft.unitId || "").trim();
    const serviceLabel = String(logisticsUnitServiceDraft.serviceLabel || "").trim();
    const kmBefore = Number(logisticsUnitServiceDraft.kmBefore);
    const kmAfter = Number(logisticsUnitServiceDraft.kmAfter);
    if (!unitId || !serviceLabel || !Number.isFinite(kmBefore) || !Number.isFinite(kmAfter) || kmBefore < 0 || kmAfter < 0 || kmAfter < kmBefore) {
      setLogisticsWarning("Captura unidad, servicio y kilometrajes válidos (final >= inicial).");
      return;
    }

    const nextLogs = [
      {
        id: `tunitlog-${Date.now()}`,
        unitId,
        dateKey: String(logisticsUnitServiceDraft.dateKey || new Date().toISOString().slice(0, 10)).trim(),
        serviceLabel,
        kmBefore,
        kmAfter,
        kmDelta: kmAfter - kmBefore,
        notes: String(logisticsUnitServiceDraft.notes || "").trim() || null,
        checklist: null,
        createdById: contexto.currentUser?.id || null,
        createdByName: contexto.currentUser?.name || contexto.currentUser?.username || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...transportUnitServiceLogs,
    ];

    void (async () => {
      setLogisticsSaving(true);
      setLogisticsError("");
      try {
        await persistWarehouseState({
          ...(transportState || {}),
          customerAddresses,
          transportExpenses,
          transportUnits,
          transportUnitServiceLogs: nextLogs,
        });
        setLogisticsUnitServiceDraft(createTransportUnitServiceDraft());
        setLogisticsUnitServiceModalOpen(false);
        setLogisticsSuccess("Servicio de unidad guardado correctamente.");
      } catch (error) {
        setLogisticsError(error?.message || "No se pudo guardar el servicio de la unidad.");
      } finally {
        setLogisticsSaving(false);
      }
    })();
  }

  function openTransportUnitChecklistModal(unitId) {
    setLogisticsError("");
    setIsChecklistEditMode(false);
    const normalizedUnitId = String(unitId || "").trim();
    const selectedUnit = transportUnits.find((unit) => String(unit?.id || "").trim() === normalizedUnitId);
    const latestChecklistLog = transportUnitServiceLogs.find((log) => (
      String(log?.unitId || "").trim() === normalizedUnitId
      && log?.checklist
      && typeof log.checklist === "object"
    ));
    const unitTemplateChecks = selectedUnit?.checklistTemplate && typeof selectedUnit.checklistTemplate === "object"
      ? selectedUnit.checklistTemplate
      : (latestChecklistLog?.checklist || null);

    setChecklistCustomItemDraft({
      section: TRANSPORT_CHECKLIST_STRUCTURE[0]?.section || "General",
      label: "",
    });
    setLogisticsUnitChecklistDraft(createTransportUnitChecklistDraft({ unitId: normalizedUnitId, templateChecks: unitTemplateChecks }));
    setLogisticsUnitChecklistModalOpen(true);
  }

  function addTransportChecklistCustomItem() {
    if (!canManageLogisticsTab) {
      setLogisticsWarning("No cuentas con permiso para editar el checklist.");
      return;
    }
    if (!isChecklistEditMode) {
      setLogisticsWarning("Activa el modo de edición para agregar checks.");
      return;
    }

    const label = String(checklistCustomItemDraft.label || "").trim();
    const section = String(checklistCustomItemDraft.section || "").trim() || "General";
    if (!label) {
      setLogisticsWarning("Escribe el nombre del check a agregar.");
      return;
    }

    const key = createTransportChecklistCustomKey();
    setLogisticsUnitChecklistDraft((current) => ({
      ...current,
      checks: {
        ...(current.checks || {}),
        [key]: {
          status: "good",
          label,
          section,
          notes: "",
          evidence: null,
        },
      },
    }));
    setChecklistCustomItemDraft((current) => ({ ...current, label: "" }));
  }

  function removeTransportChecklistItem(checkKey) {
    if (!canManageLogisticsTab) {
      setLogisticsWarning("No cuentas con permiso para editar el checklist.");
      return;
    }
    if (!isChecklistEditMode) {
      setLogisticsWarning("Activa el modo de edición para eliminar checks.");
      return;
    }
    setLogisticsUnitChecklistDraft((current) => {
      const nextChecks = { ...(current.checks || {}) };
      delete nextChecks[checkKey];
      return {
        ...current,
        checks: nextChecks,
      };
    });
  }

  function addTransportUnitChecklist() {
    if (!canManageLogisticsTab) {
      setLogisticsWarning("No cuentas con permiso para editar el checklist.");
      return;
    }

    const unitId = String(logisticsUnitChecklistDraft.unitId || "").trim();
    if (!unitId) {
      setLogisticsWarning("Selecciona una unidad para guardar el checklist.");
      return;
    }

    const checklistEntries = Object.entries(logisticsUnitChecklistDraft.checks || {});
    const missingEvidenceBadChecks = checklistEntries.filter(([, item]) => {
      const status = resolveChecklistItemStatus(item);
      const evidence = resolveChecklistItemEvidence(item);
      return status === "bad" && !evidence?.url;
    });
    const missingReasonBadChecks = checklistEntries.filter(([, item]) => {
      const status = resolveChecklistItemStatus(item);
      return status === "bad" && !String(item?.notes || "").trim();
    });
    if (missingReasonBadChecks.length) {
      setLogisticsWarning("Escribe el motivo de incidencia en todos los checks marcados como Malo.");
      return;
    }
    if (missingEvidenceBadChecks.length) {
      setLogisticsWarning("Adjunta evidencia en todos los checks marcados como Malo.");
      return;
    }

    const checklistPayload = checklistEntries.reduce((acc, [key, item]) => {
      const meta = TRANSPORT_CHECKLIST_ITEM_INDEX[key] || {};
      acc[key] = {
        status: resolveChecklistItemStatus(item),
        label: String(item?.label || meta.label || key),
        section: String(item?.section || meta.section || "General"),
        notes: String(item?.notes || "").trim() || null,
        evidence: resolveChecklistItemEvidence(item) || null,
      };
      return acc;
    }, {});
    const firstEvidence = Object.values(checklistPayload)
      .map((item) => item?.evidence)
      .find((ev) => ev?.url) || null;
    const nextUnitTemplate = buildTransportChecklistTemplateFromChecks(checklistPayload);
    const nextUnits = transportUnits.map((unit) => {
      if (String(unit?.id || "") !== unitId) return unit;
      return {
        ...unit,
        checklistTemplate: nextUnitTemplate,
        updatedAt: new Date().toISOString(),
      };
    });

    const nextLogs = [
      {
        id: `tunitchk-${Date.now()}`,
        unitId,
        dateKey: String(logisticsUnitChecklistDraft.dateKey || new Date().toISOString().slice(0, 10)).trim(),
        serviceLabel: "Checklist de unidad",
        kmBefore: null,
        kmAfter: null,
        kmDelta: null,
        notes: String(logisticsUnitChecklistDraft.notes || "").trim() || null,
        evidence: firstEvidence,
        checklist: checklistPayload,
        createdById: contexto.currentUser?.id || null,
        createdByName: contexto.currentUser?.name || contexto.currentUser?.username || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...transportUnitServiceLogs,
    ];

    void (async () => {
      setLogisticsSaving(true);
      setLogisticsError("");
      try {
        await persistWarehouseState({
          ...(transportState || {}),
          customerAddresses,
          transportExpenses,
          transportUnits: nextUnits,
          transportUnitServiceLogs: nextLogs,
        });
        setLogisticsUnitChecklistDraft(createTransportUnitChecklistDraft());
        setLogisticsUnitChecklistModalOpen(false);
        setLogisticsSuccess("Checklist guardado correctamente.");
      } catch (error) {
        setLogisticsError(error?.message || "No se pudo guardar el checklist de la unidad.");
      } finally {
        setLogisticsSaving(false);
      }
    })();
  }

  const principalMonthOptions = useMemo(() => {
    const monthSet = new Set();
    const activeMonth = String(transportState?.activeDateKey || "").slice(0, 7);
    if (activeMonth) monthSet.add(activeMonth);

    transportRecordsAll.forEach((record) => {
      const dateKey = extractDateKey(record, transportState?.activeDateKey || "");
      if (dateKey.length >= 7) monthSet.add(dateKey.slice(0, 7));
    });

    (Array.isArray(documentacionState?.records) ? documentacionState.records : []).forEach((record) => {
      const dateKey = extractDateKey(record, transportState?.activeDateKey || "");
      if (dateKey.length >= 7) monthSet.add(dateKey.slice(0, 7));
    });

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [documentacionState?.records, transportRecordsAll, transportState?.activeDateKey]);

  useEffect(() => {
    if (!principalMonthOptions.length) return;
    if (principalMonthOptions.includes(selectedPrincipalMonth)) return;
    setSelectedPrincipalMonth(principalMonthOptions[0]);
  }, [principalMonthOptions, selectedPrincipalMonth]);

  const principalDateOptions = useMemo(() => {
    const dateSet = new Set();
    const activeDateKey = String(transportState?.activeDateKey || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(activeDateKey)) dateSet.add(activeDateKey);

    transportRecordsAll.forEach((record) => {
      const dateKey = extractDateKey(record, transportState?.activeDateKey || "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) dateSet.add(dateKey);
    });

    (Array.isArray(documentacionState?.records) ? documentacionState.records : []).forEach((record) => {
      const dateKey = extractDateKey(record, transportState?.activeDateKey || "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) dateSet.add(dateKey);
    });

    const todayKey = toDateKeyFromDate(new Date());
    if (todayKey) dateSet.add(todayKey);

    return Array.from(dateSet).sort((left, right) => right.localeCompare(left));
  }, [documentacionState?.records, transportRecordsAll, transportState?.activeDateKey]);

  useEffect(() => {
    if (!principalDateOptions.length) return;
    if (principalDateOptions.includes(selectedPrincipalDate)) return;
    setSelectedPrincipalDate(principalDateOptions[0]);
  }, [principalDateOptions, selectedPrincipalDate]);

  useEffect(() => {
    const todayKey = toDateKeyFromDate(new Date());
    const isFromValid = /^\d{4}-\d{2}-\d{2}$/.test(String(selectedPrincipalDateFrom || ""));
    const isToValid = /^\d{4}-\d{2}-\d{2}$/.test(String(selectedPrincipalDateTo || ""));
    if (!isFromValid) {
      setSelectedPrincipalDateFrom(todayKey);
      if (!isToValid) setSelectedPrincipalDateTo(todayKey);
      return;
    }
    if (!isToValid) {
      setSelectedPrincipalDateTo(selectedPrincipalDateFrom);
    }
  }, [selectedPrincipalDateFrom, selectedPrincipalDateTo]);

  const principalYearOptions = useMemo(() => {
    const years = new Set();
    principalMonthOptions.forEach((monthKey) => {
      const year = Number(String(monthKey || "").slice(0, 4));
      if (Number.isInteger(year) && year > 0) years.add(year);
    });

    principalDateOptions.forEach((dateKey) => {
      const year = Number(String(dateKey || "").slice(0, 4));
      if (Number.isInteger(year) && year > 0) years.add(year);
    });

    if (!years.size) years.add(new Date().getFullYear());

    return Array.from(years).sort((left, right) => right - left);
  }, [principalDateOptions, principalMonthOptions]);

  useEffect(() => {
    if (!principalYearOptions.length) return;
    if (principalYearOptions.includes(Number(selectedPrincipalYear))) return;
    setSelectedPrincipalYear(principalYearOptions[0]);
  }, [principalYearOptions, selectedPrincipalYear]);

  const consolidatedRangeModel = useMemo(() => getConsolidatedRangeModel({
    rangeType: selectedConsolidatedRange,
    selectedDateKey: selectedPrincipalDate,
    selectedDateFrom: selectedPrincipalDateFrom,
    selectedDateTo: selectedPrincipalDateTo,
    selectedCalendarGrouping,
    selectedMonth: selectedPrincipalMonth,
    selectedYear: selectedPrincipalYear,
    selectedMonthSpan: selectedPrincipalMonthSpan,
    principalMonthOptions,
  }), [
    principalMonthOptions,
    selectedCalendarGrouping,
    selectedConsolidatedRange,
    selectedPrincipalDate,
    selectedPrincipalDateFrom,
    selectedPrincipalDateTo,
    selectedPrincipalMonth,
    selectedPrincipalMonthSpan,
    selectedPrincipalYear,
  ]);

  const consolidatedPlayerOptions = useMemo(() => {
    const optionsMap = new Map();
    const addOption = (playerIdRaw, playerNameRaw) => {
      const id = String(playerIdRaw || "").trim();
      const name = String(playerNameRaw || "").trim();
      if (id) {
        const resolved = name || usersById.get(id) || id;
        if (resolved) optionsMap.set(id, resolved);
        return;
      }
      if (name) {
        optionsMap.set(`name:${name.toLowerCase()}`, name);
      }
    };

    transportRecordsAll.forEach((record) => {
      addOption(record?.assignedTo, record?.assignedToName);
    });
    (Array.isArray(documentacionState?.records) ? documentacionState.records : []).forEach((record) => {
      addOption(record?.assignedTo, record?.assignedToName);
    });

    return Array.from(optionsMap.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "es"));
  }, [documentacionState?.records, transportRecordsAll, usersById]);

  useEffect(() => {
    if (selectedConsolidatedPlayerId === "all" || selectedConsolidatedPlayerId === "unassigned") return;
    const isValid = consolidatedPlayerOptions.some((player) => player.value === selectedConsolidatedPlayerId);
    if (!isValid) setSelectedConsolidatedPlayerId("all");
  }, [consolidatedPlayerOptions, selectedConsolidatedPlayerId]);

  const doesRecordMatchConsolidatedPlayer = (record) => {
    const selectedId = String(selectedConsolidatedPlayerId || "all").trim();
    if (selectedId === "all") return true;

    const assignedId = String(record?.assignedTo || "").trim();
    const assignedName = String(record?.assignedToName || "").trim();
    if (selectedId === "unassigned") return !assignedId && !assignedName;
    if (selectedId.startsWith("name:")) {
      return assignedName && `name:${assignedName.toLowerCase()}` === selectedId;
    }
    return assignedId === selectedId;
  };

  const principalSummary = useMemo(() => {
    const visibleAreas = areaConfig
      .map((area) => ({ id: String(area?.id || "").trim(), label: String(area?.label || area?.id || "").trim() }))
      .filter((area) => area.id);
    visibleAreas.push({ id: "documentacion", label: "DOCUMENTACIÓN" });

    const visibleAreaMap = new Map(visibleAreas.map((area) => [area.id, area]));
    const weeks = Array.isArray(consolidatedRangeModel?.buckets) ? consolidatedRangeModel.buckets : [];
    if (!weeks.length) {
      return { weeks: [], areas: [], grandTotals: { salidas: 0, cajas: 0, piezas: 0 }, grandWeekly: [] };
    }

    const areasMap = new Map();
    const grandWeekly = weeks.map(() => ({ salidas: 0, cajas: 0, piezas: 0 }));
    const grandTotals = { salidas: 0, cajas: 0, piezas: 0 };

    const ensureAreaEntry = (areaId, areaLabel) => {
      if (!areasMap.has(areaId)) {
        areasMap.set(areaId, {
          areaId,
          areaLabel,
          rowsMap: new Map(),
          totals: { salidas: 0, cajas: 0, piezas: 0 },
          weeklyTotals: weeks.map(() => ({ salidas: 0, cajas: 0, piezas: 0 })),
        });
      }
      return areasMap.get(areaId);
    };

    const applyRecordToSummary = (areaId, areaLabel, destination, weekIndex, salidas, cajas, piezas) => {
      const areaEntry = ensureAreaEntry(areaId, areaLabel);

      if (!areaEntry.rowsMap.has(destination)) {
        areaEntry.rowsMap.set(destination, {
          destination,
          totals: { salidas: 0, cajas: 0, piezas: 0 },
          weekly: weeks.map(() => ({ salidas: 0, cajas: 0, piezas: 0 })),
        });
      }

      const rowEntry = areaEntry.rowsMap.get(destination);
      rowEntry.weekly[weekIndex].salidas += salidas;
      rowEntry.weekly[weekIndex].cajas += cajas;
      rowEntry.weekly[weekIndex].piezas += piezas;
      rowEntry.totals.salidas += salidas;
      rowEntry.totals.cajas += cajas;
      rowEntry.totals.piezas += piezas;

      areaEntry.weeklyTotals[weekIndex].salidas += salidas;
      areaEntry.weeklyTotals[weekIndex].cajas += cajas;
      areaEntry.weeklyTotals[weekIndex].piezas += piezas;
      areaEntry.totals.salidas += salidas;
      areaEntry.totals.cajas += cajas;
      areaEntry.totals.piezas += piezas;

      grandWeekly[weekIndex].salidas += salidas;
      grandWeekly[weekIndex].cajas += cajas;
      grandWeekly[weekIndex].piezas += piezas;
      grandTotals.salidas += salidas;
      grandTotals.cajas += cajas;
      grandTotals.piezas += piezas;
    };

    transportRecordsAll.forEach((record) => {
      if (String(record?.status || "").trim() === "Cancelado") return;
      if (!doesRecordMatchConsolidatedPlayer(record)) return;
      const areaId = String(record?.areaId || "").trim();
      const visibleArea = visibleAreaMap.get(areaId);
      if (!visibleArea) return;

      const dateKey = extractDateKey(record, transportState?.activeDateKey || "");
      const dateMs = parseDateKeyToMs(dateKey);
      if (!Number.isFinite(dateMs)) return;
      const weekIndex = weeks.findIndex((bucket) => dateMs >= bucket.startMs && dateMs <= bucket.endMs);
      if (weekIndex < 0 || weekIndex >= weeks.length) return;

      const destination = String(record?.destination || "Sin destino").trim() || "Sin destino";
      const salidas = 1;
      const cajas = toPositiveNumber(record?.boxes);
      const piezas = toPositiveNumber(record?.pieces);

      applyRecordToSummary(areaId, visibleArea.label, destination, weekIndex, salidas, cajas, piezas);
    });

    (Array.isArray(documentacionState?.records) ? documentacionState.records : []).forEach((record) => {
      if (String(record?.status || "").trim() === "Cancelado") return;
      if (!doesRecordMatchConsolidatedPlayer(record)) return;
      const visibleArea = visibleAreaMap.get("documentacion");
      if (!visibleArea) return;

      const dateKey = extractDateKey(record, transportState?.activeDateKey || "");
      const dateMs = parseDateKeyToMs(dateKey);
      if (!Number.isFinite(dateMs)) return;
      const weekIndex = weeks.findIndex((bucket) => dateMs >= bucket.startMs && dateMs <= bucket.endMs);
      if (weekIndex < 0 || weekIndex >= weeks.length) return;

      const destination = String(record?.area || "Sin área").trim() || "Sin área";
      const salidas = 1;
      const cajas = 0;
      const piezas = 0;

      applyRecordToSummary("documentacion", visibleArea.label, destination, weekIndex, salidas, cajas, piezas);
    });

    const areas = visibleAreas.map((area) => {
      const resolved = areasMap.get(area.id) || {
        areaId: area.id,
        areaLabel: area.label,
        rowsMap: new Map(),
        totals: { salidas: 0, cajas: 0, piezas: 0 },
        weeklyTotals: weeks.map(() => ({ salidas: 0, cajas: 0, piezas: 0 })),
      };
      return {
        areaId: resolved.areaId,
        areaLabel: resolved.areaLabel,
        totals: resolved.totals,
        weeklyTotals: resolved.weeklyTotals,
        rows: Array.from(resolved.rowsMap.values()).sort((a, b) => a.destination.localeCompare(b.destination, "es")),
      };
    });

    return { weeks, areas, grandTotals, grandWeekly };
  }, [
    areaConfig,
    consolidatedRangeModel,
    documentacionState?.records,
    selectedConsolidatedPlayerId,
    transportRecordsAll,
    transportState?.activeDateKey,
  ]);

  const consolidatedDashboard = useMemo(() => {
    const totalSalidas = Number(principalSummary?.grandTotals?.salidas || 0);
    const totalCajas = Number(principalSummary?.grandTotals?.cajas || 0);
    const totalPiezas = Number(principalSummary?.grandTotals?.piezas || 0);

    const areaRows = Array.isArray(principalSummary?.areas) ? principalSummary.areas : [];
    const weekRows = Array.isArray(principalSummary?.weeks) ? principalSummary.weeks : [];
    const weeklyTotals = Array.isArray(principalSummary?.grandWeekly) ? principalSummary.grandWeekly : [];

    const areaTotals = areaRows.map((area) => ({
      areaId: area.areaId,
      areaLabel: area.areaLabel,
      salidas: Number(area?.totals?.salidas || 0),
      cajas: Number(area?.totals?.cajas || 0),
      piezas: Number(area?.totals?.piezas || 0),
      destinos: Array.isArray(area?.rows) ? area.rows.length : 0,
    }));

    const totalDestinos = areaTotals.reduce((acc, area) => acc + Number(area.destinos || 0), 0);
    const maxAreaSalidas = Math.max(1, ...areaTotals.map((area) => Number(area.salidas || 0)));

    const weeklySeries = weekRows.map((week, index) => ({
      label: week.label,
      shortLabel: week.shortLabel,
      salidas: Number(weeklyTotals?.[index]?.salidas || 0),
      cajas: Number(weeklyTotals?.[index]?.cajas || 0),
      piezas: Number(weeklyTotals?.[index]?.piezas || 0),
    }));

    const maxWeeklySalidas = Math.max(1, ...weeklySeries.map((week) => Number(week.salidas || 0)));

    const areaSortedBySalidas = [...areaTotals].sort((left, right) => right.salidas - left.salidas);
    const topArea = areaSortedBySalidas[0] || null;

    const dominantWeek = [...weeklySeries]
      .sort((left, right) => right.salidas - left.salidas)[0] || null;

    const palette = [
      "#355f88",
      "#2563eb",
      "#b45309",
      "#6d28d9",
      "#3f678f",
      "#be123c",
      "#0e7490",
      "#334155",
    ];

    const areaPie = [];
    let accumulated = 0;
    areaSortedBySalidas.forEach((area, index) => {
      const rawPercent = totalSalidas > 0 ? (area.salidas / totalSalidas) * 100 : 0;
      const safePercent = Number.isFinite(rawPercent) ? rawPercent : 0;
      const start = accumulated;
      const end = Math.min(100, accumulated + safePercent);
      accumulated = end;
      areaPie.push({
        ...area,
        color: palette[index % palette.length],
        percent: safePercent,
        start,
        end,
      });
    });

    const pieGradient = areaPie.length
      ? `conic-gradient(${areaPie.map((item) => `${item.color} ${item.start}% ${item.end}%`).join(", ")})`
      : "conic-gradient(#dce7e3 0% 100%)";

    const lineSeries = weeklySeries.map((week, index, list) => {
      const ratio = maxWeeklySalidas > 0 ? week.salidas / maxWeeklySalidas : 0;
      const x = list.length <= 1 ? 40 : 40 + (index * (560 / (list.length - 1)));
      const y = 170 - (ratio * 130);
      return {
        ...week,
        shortLabel: String(week.shortLabel || week.label || ""),
        x,
        y,
      };
    });

    const linePath = lineSeries.map((point) => `${point.x},${point.y}`).join(" ");

    const areaBarSeries = areaSortedBySalidas.slice(0, 8).map((area) => ({
      ...area,
      shortLabel: String(area.areaLabel || "").replace("DOCUMENTACIÓN", "DOC."),
      ratio: maxAreaSalidas > 0 ? (area.salidas / maxAreaSalidas) : 0,
    }));

    return {
      totalSalidas,
      totalCajas,
      totalPiezas,
      totalDestinos,
      areaTotals,
      areaSortedBySalidas,
      maxAreaSalidas,
      weeklySeries,
      maxWeeklySalidas,
      topArea,
      dominantWeek,
      areaPie,
      pieGradient,
      lineSeries,
      linePath,
      areaBarSeries,
    };
  }, [principalSummary]);

  const consolidatedAreaOptions = useMemo(() => {
    const areas = Array.isArray(principalSummary?.areas) ? principalSummary.areas : [];
    return areas
      .map((area) => ({
        value: String(area?.areaId || "").trim(),
        label: String(area?.areaLabel || area?.areaId || "Área").trim() || "Área",
      }))
      .filter((area) => area.value);
  }, [principalSummary?.areas]);

  useEffect(() => {
    if (selectedConsolidatedAreaId === "all") return;
    const exists = consolidatedAreaOptions.some((area) => area.value === selectedConsolidatedAreaId);
    if (!exists) setSelectedConsolidatedAreaId("all");
  }, [consolidatedAreaOptions, selectedConsolidatedAreaId]);

  const scopedConsolidatedAreas = useMemo(() => {
    const areas = Array.isArray(principalSummary?.areas) ? principalSummary.areas : [];
    if (selectedConsolidatedAreaId === "all") return areas;
    return areas.filter((area) => String(area?.areaId || "").trim() === selectedConsolidatedAreaId);
  }, [principalSummary?.areas, selectedConsolidatedAreaId]);

  const selectedConsolidatedAreaData = useMemo(() => {
    if (selectedConsolidatedAreaId === "all") return null;
    return scopedConsolidatedAreas[0] || null;
  }, [scopedConsolidatedAreas, selectedConsolidatedAreaId]);

  const selectedAreaDashboard = useMemo(() => {
    const area = selectedConsolidatedAreaData;
    const weeks = Array.isArray(principalSummary?.weeks) ? principalSummary.weeks : [];
    if (!area) return null;

    const totalSalidas = Number(area?.totals?.salidas || 0);
    const totalCajas = Number(area?.totals?.cajas || 0);
    const totalPiezas = Number(area?.totals?.piezas || 0);
    const totalDestinos = Array.isArray(area?.rows) ? area.rows.length : 0;

    const weeklySeries = weeks.map((week, index) => ({
      label: week.label,
      shortLabel: week.shortLabel,
      salidas: Number(area?.weeklyTotals?.[index]?.salidas || 0),
      cajas: Number(area?.weeklyTotals?.[index]?.cajas || 0),
      piezas: Number(area?.weeklyTotals?.[index]?.piezas || 0),
    }));

    const maxWeeklySalidas = Math.max(1, ...weeklySeries.map((entry) => Number(entry.salidas || 0)));
    const lineSeries = weeklySeries.map((week, index, list) => {
      const ratio = maxWeeklySalidas > 0 ? week.salidas / maxWeeklySalidas : 0;
      const x = list.length <= 1 ? 40 : 40 + (index * (560 / (list.length - 1)));
      const y = 170 - (ratio * 130);
      return {
        ...week,
        shortLabel: String(week.shortLabel || week.label || ""),
        x,
        y,
      };
    });
    const linePath = lineSeries.map((point) => `${point.x},${point.y}`).join(" ");

    const destinationBarSeries = (Array.isArray(area?.rows) ? area.rows : [])
      .map((row) => ({
        destination: row.destination,
        salidas: Number(row?.totals?.salidas || 0),
        cajas: Number(row?.totals?.cajas || 0),
        piezas: Number(row?.totals?.piezas || 0),
      }))
      .sort((left, right) => right.salidas - left.salidas)
      .slice(0, 8);

    const maxDestSalidas = Math.max(1, ...destinationBarSeries.map((entry) => Number(entry.salidas || 0)));
    const destinations = destinationBarSeries.map((row) => ({
      ...row,
      ratio: maxDestSalidas > 0 ? (row.salidas / maxDestSalidas) : 0,
    }));

    return {
      areaLabel: area.areaLabel,
      totalSalidas,
      totalCajas,
      totalPiezas,
      totalDestinos,
      weeklySeries,
      lineSeries,
      linePath,
      destinations,
      topDestination: destinations[0] || null,
    };
  }, [principalSummary?.weeks, selectedConsolidatedAreaData]);

  const transportPlayersRanking = useMemo(() => {
    const visibleTransportAreaIds = new Set(
      (Array.isArray(areaConfig) ? areaConfig : [])
        .map((area) => String(area?.id || "").trim())
        .filter(Boolean),
    );

    const rankingMap = new Map();

    transportRecordsAll.forEach((record) => {
      if (String(record?.status || "").trim() === "Cancelado") return;
      if (!doesRecordMatchConsolidatedPlayer(record)) return;

      const areaId = String(record?.areaId || "").trim();
      if (!visibleTransportAreaIds.has(areaId)) return;

      const dateKey = extractDateKey(record, transportState?.activeDateKey || "");
      const dateMs = parseDateKeyToMs(dateKey);
      if (!Number.isFinite(dateMs)) return;
      const isInRange = (Array.isArray(consolidatedRangeModel?.buckets) ? consolidatedRangeModel.buckets : [])
        .some((bucket) => dateMs >= bucket.startMs && dateMs <= bucket.endMs);
      if (!isInRange) return;

      const assignedId = String(record?.assignedTo || "").trim();
      const inlineName = String(record?.assignedToName || "").trim();
      const resolvedName = inlineName || (assignedId ? usersById.get(assignedId) : "") || "Sin asignar";
      const rankingKey = assignedId || `name:${resolvedName.toLowerCase()}`;

      if (!rankingMap.has(rankingKey)) {
        rankingMap.set(rankingKey, {
          key: rankingKey,
          playerId: assignedId,
          playerName: resolvedName,
          salidas: 0,
          cajas: 0,
          piezas: 0,
        });
      }

      const entry = rankingMap.get(rankingKey);
      entry.salidas += 1;
      entry.cajas += toPositiveNumber(record?.boxes);
      entry.piezas += toPositiveNumber(record?.pieces);
    });

    const rows = Array.from(rankingMap.values())
      .sort((left, right) => {
        if (right.salidas !== left.salidas) return right.salidas - left.salidas;
        if (right.cajas !== left.cajas) return right.cajas - left.cajas;
        if (right.piezas !== left.piezas) return right.piezas - left.piezas;
        return left.playerName.localeCompare(right.playerName, "es");
      });

    const maxSalidas = Math.max(1, ...rows.map((row) => Number(row.salidas || 0)));

    return {
      rows,
      maxSalidas,
      topThree: rows.slice(0, 3),
    };
  }, [
    areaConfig,
    consolidatedRangeModel,
    selectedConsolidatedPlayerId,
    transportRecordsAll,
    transportState?.activeDateKey,
    usersById,
  ]);

  const mainTabCountById = useMemo(() => {
    const terminalStatuses = new Set(["Entregado", "Devuelto", "Cancelado"]);
    const activeTransportRecords = Array.isArray(transportState?.activeRecords) ? transportState.activeRecords : [];
    const docRecords = Array.isArray(documentacionState?.records) ? documentacionState.records : [];
    const activeDateKey = String(transportState?.activeDateKey || "").trim();

    const allAreaIds = (Array.isArray(transportState?.config) ? transportState.config : [])
      .map((area) => area.id)
      .filter(Boolean);

    const manageableAreaIds = allAreaIds.filter((areaId) => canManageTransportArea?.(areaId));
    const allowedAssignmentAreaIds = new Set(manageableAreaIds.length ? manageableAreaIds : allAreaIds);
    const canViewAllPostponed = canSeePostponedTab && !hasAnyTransportManageAccess;
    const visibleAreaIds = new Set(areaConfig.map((area) => area.id).filter(Boolean));

    const areaRetailCount = activeTransportRecords.filter((record) => retailAreaIds.includes(String(record?.areaId || "").trim())).length;
    const areaPedidosCount = activeTransportRecords.filter((record) => pedidosAreaIds.includes(String(record?.areaId || "").trim())).length;
    const areaInventarioCount = activeTransportRecords.filter((record) => inventarioAreaIds.includes(String(record?.areaId || "").trim())).length;

    const documentacionCount = activeDateKey
      ? docRecords.filter((record) => String(record?.dateKey || "").trim() === activeDateKey).length
      : 0;

    const assignmentTransportCount = activeTransportRecords
      .filter((record) => {
        const status = String(record?.status || "").trim();
        const isPending = status === "Pendiente";
        const isReadyFromPostponed = isPostponedReady(record, nowMs);
        if (!isPending && !isReadyFromPostponed) return false;
        return allowedAssignmentAreaIds.size ? allowedAssignmentAreaIds.has(record.areaId) : true;
      })
      .length;

    const assignmentDocCount = activeDateKey
      ? docRecords
        .filter((record) => String(record?.dateKey || "").trim() === activeDateKey)
        .filter((record) => String(record?.status || "Pendiente").trim() === "Pendiente")
        .length
      : 0;

    const postponedCount = activeTransportRecords
      .filter((record) => String(record?.status || "").trim() === "Pospuesto")
      .filter((record) => !isPostponedReady(record, nowMs))
      .filter((record) => canViewAllPostponed || canManageTransportArea?.(record.areaId))
      .length;

    const currentUserId = String(contexto?.currentUser?.id || "").trim();
    const myRoutesCount = currentUserId
      ? activeTransportRecords.filter((record) => record.assignedTo === currentUserId && !terminalStatuses.has(String(record.status || ""))).length
        + docRecords.filter((record) => record.assignedTo === currentUserId && !terminalStatuses.has(String(record.status || ""))).length
      : 0;

    const rangeBuckets = Array.isArray(consolidatedRangeModel?.buckets) ? consolidatedRangeModel.buckets : [];
    const isDateInConsolidatedRange = (dateKey) => {
      const dateMs = parseDateKeyToMs(dateKey);
      if (!Number.isFinite(dateMs)) return false;
      return rangeBuckets.some((bucket) => dateMs >= bucket.startMs && dateMs <= bucket.endMs);
    };

    const consolidatedCount = rangeBuckets.length
      ? transportRecordsAll
        .filter((record) => visibleAreaIds.has(String(record?.areaId || "").trim()))
        .filter((record) => doesRecordMatchConsolidatedPlayer(record))
        .filter((record) => isDateInConsolidatedRange(extractDateKey(record, transportState?.activeDateKey || "")))
        .length
        + docRecords
          .filter((record) => doesRecordMatchConsolidatedPlayer(record))
          .filter((record) => isDateInConsolidatedRange(extractDateKey(record, transportState?.activeDateKey || "")))
          .length
      : 0;

    return {
      "area-retail": areaRetailCount,
      "area-pedidos": areaPedidosCount,
      "area-inventario": areaInventarioCount,
      documentacion: documentacionCount,
      asignaciones: assignmentTransportCount + assignmentDocCount,
      pospuestos: postponedCount,
      "mis-rutas": myRoutesCount,
      consolidado: consolidatedCount,
    };
  }, [
    areaConfig,
    canManageTransportArea,
    canSeePostponedTab,
    consolidatedRangeModel,
    contexto?.currentUser?.id,
    documentacionState?.records,
    hasAnyTransportManageAccess,
    nowMs,
    selectedConsolidatedPlayerId,
    transportRecordsAll,
    transportState?.activeDateKey,
    transportState?.activeRecords,
    transportState?.config,
  ]);

  function openCreateModal() {
    const baseDate = new Date(Date.now() + (2 * 60 * 60 * 1000));
    const defaultDate = baseDate.toISOString().slice(0, 10);
    const defaultTime = baseDate.toTimeString().slice(0, 5);
    const destinationGroups = destinationMenuGroupsByArea[selectedArea?.id || ""] || [];
    const firstDestination = destinationGroups.flatMap((group) => group.destinations)[0] || "";
    setTransportModalError("");
    setTransportModal({
      ...createTransportModalState(selectedArea?.id || ""),
      open: true,
      destination: firstDestination,
      scheduledDate: defaultDate,
      scheduledTime: defaultTime,
    });
  }

  function openEditModal(record) {
    setTransportModalError("");
    setTransportModal({
      open: true,
      mode: "edit",
      recordId: String(record?.id || "").trim(),
      areaId: String(record?.areaId || selectedArea?.id || "").trim(),
      destination: String(record?.destination || "").trim(),
      boxes: String(record?.boxes ?? ""),
      pieces: String(record?.pieces ?? ""),
      notes: String(record?.notes || "").trim(),
      evidence: record?.evidence || null,
    });
  }

  function openEvidenceViewer(record) {
    if (!record?.evidence?.url) return;
    setEvidenceViewer({
      open: true,
      evidence: record.evidence,
      title: record.destination || "Evidencia del envio",
    });
  }

  function closeEvidenceViewer() {
    setEvidenceViewer({ open: false, evidence: null, title: "" });
  }

  async function handleUploadEvidence(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingEvidence(true);
    try {
      const uploaded = await uploadFileToCloudinary(file);
      setTransportModal((current) => ({
        ...current,
        evidence: {
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
          name: uploaded.originalName || file.name,
          type: uploaded.resourceType || file.type || "image",
        },
      }));
      setTransportModalError("");
    } finally {
      setUploadingEvidence(false);
      event.target.value = "";
    }
  }

  async function submitTransportModal() {
    if (!canManageTransportArea(transportModal.areaId)) {
      setTransportModalError("No tienes permiso para guardar este registro.");
      return;
    }
    const payload = {
      areaId: transportModal.areaId,
      destination: transportModal.destination,
      boxes: Number(transportModal.boxes || 0),
      pieces: Number(transportModal.pieces || 0),
      notes: transportModal.notes.trim(),
      evidence: transportModal.evidence,
    };

    const missingFields = [];
    if (!payload.areaId) missingFields.push("área");
    if (!payload.destination) missingFields.push("destino");
    if (!payload.evidence?.url) missingFields.push("evidencia");
    if ((payload.boxes || 0) <= 0 && (payload.pieces || 0) <= 0) missingFields.push("cajas o piezas");

    if (missingFields.length > 0) {
      setTransportModalError(`Falta completar: ${missingFields.join(", ")}.`);
      return;
    }

    if (transportModal.mode === "create" && transportModal.isScheduled) {
      const scheduleDate = String(transportModal.scheduledDate || "").trim();
      const scheduleTime = String(transportModal.scheduledTime || "").trim();
      const remindBeforeMinutes = Math.max(0, Number(transportModal.remindBeforeMinutes || 0));
      const candidate = new Date(`${scheduleDate}T${scheduleTime}`);
      if (!scheduleDate || !scheduleTime || Number.isNaN(candidate.getTime())) {
        setTransportModalError("Define una fecha y hora válidas para programar el envío.");
        return;
      }
      if (candidate.getTime() <= Date.now()) {
        setTransportModalError("La fecha programada debe ser mayor a la hora actual.");
        return;
      }
      if (!Number.isFinite(remindBeforeMinutes)) {
        setTransportModalError("El recordatorio debe ser un número válido.");
        return;
      }
    }

    try {
      if (transportModal.mode === "create") {
        const createdResult = await createTransportRecord(payload);
        if (transportModal.isScheduled) {
          const recordId = String(createdResult?.data?.recordId || "").trim();
          const scheduleDate = String(transportModal.scheduledDate || "").trim();
          const scheduleTime = String(transportModal.scheduledTime || "").trim();
          const remindBeforeMinutes = Math.max(0, Number(transportModal.remindBeforeMinutes || 0));
          const candidate = new Date(`${scheduleDate}T${scheduleTime}`);
          if (!recordId) {
            throw new Error("Se creó el envío, pero no se pudo identificar para programarlo.");
          }
          const scheduleResult = await requestJson(`/warehouse/transport/records/${recordId}/postpone`, {
            method: "POST",
            body: JSON.stringify({
              postponedUntil: candidate.toISOString(),
              remindBeforeMinutes,
            }),
          });
          if (!scheduleResult?.ok) {
            throw new Error(scheduleResult?.message || "Se creó el envío, pero no se pudo programar.");
          }
        }
      } else {
        await updateTransportRecord(transportModal.recordId, payload);
      }
      setTransportModalError("");
      setTransportModal(createTransportModalState(selectedArea?.id || ""));
    } catch (error) {
      setTransportModalError(error?.message || "No fue posible guardar el registro. Revisa los campos obligatorios.");
    }
  }

  function openPostponeModal(record) {
    const baseDate = new Date(Date.now() + (2 * 60 * 60 * 1000));
    const defaultDate = baseDate.toISOString().slice(0, 10);
    const defaultTime = baseDate.toTimeString().slice(0, 5);

    setPostponeModal({
      open: true,
      recordId: String(record?.id || "").trim(),
      destination: String(record?.destination || "").trim() || "Destino",
      postponedDate: defaultDate,
      postponedTime: defaultTime,
      remindBeforeMinutes: "60",
    });
  }

  async function submitPostponeModal() {
    const recordId = String(postponeModal.recordId || "").trim();
    const postponedDate = String(postponeModal.postponedDate || "").trim();
    const postponedTime = String(postponeModal.postponedTime || "").trim();
    const remindBeforeMinutes = Math.max(0, Number(postponeModal.remindBeforeMinutes || 0));

    if (!recordId || !postponedDate || !postponedTime || !Number.isFinite(remindBeforeMinutes)) return;

    const candidate = new Date(`${postponedDate}T${postponedTime}`);
    if (Number.isNaN(candidate.getTime())) return;

    const result = await requestJson(`/warehouse/transport/records/${recordId}/postpone`, {
      method: "POST",
      body: JSON.stringify({
        postponedUntil: candidate.toISOString(),
        remindBeforeMinutes,
      }),
    });

    if (!result?.ok) return;
    setPostponeModal(createPostponeModalState());
  }

  function openDeleteTransportModal(record) {
    setDeleteTransportModal({
      open: true,
      recordId: String(record?.id || "").trim(),
      destination: String(record?.destination || "").trim() || "Destino",
      submitting: false,
      error: "",
    });
  }

  async function submitDeleteTransportModal() {
    const recordId = String(deleteTransportModal.recordId || "").trim();
    if (!recordId || !canDeleteTransportRecord) return;

    setDeleteTransportModal((current) => ({ ...current, submitting: true, error: "" }));
    try {
      await requestJson(`/warehouse/transport/records/${recordId}`, { method: "DELETE" });
      setDeleteTransportModal(createDeleteTransportModalState());
    } catch (error) {
      setDeleteTransportModal((current) => ({
        ...current,
        submitting: false,
        error: error?.message || "No fue posible eliminar el registro.",
      }));
    }
  }

  function renderEvidenceCell(record) {
    const evidence = record?.evidence;
    if (!evidence?.url) return <span className="subtle-line">Sin evidencia</span>;

    if (isImageEvidence(evidence)) {
      return (
        <button type="button" className="transport-evidence-thumb" onClick={() => openEvidenceViewer(record)}>
          <img src={evidence.thumbnailUrl || evidence.url} alt={evidence.name || `Evidencia ${record.destination || ""}`.trim()} />
        </button>
      );
    }

    if (isVideoEvidence(evidence)) {
      return (
        <button type="button" className="transport-evidence-thumb transport-evidence-thumb-video" onClick={() => openEvidenceViewer(record)}>
          <video src={evidence.url} poster={evidence.thumbnailUrl || undefined} muted playsInline preload="metadata" />
          <span>Video</span>
        </button>
      );
    }

    return (
      <a href={evidence.url} target="_blank" rel="noreferrer" className="transport-evidence-file-link">
        {evidence.name || "Abrir archivo"}
      </a>
    );
  }

  // ── Documentación helpers ─────────────────────────────────────────
  const docRecords = useMemo(() => {
    const all = Array.isArray(documentacionState?.records) ? documentacionState.records : [];
    return all
      .filter((r) => docFilterUbicacion === "ALL" || r.ubicacion === docFilterUbicacion)
      .filter((r) => docFilterArea === "ALL" || r.area === docFilterArea);
  }, [documentacionState, docFilterUbicacion, docFilterArea]);

  const activeDocDateKey = String(transportState?.activeDateKey || "").trim();
  const docActiveRecords = useMemo(
    () => docRecords.filter((r) => String(r?.dateKey || "").trim() === activeDocDateKey),
    [activeDocDateKey, docRecords],
  );
  const docHistoryRecords = useMemo(
    () => docRecords.filter((r) => String(r?.dateKey || "").trim() !== activeDocDateKey),
    [activeDocDateKey, docRecords],
  );

  const customAreas = Array.isArray(documentacionState?.customAreas) ? documentacionState.customAreas : [];

  function openCreateDocModal() {
    const defaultArea = customAreas[0] || "";
    setDocAreaMode(customAreas.length ? "select" : "new");
    setDocModal({ ...createDocModalState(), open: true, area: defaultArea });
  }

  function openEditDocModal(record) {
    const areaName = String(record?.area || "").trim();
    const isKnownArea = customAreas.some((a) => a.toLowerCase() === areaName.toLowerCase());
    setDocAreaMode(isKnownArea ? "select" : "new");
    setDocModal({
      open: true,
      mode: "edit",
      recordId: record.id,
      ubicacion: record.ubicacion || "SONATA",
      area: areaName,
      dirigidoA: record.dirigidoA || "",
      notas: record.notas || "",
      evidence: record.evidence || null,
    });
  }

  async function handleUploadDocEvidence(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingDocEvidence(true);
    try {
      const uploaded = await uploadFileToCloudinary(file);
      setDocModal((prev) => ({
        ...prev,
        evidence: {
          url: uploaded.url,
          thumbnailUrl: uploaded.thumbnailUrl || uploaded.url,
          name: uploaded.originalName || file.name,
          type: uploaded.resourceType || file.type || "image",
        },
      }));
    } finally {
      setUploadingDocEvidence(false);
      event.target.value = "";
    }
  }

  async function submitDocModal() {
    const normalizedArea = docModal.area.trim();
    const payload = {
      ubicacion: docModal.ubicacion,
      area: normalizedArea,
      dirigidoA: docModal.dirigidoA.trim(),
      notas: docModal.notas.trim(),
      evidence: docModal.evidence,
    };
    if (!payload.area || !payload.dirigidoA || !payload.evidence?.url) return;

    const areaExists = customAreas.some((a) => a.toLowerCase() === normalizedArea.toLowerCase());
    if (!areaExists) {
      await addDocumentacionArea(normalizedArea);
    }

    if (docModal.mode === "create") {
      await createDocumentacionRecord(payload);
    } else {
      await updateDocumentacionRecord(docModal.recordId, payload);
    }
    setDocAreaMode(customAreas.length ? "select" : "new");
    setDocModal(createDocModalState());
  }

  function renderDocFileCell(record, field = "evidence") {
    const file = record?.[field];
    if (!file?.url) return <span className="subtle-line">—</span>;
    if (isImageEvidence(file)) {
      return (
        <button type="button" className="transport-evidence-thumb" onClick={() => setDocEvidenceViewer({ open: true, evidence: file, title: "Evidencia" })}>
          <img src={file.thumbnailUrl || file.url} alt={file.name || ""} />
        </button>
      );
    }
    return (
      <a href={file.url} target="_blank" rel="noreferrer" className="transport-evidence-file-link">
        <FileText size={14} style={{ marginRight: "0.25rem" }} />{file.name || "Abrir"}
      </a>
    );
  }

  return (
    <section className="page-shell inventory-page-shell transport-page-shell">
      <section className="inventory-stack transport-page-stack">
        {activeTransportRoadAlerts.length ? (
          <div className="transport-road-alert-banner" role="status" aria-live="polite">
            <div className="transport-road-alert-banner-head">
              <strong>Alertas viales en envios activos</strong>
              <span className="chip warning">{activeTransportRoadAlerts.length}</span>
            </div>
            <ul className="transport-road-alert-banner-list">
              {activeTransportRoadAlerts.map((alert) => (
                <li key={alert.id || `${alert.recordId}-${alert.title}`}>
                  <span className="transport-road-alert-banner-item-title">
                    {alert.shipmentCode || alert.destination}: {alert.incidentLabel || "Vialidad"}
                  </span>
                  <span className="subtle-line">{alert.title}</span>
                  {alert.link ? (
                    <a href={alert.link} target="_blank" rel="noreferrer" className="transport-road-news-link">
                      Ver detalle
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <article className="surface-card inventory-surface-card full-width transport-responsive-card">
          <div className="transport-main-groups">
            {transportSectionOptions.length ? (
              <section className="transport-tab-section">
                {visibleMainTabOptions.length > 1 ? (
                  <div className="transport-view-tabs transport-view-tabs-separated">
                    {visibleMainTabOptions.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        className={`transport-view-tab transport-main-tab ${tab.id === "consolidado" ? "transport-main-tab-end" : ""} ${selectedMainTab === tab.id ? "is-active" : ""}`}
                        onClick={() => setSelectedMainTab(tab.id)}
                        aria-label={tab.label}
                        title={tab.label}
                        style={{ "--transport-tab-accent": tab.accent, "--transport-tab-soft": tab.soft }}
                      >
                        <span className="transport-main-tab-icon" aria-hidden="true">{tab.icon}</span>
                        <span>{tab.shortLabel || tab.label}</span>
                        {tab.id !== "consolidado" && Number(mainTabCountById[tab.id] || 0) > 0 ? (
                          <span className="transport-main-tab-count">{mainTabCountById[tab.id]}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          {/* ── TRANSPORTE POR ÁREA ── */}
          {["area-retail", "area-pedidos", "area-inventario"].includes(selectedMainTab) ? (
            <>
              <div className="transport-view-tabs" style={{ marginBottom: "0.85rem" }}>
                <button
                  type="button"
                  className={`transport-view-tab ${selectedViewTab === "active" ? "is-active" : ""}`}
                  onClick={() => setSelectedViewTab("active")}
                >
                  Registros de hoy
                </button>
                <button
                  type="button"
                  className={`transport-view-tab ${selectedViewTab === "history" ? "is-active" : ""}`}
                  onClick={() => setSelectedViewTab("history")}
                >
                  Historial
                </button>
              </div>


              {selectedAreaOptions.length > 1 ? (
                <div className="saved-board-list board-builder-launch-list" style={{ marginBottom: "0.8rem" }}>
                  {selectedAreaOptions.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      className="chip"
                      onClick={() => setSelectedAreaId(area.id)}
                      style={{
                        border: area.id === selectedArea?.id ? "1px solid rgba(49, 77, 105, 0.36)" : "1px solid rgba(162, 170, 181, 0.25)",
                        background: area.id === selectedArea?.id ? "rgba(49, 77, 105, 0.08)" : "#ffffff",
                        color: "#314d69",
                        cursor: "pointer",
                      }}
                    >
                      {area.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {selectedViewTab === "history" ? (
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    marginBottom: "0.85rem",
                    alignItems: "flex-end",
                  }}
                >
                  <label className="dashboard-filter-field" style={{ minWidth: "260px", margin: 0 }}>
                    <span>Buscar en historial</span>
                    <input
                      type="search"
                      value={areaHistorySearch}
                      onChange={(event) => setAreaHistorySearch(event.target.value)}
                      placeholder="Código, destino, fecha, chofer, notas..."
                    />
                  </label>

                  <label className="dashboard-filter-field" style={{ minWidth: "220px", margin: 0 }}>
                    <span>Filtrar por estado</span>
                    <select
                      value={areaHistoryStatusFilter}
                      onChange={(event) => setAreaHistoryStatusFilter(event.target.value)}
                    >
                      <option value="all">Todos</option>
                      <option value="pendiente">Pendiente</option>
                      <option value="asignado">Asignado</option>
                      <option value="en camino">En camino</option>
                      <option value="retorno">Retorno</option>
                      <option value="entregado">Entregado</option>
                      <option value="devuelto">Devuelto</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="pospuesto">Pospuesto</option>
                    </select>
                  </label>
                </div>
              ) : null}

              <div className="card-header-row" style={{ marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0 }}>{selectedArea?.label || "Area"}</h3>
                {selectedViewTab === "active" ? (
                  <button type="button" className="primary-button" onClick={openCreateModal} disabled={!canManageSelectedArea || !selectedArea}>Crear registro de envio</button>
                ) : null}
              </div>

              <div className="table-wrap">
                <table className="inventory-table-clean">
                  <thead>
                    <tr>
                      {selectedViewTab === "history" ? <th>Fecha</th> : null}
                      <th>Código</th>
                      <th>Destino</th>
                      <th>Cajas</th>
                      <th>Piezas</th>
                      <th>Estado</th>
                      <th>Creado por</th>
                      <th>Evidencia</th>
                      <th>{selectedViewTab === "history" ? "Ultima actualizacion" : "Capturado"}</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleAreaRecords.map((record) => (
                      <tr key={record.id} data-transport-record-id={record.id}>
                        {selectedViewTab === "history" ? <td>{record.dateKey || "-"}</td> : null}
                        <td>{record.shipmentCode || "-"}</td>
                        <td>{record.destination}</td>
                        <td>{record.boxes}</td>
                        <td>{record.pieces}</td>
                        <td>{renderRouteStatusChip(record.status, resolveAssignedName(record))}</td>
                        <td>{record.createdByName || "-"}</td>
                        <td>{renderEvidenceCell(record)}</td>
                        <td>{formatDateTime(record.updatedAt || record.createdAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <button type="button" className="icon-button" onClick={() => openEditModal(record)} disabled={!canManageSelectedArea}>Editar</button>
                            {selectedViewTab === "active" ? (
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => openPostponeModal(record)}
                                disabled={!canManageSelectedArea}
                              >
                                Posponer
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="icon-button"
                              onClick={() => openDeleteTransportModal(record)}
                              disabled={!canDeleteTransportRecord}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!visibleAreaRecords.length ? (
                      <tr>
                        <td colSpan={selectedViewTab === "history" ? 10 : 9} className="subtle-line">
                          {selectedViewTab === "history" ? "Sin historial para esta area." : "Sin registros capturados hoy para esta area."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}

          {/* ── ASIGNACIONES ── */}
          {selectedMainTab === "asignaciones" ? (
            <TransportAssignmentsTab
              transportState={transportState}
              documentacionState={documentacionState}
              activeDateKey={transportState?.activeDateKey || ""}
              canManageTransportArea={canManageTransportArea}
              selectedArea={selectedArea}
              currentUser={contexto.currentUser}
              formatDateTime={formatDateTime}
              requestJson={contexto.requestJson}
              onRouteAssigned={() => {
                // Forzar recarga
                contexto.onRefresh?.();
              }}
            />
          ) : null}

          {selectedMainTab === "pospuestos" ? (
            <TransportPostponedTab
              transportState={transportState}
              canManageTransportArea={canManageTransportArea}
              canViewAllPostponed={canSeePostponedTab && !hasAnyTransportManageAccess}
              currentUser={contexto.currentUser}
              formatDateTime={formatDateTime}
              requestJson={contexto.requestJson}
              onChanged={() => {
                contexto.onRefresh?.();
              }}
            />
          ) : null}

          {/* ── MIS RUTAS ── */}
          {selectedMainTab === "mis-rutas" ? (
            <TransportMyRoutesTab
              transportState={transportState}
              documentacionState={documentacionState}
              currentUser={contexto.currentUser}
              canDeleteHistoryTransportRecords={canDeleteHistoryTransportRecords}
              formatDateTime={formatDateTime}
              requestJson={contexto.requestJson}
              onStatusUpdated={() => {
                // Forzar recarga
                contexto.onRefresh?.();
              }}
            />
          ) : null}



          {/* ── DIRECCIONES Y GASTOS ── */}
          {selectedMainTab === "logistica" ? (
            <section className="transport-logistics-section" style={{ display: "grid", gap: "0.9rem" }}>
              <div className="card-header-row" style={{ marginBottom: 0, gap: "0.6rem", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Direcciones, unidades y gastos</h3>
                  <p className="subtle-line" style={{ marginTop: "0.25rem" }}>
                    Aquí se administran direcciones de clientes, parque vehicular y gastos de transporte.
                  </p>
                </div>
                <span className="chip">Direcciones: {customerAddresses.length} | Unidades: {transportUnits.length} | Gastos: {transportExpenses.length}</span>
              </div>

              {logisticsError ? <div className={`status-banner ${logisticsBanner.tone === "success" ? "status-banner-success" : logisticsBanner.tone === "warning" ? "status-banner-warning" : "status-banner-error"}`}>{logisticsError}</div> : null}

              <div className="transport-view-tabs transport-view-tabs-separated" style={{ marginBottom: "0.5rem" }}>
                <button
                  type="button"
                  className={`transport-view-tab transport-main-tab ${logisticsViewTab === "direcciones" ? "is-active" : ""}`}
                  onClick={() => setLogisticsViewTab("direcciones")}
                >
                  Direcciones
                </button>
                <button
                  type="button"
                  className={`transport-view-tab transport-main-tab ${logisticsViewTab === "gastos" ? "is-active" : ""}`}
                  onClick={() => setLogisticsViewTab("gastos")}
                >
                  Gastos
                </button>
                <button
                  type="button"
                  className={`transport-view-tab transport-main-tab ${logisticsViewTab === "unidades" ? "is-active" : ""}`}
                  onClick={() => setLogisticsViewTab("unidades")}
                >
                  Unidades
                </button>
                <button
                  type="button"
                  className={`transport-view-tab transport-main-tab ${logisticsViewTab === "noticias" ? "is-active" : ""}`}
                  onClick={() => setLogisticsViewTab("noticias")}
                >
                  Noticias viales
                </button>
              </div>

              {logisticsViewTab === "direcciones" ? (
                <article className="surface-card transport-logistics-card" style={{ padding: "0.9rem", borderRadius: "1.2rem" }}>
                  <div className="card-header-row" style={{ marginBottom: "0.7rem" }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Directorio de destinos</h4>
                      <p className="subtle-line" style={{ marginTop: "0.25rem" }}>Incluye destinos ya detectados; edítalos para completar la información de cliente y dirección.</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span className="chip">Total: {destinationDirectorySummary.total}</span>
                      <button
                        type="button"
                        className={`chip ${logisticsAddressCompletenessFilter === "pending" ? "danger" : ""}`}
                        onClick={() => setLogisticsAddressCompletenessFilter((current) => (current === "pending" ? "all" : "pending"))}
                        style={{ cursor: "pointer" }}
                      >
                        Pendientes: {destinationDirectorySummary.pending}
                      </button>
                      <button
                        type="button"
                        className={`chip ${logisticsAddressCompletenessFilter === "complete" ? "success" : ""}`}
                        onClick={() => setLogisticsAddressCompletenessFilter((current) => (current === "complete" ? "all" : "complete"))}
                        style={{ cursor: "pointer" }}
                      >
                        Completos: {destinationDirectorySummary.complete}
                      </button>
                      {canManageLogisticsTab ? (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={openTransportAddressCreateModal}
                          disabled={logisticsSaving}
                        >
                          Agregar destino
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 340px)", gap: "0.6rem", marginBottom: "0.65rem" }}>
                    <label className="app-modal-field" style={{ marginBottom: 0 }}>
                      <span>Buscar destino</span>
                      <input
                        value={logisticsAddressSearch}
                        onChange={(event) => setLogisticsAddressSearch(event.target.value)}
                        placeholder="Destino, cliente, dirección, contacto o teléfono"
                      />
                    </label>
                  </div>

                  <div style={{ display: "grid", gap: "0.7rem" }}>
                    {destinationDirectoryGroupsByServiceType.map((group) => (
                      <article key={`dest-group-${group.serviceType}`} className="surface-card" style={{ padding: "0.65rem", borderRadius: "1rem", border: "1px solid rgba(49, 77, 105, 0.12)" }}>
                        <div className="card-header-row" style={{ marginBottom: "0.5rem" }}>
                          <h5 style={{ margin: 0 }}>{group.label}</h5>
                          <span className="chip">{group.rows.length}</span>
                        </div>

                        <div className="table-wrap">
                          <table className="inventory-table-clean">
                            <thead>
                              <tr>
                                <th>Destino</th>
                                <th>Cliente</th>
                                <th>Dirección</th>
                                <th>Contacto</th>
                                <th>Área</th>
                                <th>Notas</th>
                                <th>Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.rows.length ? group.rows.map((address) => (
                                <tr key={address.id}>
                                  <td>
                                    <div style={{ display: "grid", gap: "0.2rem" }}>
                                      <span>{address.destination || "-"}</span>
                                      {!address.isComplete ? (
                                        <span className="chip danger" style={{ width: "fit-content", fontSize: "0.68rem", padding: "0.16rem 0.48rem" }}>
                                          Pendiente completar
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td>{address.customerName || "-"}</td>
                                  <td>
                                    <TransportAddressNavigateButton address={address} />
                                  </td>
                                  <td>
                                    <div style={{ display: "grid", gap: "0.15rem" }}>
                                      <span>{address.contactName || "-"}</span>
                                      <span className="subtle-line">{address.phone || "Sin teléfono"}</span>
                                    </div>
                                  </td>
                                  <td>{transportLogisticsAreaOptions.find((area) => area.value === address.areaId)?.label || "-"}</td>
                                  <td>
                                    <div style={{ display: "grid", gap: "0.2rem" }}>
                                      <span>{address.notes || "-"}</span>
                                      {!address.isComplete ? (
                                        <span className="subtle-line" style={{ color: "#b13f34" }}>
                                          Faltan: {address.missingFields.join(", ")}
                                        </span>
                                      ) : null}
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                      {canManageLogisticsTab ? (
                                        <>
                                          <button type="button" className="icon-button" onClick={() => openTransportAddressEditModal(address)} disabled={logisticsSaving}>Editar</button>
                                          {!address._seed ? (
                                            <button type="button" className="icon-button" onClick={() => removeTransportAddress(address.id)} disabled={logisticsSaving}>Eliminar</button>
                                          ) : null}
                                        </>
                                      ) : null}
                                    </div>
                                  </td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan="7" className="subtle-line">Sin destinos en esta categoría.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    ))}
                  </div>
                </article>
              ) : logisticsViewTab === "gastos" ? (
                <article className="surface-card transport-logistics-card" style={{ padding: "0.9rem", borderRadius: "1.2rem" }}>
                  <div className="card-header-row" style={{ marginBottom: "0.7rem" }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Gastos de transporte</h4>
                      <p className="subtle-line" style={{ marginTop: "0.25rem" }}>Combustible, casetas, taxis, viáticos y otros gastos.</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span className="chip">{transportExpenses.length}</span>
                      {canManageLogisticsTab ? (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => {
                            setLogisticsError("");
                            setLogisticsExpenseDraft(createTransportLogisticsExpenseDraft());
                            setLogisticsExpenseModalOpen(true);
                          }}
                          disabled={logisticsSaving}
                        >
                          Agregar gasto
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table className="inventory-table-clean">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Importe</th>
                          <th>Área</th>
                          <th>Ruta</th>
                          <th>Referencia</th>
                          <th>Descripción</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transportExpenses.length ? transportExpenses.map((expense) => (
                          <tr key={expense.id}>
                            <td>{expense.dateKey || "-"}</td>
                            <td>{expense.expenseType || "-"}</td>
                            <td>{expense.amount}</td>
                            <td>{transportLogisticsAreaOptions.find((area) => area.value === expense.areaId)?.label || "-"}</td>
                            <td>{expense.routeLabel || "-"}</td>
                            <td>{expense.reference || "-"}</td>
                            <td>{expense.description || "-"}</td>
                            <td>
                              {canManageLogisticsTab ? (
                                <button type="button" className="icon-button" onClick={() => removeTransportExpense(expense.id)} disabled={logisticsSaving}>Eliminar</button>
                              ) : (
                                <span className="subtle-line">—</span>
                              )}
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="8" className="subtle-line">No hay gastos registrados.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              ) : logisticsViewTab === "noticias" ? (
                <article className="surface-card transport-logistics-card transport-road-news-panel" style={{ padding: "0.9rem", borderRadius: "1.2rem" }}>
                  <div className="card-header-row" style={{ marginBottom: "0.7rem", gap: "0.6rem", flexWrap: "wrap" }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Alertas viales en tiempo casi real</h4>
                      <p className="subtle-line" style={{ marginTop: "0.25rem" }}>
                        Agregador gratuito (Google Noticias + respaldo GDELT). Se actualiza cada 10 minutos mientras permanezcas en esta pestaña.
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                      <span className="chip">Resultados: {roadNewsItems.length}</span>
                      {roadNewsLoadedAt ? <span className="subtle-line">Actualizado: {formatDateTime(roadNewsLoadedAt)}</span> : null}
                      <button
                        type="button"
                        className="icon-button transport-road-news-refresh"
                        onClick={loadTransportRoadNews}
                        disabled={roadNewsLoading}
                        title="Actualizar alertas"
                      >
                        <RefreshCw size={15} aria-hidden="true" />
                        {roadNewsLoading ? "Actualizando..." : "Actualizar"}
                      </button>
                    </div>
                  </div>

                  {Object.keys(roadNewsAlertSummary).length ? (
                    <div className="transport-road-news-summary" style={{ marginBottom: "0.65rem" }}>
                      {Object.entries(roadNewsAlertSummary).map(([kind, count]) => {
                        const style = TRANSPORT_ROAD_NEWS_ALERT_STYLES[kind] || TRANSPORT_ROAD_NEWS_ALERT_STYLES.general;
                        return (
                          <span key={`alert-kind-${kind}`} className={`chip ${style.chipClass}`.trim()}>
                            {style.label}: {count}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.55rem", marginBottom: "0.65rem" }}>
                    <label className="app-modal-field" style={{ marginBottom: 0 }}>
                      <span>Tema</span>
                      <select
                        value={roadNewsFilters.topic}
                        onChange={(event) => setRoadNewsFilters((prev) => ({ ...prev, topic: event.target.value }))}
                      >
                        {TRANSPORT_ROAD_NEWS_TOPIC_OPTIONS.map((entry) => (
                          <option key={`news-topic-${entry.value}`} value={entry.value}>{entry.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="app-modal-field" style={{ marginBottom: 0 }}>
                      <span>Región</span>
                      <select
                        value={roadNewsFilters.region}
                        onChange={(event) => setRoadNewsFilters((prev) => ({ ...prev, region: event.target.value }))}
                      >
                        {TRANSPORT_ROAD_NEWS_REGION_OPTIONS.map((entry) => (
                          <option key={`news-region-${entry}`} value={entry}>{entry}</option>
                        ))}
                      </select>
                    </label>

                    <label className="app-modal-field" style={{ marginBottom: 0 }}>
                      <span>Últimas horas</span>
                      <select
                        value={roadNewsFilters.hours}
                        onChange={(event) => setRoadNewsFilters((prev) => ({ ...prev, hours: event.target.value }))}
                      >
                        <option value="6">6 horas</option>
                        <option value="12">12 horas</option>
                        <option value="24">24 horas</option>
                        <option value="48">48 horas</option>
                        <option value="72">72 horas</option>
                        <option value="168">7 días</option>
                      </select>
                    </label>

                    <label className="app-modal-field" style={{ marginBottom: 0 }}>
                      <span>Máximo resultados</span>
                      <select
                        value={roadNewsFilters.limit}
                        onChange={(event) => setRoadNewsFilters((prev) => ({ ...prev, limit: event.target.value }))}
                      >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="30">30</option>
                        <option value="40">40</option>
                        <option value="50">50</option>
                      </select>
                    </label>

                    <label className="app-modal-field" style={{ marginBottom: 0, gridColumn: "span 2" }}>
                      <span>Palabra clave (opcional)</span>
                      <input
                        value={roadNewsFilters.q}
                        onChange={(event) => setRoadNewsFilters((prev) => ({ ...prev, q: event.target.value }))}
                        placeholder="Ejemplo: Puebla-Orizaba, caseta, bloqueo, volcadura"
                      />
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.65rem" }}>
                    <button type="button" className="primary-button" onClick={loadTransportRoadNews} disabled={roadNewsLoading}>
                      {roadNewsLoading ? "Consultando..." : "Buscar noticias"}
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        setRoadNewsFilters(createRoadNewsFiltersDraft());
                        setRoadNewsItems([]);
                        setRoadNewsError("");
                        setRoadNewsWarning("");
                        setRoadNewsStale(false);
                        setRoadNewsAlertSummary({});
                        setRoadNewsLoadedAt("");
                      }}
                      disabled={roadNewsLoading}
                    >
                      Limpiar filtros
                    </button>
                  </div>

                  {roadNewsError ? <div className="status-banner status-banner-error" style={{ marginBottom: "0.65rem" }}>{roadNewsError}</div> : null}
                  {roadNewsWarning ? (
                    <div className={`status-banner ${roadNewsStale ? "status-banner-warning" : ""}`} style={{ marginBottom: "0.65rem" }}>
                      {roadNewsWarning}
                    </div>
                  ) : null}

                  <div className="transport-road-news-feed">
                    {roadNewsLoading && !roadNewsItems.length ? (
                      <p className="subtle-line transport-road-news-empty">Consultando alertas viales...</p>
                    ) : null}

                    {!roadNewsLoading && !roadNewsItems.length ? (
                      <p className="subtle-line transport-road-news-empty">Sin resultados para los filtros seleccionados.</p>
                    ) : null}

                    {roadNewsItems.map((item) => {
                      const alertStyle = TRANSPORT_ROAD_NEWS_ALERT_STYLES[item.alertKind] || TRANSPORT_ROAD_NEWS_ALERT_STYLES.general;
                      const relativeTime = formatRoadNewsRelativeTime(item.publishedAt || item.publishedAtLabel);
                      return (
                        <article key={item.id || item.link} className={`transport-road-news-card transport-road-news-card--${item.alertKind || "general"}`}>
                          <header className="transport-road-news-card-head">
                            <span className={`chip ${alertStyle.chipClass}`.trim()}>{item.alertLabel || alertStyle.label}</span>
                            <span className="subtle-line">{relativeTime || formatDateTime(item.publishedAt || item.publishedAtLabel || "")}</span>
                          </header>
                          <h5 className="transport-road-news-card-title">{item.title || "Sin título"}</h5>
                          <p className="transport-road-news-card-summary">{item.summary || "Sin resumen disponible."}</p>
                          <footer className="transport-road-news-card-foot">
                            <span className="subtle-line">{item.source || "Fuente no identificada"}</span>
                            {item.link ? (
                              <a href={item.link} target="_blank" rel="noreferrer" className="transport-road-news-link">
                                <ExternalLink size={14} aria-hidden="true" />
                                Ver noticia
                              </a>
                            ) : null}
                          </footer>
                        </article>
                      );
                    })}
                  </div>
                </article>
              ) : (
                <article className="surface-card transport-logistics-card" style={{ padding: "0.9rem", borderRadius: "1.2rem" }}>
                  <div className="card-header-row" style={{ marginBottom: "0.7rem" }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Unidades de transporte</h4>
                      <p className="subtle-line" style={{ marginTop: "0.25rem" }}>Registra unidades, checklist y kilometraje antes/después de cada servicio.</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span className="chip">{transportUnits.length}</span>
                      {canManageLogisticsTab ? (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => {
                            setLogisticsError("");
                            setLogisticsUnitDraft(createTransportUnitDraft());
                            setLogisticsUnitModalOpen(true);
                          }}
                          disabled={logisticsSaving}
                        >
                          Agregar unidad
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: "0.65rem" }}>
                    {transportUnits.length ? transportUnits.map((unit) => {
                      const unitPhoto = unit?.photo;
                      const lastActivity = latestUnitActivityByUnitId.get(String(unit?.id || "").trim());
                      const unitArea = transportLogisticsAreaOptions.find((area) => area.value === unit?.areaId)?.label || "Sin área";
                      return (
                        <div key={unit.id} style={{ border: "1px solid rgba(49, 77, 105, 0.16)", borderRadius: "1rem", padding: "0.65rem", display: "grid", gap: "0.55rem" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.7rem", alignItems: "center" }}>
                            <div style={{ width: "58px", height: "58px", borderRadius: "0.8rem", overflow: "hidden", background: "rgba(49, 77, 105, 0.08)", display: "grid", placeItems: "center" }}>
                              {unitPhoto?.url ? <img src={unitPhoto.thumbnailUrl || unitPhoto.url} alt={unit.unitName || "Unidad"} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="subtle-line" style={{ fontSize: "0.7rem" }}>Sin foto</span>}
                            </div>
                            <div style={{ display: "grid", gap: "0.2rem" }}>
                              <strong style={{ fontSize: "0.9rem" }}>{unit.unitName || "Unidad"}</strong>
                              <span className="subtle-line" style={{ fontSize: "0.77rem" }}>Código: {unit.unitCode || "—"} | Placas: {unit.plate || "—"}</span>
                              <span className="subtle-line" style={{ fontSize: "0.77rem" }}>Modelo: {unit.model || "—"} | Área: {unitArea}</span>
                            </div>
                            {canManageLogisticsTab ? (
                              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <button type="button" className="icon-button" onClick={() => openTransportUnitServiceModal(unit.id)} disabled={logisticsSaving}>Registrar servicio</button>
                                <button type="button" className="icon-button" onClick={() => openTransportUnitChecklistModal(unit.id)} disabled={logisticsSaving}>Checklist</button>
                              </div>
                            ) : null}
                          </div>
                          {lastActivity ? (
                            <span className="subtle-line" style={{ fontSize: "0.78rem" }}>
                              Último registro ({lastActivity.dateKey || "sin fecha"}): {lastActivity.serviceLabel || "Servicio"}
                              {Number.isFinite(lastActivity.kmBefore) && Number.isFinite(lastActivity.kmAfter)
                                ? ` | KM ${lastActivity.kmBefore} -> ${lastActivity.kmAfter}`
                                : ""}
                            </span>
                          ) : (
                            <span className="subtle-line" style={{ fontSize: "0.78rem" }}>Sin servicios ni checklist registrados.</span>
                          )}
                        </div>
                      );
                    }) : <span className="subtle-line">No hay unidades registradas.</span>}
                  </div>

                  <div className="table-wrap" style={{ marginTop: "0.8rem" }}>
                    <table className="inventory-table-clean">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Unidad</th>
                          <th>Tipo</th>
                          <th>Servicio / Check</th>
                          <th>KM</th>
                          <th>Evidencia</th>
                          <th>Registró</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transportUnitServiceLogs.length ? transportUnitServiceLogs.slice().sort((a, b) => String(b.createdAt || b.dateKey || "").localeCompare(String(a.createdAt || a.dateKey || ""))).map((log) => {
                          const unit = transportUnits.find((entry) => entry.id === log.unitId);
                          const checklistEntries = log?.checklist && typeof log.checklist === "object" ? Object.entries(log.checklist) : [];
                          const checksOk = checklistEntries.filter(([, item]) => resolveChecklistItemStatus(item) === "good").length;
                          const checksBad = checklistEntries.filter(([, item]) => resolveChecklistItemStatus(item) === "bad").length;
                          const checklistEvidence = checklistEntries
                            .map(([, item]) => resolveChecklistItemEvidence(item))
                            .find((ev) => ev?.url) || null;
                          const evidenceToShow = log?.evidence?.url ? log.evidence : checklistEvidence;
                          return (
                            <tr key={log.id}>
                              <td>{log.dateKey || "-"}</td>
                              <td>{unit?.unitName || unit?.unitCode || unit?.plate || "Unidad"}</td>
                              <td>{log?.checklist ? "Checklist" : "Servicio"}</td>
                              <td>
                                {log?.checklist
                                  ? `${checksOk} OK / ${checksBad} Malo${log.notes ? ` · ${log.notes}` : ""}`
                                  : `${log.serviceLabel || "Servicio"}${log.notes ? ` · ${log.notes}` : ""}`}
                              </td>
                              <td>{Number.isFinite(log.kmBefore) && Number.isFinite(log.kmAfter) ? `${log.kmBefore} -> ${log.kmAfter}` : "—"}</td>
                              <td>
                                {evidenceToShow?.url ? (
                                  isImageEvidence(evidenceToShow) ? (
                                    <button type="button" className="transport-evidence-thumb" onClick={() => setEvidenceViewer({ open: true, evidence: evidenceToShow, title: "Evidencia checklist" })}>
                                      <img src={evidenceToShow.thumbnailUrl || evidenceToShow.url} alt={evidenceToShow.name || "Evidencia"} />
                                    </button>
                                  ) : (
                                    <a href={evidenceToShow.url} target="_blank" rel="noreferrer" className="transport-evidence-file-link">{evidenceToShow.name || "Abrir"}</a>
                                  )
                                ) : <span className="subtle-line">—</span>}
                              </td>
                              <td>{log.createdByName || "—"}</td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan="7" className="subtle-line">Sin historial de checks o servicios.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              )}
            </section>
          ) : null}

          {/* ── CONSOLIDADO / DASHBOARD ── */}
          {["consolidado", "dashboard-transporte"].includes(selectedMainTab) ? (
            <>
              <div className="card-header-row" style={{ marginBottom: "0.65rem", gap: "0.65rem", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>Consolidado general por área</h3>
                <div className="transport-consolidated-controls">
                  <label className="transport-consolidated-control-field">
                    <span style={{ fontSize: "0.8rem", color: "#315753" }}>Player</span>
                    <select value={selectedConsolidatedPlayerId} onChange={(e) => setSelectedConsolidatedPlayerId(e.target.value)}>
                      <option value="all">Todos los players</option>
                      <option value="unassigned">Sin asignar</option>
                      {consolidatedPlayerOptions.map((player) => (
                        <option key={player.value} value={player.value}>{player.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="dashboard-filter-field dashboard-filter-field-range transport-consolidated-control-range">
                    <span>Calendario y vista</span>
                    <DashboardDateRangePicker
                      startDate={selectedPrincipalDateFrom}
                      endDate={selectedPrincipalDateTo}
                      grouping={selectedCalendarGrouping}
                      onGroupingChange={setSelectedCalendarGrouping}
                      selectedYear={selectedPrincipalYear}
                      yearOptions={principalYearOptions}
                      onYearChange={setSelectedPrincipalYear}
                      onChange={({ startDate, endDate }) => {
                        const nextStart = startDate || selectedPrincipalDateFrom;
                        const nextEnd = endDate || startDate || selectedPrincipalDateTo || nextStart;
                        if (selectedCalendarGrouping !== "anio") {
                          setSelectedCalendarGrouping(inferCalendarGroupingFromRange(nextStart, nextEnd));
                        }
                        setSelectedPrincipalDate(nextStart);
                        setSelectedPrincipalDateFrom(nextStart);
                        setSelectedPrincipalDateTo(nextEnd);
                      }}
                    />
                  </label>
                </div>
              </div>

              <p className="subtle-line" style={{ marginBottom: "0.75rem" }}>
                Vista actual: {consolidatedRangeModel.rangeLabel}. Agrupación: {selectedCalendarGrouping === "semana" ? "por días" : selectedCalendarGrouping === "anio" ? "por meses" : "por semanas"}. Player: {selectedConsolidatedPlayerId === "all" ? "Todos" : selectedConsolidatedPlayerId === "unassigned" ? "Sin asignar" : consolidatedPlayerOptions.find((entry) => entry.value === selectedConsolidatedPlayerId)?.label || "Seleccionado"}. Columnas: S (salidas/folios), C (cajas), PZ (piezas). En DOCUMENTACIÓN, S representa cantidad de registros.
              </p>

              <div style={{ border: "1px solid rgba(47, 89, 126, 0.34)", borderRadius: "1rem", padding: "0.7rem 0.9rem", background: "rgba(93, 152, 203, 0.16)", marginBottom: "0.8rem" }}>
                <strong style={{ color: "#173651", fontSize: "0.85rem" }}>Dashboard general del período</strong>
                <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.8rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
                  <span><strong>S:</strong> {principalSummary.grandTotals.salidas}</span>
                  <span><strong>C:</strong> {principalSummary.grandTotals.cajas}</span>
                  <span><strong>PZ:</strong> {principalSummary.grandTotals.piezas}</span>
                </div>
              </div>

              <div className="saved-board-list board-builder-launch-list" style={{ marginBottom: "0.8rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setSelectedConsolidatedAreaId("all")}
                  style={{
                    border: selectedConsolidatedAreaId === "all" ? "1px solid rgba(49, 77, 105, 0.36)" : "1px solid rgba(162, 170, 181, 0.25)",
                    background: selectedConsolidatedAreaId === "all" ? "rgba(49, 77, 105, 0.08)" : "#ffffff",
                    color: "#314d69",
                    cursor: "pointer",
                  }}
                >
                  Dashboard general
                </button>
                {consolidatedAreaOptions.map((area) => (
                  <button
                    key={`consolidated-area-${area.value}`}
                    type="button"
                    className="chip"
                    onClick={() => setSelectedConsolidatedAreaId(area.value)}
                    style={{
                      border: selectedConsolidatedAreaId === area.value ? "1px solid rgba(49, 77, 105, 0.36)" : "1px solid rgba(162, 170, 181, 0.25)",
                      background: selectedConsolidatedAreaId === area.value ? "rgba(49, 77, 105, 0.08)" : "#ffffff",
                      color: "#314d69",
                      cursor: "pointer",
                    }}
                  >
                    {area.label}
                  </button>
                ))}
              </div>

              {selectedMainTab === "dashboard-transporte" ? (
                <section className="transport-consolidated-dashboard">
                <div className="transport-consolidated-kpi-grid">
                  <article className="transport-consolidated-kpi-card">
                    <span className="transport-consolidated-kpi-label">Salidas del periodo</span>
                    <strong>{consolidatedDashboard.totalSalidas}</strong>
                    <small>{consolidatedDashboard.topArea ? `Área líder: ${consolidatedDashboard.topArea.areaLabel}` : "Sin datos"}</small>
                  </article>
                  <article className="transport-consolidated-kpi-card">
                    <span className="transport-consolidated-kpi-label">Cajas del periodo</span>
                    <strong>{consolidatedDashboard.totalCajas}</strong>
                    <small>Promedio por salida: {consolidatedDashboard.totalSalidas > 0 ? (consolidatedDashboard.totalCajas / consolidatedDashboard.totalSalidas).toFixed(1) : "0.0"}</small>
                  </article>
                  <article className="transport-consolidated-kpi-card">
                    <span className="transport-consolidated-kpi-label">Piezas del periodo</span>
                    <strong>{consolidatedDashboard.totalPiezas}</strong>
                    <small>Promedio por salida: {consolidatedDashboard.totalSalidas > 0 ? (consolidatedDashboard.totalPiezas / consolidatedDashboard.totalSalidas).toFixed(1) : "0.0"}</small>
                  </article>
                  <article className="transport-consolidated-kpi-card">
                    <span className="transport-consolidated-kpi-label">Destinos activos</span>
                    <strong>{consolidatedDashboard.totalDestinos}</strong>
                    <small>{consolidatedDashboard.dominantWeek ? `Pico: ${consolidatedDashboard.dominantWeek.label}` : "Sin datos"}</small>
                  </article>
                </div>

                <div className="transport-consolidated-chart-grid">
                  <article className="transport-consolidated-chart-card">
                    <div className="transport-consolidated-chart-head">
                      <h4>Participación por área (S)</h4>
                    </div>
                    <div className="transport-consolidated-pie-layout">
                      <div className="transport-consolidated-pie-ring" style={{ background: consolidatedDashboard.pieGradient }} aria-label="Participación por área" />
                      <div className="transport-consolidated-legend">
                        {consolidatedDashboard.areaPie.map((item) => (
                          <div key={`pie-${item.areaId}`} className="transport-consolidated-legend-item">
                            <span className="transport-consolidated-legend-dot" style={{ background: item.color }} />
                            <span className="transport-consolidated-legend-label">{item.areaLabel}</span>
                            <strong>{item.percent.toFixed(1)}%</strong>
                          </div>
                        ))}
                        {!consolidatedDashboard.areaPie.length ? <span className="subtle-line">Sin datos para graficar.</span> : null}
                      </div>
                    </div>
                  </article>

                  <article className="transport-consolidated-chart-card">
                    <div className="transport-consolidated-chart-head">
                      <h4>Gráfica de línea por {consolidatedRangeModel.unitLabel} (S)</h4>
                    </div>
                    <div className="transport-consolidated-line-chart-wrap">
                      {consolidatedDashboard.lineSeries.length ? (
                        <>
                          <svg className="transport-consolidated-line-chart" viewBox="0 0 620 210" role="img" aria-label="Gráfica de línea semanal de salidas">
                            <line x1="40" y1="170" x2="600" y2="170" stroke="rgba(49, 77, 105, 0.22)" strokeWidth="1" />
                            <line x1="40" y1="26" x2="40" y2="170" stroke="rgba(49, 77, 105, 0.22)" strokeWidth="1" />
                            <polyline
                              points={consolidatedDashboard.linePath}
                              fill="none"
                              stroke="#355f88"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {consolidatedDashboard.lineSeries.map((point) => (
                              <g key={`line-point-${point.label}`}>
                                <circle cx={point.x} cy={point.y} r="4.4" fill="#405db0" stroke="#ffffff" strokeWidth="1.5" />
                                <text x={point.x} y={point.y - 10} textAnchor="middle" className="transport-consolidated-line-value">{point.salidas}</text>
                                <text x={point.x} y="190" textAnchor="middle" className="transport-consolidated-line-label">{point.shortLabel}</text>
                              </g>
                            ))}
                          </svg>
                          <span className="subtle-line">Tendencia de salidas por {consolidatedRangeModel.unitLabel} en el periodo seleccionado.</span>
                        </>
                      ) : (
                        <span className="subtle-line">Sin datos para graficar.</span>
                      )}
                    </div>
                  </article>
                </div>

                <div className="transport-consolidated-bar-ranking-grid">
                  <article className="transport-consolidated-chart-card transport-consolidated-chart-card--compact-bars">
                    <div className="transport-consolidated-chart-head">
                      <h4>Gráfica de barras por área (S)</h4>
                    </div>
                    <div className="transport-consolidated-columns-wrap">
                      {consolidatedDashboard.areaBarSeries.length ? (
                        consolidatedDashboard.areaBarSeries.map((area) => (
                          <div key={`bar-${area.areaId}`} className="transport-consolidated-column-item">
                            <div className="transport-consolidated-column-track">
                              <span className="transport-consolidated-column-fill" style={{ height: `${Math.max(6, Math.round(area.ratio * 100))}%` }} />
                            </div>
                            <strong className="transport-consolidated-column-value">{area.salidas}</strong>
                            <span className="transport-consolidated-column-label" title={area.areaLabel}>{area.shortLabel}</span>
                          </div>
                        ))
                      ) : (
                        <span className="subtle-line">Sin datos para graficar.</span>
                      )}
                    </div>
                  </article>

                  <article className="transport-consolidated-chart-card">
                    <div className="transport-consolidated-chart-head">
                      <h4>Ranking de players de Transporte</h4>
                    </div>

                    <div className="transport-player-ranking-list">
                      {transportPlayersRanking.rows.length ? (
                        transportPlayersRanking.rows.map((player, index) => {
                          const ratio = Math.max(5, Math.round((player.salidas / transportPlayersRanking.maxSalidas) * 100));
                          return (
                            <div key={`player-rank-${player.key}`} className="transport-player-ranking-item">
                              <div className="transport-player-ranking-head">
                                <strong>{index + 1}. {player.playerName}</strong>
                                <span>S: {player.salidas} | C: {player.cajas} | PZ: {player.piezas}</span>
                              </div>
                              <div className="transport-player-ranking-track">
                                <span className="transport-player-ranking-fill" style={{ width: `${ratio}%` }} />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <span className="subtle-line">No hay registros asignados en este periodo.</span>
                      )}
                    </div>
                  </article>
                </div>

                {selectedConsolidatedAreaData ? (
                  <>
                    <div className="card-header-row" style={{ marginTop: "0.8rem", marginBottom: "0.45rem" }}>
                      <h4 style={{ margin: 0 }}>Dashboard por área: {selectedAreaDashboard?.areaLabel || selectedConsolidatedAreaData.areaLabel}</h4>
                    </div>

                    <div className="transport-consolidated-kpi-grid">
                      <article className="transport-consolidated-kpi-card">
                        <span className="transport-consolidated-kpi-label">Salidas del período</span>
                        <strong>{selectedAreaDashboard?.totalSalidas || 0}</strong>
                        <small>{selectedAreaDashboard?.topDestination ? `Destino líder: ${selectedAreaDashboard.topDestination.destination}` : "Sin datos"}</small>
                      </article>
                      <article className="transport-consolidated-kpi-card">
                        <span className="transport-consolidated-kpi-label">Cajas del período</span>
                        <strong>{selectedAreaDashboard?.totalCajas || 0}</strong>
                        <small>Promedio por salida: {(selectedAreaDashboard?.totalSalidas || 0) > 0 ? ((selectedAreaDashboard.totalCajas || 0) / selectedAreaDashboard.totalSalidas).toFixed(1) : "0.0"}</small>
                      </article>
                      <article className="transport-consolidated-kpi-card">
                        <span className="transport-consolidated-kpi-label">Piezas del período</span>
                        <strong>{selectedAreaDashboard?.totalPiezas || 0}</strong>
                        <small>Promedio por salida: {(selectedAreaDashboard?.totalSalidas || 0) > 0 ? ((selectedAreaDashboard.totalPiezas || 0) / selectedAreaDashboard.totalSalidas).toFixed(1) : "0.0"}</small>
                      </article>
                      <article className="transport-consolidated-kpi-card">
                        <span className="transport-consolidated-kpi-label">Destinos activos</span>
                        <strong>{selectedAreaDashboard?.totalDestinos || 0}</strong>
                        <small>{selectedAreaDashboard?.weeklySeries?.length ? `Barras por ${consolidatedRangeModel.unitLabel}` : "Sin datos"}</small>
                      </article>
                    </div>

                    <div className="transport-consolidated-bar-ranking-grid">
                      <article className="transport-consolidated-chart-card">
                        <div className="transport-consolidated-chart-head">
                          <h4>Gráfica de línea por {consolidatedRangeModel.unitLabel} (S)</h4>
                        </div>
                        <div className="transport-consolidated-line-chart-wrap">
                          {selectedAreaDashboard?.lineSeries?.length ? (
                            <>
                              <svg className="transport-consolidated-line-chart" viewBox="0 0 620 210" role="img" aria-label="Gráfica de línea por área">
                                <line x1="40" y1="170" x2="600" y2="170" stroke="rgba(49, 77, 105, 0.22)" strokeWidth="1" />
                                <line x1="40" y1="26" x2="40" y2="170" stroke="rgba(49, 77, 105, 0.22)" strokeWidth="1" />
                                <polyline
                                  points={selectedAreaDashboard.linePath}
                                  fill="none"
                                  stroke="#355f88"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                {selectedAreaDashboard.lineSeries.map((point) => (
                                  <g key={`area-line-point-${point.label}`}>
                                    <circle cx={point.x} cy={point.y} r="4.4" fill="#405db0" stroke="#ffffff" strokeWidth="1.5" />
                                    <text x={point.x} y={point.y - 10} textAnchor="middle" className="transport-consolidated-line-value">{point.salidas}</text>
                                    <text x={point.x} y="190" textAnchor="middle" className="transport-consolidated-line-label">{point.shortLabel}</text>
                                  </g>
                                ))}
                              </svg>
                              <span className="subtle-line">Tendencia de salidas de {selectedAreaDashboard.areaLabel} por {consolidatedRangeModel.unitLabel}.</span>
                            </>
                          ) : (
                            <span className="subtle-line">Sin datos para graficar.</span>
                          )}
                        </div>
                      </article>

                      <article className="transport-consolidated-chart-card transport-consolidated-chart-card--compact-bars">
                        <div className="transport-consolidated-chart-head">
                          <h4>Top destinos del área (S)</h4>
                        </div>
                        <div className="transport-consolidated-columns-wrap">
                          {selectedAreaDashboard?.destinations?.length ? (
                            selectedAreaDashboard.destinations.map((destination) => (
                              <div key={`area-dest-${destination.destination}`} className="transport-consolidated-column-item">
                                <div className="transport-consolidated-column-track">
                                  <span className="transport-consolidated-column-fill" style={{ height: `${Math.max(6, Math.round((destination.ratio || 0) * 100))}%` }} />
                                </div>
                                <strong className="transport-consolidated-column-value">{destination.salidas}</strong>
                                <span className="transport-consolidated-column-label" title={destination.destination}>{destination.destination}</span>
                              </div>
                            ))
                          ) : (
                            <span className="subtle-line">Sin destinos para graficar.</span>
                          )}
                        </div>
                      </article>
                    </div>
                  </>
                ) : null}
                </section>
              ) : null}

              {selectedMainTab === "consolidado" ? scopedConsolidatedAreas.map((area) => (
                <div key={area.areaId} style={{ marginBottom: "1rem", border: "1px solid rgba(47, 89, 126, 0.28)", borderRadius: "1rem", overflow: "hidden" }}>
                  <div style={{ padding: "0.55rem 0.8rem", background: "rgba(93, 152, 203, 0.18)", fontWeight: 700, color: "#173651" }}>
                    {area.areaLabel}
                  </div>
                  <div className="table-wrap" style={{ margin: 0 }}>
                    <table className="inventory-table-clean">
                      <thead>
                        <tr>
                          <th rowSpan={2}>Destino</th>
                          {principalSummary.weeks.map((week) => (
                            <th key={`${area.areaId}-${week.key || week.label}`} colSpan={3}>{week.shortLabel || week.label}</th>
                          ))}
                          <th colSpan={3}>Total periodo</th>
                        </tr>
                        <tr>
                          {principalSummary.weeks.flatMap((week) => ([
                            <th key={`${area.areaId}-${week.key || week.label}-s`}>S</th>,
                            <th key={`${area.areaId}-${week.key || week.label}-c`}>C</th>,
                            <th key={`${area.areaId}-${week.key || week.label}-p`}>PZ</th>,
                          ]))}
                          <th>S</th>
                          <th>C</th>
                          <th>PZ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {area.rows.map((row) => (
                          <tr key={`${area.areaId}-${row.destination}`}>
                            <td>{row.destination}</td>
                            {row.weekly.flatMap((weekTotals, index) => ([
                              <td key={`${area.areaId}-${row.destination}-${index}-s`}>{weekTotals.salidas}</td>,
                              <td key={`${area.areaId}-${row.destination}-${index}-c`}>{weekTotals.cajas}</td>,
                              <td key={`${area.areaId}-${row.destination}-${index}-p`}>{weekTotals.piezas}</td>,
                            ]))}
                            <td>{row.totals.salidas}</td>
                            <td>{row.totals.cajas}</td>
                            <td>{row.totals.piezas}</td>
                          </tr>
                        ))}
                        {!area.rows.length ? (
                          <tr>
                            <td colSpan={1 + principalSummary.weeks.length * 3 + 3} className="subtle-line">Sin movimientos en este periodo para esta área.</td>
                          </tr>
                        ) : null}
                        <tr style={{ background: "rgba(93, 152, 203, 0.14)", fontWeight: 700 }}>
                          <td>Total área</td>
                          {area.weeklyTotals.flatMap((weekTotals, index) => ([
                            <td key={`${area.areaId}-total-${index}-s`}>{weekTotals.salidas}</td>,
                            <td key={`${area.areaId}-total-${index}-c`}>{weekTotals.cajas}</td>,
                            <td key={`${area.areaId}-total-${index}-p`}>{weekTotals.piezas}</td>,
                          ]))}
                          <td>{area.totals.salidas}</td>
                          <td>{area.totals.cajas}</td>
                          <td>{area.totals.piezas}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )) : null}

              {selectedMainTab === "consolidado" ? (
                <div style={{ border: "1px solid rgba(47, 89, 126, 0.34)", borderRadius: "1rem", padding: "0.7rem 0.9rem", background: "rgba(93, 152, 203, 0.16)" }}>
                <strong style={{ color: "#173651", fontSize: "0.85rem" }}>Total general del período</strong>
                <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.8rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
                  <span><strong>S:</strong> {principalSummary.grandTotals.salidas}</span>
                  <span><strong>C:</strong> {principalSummary.grandTotals.cajas}</span>
                  <span><strong>PZ:</strong> {principalSummary.grandTotals.piezas}</span>
                </div>
                </div>
              ) : null}
            </>
          ) : null}

          {selectedMainTab === "incidencias-transporte" ? (
            <section className="transport-logistics-section" style={{ display: "grid", gap: "0.9rem" }}>
              <div className="card-header-row" style={{ marginBottom: 0, gap: "0.6rem", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ margin: 0 }}>Incidencias de transporte</h3>
                  <p className="subtle-line" style={{ marginTop: "0.25rem" }}>
                    Registro operativo de incidencias para rutas, unidades, entregas y devoluciones.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <span className="chip">{filteredTransportIncidencias.length} incidencias</span>
                  {canCreateTransportIncidencia ? (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={openTransportIncidenciaCreateModal}
                      disabled={incidenciaSaving}
                    >
                      Registrar incidencia
                    </button>
                  ) : null}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.55rem" }}>
                <label className="app-modal-field" style={{ marginBottom: 0 }}>
                  <span>Buscar</span>
                  <input
                    value={incidenciasSearch}
                    onChange={(event) => setIncidenciasSearch(event.target.value)}
                    placeholder="Título, descripción o área"
                  />
                </label>

                <label className="app-modal-field" style={{ marginBottom: 0 }}>
                  <span>Estado</span>
                  <select value={incidenciasStatusFilter} onChange={(event) => setIncidenciasStatusFilter(event.target.value)}>
                    <option value="all">Todos</option>
                    <option value="abierta">Abierta</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelta">Resuelta</option>
                    <option value="cerrada">Cerrada</option>
                  </select>
                </label>

                <label className="app-modal-field" style={{ marginBottom: 0 }}>
                  <span>Prioridad</span>
                  <select value={incidenciasPriorityFilter} onChange={(event) => setIncidenciasPriorityFilter(event.target.value)}>
                    <option value="all">Todas</option>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </label>
              </div>

              <div className="table-wrap">
                <table className="inventory-table-clean">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Título</th>
                      <th>Área</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                      <th>Descripción</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransportIncidencias.length ? filteredTransportIncidencias.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDateTime(item.reportedAt || item.createdAt)}</td>
                        <td>{item.title || "-"}</td>
                        <td>{item.area || "-"}</td>
                        <td>{item.priority || "-"}</td>
                        <td>{item.status || "-"}</td>
                        <td style={{ maxWidth: "260px", whiteSpace: "normal" }}>{item.description || "-"}</td>
                        <td>
                          {canEditTransportIncidencia || canDeleteTransportIncidencia ? (
                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                              {canEditTransportIncidencia ? (
                                <button type="button" className="icon-button" onClick={() => openTransportIncidenciaEditModal(item)}>
                                  Editar
                                </button>
                              ) : null}
                              {canDeleteTransportIncidencia ? (
                                <button type="button" className="icon-button danger" onClick={() => setIncidenciaDeleteId(item.id)}>
                                  Eliminar
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span className="subtle-line">Solo lectura</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="7" className="subtle-line">No hay incidencias de transporte para los filtros seleccionados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* ── DOCUMENTACIÓN TAB ── */}
          {selectedMainTab === "documentacion" ? (
            <>
              {/* Filters + action */}
              <div className="card-header-row" style={{ marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <select value={docFilterUbicacion} onChange={(e) => setDocFilterUbicacion(e.target.value)} style={{ minWidth: "min(100%, 120px)" }}>
                    <option value="ALL">Todas las ubicaciones</option>
                    <option value="SONATA">SONATA</option>
                    <option value="CEDIS">CEDIS</option>
                  </select>
                  <select value={docFilterArea} onChange={(e) => setDocFilterArea(e.target.value)} style={{ minWidth: "min(100%, 120px)" }}>
                    <option value="ALL">Todas las áreas</option>
                    {customAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <button type="button" className="primary-button" onClick={openCreateDocModal} disabled={!canManageDocumentacionTab}>
                  + Registro de envío
                </button>
              </div>

              <div className="transport-view-tabs" style={{ marginBottom: "0.8rem" }}>
                <button
                  type="button"
                  className={`transport-view-tab ${selectedDocViewTab === "active" ? "is-active" : ""}`}
                  onClick={() => setSelectedDocViewTab("active")}
                >
                  Registros de hoy
                </button>
                <button
                  type="button"
                  className={`transport-view-tab ${selectedDocViewTab === "history" ? "is-active" : ""}`}
                  onClick={() => setSelectedDocViewTab("history")}
                >
                  Historial
                </button>
              </div>

              {/* Table */}
              <div className="table-wrap">
                <table className="inventory-table-clean">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Código</th>
                      <th>Ubicación</th>
                      <th>Área</th>
                      <th>Dirigido a</th>
                      <th>Estado</th>
                      <th>Evidencia</th>
                      <th>Notas</th>
                      <th>Registrado por</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDocViewTab === "history" ? docHistoryRecords : docActiveRecords).map((record) => (
                      <tr key={record.id} data-transport-record-id={record.id}>
                        <td>{record.dateKey || "-"}</td>
                        <td>{record.shipmentCode || "-"}</td>
                        <td><span className="chip" style={{ fontSize: "0.75rem" }}>{record.ubicacion}</span></td>
                        <td>{record.area}</td>
                        <td>{record.dirigidoA}</td>
                        <td>{renderRouteStatusChip(record.status, resolveAssignedName(record))}</td>
                        <td>{renderDocFileCell(record, "evidence")}</td>
                        <td style={{ maxWidth: "160px", whiteSpace: "normal", fontSize: "0.78rem" }}>{record.notas || "—"}</td>
                        <td style={{ fontSize: "0.78rem" }}>{record.createdByName || "—"}</td>
                        <td>
                          <button type="button" className="icon-button" onClick={() => openEditDocModal(record)} disabled={!canManageDocumentacionTab}>Editar</button>
                        </td>
                      </tr>
                    ))}
                    {!(selectedDocViewTab === "history" ? docHistoryRecords : docActiveRecords).length ? (
                      <tr>
                        <td colSpan={10} className="subtle-line">
                          {selectedDocViewTab === "history" ? "Sin historial en documentación." : "Sin registros de documentación para hoy."}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </article>
      </section>

      <Modal
        open={logisticsAddressModalOpen}
        title={logisticsAddressEditId ? "Editar destino" : "Agregar destino"}
        confirmLabel={logisticsSaving ? "Guardando..." : logisticsAddressEditId ? "Guardar cambios" : "Guardar destino"}
        cancelLabel="Cancelar"
        onClose={() => {
          setLogisticsAddressEditId("");
          setLogisticsAddressDraft(createTransportLogisticsAddressDraft());
          setLogisticsAddressModalOpen(false);
        }}
        onConfirm={() => addTransportAddress()}
      >
        <div className="modal-form-grid">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>Destino</span>
              <input value={logisticsAddressDraft.destination} onChange={(event) => setLogisticsAddressDraft((current) => ({ ...current, destination: event.target.value }))} placeholder="Nombre del destino" />
            </label>
            <label className="app-modal-field">
              <span>Cliente</span>
              <input value={logisticsAddressDraft.customerName} onChange={(event) => setLogisticsAddressDraft((current) => ({ ...current, customerName: event.target.value }))} placeholder="Nombre del cliente" />
            </label>
            <label className="app-modal-field">
              <span>Área</span>
              <select
                value={logisticsAddressDraft.areaId}
                onChange={(event) => {
                  const nextAreaId = event.target.value;
                  setLogisticsAddressDraft((current) => ({
                    ...current,
                    areaId: nextAreaId,
                    serviceType: normalizeServiceType(current.serviceType, inferServiceTypeByArea(nextAreaId)),
                  }));
                }}
              >
                <option value="">Sin área</option>
                {transportLogisticsAreaOptions.map((area) => (
                  <option key={`addr-modal-${area.value}`} value={area.value}>{area.label}</option>
                ))}
              </select>
            </label>
            <label className="app-modal-field">
              <span>Tipo de servicio</span>
              <select value={logisticsAddressDraft.serviceType} onChange={(event) => setLogisticsAddressDraft((current) => ({ ...current, serviceType: event.target.value }))}>
                {TRANSPORT_SERVICE_TYPE_OPTIONS.map((entry) => (
                  <option key={`addr-service-${entry.value}`} value={entry.value}>{entry.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="app-modal-field transport-field-full">
            <span>Dirección</span>
            <textarea rows={2} value={logisticsAddressDraft.address} onChange={(event) => setLogisticsAddressDraft((current) => ({ ...current, address: event.target.value }))} placeholder="Calle, colonia, número exterior e interior" />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>Contacto</span>
              <input value={logisticsAddressDraft.contactName} onChange={(event) => setLogisticsAddressDraft((current) => ({ ...current, contactName: event.target.value }))} placeholder="Nombre de contacto" />
            </label>
            <label className="app-modal-field">
              <span>Teléfono</span>
              <input value={logisticsAddressDraft.phone} onChange={(event) => setLogisticsAddressDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="WhatsApp o teléfono" />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>Notas</span>
              <input value={logisticsAddressDraft.notes} onChange={(event) => setLogisticsAddressDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Observaciones" />
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={logisticsExpenseModalOpen}
        title="Agregar gasto"
        confirmLabel={logisticsSaving ? "Guardando..." : "Guardar gasto"}
        cancelLabel="Cancelar"
        onClose={() => setLogisticsExpenseModalOpen(false)}
        onConfirm={() => addTransportExpense()}
      >
        <div className="modal-form-grid">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>Fecha</span>
              <SpanishDateInput value={logisticsExpenseDraft.dateKey} onChange={(event) => setLogisticsExpenseDraft((current) => ({ ...current, dateKey: event.target.value }))} placeholder="Seleccionar fecha" />
            </label>
            <label className="app-modal-field">
              <span>Tipo</span>
              <select value={logisticsExpenseDraft.expenseType} onChange={(event) => setLogisticsExpenseDraft((current) => ({ ...current, expenseType: event.target.value }))}>
                <option value="combustible">Combustible</option>
                <option value="caseta">Caseta</option>
                <option value="taxi">Taxi</option>
                <option value="viatico">Viático</option>
                <option value="gasto">Gasto</option>
                <option value="otro">Otro</option>
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>Importe</span>
              <input type="number" min="0" step="0.01" value={logisticsExpenseDraft.amount} onChange={(event) => setLogisticsExpenseDraft((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" />
            </label>
            <label className="app-modal-field">
              <span>Área</span>
              <select value={logisticsExpenseDraft.areaId} onChange={(event) => setLogisticsExpenseDraft((current) => ({ ...current, areaId: event.target.value }))}>
                <option value="">Sin área</option>
                {transportLogisticsAreaOptions.map((area) => (
                  <option key={`exp-modal-${area.value}`} value={area.value}>{area.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>Ruta</span>
              <input value={logisticsExpenseDraft.routeLabel} onChange={(event) => setLogisticsExpenseDraft((current) => ({ ...current, routeLabel: event.target.value }))} placeholder="Ruta o referencia" />
            </label>
            <label className="app-modal-field">
              <span>Referencia</span>
              <input value={logisticsExpenseDraft.reference} onChange={(event) => setLogisticsExpenseDraft((current) => ({ ...current, reference: event.target.value }))} placeholder="Folio, ticket o factura" />
            </label>
          </div>

          <label className="app-modal-field transport-field-full">
            <span>Descripción</span>
            <textarea rows={2} value={logisticsExpenseDraft.description} onChange={(event) => setLogisticsExpenseDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Detalle del gasto" />
          </label>
        </div>
      </Modal>

      <Modal
        open={logisticsUnitModalOpen}
        title="Agregar unidad"
        confirmLabel={logisticsSaving ? "Guardando..." : "Guardar unidad"}
        cancelLabel="Cancelar"
        onClose={() => setLogisticsUnitModalOpen(false)}
        onConfirm={addTransportUnit}
      >
        <div className="modal-form-grid">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>Unidad</span>
              <input value={logisticsUnitDraft.unitName} onChange={(event) => setLogisticsUnitDraft((current) => ({ ...current, unitName: event.target.value }))} placeholder="Ej. Camioneta 01" />
            </label>
            <label className="app-modal-field">
              <span>Código interno</span>
              <input value={logisticsUnitDraft.unitCode} onChange={(event) => setLogisticsUnitDraft((current) => ({ ...current, unitCode: event.target.value }))} placeholder="Ej. U-01" />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>Placas</span>
              <input value={logisticsUnitDraft.plate} onChange={(event) => setLogisticsUnitDraft((current) => ({ ...current, plate: event.target.value }))} placeholder="ABC-123-A" />
            </label>
            <label className="app-modal-field">
              <span>Modelo</span>
              <input value={logisticsUnitDraft.model} onChange={(event) => setLogisticsUnitDraft((current) => ({ ...current, model: event.target.value }))} placeholder="Nissan NP300 2022" />
            </label>
          </div>

          <label className="app-modal-field">
            <span>Área</span>
            <select value={logisticsUnitDraft.areaId} onChange={(event) => setLogisticsUnitDraft((current) => ({ ...current, areaId: event.target.value }))}>
              <option value="">Sin área</option>
              {transportLogisticsAreaOptions.map((area) => (
                <option key={`unit-modal-${area.value}`} value={area.value}>{area.label}</option>
              ))}
            </select>
          </label>

          <label className="app-modal-field transport-field-full">
            <span>Notas</span>
            <textarea rows={2} value={logisticsUnitDraft.notes} onChange={(event) => setLogisticsUnitDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Observaciones de la unidad" />
          </label>

          <div className="app-modal-field transport-field-full">
            <span>Foto de la unidad</span>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="icon-button sm-button" onClick={() => unitPhotoInputRef.current?.click()} disabled={uploadingUnitPhoto}>
                {uploadingUnitPhoto ? "Subiendo..." : "Subir foto"}
              </button>
              {logisticsUnitDraft.photo?.url ? (
                <img src={logisticsUnitDraft.photo.thumbnailUrl || logisticsUnitDraft.photo.url} alt="Unidad" style={{ width: "56px", height: "56px", borderRadius: "0.7rem", objectFit: "cover", border: "1px solid rgba(49, 77, 105, 0.18)" }} />
              ) : <span className="subtle-line">Sin foto</span>}
            </div>
            <input ref={unitPhotoInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleUploadUnitPhoto} />
          </div>
        </div>
      </Modal>

      <Modal
        open={logisticsUnitServiceModalOpen}
        title="Registrar servicio de unidad"
        confirmLabel={logisticsSaving ? "Guardando..." : "Guardar servicio"}
        cancelLabel="Cancelar"
        onClose={() => setLogisticsUnitServiceModalOpen(false)}
        onConfirm={addTransportUnitServiceLog}
      >
        <div className="modal-form-grid">
          <label className="app-modal-field">
            <span>Unidad</span>
            <select value={logisticsUnitServiceDraft.unitId} onChange={(event) => setLogisticsUnitServiceDraft((current) => ({ ...current, unitId: event.target.value }))}>
              <option value="">Selecciona unidad</option>
              {transportUnits.map((unit) => <option key={`service-unit-${unit.id}`} value={unit.id}>{unit.unitName || unit.unitCode || unit.plate || unit.id}</option>)}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>Fecha</span>
              <SpanishDateInput value={logisticsUnitServiceDraft.dateKey} onChange={(event) => setLogisticsUnitServiceDraft((current) => ({ ...current, dateKey: event.target.value }))} placeholder="Seleccionar fecha" />
            </label>
            <label className="app-modal-field">
              <span>Servicio</span>
              <input value={logisticsUnitServiceDraft.serviceLabel} onChange={(event) => setLogisticsUnitServiceDraft((current) => ({ ...current, serviceLabel: event.target.value }))} placeholder="Ej. Entrega ruta SONATA" />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.6rem" }}>
            <label className="app-modal-field">
              <span>KM antes</span>
              <input type="number" min="0" step="0.1" value={logisticsUnitServiceDraft.kmBefore} onChange={(event) => setLogisticsUnitServiceDraft((current) => ({ ...current, kmBefore: event.target.value }))} placeholder="0" />
            </label>
            <label className="app-modal-field">
              <span>KM después</span>
              <input type="number" min="0" step="0.1" value={logisticsUnitServiceDraft.kmAfter} onChange={(event) => setLogisticsUnitServiceDraft((current) => ({ ...current, kmAfter: event.target.value }))} placeholder="0" />
            </label>
          </div>

          <label className="app-modal-field transport-field-full">
            <span>Notas</span>
            <textarea rows={2} value={logisticsUnitServiceDraft.notes} onChange={(event) => setLogisticsUnitServiceDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Observaciones del servicio" />
          </label>
        </div>
      </Modal>

      <Modal
        open={logisticsUnitChecklistModalOpen}
        title="Checklist de unidad"
        confirmLabel={logisticsSaving ? "Guardando..." : "Guardar checklist"}
        cancelLabel="Cancelar"
        onClose={() => {
          setIsChecklistEditMode(false);
          setLogisticsUnitChecklistModalOpen(false);
        }}
        onConfirm={addTransportUnitChecklist}
      >
        <div className="modal-form-grid">
          <label className="app-modal-field">
            <span>Unidad</span>
            <select value={logisticsUnitChecklistDraft.unitId} onChange={(event) => setLogisticsUnitChecklistDraft((current) => ({ ...current, unitId: event.target.value }))}>
              <option value="">Selecciona unidad</option>
              {transportUnits.map((unit) => <option key={`check-unit-${unit.id}`} value={unit.id}>{unit.unitName || unit.unitCode || unit.plate || unit.id}</option>)}
            </select>
          </label>

          <label className="app-modal-field">
            <span>Fecha</span>
            <SpanishDateInput value={logisticsUnitChecklistDraft.dateKey} onChange={(event) => setLogisticsUnitChecklistDraft((current) => ({ ...current, dateKey: event.target.value }))} placeholder="Seleccionar fecha" />
          </label>

          <div className="transport-field-full" style={{ display: "grid", gap: "0.45rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#315753" }}>Checklist operativo detallado</span>
              {canManageLogisticsTab ? (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setIsChecklistEditMode((current) => !current)}
                >
                  {isChecklistEditMode ? "Terminar edición" : "Editar checklist"}
                </button>
              ) : null}
            </div>
            {checklistGroupsForModal.map((group) => (
              <div key={group.section} className="transport-checklist-group">
                <div className="transport-checklist-group-head">
                  <strong>{group.section}</strong>
                </div>
                <div className="transport-checklist-items">
                  {group.items.map((checkItem) => {
                    const itemValue = logisticsUnitChecklistDraft.checks?.[checkItem.key] || {};
                    const status = resolveChecklistItemStatus(itemValue);
                    const evidence = resolveChecklistItemEvidence(itemValue);
                    return (
                      <div key={checkItem.key} className={`transport-checklist-item ${status === "bad" ? "is-bad" : ""}`}>
                        <div className="transport-checklist-row">
                          <div>
                            <span>{checkItem.label}</span>
                          </div>
                          <div className="transport-checklist-switch-wrap">
                            <span
                              className="chip"
                              style={{
                                background: status === "bad" ? "rgba(185, 28, 28, 0.14)" : "rgba(42, 96, 143, 0.14)",
                                color: status === "bad" ? "#991b1b" : "#2d4f72",
                              }}
                            >
                              {status === "bad" ? "Malo" : "Bueno"}
                            </span>
                            <button
                              type="button"
                              className={`switch-button transport-schedule-switch ${status !== "bad" ? "on" : ""}`}
                              onClick={() => setLogisticsUnitChecklistDraft((current) => ({
                                ...current,
                                checks: {
                                  ...(current.checks || {}),
                                  [checkItem.key]: {
                                    ...(current.checks?.[checkItem.key] || {}),
                                    status: resolveChecklistItemStatus(current.checks?.[checkItem.key]) === "bad" ? "good" : "bad",
                                    label: checkItem.label,
                                    section: group.section,
                                  },
                                },
                              }))}
                              aria-label={`Cambiar estado de ${checkItem.label}`}
                            >
                              <span className="switch-thumb" />
                            </button>
                            {canManageLogisticsTab && isChecklistEditMode ? (
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => removeTransportChecklistItem(checkItem.key)}
                              >
                                Eliminar
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {status === "bad" ? (
                          <div className="transport-checklist-evidence-wrap">
                            <label className="app-modal-field transport-field-full" style={{ marginBottom: 0 }}>
                              <span>Motivo de incidencia</span>
                              <textarea
                                rows={2}
                                value={String(itemValue?.notes || "")}
                                onChange={(event) => setLogisticsUnitChecklistDraft((current) => ({
                                  ...current,
                                  checks: {
                                    ...(current.checks || {}),
                                    [checkItem.key]: {
                                      ...(current.checks?.[checkItem.key] || {}),
                                      notes: event.target.value,
                                      label: checkItem.label,
                                      section: group.section,
                                    },
                                  },
                                }))}
                                placeholder="Describe por qué se marcó incidencia"
                              />
                            </label>

                            <label className="app-modal-field transport-field-full" style={{ marginBottom: 0 }}>
                              <span>Evidencia del hallazgo</span>
                              <input
                                ref={(node) => {
                                  if (node) checklistCameraInputRefs.current[checkItem.key] = node;
                                  else delete checklistCameraInputRefs.current[checkItem.key];
                                }}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={(event) => handleUploadUnitChecklistEvidence(event, checkItem.key)}
                                disabled={uploadingUnitChecklistEvidence}
                                style={{ display: "none" }}
                              />
                              <input
                                ref={(node) => {
                                  if (node) checklistUploadInputRefs.current[checkItem.key] = node;
                                  else delete checklistUploadInputRefs.current[checkItem.key];
                                }}
                                type="file"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                onChange={(event) => handleUploadUnitChecklistEvidence(event, checkItem.key)}
                                disabled={uploadingUnitChecklistEvidence}
                                style={{ display: "none" }}
                              />
                            </label>
                            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => checklistCameraInputRefs.current[checkItem.key]?.click()}
                                disabled={uploadingUnitChecklistEvidence}
                              >
                                Tomar foto
                              </button>
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => checklistUploadInputRefs.current[checkItem.key]?.click()}
                                disabled={uploadingUnitChecklistEvidence}
                              >
                                Subir archivo
                              </button>
                            </div>
                            {evidence?.url ? (
                              <button
                                type="button"
                                className="icon-button"
                                onClick={() => setEvidenceViewer({ open: true, evidence, title: `Evidencia: ${checkItem.label}` })}
                              >
                                Ver evidencia
                              </button>
                            ) : (
                              <span className="subtle-line">Captura o sube evidencia para continuar.</span>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {canManageLogisticsTab && isChecklistEditMode ? (
              <div className="transport-checklist-group" style={{ background: "rgba(237, 245, 243, 0.8)" }}>
                <div className="transport-checklist-group-head">
                  <strong>Editar checklist (agregar check)</strong>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 1fr) minmax(220px, 2fr) auto", gap: "0.45rem", alignItems: "end" }}>
                  <label className="app-modal-field" style={{ marginBottom: 0 }}>
                    <span>Sección</span>
                    <select
                      value={checklistCustomItemDraft.section}
                      onChange={(event) => setChecklistCustomItemDraft((current) => ({ ...current, section: event.target.value }))}
                    >
                      {[...new Set([...(TRANSPORT_CHECKLIST_STRUCTURE.map((entry) => entry.section)), "General"])].map((section) => (
                        <option key={`check-section-${section}`} value={section}>{section}</option>
                      ))}
                    </select>
                  </label>
                  <label className="app-modal-field" style={{ marginBottom: 0 }}>
                    <span>Nuevo check</span>
                    <input
                      value={checklistCustomItemDraft.label}
                      onChange={(event) => setChecklistCustomItemDraft((current) => ({ ...current, label: event.target.value }))}
                      placeholder="Ej. Cinturón de seguridad"
                    />
                  </label>
                  <button type="button" className="icon-button" onClick={addTransportChecklistCustomItem}>Agregar</button>
                </div>
              </div>
            ) : null}
          </div>

          <label className="app-modal-field transport-field-full">
            <span>Notas</span>
            <textarea rows={2} value={logisticsUnitChecklistDraft.notes} onChange={(event) => setLogisticsUnitChecklistDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Hallazgos del checklist" />
          </label>
        </div>
      </Modal>

      <Modal
        open={incidenciaModalOpen}
        title={incidenciaEditId ? "Editar incidencia de transporte" : "Nueva incidencia de transporte"}
        confirmLabel={incidenciaSaving ? "Guardando..." : incidenciaEditId ? "Guardar cambios" : "Registrar incidencia"}
        cancelLabel="Cancelar"
        onClose={() => {
          setIncidenciaError("");
          setIncidenciaModalOpen(false);
        }}
        onConfirm={saveTransportIncidencia}
      >
        <div className="modal-form-grid">
          {incidenciaError ? <div className="status-banner status-banner-error">{incidenciaError}</div> : null}

          <label className="app-modal-field transport-field-full">
            <span>Título</span>
            <input
              value={incidenciaDraft.title}
              onChange={(event) => setIncidenciaDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Ej. Falla de frenos en ruta norte"
            />
          </label>

          <label className="app-modal-field transport-field-full">
            <span>Descripción</span>
            <textarea
              rows={3}
              value={incidenciaDraft.description}
              onChange={(event) => setIncidenciaDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Describe lo sucedido y la acción requerida"
            />
          </label>

          <label className="app-modal-field">
            <span>Área / ruta</span>
            <input
              value={incidenciaDraft.area}
              onChange={(event) => setIncidenciaDraft((current) => ({ ...current, area: event.target.value }))}
              placeholder="Ej. Pedidos / Ruta 03"
            />
          </label>

          <label className="app-modal-field">
            <span>Prioridad</span>
            <select value={incidenciaDraft.priority} onChange={(event) => setIncidenciaDraft((current) => ({ ...current, priority: event.target.value }))}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </label>

          <label className="app-modal-field">
            <span>Estado</span>
            <select value={incidenciaDraft.status} onChange={(event) => setIncidenciaDraft((current) => ({ ...current, status: event.target.value }))}>
              <option value="abierta">Abierta</option>
              <option value="en_proceso">En proceso</option>
              <option value="resuelta">Resuelta</option>
              <option value="cerrada">Cerrada</option>
            </select>
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(incidenciaDeleteId)}
        title="Eliminar incidencia"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onClose={() => setIncidenciaDeleteId(null)}
        onConfirm={() => removeTransportIncidencia(incidenciaDeleteId)}
      >
        <p style={{ margin: 0 }}>
          Esta acción eliminará la incidencia de transporte seleccionada. ¿Deseas continuar?
        </p>
      </Modal>

      <Modal
        className="transport-record-modal"
        open={transportModal.open}
        title={transportModal.mode === "create" ? "Agregar registro de envio" : "Editar registro de envio"}
        confirmLabel={transportModal.mode === "create" ? "Guardar registro" : "Guardar cambios"}
        cancelLabel="Cancelar"
        onClose={() => {
          setTransportModalError("");
          setTransportModal(createTransportModalState(selectedArea?.id || ""));
        }}
        onConfirm={submitTransportModal}
      >
        <div className="modal-form-grid transport-record-grid">
          {transportModalError ? (
            <div
              className="transport-field-full"
              style={{
                background: "#ffebee",
                border: "1px solid #ff8a80",
                color: "#c62828",
                borderRadius: "0.75rem",
                padding: "0.65rem 0.8rem",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              {transportModalError}
            </div>
          ) : null}

          <div className="transport-field-full transport-inline-top-row">
            <div className="app-modal-field transport-inline-area">
              <span>Area</span>
              <div className="transport-readonly-field">{selectedArea?.label || "Area"}</div>
            </div>

            <label className="app-modal-field transport-inline-boxes">
              <span>Cajas a mandar</span>
              <input
                type="number"
                min="0"
                value={transportModal.boxes}
                onChange={(event) => setTransportModal((current) => ({ ...current, boxes: event.target.value }))}
                placeholder="0"
              />
            </label>

            <label className="app-modal-field transport-inline-pieces">
              <span>Piezas a mandar</span>
              <input
                type="number"
                min="0"
                value={transportModal.pieces}
                onChange={(event) => setTransportModal((current) => ({ ...current, pieces: event.target.value }))}
                placeholder="0"
              />
            </label>
          </div>

          {transportModal.mode === "create" ? (
            <div className="transport-field-full transport-destination-schedule-row">
              <label className="app-modal-field transport-destination-field">
                <span>Destino</span>
                <select
                  value={transportModal.destination}
                  onChange={(event) => setTransportModal((current) => ({ ...current, destination: event.target.value }))}
                >
                  {(destinationMenuGroupsByArea[transportModal.areaId] || []).map((group) => (
                    <optgroup key={`dest-group-create-${transportModal.areaId}-${group.serviceType}`} label={group.label}>
                      {group.destinations.map((destination) => (
                        <option key={`dest-create-${group.serviceType}-${destination}`} value={destination}>{destination}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <div className="transport-schedule-row" role="group" aria-label="Programación de envío">
                <div className="transport-schedule-row-copy">
                  <strong>Programar envío</strong>
                  <span>Activa para definir fecha, hora y recordatorio.</span>
                </div>
                <button
                  type="button"
                  className={`switch-button transport-schedule-switch ${transportModal.isScheduled ? "on" : ""}`.trim()}
                  role="switch"
                  aria-checked={Boolean(transportModal.isScheduled)}
                  aria-label="Programar envío"
                  onClick={() => setTransportModal((current) => ({ ...current, isScheduled: !current.isScheduled }))}
                >
                  <span className="switch-thumb" />
                </button>
              </div>
            </div>
          ) : (
            <label className="app-modal-field transport-field-span-2">
              <span>Destino</span>
              <select
                value={transportModal.destination}
                onChange={(event) => setTransportModal((current) => ({ ...current, destination: event.target.value }))}
              >
                {(destinationMenuGroupsByArea[transportModal.areaId] || []).map((group) => (
                  <optgroup key={`dest-group-edit-${transportModal.areaId}-${group.serviceType}`} label={group.label}>
                    {group.destinations.map((destination) => (
                      <option key={`dest-edit-${group.serviceType}-${destination}`} value={destination}>{destination}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}

          <label className="app-modal-field transport-field-full">
            <span>Notas</span>
            <textarea
              value={transportModal.notes}
              onChange={(event) => setTransportModal((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Detalle opcional del envio"
              rows={2}
            />
          </label>

          {transportModal.mode === "create" ? (
            <>
              {transportModal.isScheduled ? (
                <div className="transport-field-full transport-schedule-panel">
                  <label className="app-modal-field">
                    <span>Fecha programada</span>
                    <SpanishDateInput
                      value={transportModal.scheduledDate}
                      onChange={(event) => setTransportModal((current) => ({ ...current, scheduledDate: event.target.value }))}
                      placeholder="Seleccionar fecha"
                    />
                  </label>

                  <label className="app-modal-field">
                    <span>Hora programada</span>
                    <input
                      type="time"
                      value={transportModal.scheduledTime}
                      onChange={(event) => setTransportModal((current) => ({ ...current, scheduledTime: event.target.value }))}
                    />
                  </label>

                  <label className="app-modal-field">
                    <span>Recordatorio (min)</span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={transportModal.remindBeforeMinutes}
                      onChange={(event) => setTransportModal((current) => ({ ...current, remindBeforeMinutes: event.target.value }))}
                      placeholder="60"
                    />
                  </label>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="app-modal-field transport-field-full">
            <span>Evidencia <span style={{ color: "#b05050" }}>*</span></span>
            <div className="transport-upload-actions">
              <button type="button" className="icon-button sm-button" onClick={() => cameraInputRef.current?.click()} disabled={uploadingEvidence}>
                {uploadingEvidence ? "Subiendo evidencia..." : "Tomar foto"}
              </button>
              <button type="button" className="icon-button sm-button" onClick={() => fileInputRef.current?.click()} disabled={uploadingEvidence}>
                {uploadingEvidence ? "Subiendo evidencia..." : "Subir desde dispositivo"}
              </button>
              {transportModal.evidence?.url ? (
                <button type="button" className="transport-upload-preview" onClick={() => openEvidenceViewer({ destination: transportModal.destination, evidence: transportModal.evidence })}>
                  {isImageEvidence(transportModal.evidence) ? (
                    <img src={transportModal.evidence.thumbnailUrl || transportModal.evidence.url} alt={transportModal.evidence.name || "Evidencia subida"} />
                  ) : isVideoEvidence(transportModal.evidence) ? (
                    <video src={transportModal.evidence.url} poster={transportModal.evidence.thumbnailUrl || undefined} muted playsInline preload="metadata" />
                  ) : (
                    <span>{transportModal.evidence.name || "Archivo cargado"}</span>
                  )}
                </button>
              ) : (
                <span className="subtle-line">Debes adjuntar una evidencia para guardar.</span>
              )}
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: "none" }}
              onChange={handleUploadEvidence}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf"
              style={{ display: "none" }}
              onChange={handleUploadEvidence}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={postponeModal.open}
        title={`Posponer envío: ${postponeModal.destination || "Destino"}`}
        confirmLabel="Guardar pospuesto"
        cancelLabel="Cancelar"
        onClose={() => setPostponeModal(createPostponeModalState())}
        onConfirm={submitPostponeModal}
      >
        <div className="modal-form-grid">
          <label className="app-modal-field">
            <span>Fecha nueva de entrega</span>
            <SpanishDateInput
              value={postponeModal.postponedDate}
              onChange={(event) => setPostponeModal((prev) => ({ ...prev, postponedDate: event.target.value }))}
              placeholder="Seleccionar fecha"
            />
          </label>
          <label className="app-modal-field">
            <span>Hora nueva de entrega</span>
            <input
              type="time"
              value={postponeModal.postponedTime}
              onChange={(event) => setPostponeModal((prev) => ({ ...prev, postponedTime: event.target.value }))}
            />
          </label>
          <label className="app-modal-field transport-field-full">
            <span>Recordar con anticipación (minutos)</span>
            <input
              type="number"
              min="0"
              step="5"
              value={postponeModal.remindBeforeMinutes}
              onChange={(event) => setPostponeModal((prev) => ({ ...prev, remindBeforeMinutes: event.target.value }))}
              placeholder="60"
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={deleteTransportModal.open}
        title={`Eliminar envío: ${deleteTransportModal.destination || "Destino"}`}
        confirmLabel={deleteTransportModal.submitting ? "Eliminando..." : "Eliminar"}
        cancelLabel="Cancelar"
        onClose={() => setDeleteTransportModal(createDeleteTransportModalState())}
        onConfirm={submitDeleteTransportModal}
      >
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <p className="subtle-line" style={{ margin: 0 }}>
            Esta acción eliminará el registro de forma permanente.
          </p>
          {deleteTransportModal.error ? (
            <div
              role="alert"
              style={{
                background: "rgba(176, 80, 80, 0.12)",
                color: "#7d1e1e",
                border: "1px solid rgba(176, 80, 80, 0.25)",
                borderRadius: "0.75rem",
                padding: "0.55rem 0.65rem",
                fontSize: "0.84rem",
                fontWeight: 600,
              }}
            >
              {deleteTransportModal.error}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        className="modal-wide transport-evidence-viewer-modal"
        open={evidenceViewer.open}
        title={evidenceViewer.title || "Vista previa de evidencia"}
        confirmLabel="Cerrar"
        hideCancel
        onClose={closeEvidenceViewer}
      >
        <div className="transport-evidence-viewer-body">
          {isImageEvidence(evidenceViewer.evidence) ? (
            <img src={evidenceViewer.evidence?.url} alt={evidenceViewer.evidence?.name || evidenceViewer.title || "Evidencia"} className="transport-evidence-viewer-media" />
          ) : isVideoEvidence(evidenceViewer.evidence) ? (
            <video src={evidenceViewer.evidence?.url} poster={evidenceViewer.evidence?.thumbnailUrl || undefined} className="transport-evidence-viewer-media" controls autoPlay />
          ) : (
            <a href={evidenceViewer.evidence?.url} target="_blank" rel="noreferrer" className="transport-evidence-file-link">
              {evidenceViewer.evidence?.name || "Abrir archivo"}
            </a>
          )}
        </div>
      </Modal>

      {/* ── Documentación: Create/Edit Modal ── */}
      <Modal
        className="transport-record-modal"
        open={docModal.open}
        title={docModal.mode === "create" ? "Nuevo registro de documentación" : "Editar registro de documentación"}
        confirmLabel={docModal.mode === "create" ? "Guardar registro" : "Guardar cambios"}
        cancelLabel="Cancelar"
                onClose={() => {
                  setDocModal(createDocModalState());
                  setDocAreaMode(customAreas.length ? "select" : "new");
                }}
        onConfirm={submitDocModal}
      >
        <div className="modal-form-grid transport-record-grid">
          <div className="transport-field-full doc-three-inputs-row">
            {/* Ubicación */}
            <label className="app-modal-field">
              <span>Ubicación</span>
              <select
                value={docModal.ubicacion}
                onChange={(e) => setDocModal((prev) => ({ ...prev, ubicacion: e.target.value }))}
              >
                <option value="SONATA">SONATA</option>
                <option value="CEDIS">CEDIS</option>
              </select>
            </label>

            {/* Área */}
            <label className="app-modal-field">
              <span>Área</span>
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                {docAreaMode === "select" && customAreas.length > 0 ? (
                  <select
                    value={docModal.area}
                    onChange={(e) => setDocModal((prev) => ({ ...prev, area: e.target.value }))}
                    style={{ flex: 1 }}
                  >
                    <option value="">Seleccionar área...</option>
                    {customAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={docModal.area}
                    onChange={(e) => setDocModal((prev) => ({ ...prev, area: e.target.value }))}
                    placeholder="Escribe el área"
                    style={{ flex: 1 }}
                  />
                )}
                <button
                  type="button"
                  className="icon-button sm-button"
                  onClick={() => {
                    if (docAreaMode === "select") {
                      setDocAreaMode("new");
                      setDocModal((prev) => ({ ...prev, area: "" }));
                    } else {
                      setDocAreaMode("select");
                      setDocModal((prev) => ({ ...prev, area: customAreas[0] || prev.area }));
                    }
                  }}
                  title={docAreaMode === "select" ? "Agregar nueva área" : "Elegir del menú"}
                  aria-label={docAreaMode === "select" ? "Agregar nueva área" : "Elegir del menú"}
                >
                  <Plus size={13} />
                </button>
              </div>
            </label>

            {/* Dirigido a */}
            <label className="app-modal-field">
              <span>Dirigido a</span>
              <input
                type="text"
                value={docModal.dirigidoA}
                onChange={(e) => setDocModal((prev) => ({ ...prev, dirigidoA: e.target.value }))}
                placeholder="Nombre del destinatario"
              />
            </label>
          </div>

          {/* Notas */}
          <label className="app-modal-field transport-field-full">
            <span>Notas</span>
            <textarea
              value={docModal.notas}
              onChange={(e) => setDocModal((prev) => ({ ...prev, notas: e.target.value }))}
              placeholder="Descripción del documento o paquete (opcional)"
              rows={2}
            />
          </label>

          {/* Evidencia */}
          <div className="app-modal-field transport-field-full">
            <span>Evidencia <span style={{ color: "#b05050" }}>*</span></span>
            <div className="transport-upload-actions">
              <button type="button" className="icon-button sm-button" onClick={() => docEvidenceCameraRef.current?.click()} disabled={uploadingDocEvidence}>
                {uploadingDocEvidence ? "Subiendo..." : "Tomar foto"}
              </button>
              <button type="button" className="icon-button sm-button" onClick={() => docEvidenceInputRef.current?.click()} disabled={uploadingDocEvidence}>
                {uploadingDocEvidence ? "Subiendo..." : "Subir archivo"}
              </button>
              {docModal.evidence?.url ? (
                <button type="button" className="transport-upload-preview" onClick={() => setDocEvidenceViewer({ open: true, evidence: docModal.evidence, title: "Evidencia" })}>
                  {isImageEvidence(docModal.evidence) ? (
                    <img src={docModal.evidence.thumbnailUrl || docModal.evidence.url} alt={docModal.evidence.name || "Evidencia"} />
                  ) : (
                    <span>{docModal.evidence.name || "Archivo cargado"}</span>
                  )}
                </button>
              ) : (
                <span className="subtle-line">Debes adjuntar una evidencia para guardar.</span>
              )}
            </div>
            <input ref={docEvidenceCameraRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleUploadDocEvidence} />
            <input ref={docEvidenceInputRef} type="file" accept="image/*,video/*,.pdf" style={{ display: "none" }} onChange={handleUploadDocEvidence} />
          </div>
        </div>
      </Modal>

      {/* ── Documentación: evidence viewer ── */}
      <Modal
        className="modal-wide transport-evidence-viewer-modal"
        open={docEvidenceViewer.open}
        title={docEvidenceViewer.title || "Vista previa"}
        confirmLabel="Cerrar"
        hideCancel
        onClose={() => setDocEvidenceViewer({ open: false, evidence: null, title: "" })}
      >
        <div className="transport-evidence-viewer-body">
          {isImageEvidence(docEvidenceViewer.evidence) ? (
            <img src={docEvidenceViewer.evidence?.url} alt={docEvidenceViewer.evidence?.name || "Evidencia"} className="transport-evidence-viewer-media" />
          ) : isVideoEvidence(docEvidenceViewer.evidence) ? (
            <video src={docEvidenceViewer.evidence?.url} poster={docEvidenceViewer.evidence?.thumbnailUrl || undefined} className="transport-evidence-viewer-media" controls autoPlay />
          ) : (
            <a href={docEvidenceViewer.evidence?.url} target="_blank" rel="noreferrer" className="transport-evidence-file-link">
              {docEvidenceViewer.evidence?.name || "Abrir archivo"}
            </a>
          )}
        </div>
      </Modal>
    </section>
  );
}
