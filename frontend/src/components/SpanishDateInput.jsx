import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  WEEKDAY_LABELS_ES,
  buildCalendarDays,
  formatDateDisplayEs,
  formatDateValue,
  formatMonthYearEs,
  isDateWithinBounds,
  isSameDay,
  parseDateValue,
} from "../utils/dateLocaleEs";
import "./SpanishDateInput.css";

/**
 * Selector de fecha en español (reemplaza input type="date" del navegador).
 */
export function SpanishDateInput({
  value = "",
  onChange,
  className = "",
  disabled = false,
  placeholder = "Seleccionar fecha",
  id,
  name,
  min,
  max,
  "aria-label": ariaLabel,
}) {
  const autoId = useId();
  const fieldId = id || `fecha-es-${autoId}`;
  const shellRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = parseDateValue(value);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate || new Date());
  const displayValue = formatDateDisplayEs(value);
  const calendarDays = buildCalendarDays(visibleMonth);
  const monthLabel = formatMonthYearEs(visibleMonth);

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event) {
      if (shellRef.current?.contains(event.target)) return;
      setIsOpen(false);
    }

    function handleEscape(event) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function emitChange(nextValue) {
    onChange?.({ target: { value: nextValue, name } });
  }

  function selectDay(day) {
    if (!isDateWithinBounds(day, min, max)) return;
    emitChange(formatDateValue(day));
    setIsOpen(false);
  }

  function selectToday() {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    if (!isDateWithinBounds(today, min, max)) return;
    emitChange(formatDateValue(today));
    setIsOpen(false);
  }

  function clearDate() {
    emitChange("");
    setIsOpen(false);
  }

  return (
    <div ref={shellRef} className={`spanish-date-input ${className}`.trim()}>
      <button
        id={fieldId}
        type="button"
        className={`spanish-date-input__trigger${isOpen ? " open" : ""}${displayValue ? "" : " is-empty"}`}
        onClick={() => !disabled && setIsOpen((current) => !current)}
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>{displayValue || placeholder}</span>
        <CalendarDays size={16} className="spanish-date-input__icon" aria-hidden />
      </button>

      {isOpen ? (
        <div className="spanish-date-input__popover" role="dialog" aria-label="Calendario en español">
          <div className="spanish-date-input__header">
            <button
              type="button"
              className="spanish-date-input__nav"
              aria-label="Mes anterior"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              {"<"}
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              className="spanish-date-input__nav"
              aria-label="Mes siguiente"
              onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              {">"}
            </button>
          </div>

          <div className="spanish-date-input__weekdays">
            {WEEKDAY_LABELS_ES.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="spanish-date-input__grid">
            {calendarDays.map((day) => {
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelected = isSameDay(day, selectedDate);
              const isDisabled = !isDateWithinBounds(day, min, max);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`spanish-date-input__day${isCurrentMonth ? "" : " muted"}${isSelected ? " selected" : ""}`}
                  onClick={() => selectDay(day)}
                  disabled={isDisabled}
                  aria-label={formatDateDisplayEs(formatDateValue(day))}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="spanish-date-input__footer">
            <button type="button" onClick={clearDate}>Limpiar</button>
            <button type="button" onClick={selectToday}>Hoy</button>
            <button type="button" className="primary" onClick={() => setIsOpen(false)}>Cerrar</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
