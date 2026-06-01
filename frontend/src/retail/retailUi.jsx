import { RETAIL_PO_STATUS, RETAIL_PO_STATUS_LABELS } from "./retailModuleConfig.js";

const WORKFLOW_STEPS = [
  { id: "clientes", label: "1. Clientes", countKey: "clients" },
  { id: "huellas", label: "2. Huellas", countKey: "footprints" },
  { id: "inventario", label: "3. Inventario", countKey: "products" },
  { id: "prearmado", label: "4. Prearmado", countKey: "prearm" },
  { id: "ordenes-compra", label: "5. OC", countKey: "orders" },
  { id: "surtido", label: "6. Surtido", countKey: "openPick" },
  { id: "cerrado", label: "7. Cierre", countKey: "closing" },
];

export function RetailWorkflowBar({ retail, activeTab, onStepClick, adminOnly = true }) {
  const orders = retail?.purchaseOrders || [];
  const counts = {
    clients: (retail?.clients || []).length,
    footprints: (retail?.footprints || []).length,
    products: (retail?.products || []).length,
    prearm: (retail?.preassembledBoxes || []).filter((b) => b.status === "available").length,
    orders: orders.length,
    openPick: orders.filter((o) => ["pending_pick", "picking", "picked_partial"].includes(o.status)).length,
    closing: orders.filter((o) => ["picked", "picked_partial", "closing", RETAIL_PO_STATUS.CLOSED].includes(o.status)).length,
  };

  return (
    <article className="surface-card retail-workflow-card">
      <div className="card-header-row">
        <div>
          <h3>Flujo retail conectado</h3>
          <p>
            {adminOnly
              ? "Vista de administracion. Haz clic en un paso para ir a esa pestana operativa."
              : "Resumen del proceso retail."}
          </p>
        </div>
      </div>
      <div className="retail-workflow-steps">
        {WORKFLOW_STEPS.map((step) => {
          const count = counts[step.countKey] ?? 0;
          const clickable = typeof onStepClick === "function";
          return (
            <button
              key={step.id}
              type="button"
              className={`retail-workflow-step ${activeTab === step.id ? "active" : ""} ${clickable ? "clickable" : ""}`}
              disabled={!clickable}
              onClick={() => clickable && onStepClick(step.id)}
            >
              <span className="retail-workflow-step-label">{step.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function RetailStatusBadge({ status }) {
  const label = RETAIL_PO_STATUS_LABELS[status] || status;
  const cls = status === RETAIL_PO_STATUS.CLOSED
    ? "ok"
    : [RETAIL_PO_STATUS.PICKED, RETAIL_PO_STATUS.PICKED_PARTIAL, RETAIL_PO_STATUS.CLOSING].includes(status)
      ? "warn"
      : "";
  return <span className={`retail-status-badge ${cls}`}>{label}</span>;
}

export function RetailTabTitle({ tabId }) {
  const labels = {
    dashboard: "Dashboard",
    "ordenes-compra": "Ordenes de compra",
    surtido: "Surtido",
    cerrado: "Cerrado",
    huellas: "Huellas logisticas",
    clientes: "Clientes",
    inventario: "Inventario retail",
    prearmado: "Prearmado de cajas",
    incidencias: "Incidencias",
    reportes: "Reportes",
  };
  return labels[tabId] || "Retail";
}

export function RetailEmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="retail-empty-cell">{message}</td>
    </tr>
  );
}
