
// ── Componentes de Dashboard ─────────────────────────────────────────────────
// StatusBadge, MetricCard, InventoryStockBar, DashboardKpiCard, DashboardBarRow,
// DashboardRankItem, DashboardProgressMetric, DashboardParetoRow, DashboardCauseCard,
// DashboardSection, DashboardPieChart, DashboardColumnChart, DashboardLineChart,
// DashboardParetoChart, DashboardIshikawaDiagram, CopmecBrand, StatTile
// ─────────────────────────────────────────────────────────────────────────────

import { ArrowDown } from "lucide-react";
import copmecLogo from "../assets/axo-logo.png";

const KPI_STYLES = {
  cyan:  { iconBg: "#53dde5", iconColor: "#178e94" },
  green: { iconBg: "#7fa6c9", iconColor: "#3d6388" },
  red:   { iconBg: "#ff5f5f", iconColor: "#bf2f2f" },
  lime:  { iconBg: "#669bc9", iconColor: "#2f5577" },
  amber: { iconBg: "#ffbf47", iconColor: "#b87800" },
  slate: { iconBg: "#eef1f7", iconColor: "#8a94a6" },
};

const DASHBOARD_CHART_PALETTE = ["#0ea5e9", "#405db0", "#3375af", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];
const DASHBOARD_LINE_PALETTE  = ["#0ea5e9", "#405db0", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

// ── Componentes simples ───────────────────────────────────────────────────────

export function StatusBadge({ status }) {
  return <span className={`status-badge ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>;
}

/** Desglose legible de registros por estado (antes C/R/P). */
export function formatDashboardRecordStatusSummary({
  completed = 0,
  running = 0,
  paused = 0,
  totalRecords = 0,
  completionPercent,
}) {
  const total = Math.max(0, Number(totalRecords) || 0);
  const terminados = Math.max(0, Number(completed) || 0);
  const enCurso = Math.max(0, Number(running) || 0);
  const pausados = Math.max(0, Number(paused) || 0);
  const pendientes = Math.max(0, total - terminados - enCurso - pausados);
  const cumplimiento = Number.isFinite(Number(completionPercent))
    ? Number(completionPercent)
    : (total ? (terminados / total) * 100 : 0);

  const chips = [
    { key: "finished", label: "Terminados", count: terminados },
    { key: "running", label: "En curso", count: enCurso },
    { key: "paused", label: "Pausados", count: pausados },
    ...(pendientes > 0 ? [{ key: "pending", label: "Pendientes", count: pendientes }] : []),
  ];

  const partes = [
    `${terminados} terminado${terminados === 1 ? "" : "s"}`,
    `${enCurso} en curso`,
    `${pausados} pausado${pausados === 1 ? "" : "s"}`,
  ];
  if (pendientes > 0) partes.push(`${pendientes} pendiente${pendientes === 1 ? "" : "s"}`);

  const cumplimientoTexto = total > 0
    ? `${cumplimiento.toFixed(1)}% cumplimiento · ${terminados} de ${total} registros`
    : "Sin registros en el periodo";

  return {
    chips,
    cumplimiento,
    cumplimientoTexto,
    pdfLine: total > 0 ? `${partes.join(" · ")} — ${cumplimientoTexto}` : "Sin registros",
  };
}

export function DashboardRecordStatusCell({
  completed = 0,
  running = 0,
  paused = 0,
  totalRecords = 0,
  completionPercent,
  compact = false,
}) {
  const { chips, cumplimientoTexto } = formatDashboardRecordStatusSummary({
    completed,
    running,
    paused,
    totalRecords,
    completionPercent,
  });

  return (
    <div className={`dashboard-record-status${compact ? " dashboard-record-status--compact" : ""}`}>
      <div className="dashboard-record-status-chips" aria-label="Registros por estado">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className={`dashboard-record-status-chip dashboard-record-status-chip--${chip.key}${chip.count === 0 ? " dashboard-record-status-chip--zero" : ""}`}
          >
            <strong>{chip.count}</strong>
            <span>{chip.label}</span>
          </span>
        ))}
      </div>
      <p className="dashboard-record-status-compliance">{cumplimientoTexto}</p>
    </div>
  );
}

export function MetricCard({ label, value, hint, tone = "default" }) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

export function InventoryStockBar({ current, minimum, unitLabel = "pzas", target = null, primaryLabel = "", secondaryLabel = "", className = "" }) {
  const safeCurrent = Math.max(0, Number(current || 0));
  const safeMinimum = Math.max(0, Number(minimum || 0));
  const safeTarget  = Math.max(0, Number(target || 0));
  const baseline = Math.max(safeTarget || (safeMinimum > 0 ? safeMinimum * 2 : safeCurrent), 1);
  const percent  = Math.min(100, (safeCurrent / baseline) * 100);
  const isLow    = safeMinimum > 0 ? safeCurrent <= safeMinimum : safeCurrent === 0;
  const resolvedPrimaryLabel   = primaryLabel   || `${safeCurrent} ${unitLabel}`;
  const resolvedSecondaryLabel = secondaryLabel || (safeMinimum > 0 ? `Mínimo ${safeMinimum} ${unitLabel}` : `Objetivo ${baseline} ${unitLabel}`);
  return (
    <div className={`progress-row ${className}`.trim()}>
      <div className="progress-row-head">
        <span>{resolvedPrimaryLabel}</span>
        <small>{resolvedSecondaryLabel}</small>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${isLow ? "danger" : ""}`} style={{ width: `${Math.max(8, percent)}%` }} />
      </div>
    </div>
  );
}

export function DashboardKpiCard({ title, value, valueMeta, _subtitle, tone, icon: Icon }) {
  const palette = KPI_STYLES[tone] || KPI_STYLES.cyan;
  return (
    <article className="dashboard-kpi-card">
      <div className="dashboard-kpi-head">
        <div className="dashboard-kpi-icon" style={{ backgroundColor: palette.iconBg, color: palette.iconColor }}>
          {Icon ? <Icon size={14} strokeWidth={2.1} /> : null}
        </div>
      </div>
      <span>{title}</span>
      <strong>
        {value}
        {valueMeta ? <span className="dashboard-kpi-value-meta">{valueMeta}</span> : null}
      </strong>
    </article>
  );
}

const KPI_BENTO_THEMES = {
  cyan: { accent: "#0891b2", bg: "linear-gradient(135deg, #ecfeff 0%, #ffffff 72%)", ring: "rgba(8, 145, 178, 0.22)" },
  green: { accent: "#059669", bg: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 72%)", ring: "rgba(5, 150, 105, 0.2)" },
  red: { accent: "#dc2626", bg: "linear-gradient(135deg, #fef2f2 0%, #ffffff 72%)", ring: "rgba(220, 38, 38, 0.2)" },
  lime: { accent: "#4d7c0f", bg: "linear-gradient(135deg, #f7fee7 0%, #ffffff 72%)", ring: "rgba(77, 124, 15, 0.2)" },
  amber: { accent: "#d97706", bg: "linear-gradient(135deg, #fffbeb 0%, #ffffff 72%)", ring: "rgba(217, 119, 6, 0.22)" },
  slate: { accent: "#475569", bg: "linear-gradient(135deg, #f8fafc 0%, #ffffff 72%)", ring: "rgba(71, 85, 105, 0.18)" },
};

/** KPI de bento: tipografía grande, barra lateral de color, aspecto distinto al card clásico. */
export function DashboardKpiBento({ title, value, subtitle, tone, icon: Icon, progress = null, compact = false }) {
  const theme = KPI_BENTO_THEMES[tone] || KPI_BENTO_THEMES.cyan;
  const progressValue = Number.isFinite(Number(progress)) ? Math.min(100, Math.max(0, Number(progress))) : null;

  return (
    <article
      className={`dashboard-kpi-bento${compact ? " dashboard-kpi-bento--compact" : ""}`}
      style={{
        background: theme.bg,
        borderColor: theme.ring,
        boxShadow: `inset 4px 0 0 ${theme.accent}`,
      }}
    >
      <div className="dashboard-kpi-bento-top">
        <div className="dashboard-kpi-bento-icon" style={{ color: theme.accent, background: `${theme.accent}18` }}>
          {Icon ? <Icon size={18} strokeWidth={2.2} /> : null}
        </div>
        {progressValue !== null ? (
          <div className="dashboard-kpi-bento-ring" style={{ background: `conic-gradient(${theme.accent} ${progressValue}%, #e2e8f0 0)` }}>
            <span>{Math.round(progressValue)}%</span>
          </div>
        ) : null}
      </div>
      <p className="dashboard-kpi-bento-label">{title}</p>
      <p className="dashboard-kpi-bento-value">{value}</p>
      {subtitle ? <p className="dashboard-kpi-bento-sub">{subtitle}</p> : null}
    </article>
  );
}

export function DashboardBarRow({ label, value, max, color, trailing, initial }) {
  const percent = max > 0 ? Math.max(6, Math.min(100, (value / max) * 100)) : 6;
  return (
    <div className="dashboard-bar-row">
      <div className="dashboard-bar-track" />
      <div className="dashboard-bar-fill" style={{ width: `${percent}%`, background: color }} />
      <div className="dashboard-bar-content">
        <div className="dashboard-bar-identity">
          <span className="dashboard-initial-badge" style={{ background: color }}>{initial}</span>
          <span>{label}</span>
        </div>
        <strong>{trailing}</strong>
      </div>
    </div>
  );
}

export function DashboardRankItem({ index, label, value, color, highlighted = false }) {
  return (
    <li className={`dashboard-rank-item ${highlighted ? "highlighted" : ""}`}>
      <span className="dashboard-rank-index" style={{ background: color }}>{index}</span>
      <div>
        <strong>{label}</strong>
        <small>{value}</small>
      </div>
    </li>
  );
}

export function DashboardProgressMetric({ label, valueText, percent, color }) {
  return (
    <div className="dashboard-progress-metric">
      <span>{label}</span>
      <div className="dashboard-progress-metric-main">
        <div className="dashboard-progress-metric-track">
          <div className="dashboard-progress-metric-fill" style={{ width: `${Math.max(8, Math.min(100, percent))}%`, background: color }} />
        </div>
        <strong>{valueText}</strong>
      </div>
    </div>
  );
}

export function DashboardParetoRow({ label, percent, cumulativePercent, impactText, highlight = false }) {
  return (
    <div className={`dashboard-pareto-row ${highlight ? "highlight" : ""}`}>
      <div className="dashboard-pareto-row-head">
        <strong>{label}</strong>
        <span>{impactText}</span>
      </div>
      <div className="dashboard-pareto-bars">
        <div className="dashboard-pareto-track">
          <div className="dashboard-pareto-fill" style={{ width: `${Math.max(8, Math.min(100, percent))}%` }} />
        </div>
        <div className="dashboard-pareto-track cumulative">
          <div className="dashboard-pareto-fill cumulative" style={{ width: `${Math.max(8, Math.min(100, cumulativePercent))}%` }} />
        </div>
      </div>
      <small>{percent.toFixed(1)}% impacto · {cumulativePercent.toFixed(1)}% acumulado</small>
    </div>
  );
}

export function DashboardCauseCard({ title, share, count, examples }) {
  return (
    <article className="dashboard-cause-card">
      <div className="dashboard-cause-card-head">
        <strong>{title}</strong>
        <span>{share.toFixed(1)}%</span>
      </div>
      <small>{count} hallazgo(s) o causa(s) asociada(s)</small>
      <div className="saved-board-list dashboard-cause-chip-list">
        {examples.length ? examples.map((example) => <span key={example} className="chip">{example}</span>) : <span className="chip">Sin detalle</span>}
      </div>
    </article>
  );
}

export function DashboardSection({ title, _subtitle, summary, icon: Icon, open = true, onToggle, children, zone = "default" }) {
  return (
    <details className={`dashboard-section dashboard-zone dashboard-zone--${zone}`} open={open}>
      <summary className="dashboard-section-summary" onClick={(event) => {
        event.preventDefault();
        onToggle?.();
      }}>
        <div className="dashboard-section-summary-main">
          <div className="dashboard-section-summary-icon">
            {Icon ? <Icon size={18} /> : null}
          </div>
          <div>
            <strong>{title}</strong>
          </div>
        </div>
        <div className="dashboard-section-summary-side">
          {summary ? <small>{summary}</small> : null}
          <span className="dashboard-section-chevron">
            <ArrowDown size={16} />
          </span>
        </div>
      </summary>
      <div className="dashboard-section-body">{children}</div>
    </details>
  );
}

// ── Gráficas ──────────────────────────────────────────────────────────────────

export function DashboardPieChart({ rows }) {
  if (!rows.length) {
    return <p className="dashboard-empty-state">No hay datos suficientes para la gráfica de pastel.</p>;
  }

  let start = 0;
  const segments = rows.map((item, index) => {
    const color = item.solidColor || DASHBOARD_CHART_PALETTE[index % DASHBOARD_CHART_PALETTE.length];
    const end = start + item.percent;
    const segment = `${color} ${start}% ${end}%`;
    start = end; // eslint-disable-line react-hooks/immutability
    return segment;
  });

  return (
    <div className="dashboard-pie-layout">
      <div className="dashboard-pie-shell">
        <div className="dashboard-pie-chart" style={{ background: `conic-gradient(${segments.join(", ")})` }}>
          <div className="dashboard-pie-core">
            <strong>{rows.reduce((sum, item) => sum + item.count, 0)}</strong>
            <span>registros</span>
          </div>
        </div>
      </div>
      <div className="dashboard-chart-legend">
        {rows.map((item, index) => {
          const color = item.solidColor || DASHBOARD_CHART_PALETTE[index % DASHBOARD_CHART_PALETTE.length];
          return (
            <div key={item.responsibleId || item.label || index} className="dashboard-legend-item">
              <span className="dashboard-legend-swatch" style={{ background: color }} />
              <div>
                <strong>{item.label}</strong>
                <small>{item.count} registros · {item.percent.toFixed(1)}%</small>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardColumnChart({ rows, color = "linear-gradient(180deg, #0ea5e9 0%, #405db0 100%)", valueSuffix = "", emptyLabel = "No hay datos para la gráfica." }) {
  if (!rows.length) {
    return <p className="dashboard-empty-state">{emptyLabel}</p>;
  }

  const max = Math.max(...rows.map((item) => item.value), 1);

  return (
    <div className="dashboard-column-chart">
      {rows.map((item, index) => {
        const height = Math.max(14, (item.value / max) * 100);
        return (
          <div key={item.key || item.label || index} className="dashboard-column-item">
            <span className="dashboard-column-value">{item.valueLabel || `${Math.round(item.value)}${valueSuffix}`}</span>
            <div className="dashboard-column-track">
              <div className="dashboard-column-bar" style={{ height: `${height}%`, background: item.color || color }} title={item.tooltip || item.valueLabel || String(item.value)} />
            </div>
            <small>{item.label}</small>
          </div>
        );
      })}
    </div>
  );
}

function shortChartLabel(label) {
  if (!label) return "";
  // "Semana · 6 abr 2026 - 12 abr 2026" → "6-12 abr"
  let s = label.replace(/\bSemana\s*·\s*/i, "").trim();
  // Strip 4-digit years
  s = s.replace(/\s*\d{4}/g, "").trim();
  // "6 abr - 12 abr" → "6-12 abr" (same month)
  const rangeMatch = s.match(/^(\d+)\s+(\w+)\s*[-–]\s*(\d+)\s+(\w+)$/);
  if (rangeMatch) {
    const [, d1, m1, d2, m2] = rangeMatch;
    return m1 === m2 ? `${d1}-${d2} ${m1}` : `${d1} ${m1}-${d2} ${m2}`;
  }
  // "1ra quincena · mayo" or "2da quincena · mayo"
  s = s.replace(/quincena\s*·\s*/i, "q. ").replace(/([12])[ra|da]+\s+q\./i, "$1ª q.");
  return s.length > 14 ? s.substring(0, 13) + "…" : s;
}

export function DashboardLineChart({ series = [], emptyLabel = "No hay datos para la gráfica." }) {
  if (!series.length || series.every((s) => !s.data?.length)) {
    return <p className="dashboard-empty-state">{emptyLabel}</p>;
  }

  const width  = 520;
  const height = 200;
  const padLeft   = 36;
  const padRight  = 12;
  const padTop    = 14;
  const padBottom = 54;
  const chartW = width  - padLeft - padRight;
  const chartH = height - padTop  - padBottom;

  const allValues  = series.flatMap((s) => s.data.map((d) => d.y));
  const maxVal     = Math.max(...allValues, 1);
  const minVal     = Math.min(...allValues.filter((v) => v > 0), 0);
  const range      = Math.max(maxVal - minVal, 1);
  const xLabels    = series[0]?.data.map((d) => shortChartLabel(d.label)) ?? [];
  const pointCount = xLabels.length;
  const xStep      = pointCount > 1 ? chartW / (pointCount - 1) : 0;

  // Skip labels if they'd overlap (estimated px per char at 9px)
  const avgLabelPx = (xLabels.reduce((acc, l) => acc + l.length, 0) / (xLabels.length || 1)) * 5.6 * 0.7;
  const labelInterval = xStep > 0 ? Math.max(1, Math.ceil(avgLabelPx / xStep)) : 1;

  function toX(index) { return pointCount === 1 ? padLeft + chartW / 2 : padLeft + index * xStep; }
  function toY(value) { return padTop + chartH - ((value - minVal) / range) * chartH; }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(minVal + t * range));
  const baselineY = height - padBottom;

  return (
    <div className="dashboard-linechart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} className="dashboard-line-chart" overflow="hidden" aria-label="Gráfico de líneas">
        <defs>
          {series.map((s, idx) => {
            const color = s.color || DASHBOARD_LINE_PALETTE[idx % DASHBOARD_LINE_PALETTE.length];
            return (
              <linearGradient key={`lg-${s.key || idx}`} id={`lineArea-${s.key || idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            );
          })}
        </defs>

        {yTicks.map((tick, tidx) => (
          <g key={tidx}>
            <line x1={padLeft} y1={toY(tick)} x2={width - padRight} y2={toY(tick)} className="dashboard-grid-line" />
            <text x={padLeft - 4} y={toY(tick) + 4} className="dashboard-axis-label" textAnchor="end">{tick > 999 ? `${(tick / 1000).toFixed(1)}k` : tick}</text>
          </g>
        ))}

        <line x1={padLeft} y1={padTop} x2={padLeft} y2={baselineY} className="dashboard-axis-line" />
        <line x1={padLeft} y1={baselineY} x2={width - padRight} y2={baselineY} className="dashboard-axis-line" />

        {xLabels.map((label, idx) => {
          if (idx % labelInterval !== 0) return null;
          const x = toX(idx);
          return (
            <text
              key={idx}
              x={x}
              y={baselineY + 5}
              fontSize="9"
              className="dashboard-axis-label"
              textAnchor="end"
              transform={`rotate(-40, ${x}, ${baselineY + 5})`}
            >
              {label}
            </text>
          );
        })}

        {series.map((s, idx) => {
          if (!s.data?.length) return null;
          const color    = s.color || DASHBOARD_LINE_PALETTE[idx % DASHBOARD_LINE_PALETTE.length];
          const pts      = s.data.map((d, i) => `${toX(i)},${toY(d.y)}`).join(" ");
          const fillPath = `M${toX(0)},${height - padBottom} `
            + s.data.map((d, i) => `L${toX(i)},${toY(d.y)}`).join(" ")
            + ` L${toX(s.data.length - 1)},${height - padBottom} Z`;

          return (
            <g key={s.key || idx}>
              <path d={fillPath} fill={`url(#lineArea-${s.key || idx})`} />
              <polyline points={pts} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {s.data.map((d, i) => (
                <circle key={i} cx={toX(i)} cy={toY(d.y)} r="4" fill={color} stroke="#ffffff" strokeWidth="1.8">
                  <title>{`${s.label}: ${d.y}${s.valueSuffix || ""}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {series.length > 1 && (
        <div className="dashboard-linechart-legend">
          {series.map((s, idx) => {
            const color = s.color || DASHBOARD_LINE_PALETTE[idx % DASHBOARD_LINE_PALETTE.length];
            return (
              <span key={s.key || idx} className="dashboard-linechart-legend-item">
                <span className="dashboard-linechart-legend-dot" style={{ background: color }} />
                {s.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DashboardParetoChart({ rows }) {
  if (!rows.length) {
    return <p className="dashboard-empty-state">No hay datos suficientes para la gráfica de Pareto.</p>;
  }

  const width      = 520;
  const height     = 220;
  const chartLeft  = 38;
  const chartBottom = 30;
  const chartTop   = 18;
  const chartHeight = height - chartBottom - chartTop;
  const chartWidth  = width - chartLeft - 16;
  const barSlot    = chartWidth / rows.length;
  const barWidth   = Math.max(18, barSlot * 0.52);
  const maxPercent = Math.max(...rows.map((item) => item.percent), 1);

  const linePoints = rows.map((item, index) => {
    const x = chartLeft + barSlot * index + barSlot / 2;
    const y = chartTop + chartHeight - (item.cumulativePercent / 100) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="dashboard-pareto-chart-shell">
      <svg viewBox={`0 0 ${width} ${height}`} className="dashboard-pareto-chart" aria-labelledby="dashboard-pareto-chart-title">
        <title id="dashboard-pareto-chart-title">Gráfica de Pareto de incidencias e impacto</title>
        <defs>
          <linearGradient id="paretoBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#405db0" />
          </linearGradient>
        </defs>
        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={height - chartBottom} className="dashboard-axis-line" />
        <line x1={chartLeft} y1={height - chartBottom} x2={width - 8} y2={height - chartBottom} className="dashboard-axis-line" />
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = chartTop + chartHeight - (tick / 100) * chartHeight;
          return (
            <g key={tick}>
              <line x1={chartLeft} y1={y} x2={width - 8} y2={y} className="dashboard-grid-line" />
              <text x={6} y={y + 4} className="dashboard-axis-label">{tick}%</text>
            </g>
          );
        })}
        {rows.map((item, index) => {
          const x = chartLeft + barSlot * index + (barSlot - barWidth) / 2;
          const barHeight = (item.percent / maxPercent) * chartHeight;
          const y = chartTop + chartHeight - barHeight;
          return (
            <g key={item.label}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="8" className="dashboard-pareto-bar" />
              <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" className="dashboard-axis-label small">{index + 1}</text>
            </g>
          );
        })}
        <polyline points={linePoints} fill="none" className="dashboard-pareto-line" />
        {rows.map((item, index) => {
          const x = chartLeft + barSlot * index + barSlot / 2;
          const y = chartTop + chartHeight - (item.cumulativePercent / 100) * chartHeight;
          return <circle key={`${item.label}-point`} cx={x} cy={y} r="4.5" className="dashboard-pareto-point" />;
        })}
      </svg>
      <div className="dashboard-pareto-footnote">Barras = impacto individual. Línea = impacto acumulado.</div>
    </div>
  );
}

export function DashboardIshikawaDiagram({ rows }) {
  if (!rows.length) {
    return <p className="dashboard-empty-state">No hay datos suficientes para el diagrama de Ishikawa.</p>;
  }

  return (
    <div className="dashboard-fishbone-shell">
      <div className="dashboard-fishbone-spine" />
      <div className="dashboard-fishbone-head">Impacto operativo</div>
      {rows.map((item, index) => {
        const branchClass = index % 2 === 0 ? "top" : "bottom";
        return (
          <article key={item.category} className={`dashboard-fishbone-branch ${branchClass}`.trim()}>
            <span className="dashboard-fishbone-line" />
            <div className="dashboard-fishbone-card">
              <div className="dashboard-fishbone-card-head">
                <strong>{item.category}</strong>
                <span>{item.impact.toFixed(1)}%</span>
              </div>
              <small>{item.count} causas asociadas</small>
              <p>{item.examples.join(" · ") || "Sin detalle"}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ── Marca e identidad ─────────────────────────────────────────────────────────

export function CopmecBrand({ headingTag = "h1", subtitle = "Sistema de Gestión Operativa.", tone = "dark", compact = false, showKicker = false, kicker = "AXO" }) {
  const HeadingTag = headingTag;
  return (
    <div className={`copmec-brand ${tone} ${compact ? "compact" : ""}`.trim()}>
      <div className="copmec-logo-mark" aria-hidden="true">
        <img src={copmecLogo} alt="" className="copmec-logo-image" />
      </div>
      <div className="copmec-brand-copy">
        {showKicker ? <span className="copmec-brand-kicker">{kicker}</span> : null}
        <HeadingTag>AXO</HeadingTag>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function StatTile({ label, value, tone = "default", className = "", onClick = null, title = "" }) {
  const interactive = typeof onClick === "function";
  const classNames = `stat-tile ${tone} ${interactive ? "stat-tile-interactive" : ""} ${className}`.trim();

  if (interactive) {
    return (
      <button type="button" className={classNames} onClick={onClick} title={title || label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </button>
    );
  }

  return (
    <article className={classNames}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
