// Temporary debug helper: window.__copmec_exportHistory
// Usage from browser console:
// window.__copmec_exportHistory({ periodType: 'month'|'week'|'quincena1'|'quincena2', monthKey: '2026-05', weekId: '2026-W20' })

function toIsoDate(d) {
  const date = new Date(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toDayStart(value) {
  if (!value) return null;
  const d = new Date(value);
  d.setHours(0,0,0,0);
  return d;
}
function toDayEnd(value) {
  if (!value) return null;
  const d = new Date(value);
  d.setHours(23,59,59,999);
  return d;
}

function sanitizeFileNamePart(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0,80);
}

async function fetchWarehouseState() {
  const res = await fetch('/warehouse/state', { credentials: 'include' });
  if (!res.ok) throw new Error('fetch /warehouse/state failed: ' + res.status);
  return res.json();
}

async function computeWindowFromMonthKey(monthKey, periodType) {
  const parts = String(monthKey || '').split('-').map(p => Number(p));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  const [y, m] = parts;
  if (periodType === 'quincena2') {
    const start = toDayStart(new Date(y, m-1, 16));
    const end = toDayEnd(new Date(y, m, 0));
    return { start, end, label: `2da quincena ${start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`, fileSuffix: `quincena_2_${toIsoDate(start)}` };
  }
  if (periodType === 'quincena1') {
    const start = toDayStart(new Date(y, m-1, 1));
    const end = toDayEnd(new Date(y, m-1, 15));
    return { start, end, label: `1ra quincena ${start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`, fileSuffix: `quincena_1_${toIsoDate(start)}` };
  }
  // month
  const start = toDayStart(new Date(y, m-1, 1));
  const end = toDayEnd(new Date(y, m, 0));
  return { start, end, label: start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }), fileSuffix: `mes_${toIsoDate(start)}` };
}

async function computeWindowFromWeekId(state, weekId, periodType) {
  const weeks = Array.isArray(state.weeks) ? state.weeks : [];
  const found = weeks.find(w => String(w.id) === String(weekId)) || weeks[0] || null;
  const fallbackDate = (state.activities && state.activities[0] && state.activities[0].activityDate) || new Date().toISOString();
  const baseDate = found ? (found.startDate || found.endDate) : fallbackDate;
  const base = new Date(baseDate);
  if (periodType === 'week') {
    const start = toDayStart(found?.startDate || base);
    const end = toDayEnd(found?.endDate || found?.startDate || base);
    return { start, end, label: found?.name || `Semana ${toIsoDate(start)}`, fileSuffix: `semana_${toIsoDate(start)}` };
  }
  // delegate to month logic using base
  if (periodType === 'quincena1' || periodType === 'quincena2' || periodType === 'month') {
    const y = base.getFullYear();
    const m = base.getMonth();
    if (periodType === 'quincena1') {
      const start = toDayStart(new Date(y, m, 1));
      const end = toDayEnd(new Date(y, m, 15));
      return { start, end, label: `1ra quincena ${start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`, fileSuffix: `quincena_1_${toIsoDate(start)}` };
    }
    if (periodType === 'quincena2') {
      const start = toDayStart(new Date(y, m, 16));
      const end = toDayEnd(new Date(y, m+1, 0));
      return { start, end, label: `2da quincena ${start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`, fileSuffix: `quincena_2_${toIsoDate(start)}` };
    }
    const start = toDayStart(new Date(y, m, 1));
    const end = toDayEnd(new Date(y, m+1, 0));
    return { start, end, label: start.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }), fileSuffix: `mes_${toIsoDate(start)}` };
  }
  return null;
}

window.__copmec_exportHistory = async function debugExportHistory({ periodType = 'week', monthKey = null, weekId = null } = {}) {
  try {
    const state = await fetchWarehouseState();
    let win = null;
    if (monthKey) {
      win = await computeWindowFromMonthKey(monthKey, periodType);
    } else if (weekId) {
      win = await computeWindowFromWeekId(state, weekId, periodType);
    } else {
      // fallback: use active week in state
      const activeWeekId = state?.boardWeeklyCycle?.activeWeekKey || (state.weeks && state.weeks[0] && state.weeks[0].id) || null;
      win = await computeWindowFromWeekId(state, activeWeekId, periodType);
    }

    console.log('[COPMEC DEBUG] computedWindow:', win);
    if (!win) return { ok: false, reason: 'no_window' };

    // collect activities from state and filter by date
    const activities = Array.isArray(state.activities) ? state.activities : [];
    const startTime = win.start.getTime();
    const endTime = win.end.getTime();
    const rows = activities.filter(a => {
      const t = a && a.activityDate ? (new Date(a.activityDate)).getTime() : NaN;
      return Number.isFinite(t) && t >= startTime && t <= endTime;
    });

    const [{ jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text(`COPMEC - ${win.label}`, 40, 48);
    doc.setFontSize(10);
    doc.text(`Rango: ${win.start.toLocaleString()} - ${win.end.toLocaleString()}`, 40, 64);

    const body = (rows.length ? rows : [{ activityLabel: '(sin actividades en rango)' }]).map((r, i) => [String(i+1), String(r.activityDate || ''), String(r.activityLabel || r.activity || '(sin label)')]);
    autoTableModule.default(doc, {
      head: [['#', 'Fecha', 'Actividad']],
      body,
      startY: 84,
      styles: { fontSize: 9 },
    });

    const safeSuffix = sanitizeFileNamePart(win.fileSuffix || win.label || 'historial');
    const fileName = `copmec_historial_${safeSuffix}.pdf`;
    doc.save(fileName);
    console.log(`[COPMEC DEBUG] PDF generado: ${fileName} (filas: ${body.length})`);
    return { ok: true, fileName, rowsCount: body.length };
  } catch (err) {
    console.error('[COPMEC DEBUG] export error:', err);
    return { ok: false, error: String(err?.message || err) };
  }
};

console.log('COPMEC debug export helper loaded: window.__copmec_exportHistory');
