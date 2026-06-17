import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ClipboardList,
  Layers,
  Package,
  Printer,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { RETAIL_PO_STATUS, RETAIL_PO_STATUS_LABELS } from "../retail/retailModuleConfig.js";
import { RetailStatusBadge } from "../retail/retailUi.jsx";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const INCIDENT_TYPE_LABELS = {
  faltante: "Faltante",
  sobrante: "Sobrante",
  danado: "Producto danado",
  caducidad: "Caducidad",
  etiqueta: "Etiquetado",
  other: "Otro",
  otro: "Otro",
};

const STATUS_COLORS = {
  [RETAIL_PO_STATUS.DRAFT]: "#94a3b8",
  [RETAIL_PO_STATUS.PENDING_PICK]: "#0ea5e9",
  [RETAIL_PO_STATUS.PICKING]: "#6366f1",
  [RETAIL_PO_STATUS.PICKED_PARTIAL]: "#f59e0b",
  [RETAIL_PO_STATUS.PICKED]: "#8b5cf6",
  [RETAIL_PO_STATUS.CLOSING]: "#d97706",
  [RETAIL_PO_STATUS.CLOSED]: "#16a34a",
  [RETAIL_PO_STATUS.CANCELLED]: "#ef4444",
};

function toTime(value) {
  if (!value) return NaN;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function KpiCard({ icon, label, value, hint, accent = "#0f4c81", tone }) {
  const Icon = icon;
  return (
    <article className={`retail-kpi-card ${tone ? `retail-kpi-card--${tone}` : ""}`} style={{ "--kpi-accent": accent }}>
      <span className="retail-kpi-icon-wrap"><Icon size={18} /></span>
      <div className="retail-kpi-body">
        <span className="retail-kpi-label">{label}</span>
        <strong className="retail-kpi-value">{value}</strong>
        {hint ? <span className="retail-kpi-hint">{hint}</span> : null}
      </div>
    </article>
  );
}

function DonutChart({ rows }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  let acc = 0;
  const stops = rows.map((r) => {
    const start = total ? (acc / total) * 360 : 0;
    acc += r.value;
    const end = total ? (acc / total) * 360 : 0;
    return `${r.color} ${start}deg ${end}deg`;
  });
  const gradient = total ? `conic-gradient(${stops.join(", ")})` : "conic-gradient(#e2e8f0 0deg 360deg)";
  return (
    <div className="retail-donut-layout">
      <div className="retail-donut" style={{ background: gradient }}>
        <div className="retail-donut-hole">
          <strong>{total}</strong>
          <span>OC</span>
        </div>
      </div>
      <div className="retail-donut-legend">
        {rows.length ? rows.map((r) => (
          <div key={r.key} className="retail-legend-item">
            <span className="retail-legend-dot" style={{ background: r.color }} />
            <span className="retail-legend-label">{r.label}</span>
            <strong>{r.value}</strong>
            <em>{total ? Math.round((r.value / total) * 100) : 0}%</em>
          </div>
        )) : <span className="subtle-line">Aun no hay ordenes de compra.</span>}
      </div>
    </div>
  );
}

function ColumnChart({ rows, unit: _unit = "" }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="subtle-line">Sin datos para graficar.</p>;
  return (
    <div className="retail-columns">
      {rows.map((r) => (
        <div key={r.key} className="retail-column-item">
          <span className="retail-column-value">{r.value}</span>
          <div className="retail-column-track">
            <span className="retail-column-fill" style={{ height: `${Math.max(5, Math.round((r.value / max) * 100))}%`, background: r.color || "#355f88" }} />
          </div>
          <span className="retail-column-label" title={r.fullLabel || r.label}>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ points }) {
  if (!points.some((p) => p.value > 0)) return <p className="subtle-line">Aun sin historico de ordenes.</p>;
  const max = Math.max(1, ...points.map((p) => p.value));
  const W = 560;
  const H = 180;
  const padX = 36;
  const padY = 24;
  const step = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = padX + step * i;
    const y = H - padY - ((p.value / max) * (H - padY * 2));
    return { ...p, x, y };
  });
  const linePath = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath = `${padX},${H - padY} ${linePath} ${padX + step * (points.length - 1)},${H - padY}`;
  return (
    <div className="retail-line-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="retail-line-svg" role="img" aria-label="Tendencia de ordenes">
        <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="rgba(15,23,42,0.15)" strokeWidth="1" />
        <polygon points={areaPath} fill="rgba(15,76,129,0.10)" />
        <polyline points={linePath} fill="none" stroke="#0f4c81" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((c) => (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r="3.8" fill="#0f4c81" stroke="#fff" strokeWidth="1.5" />
            <text x={c.x} y={c.y - 9} textAnchor="middle" className="retail-line-value">{c.value}</text>
            <text x={c.x} y={H - 6} textAnchor="middle" className="retail-line-label">{c.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function RankingList({ rows, suffix = "OC" }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="subtle-line">Sin datos de clientes.</p>;
  return (
    <ol className="retail-ranking">
      {rows.map((r, i) => (
        <li key={r.key} className="retail-ranking-item">
          <span className={`retail-ranking-pos retail-ranking-pos--${i < 3 ? i + 1 : "n"}`}>{i + 1}</span>
          <div className="retail-ranking-body">
            <div className="retail-ranking-head">
              <span className="retail-ranking-name" title={r.label}>{r.label}</span>
              <strong>{r.value} {suffix}</strong>
            </div>
            <div className="retail-ranking-track">
              <span className="retail-ranking-fill" style={{ width: `${Math.max(6, Math.round((r.value / max) * 100))}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PlayerRankingList({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.score));
  if (!rows.length) return <p className="subtle-line">Sin actividad de players en retail.</p>;
  return (
    <ol className="retail-ranking">
      {rows.map((r, i) => (
        <li key={r.key} className="retail-ranking-item">
          <span className={`retail-ranking-pos retail-ranking-pos--${i < 3 ? i + 1 : "n"}`}>{i + 1}</span>
          <div className="retail-ranking-body">
            <div className="retail-ranking-head">
              <span className="retail-ranking-name" title={r.label}>{r.label}</span>
              <strong>{r.score} pts</strong>
            </div>
            <div className="retail-ranking-sub">Surtidos {r.picks} · Etiquetas {r.prints} · Cierres {r.closes} · Incid. {r.incidents}</div>
            <div className="retail-ranking-track">
              <span className="retail-ranking-fill" style={{ width: `${Math.max(6, Math.round((r.score / max) * 100))}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function RetailDashboard({ retail, purchaseOrders, products, printLog, incidents, users = [], can, onGoTab }) {
  void can;
  const [metricsNow] = useState(() => Date.now());
  const m = useMemo(() => {
    const clients = retail.clients || [];
    const suppliers = retail.suppliers || [];
    const footprints = retail.footprints || [];
    const boxes = retail.preassembledBoxes || [];

    const activeClients = clients.filter((c) => c.active !== false).length;
    const activeProducts = products.filter((p) => p.active !== false).length;
    const totalStock = products.reduce((s, p) => s + (Number(p.stockPieces) || 0), 0);
    const totalLots = products.reduce((s, p) => s + (Array.isArray(p.lots) ? p.lots.length : 0), 0);
    const outOfStock = products.filter((p) => (Number(p.stockPieces) || 0) <= 0).length;

    const now = metricsNow;
    const limit30 = now + 30 * DAY_MS;
    let expired = 0;
    let expiringSoon = 0;
    products.forEach((p) => (p.lots || []).forEach((lot) => {
      const t = toTime(lot.expiry);
      if (Number.isNaN(t)) return;
      if (t < now) expired += 1;
      else if (t <= limit30) expiringSoon += 1;
    }));

    const byStatus = {};
    Object.values(RETAIL_PO_STATUS).forEach((s) => { byStatus[s] = 0; });
    purchaseOrders.forEach((o) => { byStatus[o.status] = (byStatus[o.status] || 0) + 1; });

    const openPo = purchaseOrders.filter((o) => ![RETAIL_PO_STATUS.CLOSED, RETAIL_PO_STATUS.CANCELLED].includes(o.status)).length;
    const closedPo = byStatus[RETAIL_PO_STATUS.CLOSED] || 0;
    const inPicking = purchaseOrders.filter((o) => [RETAIL_PO_STATUS.PENDING_PICK, RETAIL_PO_STATUS.PICKING, RETAIL_PO_STATUS.PICKED_PARTIAL].includes(o.status)).length;
    const inClosing = purchaseOrders.filter((o) => [RETAIL_PO_STATUS.PICKED, RETAIL_PO_STATUS.PICKED_PARTIAL, RETAIL_PO_STATUS.CLOSING].includes(o.status)).length;

    let totalLines = 0;
    let qtyOrdered = 0;
    let qtyPicked = 0;
    purchaseOrders.forEach((o) => (o.lines || []).forEach((l) => {
      totalLines += 1;
      qtyOrdered += Number(l.qtyOrdered) || 0;
      qtyPicked += Number(l.qtyPicked) || 0;
    }));
    const fillRate = qtyOrdered > 0 ? Math.round((qtyPicked / qtyOrdered) * 100) : 0;
    const pendingPieces = Math.max(0, qtyOrdered - qtyPicked);

    let totalPallets = 0;
    let closedPallets = 0;
    purchaseOrders.forEach((o) => (o.pallets || []).forEach((pl) => {
      totalPallets += 1;
      if (pl.closed) closedPallets += 1;
    }));

    const availableBoxes = boxes.filter((b) => b.status === "available").length;

    const openIncidents = incidents.filter((i) => !i.resolved).length;
    const resolvedIncidents = incidents.filter((i) => i.resolved).length;
    const incidentsByType = {};
    incidents.forEach((i) => {
      const key = String(i.type || "otro").toLowerCase();
      incidentsByType[key] = (incidentsByType[key] || 0) + 1;
    });

    const reprints = printLog.filter((p) => p.reprint).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startToday = today.getTime();
    const startMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const poToday = purchaseOrders.filter((o) => toTime(o.createdAt) >= startToday).length;
    const poMonth = purchaseOrders.filter((o) => toTime(o.createdAt) >= startMonth).length;

    const trend = [];
    const baseMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(baseMonth.getFullYear(), baseMonth.getMonth() - i, 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = purchaseOrders.filter((o) => {
        const t = toTime(o.createdAt);
        return t >= d.getTime() && t < next.getTime();
      }).length;
      trend.push({ label: MONTH_LABELS[d.getMonth()], value: count });
    }

    const topStock = [...products]
      .filter((p) => (Number(p.stockPieces) || 0) > 0)
      .sort((a, b) => (Number(b.stockPieces) || 0) - (Number(a.stockPieces) || 0))
      .slice(0, 7)
      .map((p) => ({ key: p.id, label: p.code, fullLabel: `${p.code} ${p.name}`.trim(), value: Number(p.stockPieces) || 0, color: "#0ea5e9" }));

    const clientMap = {};
    purchaseOrders.forEach((o) => {
      const name = o.clientName || "Sin cliente";
      clientMap[name] = (clientMap[name] || 0) + 1;
    });
    const topClients = Object.entries(clientMap)
      .map(([label, value]) => ({ key: label, label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const userName = (userId) => {
      const user = users.find((u) => u.id === userId);
      return user?.name || user?.username || user?.jobTitle || "Player";
    };
    const playerStats = {};
    const bumpPlayer = (userId, field, amount = 1) => {
      if (!userId) return;
      if (!playerStats[userId]) playerStats[userId] = { picks: 0, prints: 0, closes: 0, incidents: 0 };
      playerStats[userId][field] += amount;
    };
    purchaseOrders.forEach((order) => {
      if (order.closedById) bumpPlayer(order.closedById, "closes");
      (order.lines || []).forEach((line) => {
        if (line.pickedById && Number(line.qtyPicked) > 0) bumpPlayer(line.pickedById, "picks");
      });
    });
    printLog.forEach((entry) => bumpPlayer(entry.printedById, "prints"));
    incidents.forEach((entry) => bumpPlayer(entry.createdById, "incidents"));
    const topPlayers = Object.entries(playerStats)
      .map(([userId, stats]) => ({
        key: userId,
        label: userName(userId),
        picks: stats.picks,
        prints: stats.prints,
        closes: stats.closes,
        incidents: stats.incidents,
        score: stats.picks + stats.prints * 2 + stats.closes * 3,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const statusRows = Object.values(RETAIL_PO_STATUS)
      .map((status) => ({ key: status, label: RETAIL_PO_STATUS_LABELS[status] || status, value: byStatus[status] || 0, color: STATUS_COLORS[status] }))
      .filter((row) => row.value > 0);

    const incidentRows = Object.entries(incidentsByType)
      .map(([key, value]) => ({ key, label: INCIDENT_TYPE_LABELS[key] || key, value, color: "#ef4444" }))
      .sort((a, b) => b.value - a.value);

    return {
      clientsTotal: clients.length, activeClients, suppliersTotal: suppliers.length, footprintsTotal: footprints.length,
      productsTotal: products.length, activeProducts, totalStock, totalLots, outOfStock, expired, expiringSoon,
      poTotal: purchaseOrders.length, openPo, closedPo, inPicking, inClosing,
      cancelledPo: byStatus[RETAIL_PO_STATUS.CANCELLED] || 0, totalLines, qtyOrdered, qtyPicked, fillRate, pendingPieces,
      totalPallets, closedPallets, availableBoxes,
      openIncidents, resolvedIncidents, incidentsTotal: incidents.length, printsTotal: printLog.length, reprints,
      poToday, poMonth, trend, topStock, topClients, topPlayers, statusRows, incidentRows,
    };
  }, [retail, products, purchaseOrders, incidents, printLog, users, metricsNow]);

  const recentOrders = [...purchaseOrders]
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
    .slice(0, 6);

  return (
    <div className="retail-dashboard">
      <header className="retail-dash-topbar">
        <div>
          <p className="eyebrow">Centro de control RETAIL</p>
          <h2>Procesamiento de pedidos en tiempo real</h2>
        </div>
        <div className="retail-dash-pills">
          <span className="retail-dash-pill"><strong>{m.poToday}</strong> OC hoy</span>
          <span className="retail-dash-pill"><strong>{m.poMonth}</strong> este mes</span>
          <span className="retail-dash-pill"><strong>{m.poTotal}</strong> historico</span>
          <span className="retail-dash-pill retail-dash-pill--accent"><strong>{m.fillRate}%</strong> cumplimiento</span>
        </div>
      </header>

      <section className="retail-kpi-grid">
        <KpiCard icon={ClipboardList} label="OC abiertas" value={m.openPo} hint={`${m.poToday} creadas hoy`} accent="#0ea5e9" />
        <KpiCard icon={Truck} label="En surtido" value={m.inPicking} hint={`${m.pendingPieces} pzas pendientes`} accent="#6366f1" />
        <KpiCard icon={Layers} label="En cierre" value={m.inClosing} hint={`${m.closedPallets}/${m.totalPallets} tarimas`} accent="#d97706" />
        <KpiCard icon={Package} label="OC cerradas" value={m.closedPo} hint={`${m.cancelledPo} canceladas`} accent="#16a34a" tone="ok" />
        <KpiCard icon={Boxes} label="Piezas en stock" value={m.totalStock.toLocaleString("es-MX")} hint={`${m.activeProducts} productos - ${m.totalLots} lotes`} accent="#0f4c81" />
        <KpiCard icon={Layers} label="Cajas prearmadas" value={m.availableBoxes} hint="Listas para surtir" accent="#8b5cf6" />
        <KpiCard icon={AlertTriangle} label="Stock critico" value={m.outOfStock} hint={`${m.expiringSoon} por caducar - ${m.expired} caducados`} accent="#ef4444" tone={m.outOfStock || m.expired ? "alert" : ""} />
        <KpiCard icon={Users} label="Clientes activos" value={m.activeClients} hint={`${m.suppliersTotal} prov - ${m.footprintsTotal} huellas`} accent="#0891b2" />
      </section>

      <div className="retail-dash-row retail-dash-row--2-1">
        <article className="surface-card retail-chart-card">
          <div className="retail-chart-head">
            <h3>Tendencia de ordenes de compra</h3>
            <span className="retail-chart-tag"><TrendingUp size={14} /> ultimos 6 meses</span>
          </div>
          <LineChart points={m.trend} />
        </article>
        <article className="surface-card retail-chart-card">
          <div className="retail-chart-head"><h3>OC por estado</h3></div>
          <DonutChart rows={m.statusRows} />
        </article>
      </div>

      <div className="retail-dash-row retail-dash-row--1-1">
        <article className="surface-card retail-chart-card">
          <div className="retail-chart-head"><h3>Ranking de players</h3><span className="retail-chart-tag">area retail</span></div>
          <PlayerRankingList rows={m.topPlayers} />
        </article>
        <article className="surface-card retail-chart-card">
          <div className="retail-chart-head"><h3>Ranking de clientes</h3><span className="retail-chart-tag">volumen de OC</span></div>
          <RankingList rows={m.topClients} />
        </article>
      </div>

      <div className="retail-dash-row retail-dash-row--1-1">
        <article className="surface-card retail-chart-card">
          <div className="retail-chart-head"><h3>Top productos por stock</h3><span className="retail-chart-tag">piezas disponibles</span></div>
          <ColumnChart rows={m.topStock} />
        </article>
        <article className="surface-card retail-chart-card">
          <div className="retail-chart-head"><h3>Incidencias por tipo</h3><span className="retail-chart-tag">registro acumulado</span></div>
          <ColumnChart rows={m.incidentRows} unit="" />
        </article>
      </div>

      <div className="retail-dash-row retail-dash-row--2-1">
        <article className="surface-card retail-chart-card">
          <div className="retail-chart-head">
            <h3>Ordenes recientes</h3>
            <button type="button" className="retail-link-button" onClick={() => onGoTab("ordenes-compra")}>Ver todas</button>
          </div>
          <div className="table-wrap">
            <table className="data-table retail-data-table">
              <thead>
                <tr><th>Folio</th><th>Cliente</th><th>Estado</th><th>Lineas</th><th>Piezas</th></tr>
              </thead>
              <tbody>
                {recentOrders.length ? recentOrders.map((order) => {
                  const ordered = (order.lines || []).reduce((s, l) => s + (Number(l.qtyOrdered) || 0), 0);
                  return (
                    <tr key={order.id}>
                      <td><strong>{order.folio}</strong></td>
                      <td>{order.clientName || "-"}</td>
                      <td><RetailStatusBadge status={order.status} /></td>
                      <td>{order.lines?.length || 0}</td>
                      <td>{ordered}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} className="retail-empty-cell">Sin ordenes todavia. Da de alta clientes e inventario y crea la primera OC.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="surface-card retail-chart-card">
          <div className="retail-chart-head"><h3>Incidencias e impresiones</h3></div>
          <div className="retail-mini-stats">
            <div className="retail-mini-stat retail-mini-stat--danger">
              <span>Incidencias abiertas</span>
              <strong>{m.openIncidents}</strong>
              <em>{m.resolvedIncidents} resueltas de {m.incidentsTotal}</em>
            </div>
            <div className="retail-mini-stat">
              <span><Printer size={13} /> Etiquetas impresas</span>
              <strong>{m.printsTotal}</strong>
              <em>{m.reprints} reimpresiones</em>
            </div>
          </div>
          {m.incidentRows.length ? (
            <div className="retail-incident-bars">
              {m.incidentRows.map((row) => {
                const max = Math.max(1, ...m.incidentRows.map((r) => r.value));
                return (
                  <div key={row.key} className="retail-bar-item">
                    <div className="retail-bar-meta">
                      <span className="retail-bar-label">{row.label}</span>
                      <strong className="retail-bar-value">{row.value}</strong>
                    </div>
                    <div className="retail-bar-track">
                      <span className="retail-bar-fill" style={{ width: `${Math.max(6, Math.round((row.value / max) * 100))}%`, background: "#ef4444" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="subtle-line" style={{ marginTop: "0.75rem" }}>Sin incidencias registradas.</p>}
        </article>
      </div>
    </div>
  );
}
