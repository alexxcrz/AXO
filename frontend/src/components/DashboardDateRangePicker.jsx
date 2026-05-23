import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DASHBOARD_WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function parseDashboardDate(value) {
  if (!value) return null;
  const next = new Date(`${value}T00:00:00`);
  return Number.isNaN(next.getTime()) ? null : next;
}

function formatDashboardDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDashboardDateLabel(date) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function isSameDashboardDay(left, right) {
  return Boolean(left && right)
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function buildDashboardCalendarDays(monthDate) {
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

function getDashboardDatePopoverStyle(triggerElement) {
  if (!triggerElement) return null;

  const rect = triggerElement.getBoundingClientRect();
  const viewportWidth = globalThis.innerWidth;
  const viewportHeight = globalThis.innerHeight;
  const gap = 8;
  const minWidth = 332;
  const maxWidth = viewportWidth - 16;
  const width = Math.min(Math.max(rect.width, minWidth), maxWidth);
  const left = Math.min(Math.max(8, rect.left), Math.max(8, viewportWidth - width - 8));
  const estimatedHeight = 360;
  const openUpwards = rect.bottom + gap + estimatedHeight > viewportHeight && rect.top > estimatedHeight;
  const top = openUpwards ? Math.max(8, rect.top - gap - estimatedHeight) : rect.bottom + gap;

  return {
    position: "fixed",
    top,
    left,
    width,
    zIndex: 80,
  };
}

export default function DashboardDateRangePicker({
  startDate,
  endDate,
  onChange,
  grouping = "mes",
  onGroupingChange,
  selectedYear,
  yearOptions,
  onYearChange,
}) {
  const pickerRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDashboardDate(startDate) || parseDashboardDate(endDate) || new Date());
  const [draftStartDate, setDraftStartDate] = useState(startDate || "");
  const [draftEndDate, setDraftEndDate] = useState(endDate || "");
  const [popoverStyle, setPopoverStyle] = useState(null);

  const start = parseDashboardDate(startDate);
  const end = parseDashboardDate(endDate);
  const draftStart = parseDashboardDate(draftStartDate);
  const draftEnd = parseDashboardDate(draftEndDate);
  const calendarDays = useMemo(() => buildDashboardCalendarDays(visibleMonth), [visibleMonth]);
  const monthLabel = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(visibleMonth);
  const groupingLabel = grouping === "semana" ? "Vista diaria" : grouping === "anio" ? "Vista mensual" : "Vista semanal";
  const effectiveYear = Number(selectedYear) || visibleMonth.getFullYear();
  const resolvedYearOptions = useMemo(() => {
    if (Array.isArray(yearOptions) && yearOptions.length) {
      return [...yearOptions]
        .map((year) => Number(year))
        .filter((year) => Number.isInteger(year) && year > 0)
        .sort((left, right) => right - left);
    }
    const baseYear = visibleMonth.getFullYear();
    return Array.from({ length: 7 }, (_, index) => baseYear + 3 - index);
  }, [visibleMonth, yearOptions]);
  const buttonLabel = start && end
    ? `${formatDashboardDateLabel(start)} - ${formatDashboardDateLabel(end)}`
    : start
      ? `${formatDashboardDateLabel(start)} - Selecciona fin`
      : "Seleccionar rango de fechas";

  const applyDraftAndClose = useCallback(() => {
    onChange({ startDate: draftStartDate, endDate: draftEndDate });
    setIsOpen(false);
  }, [draftEndDate, draftStartDate, onChange]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      const clickedTrigger = pickerRef.current?.contains(event.target);
      const clickedPopover = popoverRef.current?.contains(event.target);
      if (!clickedTrigger && !clickedPopover) {
        applyDraftAndClose();
      }
    }

    globalThis.addEventListener("pointerdown", handlePointerDown);
    return () => globalThis.removeEventListener("pointerdown", handlePointerDown);
  }, [applyDraftAndClose, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function updatePopoverPosition() {
      setPopoverStyle(getDashboardDatePopoverStyle(triggerRef.current));
    }

    updatePopoverPosition();
    globalThis.addEventListener("resize", updatePopoverPosition, { passive: true });
    globalThis.addEventListener("scroll", updatePopoverPosition, { capture: true, passive: true });
    return () => {
      globalThis.removeEventListener("resize", updatePopoverPosition);
      globalThis.removeEventListener("scroll", updatePopoverPosition, { capture: true });
    };
  }, [isOpen]);

  function handleDaySelection(day) {
    const selectedValue = formatDashboardDateValue(day);
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStartDate(selectedValue);
      setDraftEndDate("");
      return;
    }

    if (day.getTime() < draftStart.getTime()) {
      setDraftStartDate(selectedValue);
      setDraftEndDate(formatDashboardDateValue(draftStart));
      return;
    }

    setDraftEndDate(selectedValue);
  }

  function applyVisibleYearRange() {
    const year = visibleMonth.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    setDraftStartDate(formatDashboardDateValue(yearStart));
    setDraftEndDate(formatDashboardDateValue(yearEnd));
  }

  function handleYearSelection() {
    onGroupingChange?.("anio");
    applyVisibleYearRange();
  }

  function handleYearChange(event) {
    const nextYear = Number(event.target.value) || visibleMonth.getFullYear();
    onYearChange?.(nextYear);
    const nextVisible = new Date(nextYear, visibleMonth.getMonth(), 1);
    setVisibleMonth(nextVisible);
    const yearStart = new Date(nextYear, 0, 1);
    const yearEnd = new Date(nextYear, 11, 31);
    setDraftStartDate(formatDashboardDateValue(yearStart));
    setDraftEndDate(formatDashboardDateValue(yearEnd));
  }

  return (
    <div ref={pickerRef} className="dashboard-date-range-shell">
      <button
        ref={triggerRef}
        type="button"
        className={`dashboard-date-range-trigger ${isOpen ? "open" : ""}`}
        onClick={() => {
          setIsOpen((current) => {
            if (current) return false;
            setDraftStartDate(startDate || "");
            setDraftEndDate(endDate || "");
            return true;
          });
        }}
      >
        <span>{buttonLabel}</span>
        <small>{startDate || endDate ? `Rango activo · ${groupingLabel}` : "Sin filtro por fecha"}</small>
      </button>
      {isOpen && popoverStyle ? createPortal(
        <div ref={popoverRef} className="dashboard-date-range-popover" style={popoverStyle}>
          <div className="dashboard-date-range-header">
            <button type="button" className="icon-button" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>{"<"}</button>
            {grouping === "anio" ? (
              <label className="dashboard-date-range-year-select">
                <span>Año</span>
                <select value={effectiveYear} onChange={handleYearChange}>
                  {resolvedYearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            ) : (
              <strong>{monthLabel}</strong>
            )}
            <button type="button" className="icon-button" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>{">"}</button>
          </div>
          <div className="dashboard-date-range-weekdays">
            {DASHBOARD_WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
          </div>
          <div className="dashboard-date-range-grid">
            {calendarDays.map((day) => {
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelectedStart = isSameDashboardDay(day, draftStart);
              const isSelectedEnd = isSameDashboardDay(day, draftEnd);
              const isInRange = draftStart && draftEnd && day.getTime() > draftStart.getTime() && day.getTime() < draftEnd.getTime();
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`dashboard-date-cell ${isCurrentMonth ? "" : "muted"} ${isSelectedStart || isSelectedEnd ? "selected" : ""} ${isInRange ? "in-range" : ""}`.trim()}
                  onClick={() => handleDaySelection(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="dashboard-date-range-footer">
            <button type="button" className="icon-button" onClick={() => { setDraftStartDate(""); setDraftEndDate(""); }}>Limpiar</button>
            <button type="button" className="icon-button" onClick={handleYearSelection} style={grouping === "anio" ? { borderColor: "#355f88", color: "#355f88" } : undefined}>Año completo</button>
            <button type="button" className="icon-button" onClick={applyDraftAndClose}>Confirmar</button>
            <button type="button" className="icon-button" onClick={applyDraftAndClose}>Cerrar</button>
          </div>
        </div>,
        globalThis.document.body,
      ) : null}
    </div>
  );
}
