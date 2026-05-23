import { normalizeCatalogScheduledDaysBySite } from "../utils/utilidades.jsx";

const CATALOG_WEEKDAY_OPTIONS = [
  { value: 0, short: "L", label: "Lunes" },
  { value: 1, short: "M", label: "Martes" },
  { value: 2, short: "M", label: "Miercoles" },
  { value: 3, short: "J", label: "Jueves" },
  { value: 4, short: "V", label: "Viernes" },
  { value: 5, short: "S", label: "Sabado" },
];

function serializeCatalogScheduledDaysBySite(value) {
  const normalized = normalizeCatalogScheduledDaysBySite(value, []);
  const entries = Object.entries(normalized)
    .map(([site, days]) => `${site}:${days.join(";")}`)
    .filter((entry) => entry.endsWith(":") === false);
  return entries.join("|");
}

function parseCatalogScheduledDaysBySite(value, fallbackDays = []) {
  const raw = String(value || "").trim();
  if (!raw) return {};
  const parsed = raw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const [rawSite, rawDays = ""] = entry.split(":");
      const site = String(rawSite || "").trim().toUpperCase();
      if (!site) return accumulator;
      const dayValues = rawDays
        .split(/[;|,\s]+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => {
          const normalized = token.toLowerCase();
          if (normalized === "l" || normalized === "lun" || normalized === "lunes") return 0;
          if (normalized === "m" || normalized === "mar" || normalized === "martes") return 1;
          if (normalized === "x" || normalized === "mie" || normalized === "miércoles" || normalized === "miercoles") return 2;
          if (normalized === "j" || normalized === "jue" || normalized === "jueves") return 3;
          if (normalized === "v" || normalized === "vie" || normalized === "viernes") return 4;
          if (normalized === "s" || normalized === "sab" || normalized === "sábado" || normalized === "sabado") return 5;
          if (normalized === "d" || normalized === "dom" || normalized === "domingo") return 6;
          const numeric = Number(normalized);
          return Number.isFinite(numeric) ? numeric : null;
        })
        .filter((entryDay) => entryDay !== null);
      accumulator[site] = dayValues;
      return accumulator;
    }, {});
  return normalizeCatalogScheduledDaysBySite(parsed, fallbackDays);
}

function createEmptyCatalogModalState() {
  return {
    open: false,
    mode: "create",
    id: null,
    name: "",
    limit: "",
    mandatory: "true",
    frequency: "weekly",
    category: "General",
    area: "General",
    scheduledDays: [0, 1, 2, 3, 4, 5],
    scheduledDaysBySite: {},
    cleaningSites: [],
    siteMode: "general",
    submitting: false,
  };
}

export {
  CATALOG_WEEKDAY_OPTIONS,
  serializeCatalogScheduledDaysBySite,
  parseCatalogScheduledDaysBySite,
  createEmptyCatalogModalState,
};
