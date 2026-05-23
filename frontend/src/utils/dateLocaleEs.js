/** Utilidades de calendario en espanol (Mexico). */

export const WEEKDAY_LABELS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

const DATE_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
});

const DISPLAY_FORMATTER = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function parseDateValue(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const iso = raw.length === 10 ? `${raw}T12:00:00` : raw;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateValue(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateLabelEs(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return DATE_FORMATTER.format(date);
}

export function formatDateDisplayEs(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return "";
  return DISPLAY_FORMATTER.format(parsed);
}

export function formatMonthYearEs(monthDate) {
  if (!monthDate || Number.isNaN(monthDate.getTime())) return "";
  const label = MONTH_YEAR_FORMATTER.format(monthDate);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function isSameDay(left, right) {
  return Boolean(left && right)
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

export function buildCalendarDays(monthDate) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const offset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const next = new Date(gridStart);
    next.setDate(gridStart.getDate() + index);
    return next;
  });
}

export function isDateWithinBounds(date, min, max) {
  if (!date) return false;
  const minDate = parseDateValue(min);
  const maxDate = parseDateValue(max);
  if (minDate && date.getTime() < minDate.getTime()) return false;
  if (maxDate && date.getTime() > maxDate.getTime()) return false;
  return true;
}
