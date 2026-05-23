import React from "react";

export function TransportRoadAlertBadge({ recordId, roadMonitors = {} }) {
  const monitor = roadMonitors?.[recordId];
  const alerts = monitor?.monitoring && Array.isArray(monitor?.alerts) ? monitor.alerts : [];
  if (!alerts.length) return null;
  const latest = alerts[0];
  return (
    <span
      className="transport-road-alert-badge"
      title={latest?.suggestedAction || latest?.title || "Alerta vial detectada"}
    >
      Vial {alerts.length}
    </span>
  );
}

/**
 * Fila memoizada de envío pendiente
 * Previene re-renders innecesarios cuando otros registros cambian
 */
export const TransportPendingRow = React.memo(function TransportPendingRow({
  record,
  isAssigning,
  formatDateTime,
  onTakeRoute,
  roadMonitors,
}) {
  return (
    <tr>
      <td>{record.areaLabel}</td>
      <td>{record.shipmentCode || "-"}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
          <span>{record.destination}</span>
          <TransportRoadAlertBadge recordId={record.id} roadMonitors={roadMonitors} />
        </div>
      </td>
      <td>{record.boxes}</td>
      <td>{record.pieces}</td>
      <td>{record.postponedUntil ? formatDateTime(record.postponedUntil) : "-"}</td>
      <td style={{ fontSize: "0.85rem", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
        {record.notes || "-"}
      </td>
      <td>{record.createdByName}</td>
      <td>{formatDateTime(record.createdAt)}</td>
      <td>
        <button
          type="button"
          className="primary-button"
          onClick={() => onTakeRoute(record.id)}
          disabled={isAssigning}
          style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
        >
          {isAssigning ? "Asignando..." : "Tomar ruta"}
        </button>
      </td>
    </tr>
  );
});

TransportPendingRow.displayName = "TransportPendingRow";

/**
 * Fila memoizada de documentación pendiente
 */
export const TransportPendingDocRow = React.memo(function TransportPendingDocRow({
  record,
  isAssigning,
  formatDateTime,
  onTakeRoute,
}) {
  return (
    <tr>
      <td>{record.shipmentCode || "-"}</td>
      <td>{record.ubicacion || "-"}</td>
      <td>{record.area || "-"}</td>
      <td>{record.dirigidoA || "-"}</td>
      <td>{record.createdByName || "-"}</td>
      <td>{formatDateTime(record.createdAt || record.updatedAt)}</td>
      <td>
        <button
          type="button"
          className="primary-button"
          onClick={() => onTakeRoute(record.id)}
          disabled={isAssigning}
          style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
        >
          {isAssigning ? "Asignando..." : "Tomar ruta"}
        </button>
      </td>
    </tr>
  );
});

TransportPendingDocRow.displayName = "TransportPendingDocRow";

/**
 * Fila memoizada de envío pospuesto
 */
export const TransportPostponedRow = React.memo(function TransportPostponedRow({
  record,
  isSubmitting,
  formatDateTime,
  onReactivate,
  onTakeRoute,
}) {
  return (
    <tr>
      <td>{record.areaLabel}</td>
      <td>{record.destination}</td>
      <td>{record.boxes}</td>
      <td>{record.pieces}</td>
      <td>{formatDateTime(record.postponedUntil || record.updatedAt)}</td>
      <td>{Math.max(0, Number(record.postponedReminderMinutes || 0))} min antes</td>
      <td>{record.createdByName || "-"}</td>
      <td>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="icon-button"
            onClick={() => onReactivate(record.id)}
            disabled={isSubmitting}
          >
            Marcar pendiente
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onTakeRoute(record.id)}
            disabled={isSubmitting}
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
          >
            Tomar ruta
          </button>
        </div>
      </td>
    </tr>
  );
});

TransportPostponedRow.displayName = "TransportPostponedRow";

/**
 * Fila memoizada de ruta activa
 */
export const TransportActiveRouteRow = React.memo(function TransportActiveRouteRow({
  record,
  formatDateTime,
  onStatusUpdated,
  getNextActions,
}) {
  return (
    <tr>
      <td>{record.shipmentCode || "-"}</td>
      <td>{record.destination}</td>
      <td>{record.boxes}</td>
      <td>{record.pieces}</td>
      <td>{record.status}</td>
      <td>{formatDateTime(record.createdAt)}</td>
      <td>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {getNextActions(record.status).map((action) => (
            <button
              key={action}
              type="button"
              className="icon-button"
              onClick={() => onStatusUpdated(record.id, action)}
              style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}
            >
              {action}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
});

TransportActiveRouteRow.displayName = "TransportActiveRouteRow";

/**
 * Fila memoizada de historial de transporte
 */
export const TransportHistoryRow = React.memo(function TransportHistoryRow({
  entry,
  formatDateTime,
  canDelete,
  onDelete,
}) {
  return (
    <tr>
      <td>{entry.shipmentCode || "-"}</td>
      <td>{entry.destination}</td>
      <td>{entry.boxes}</td>
      <td>{entry.pieces}</td>
      <td>{entry.status}</td>
      <td>{entry.driverName || "-"}</td>
      <td>{formatDateTime(entry.completedAt || entry.updatedAt)}</td>
      {canDelete && (
        <td>
          <button
            type="button"
            className="danger-button"
            onClick={() => onDelete(entry.id)}
            style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
          >
            Eliminar
          </button>
        </td>
      )}
    </tr>
  );
});

TransportHistoryRow.displayName = "TransportHistoryRow";
