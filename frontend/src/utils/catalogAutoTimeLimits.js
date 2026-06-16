export const CATALOG_AUTO_LIMITS_MIN_WEEKS = 3;
export const CATALOG_AUTO_LIMITS_MAX_WEEKS = 30;
export const CATALOG_AUTO_LIMITS_ROUND_STEP = 5;

export function roundMinutesToScaleOfFiveCeil(minutes) {
  const numeric = Number(minutes);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return CATALOG_AUTO_LIMITS_ROUND_STEP;
  }
  return Math.max(
    CATALOG_AUTO_LIMITS_ROUND_STEP,
    Math.ceil(numeric / CATALOG_AUTO_LIMITS_ROUND_STEP) * CATALOG_AUTO_LIMITS_ROUND_STEP,
  );
}
