/** Retired areas: hidden from navigation and migrated to OPERACIONES. */
export const DEPRECATED_AREA_MIGRATION_TARGET = "OPERACIONES";

const DEPRECATED_AREA_ROOT_MATCH_KEYS = new Set([
  "DIVISION 4",
  "DIVISION IV",
]);

export function normalizeAreaMatchKey(area) {
  return String(area || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function getDeprecatedAreaRootKey(area) {
  const normalized = String(area || "")
    .trim()
    .toUpperCase()
    .replaceAll("\\", "/")
    .replace(/\s*\/\s*/g, " / ");
  const root = normalized.split("/")[0]?.trim() || normalized;
  return normalizeAreaMatchKey(root);
}

export function isDeprecatedDynamicArea(area) {
  const rootKey = getDeprecatedAreaRootKey(area);
  return Boolean(rootKey) && DEPRECATED_AREA_ROOT_MATCH_KEYS.has(rootKey);
}

export function migrateDeprecatedAreaValue(area) {
  const normalized = String(area || "")
    .trim()
    .toUpperCase()
    .replaceAll("\\", "/")
    .replaceAll(" - ", " / ")
    .replaceAll(" > ", " / ")
    .replace(/\s*\/\s*/g, " / ");
  if (!normalized) return "";
  if (isDeprecatedDynamicArea(normalized)) return DEPRECATED_AREA_MIGRATION_TARGET;
  return normalized;
}
