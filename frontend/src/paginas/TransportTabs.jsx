import { useEffect, useMemo, useState } from "react";
import DashboardDateRangePicker from "../components/DashboardDateRangePicker";
import {
  TransportPendingRow,
  TransportPendingDocRow,
  TransportPostponedRow,
  TransportRoadAlertBadge,
} from "../components/TransportTableRows";

function resolveDateMs(value) {
  const ms = Date.parse(value || "");
  return Number.isFinite(ms) ? ms : null;
}

function isPostponedReady(record, nowMs = Date.now()) {
  if (String(record?.status || "").trim() !== "Pospuesto") return false;
  const postponedUntilMs = resolveDateMs(record?.postponedUntil || record?.updatedAt);
  if (postponedUntilMs === null) return true;
  return postponedUntilMs <= nowMs;
}

function toLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolveHistoryDateKey(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return toLocalDateKey(parsed);
}

function formatHistoryMonthLabel(dateKey) {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return dateKey || "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(parsed);
}

function formatHistoryDayLabel(dateKey) {
  const parsed = parseLocalDateKey(dateKey);
  if (!parsed) return dateKey || "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(parsed);
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: toLocalDateKey(start),
    endDate: toLocalDateKey(end),
    year: now.getFullYear(),
  };
}

/**
 * Tab Asignaciones - muestra envíos pendientes por área con botón "Tomar ruta"
 */
export function TransportAssignmentsTab({
  transportState,
  documentacionState,
  activeDateKey,
  canManageTransportArea,
  currentUser,
  formatDateTime,
  requestJson,
  onRouteAssigned,
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNowMs(Date.now()), 10000);
    return () => globalThis.clearInterval(timer);
  }, []);

  // Filtrar registros pendientes (incluye historial para no perder envios sin asignar)
  const pendingRecords = useMemo(() => {
    const allAreaIds = (Array.isArray(transportState?.config) ? transportState.config : [])
      .map((area) => area.id)
      .filter(Boolean);

    const manageableAreaIds = allAreaIds.filter((areaId) => canManageTransportArea?.(areaId));

    const allowedAreaIds = new Set(
      manageableAreaIds.length
        ? manageableAreaIds
        : allAreaIds
    );

    const areaLabelById = new Map(
      (Array.isArray(transportState?.config) ? transportState.config : [])
        .map((area) => [area.id, area.label || area.id])
    );

    const activeRecords = Array.isArray(transportState?.activeRecords) ? transportState.activeRecords : [];
    const historyRecords = Array.isArray(transportState?.historyRecords) ? transportState.historyRecords : [];

    return [...activeRecords, ...historyRecords]
      .filter((record) => {
        const isPending = String(record?.status || "").trim() === "Pendiente";
        const isReadyPostponed = isPostponedReady(record, nowMs);
        if (!isPending && !isReadyPostponed) return false;
        return allowedAreaIds.size ? allowedAreaIds.has(record.areaId) : true;
      })
      .map((record) => ({
        ...record,
        areaLabel: areaLabelById.get(record.areaId) || record.areaId || "-",
      }))
        .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
      }, [canManageTransportArea, nowMs, transportState?.activeRecords, transportState?.config, transportState?.historyRecords]);

  const pendingDocRecords = useMemo(() => {
    const dateKey = String(activeDateKey || "").trim();
    const records = Array.isArray(documentacionState?.records) ? documentacionState.records : [];
    if (!dateKey) return [];
    return records
      .filter((record) => String(record?.dateKey || "").trim() === dateKey)
      .filter((record) => String(record?.status || "Pendiente").trim() === "Pendiente")
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));
  }, [activeDateKey, documentacionState?.records]);

  const handleTakeRoute = async (recordId) => {
    if (!currentUser?.id) {
      setAssignError("Usuario no identificado");
      return;
    }

    setIsAssigning(true);
    setAssignError("");

    try {
      const result = await requestJson(`/warehouse/transport/records/${recordId}/assign`, {
        method: "POST",
        body: JSON.stringify({ driverId: currentUser.id }),
      });

      if (result.ok) {
        onRouteAssigned?.();
      } else {
        setAssignError("No fue posible asignar la ruta");
      }
    } catch (error) {
      setAssignError(error?.message || "Error asignando ruta");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleTakeDocRoute = async (recordId) => {
    if (!currentUser?.id) {
      setAssignError("Usuario no identificado");
      return;
    }

    setIsAssigning(true);
    setAssignError("");

    try {
      const result = await requestJson(`/warehouse/documentacion/records/${recordId}/assign`, {
        method: "POST",
        body: JSON.stringify({ driverId: currentUser.id }),
      });

      if (result.ok) {
        onRouteAssigned?.();
      } else {
        setAssignError("No fue posible asignar la ruta de documentación");
      }
    } catch (error) {
      setAssignError(error?.message || "Error asignando documentación");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0 }}>Envíos Pendientes de Asignar</h3>
        <span className="chip" style={{ background: "#e3f2fd", color: "#1976d2" }}>
          {pendingRecords.length} pendiente{pendingRecords.length !== 1 ? "s" : ""}
        </span>
      </div>

      {assignError && (
        <div style={{
          padding: "0.75rem",
          background: "#ffebee",
          border: "1px solid #ff5252",
          borderRadius: "0.5rem",
          color: "#d32f2f",
          marginBottom: "0.75rem",
          fontSize: "0.9rem",
        }}>
          {assignError}
        </div>
      )}

      <div className="table-wrap">
        <table className="inventory-table-clean">
          <thead>
            <tr>
              <th>Área</th>
              <th>Código</th>
              <th>Destino</th>
              <th>Cajas</th>
              <th>Piezas</th>
              <th>Fecha programada</th>
              <th>Notas</th>
              <th>Capturado por</th>
              <th>Hora</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {pendingRecords.map((record) => (
              <TransportPendingRow
                key={record.id}
                record={record}
                isAssigning={isAssigning}
                formatDateTime={formatDateTime}
                onTakeRoute={handleTakeRoute}
                roadMonitors={transportState?.roadMonitors}
              />
            ))}
            {!pendingRecords.length && (
              <tr>
                <td colSpan="10" className="subtle-line">
                  No hay envíos pendientes para asignar en esta área.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card-header-row" style={{ marginBottom: "0.5rem", marginTop: "1rem" }}>
        <h3 style={{ margin: 0 }}>Documentación pendiente por trasladar</h3>
        <span className="chip" style={{ background: "#fff3cd", color: "#856404" }}>
          {pendingDocRecords.length} pendiente{pendingDocRecords.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="table-wrap">
        <table className="inventory-table-clean">
          <thead>
            <tr>
              <th>Código</th>
              <th>Ubicación</th>
              <th>Área</th>
              <th>Dirigido a</th>
              <th>Registrado por</th>
              <th>Hora</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {pendingDocRecords.map((record) => (
              <TransportPendingDocRow
                key={record.id}
                record={record}
                isAssigning={isAssigning}
                formatDateTime={formatDateTime}
                onTakeRoute={handleTakeDocRoute}
              />
            ))}
            {!pendingDocRecords.length && (
              <tr>
                <td colSpan="7" className="subtle-line">
                  No hay registros de documentación pendientes para el día activo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TransportPostponedTab({
  transportState,
  canManageTransportArea,
  canViewAllPostponed,
  currentUser,
  formatDateTime,
  requestJson,
  onChanged,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNowMs(Date.now()), 10000);
    return () => globalThis.clearInterval(timer);
  }, []);

  const postponedRecords = useMemo(() => {
    const areaLabelById = new Map(
      (Array.isArray(transportState?.config) ? transportState.config : [])
        .map((area) => [area.id, area.label || area.id])
    );

    return (Array.isArray(transportState?.activeRecords) ? transportState.activeRecords : [])
      .filter((record) => String(record?.status || "").trim() === "Pospuesto")
      .filter((record) => !isPostponedReady(record, nowMs))
      .filter((record) => canViewAllPostponed || canManageTransportArea?.(record.areaId))
      .map((record) => ({
        ...record,
        areaLabel: areaLabelById.get(record.areaId) || record.areaId || "-",
      }))
      .sort((a, b) => new Date(a.postponedUntil || a.updatedAt || 0) - new Date(b.postponedUntil || b.updatedAt || 0));
  }, [canManageTransportArea, canViewAllPostponed, nowMs, transportState?.activeRecords, transportState?.config]);

  const handleReactivate = async (recordId) => {
    setIsSubmitting(true);
    setError("");
    try {
      const result = await requestJson(`/warehouse/transport/records/${recordId}/reactivate`, {
        method: "POST",
      });
      if (!result.ok) {
        setError(result?.message || "No fue posible reactivar el envío.");
        return;
      }
      onChanged?.();
    } catch (requestError) {
      setError(requestError?.message || "Error reactivando envío.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTakeRoute = async (recordId) => {
    if (!currentUser?.id) {
      setError("Usuario no identificado");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const result = await requestJson(`/warehouse/transport/records/${recordId}/assign`, {
        method: "POST",
        body: JSON.stringify({ driverId: currentUser.id }),
      });
      if (!result.ok) {
        setError(result?.message || "No fue posible tomar la ruta.");
        return;
      }
      onChanged?.();
    } catch (requestError) {
      setError(requestError?.message || "Error asignando ruta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0 }}>Envíos Pospuestos y Programados</h3>
        <span className="chip" style={{ background: "#fff3cd", color: "#856404" }}>
          {postponedRecords.length} pospuesto{postponedRecords.length !== 1 ? "s" : ""}
        </span>
      </div>

      {error ? (
        <div style={{
          padding: "0.75rem",
          background: "#ffebee",
          border: "1px solid #ff5252",
          borderRadius: "0.5rem",
          color: "#d32f2f",
          marginBottom: "0.75rem",
          fontSize: "0.9rem",
        }}>
          {error}
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="inventory-table-clean">
          <thead>
            <tr>
              <th>Área</th>
              <th>Destino</th>
              <th>Cajas</th>
              <th>Piezas</th>
              <th>Fecha programada</th>
              <th>Recordar</th>
              <th>Capturado por</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {postponedRecords.map((record) => (
              <TransportPostponedRow
                key={record.id}
                record={record}
                isSubmitting={isSubmitting}
                formatDateTime={formatDateTime}
                onReactivate={handleReactivate}
                onTakeRoute={handleTakeRoute}
              />
            ))}
            {!postponedRecords.length ? (
              <tr>
                <td colSpan="8" className="subtle-line">
                  No hay envíos pospuestos por gestionar.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Tab Mis Rutas - muestra rutas asignadas al driver actual
 */
export function TransportMyRoutesTab({ transportState, documentacionState, currentUser, canDeleteHistoryTransportRecords = false, formatDateTime, requestJson, onStatusUpdated }) {
  const initialHistoryRange = getCurrentMonthRange();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState("");
  const [routesViewTab, setRoutesViewTab] = useState("active");
  const [historyStartDate, setHistoryStartDate] = useState(initialHistoryRange.startDate);
  const [historyEndDate, setHistoryEndDate] = useState(initialHistoryRange.endDate);
  const [historyGrouping, setHistoryGrouping] = useState("mes");
  const [historyYear, setHistoryYear] = useState(initialHistoryRange.year);
  const [deleteHistoryModal, setDeleteHistoryModal] = useState({
    open: false,
    recordId: "",
    destination: "",
    submitting: false,
    error: "",
  });
  const [reasonState, setReasonState] = useState({
    open: false,
    routeType: "",
    recordId: "",
    destination: "",
    nextStatus: "",
    reason: "",
  });

  const terminalStatuses = useMemo(() => new Set(["Entregado", "Devuelto", "Cancelado"]), []);

  const activeTransportRecords = useMemo(() => {
    return (Array.isArray(transportState?.activeRecords) ? transportState.activeRecords : [])
      .filter((record) => record.assignedTo === currentUser?.id && !terminalStatuses.has(String(record.status || "")))
      .sort((a, b) => {
        const statusOrder = ["Pendiente", "Asignado", "En camino", "Retorno", "Entregado", "Devuelto", "Cancelado"];
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      });
  }, [currentUser?.id, terminalStatuses, transportState?.activeRecords]);

  const activeDocRecords = useMemo(() => {
    return (Array.isArray(documentacionState?.records) ? documentacionState.records : [])
      .filter((record) => record.assignedTo === currentUser?.id && !terminalStatuses.has(String(record.status || "")))
      .sort((a, b) => {
        const statusOrder = ["Pendiente", "Asignado", "En camino", "Retorno", "Entregado", "Devuelto", "Cancelado"];
        return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      });
  }, [currentUser?.id, documentacionState?.records, terminalStatuses]);

  const historyTransportRecords = useMemo(() => {
    const fromHistory = Array.isArray(transportState?.historyRecords) ? transportState.historyRecords : [];
    const fromActiveTerminal = (Array.isArray(transportState?.activeRecords) ? transportState.activeRecords : [])
      .filter((record) => terminalStatuses.has(String(record.status || "")));
    return [...fromHistory, ...fromActiveTerminal]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }, [terminalStatuses, transportState?.activeRecords, transportState?.historyRecords]);

  const historyDocRecords = useMemo(() => {
    return (Array.isArray(documentacionState?.records) ? documentacionState.records : [])
      .filter((record) => record.assignedTo === currentUser?.id && terminalStatuses.has(String(record.status || "")))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }, [currentUser?.id, documentacionState?.records, terminalStatuses]);

  const historyYearOptions = useMemo(() => {
    const years = new Set([Number(historyYear) || new Date().getFullYear()]);
    [...historyTransportRecords, ...historyDocRecords].forEach((record) => {
      const closedDateKey = resolveHistoryDateKey(record.deliveredAt || record.updatedAt || record.createdAt);
      const parsed = parseLocalDateKey(closedDateKey);
      if (parsed) years.add(parsed.getFullYear());
    });
    return Array.from(years).sort((left, right) => right - left);
  }, [historyDocRecords, historyTransportRecords, historyYear]);

  const filteredHistoryTransportRecords = useMemo(() => {
    const startMs = parseLocalDateKey(historyStartDate)?.getTime() ?? null;
    const endMs = parseLocalDateKey(historyEndDate)?.getTime() ?? null;
    return historyTransportRecords.filter((record) => {
      const closedDateKey = resolveHistoryDateKey(record.deliveredAt || record.updatedAt || record.createdAt);
      const closedMs = parseLocalDateKey(closedDateKey)?.getTime() ?? null;
      if (closedMs === null) return false;
      if (startMs !== null && closedMs < startMs) return false;
      if (endMs !== null && closedMs > endMs) return false;
      return true;
    });
  }, [historyEndDate, historyStartDate, historyTransportRecords]);

  const filteredHistoryDocRecords = useMemo(() => {
    const startMs = parseLocalDateKey(historyStartDate)?.getTime() ?? null;
    const endMs = parseLocalDateKey(historyEndDate)?.getTime() ?? null;
    return historyDocRecords.filter((record) => {
      const closedDateKey = resolveHistoryDateKey(record.deliveredAt || record.updatedAt || record.createdAt);
      const closedMs = parseLocalDateKey(closedDateKey)?.getTime() ?? null;
      if (closedMs === null) return false;
      if (startMs !== null && closedMs < startMs) return false;
      if (endMs !== null && closedMs > endMs) return false;
      return true;
    });
  }, [historyDocRecords, historyEndDate, historyStartDate]);

  const visibleHistoryRecords = useMemo(() => {
    const transport = filteredHistoryTransportRecords.map((record) => ({
      ...record,
      historyType: "transport",
      historyTypeLabel: "Transporte",
      historyDestination: record.destination,
      historyBoxes: record.boxes,
      historyPieces: record.pieces,
      historyDetail: record.returnReason || record.canceledReason || "-",
      historyClosedAt: record.deliveredAt || record.updatedAt || record.createdAt,
      historyClosedDateKey: resolveHistoryDateKey(record.deliveredAt || record.updatedAt || record.createdAt),
    }));
    const docs = filteredHistoryDocRecords.map((record) => ({
      ...record,
      historyType: "documentacion",
      historyTypeLabel: "Documentación",
      historyDestination: record.area || "-",
      historyBoxes: "-",
      historyPieces: "-",
      historyDetail: record.returnReason || record.canceledReason || "-",
      historyClosedAt: record.deliveredAt || record.updatedAt || record.createdAt,
      historyClosedDateKey: resolveHistoryDateKey(record.deliveredAt || record.updatedAt || record.createdAt),
    }));
    return [...transport, ...docs]
      .sort((left, right) => new Date(right.historyClosedAt || 0) - new Date(left.historyClosedAt || 0));
  }, [filteredHistoryDocRecords, filteredHistoryTransportRecords]);

  const historyRenderRows = useMemo(() => {
    let previousMonthKey = "";
    let previousDayKey = "";
    const rows = [];

    visibleHistoryRecords.forEach((record) => {
      const dayKey = record.historyClosedDateKey;
      const monthKey = dayKey ? String(dayKey).slice(0, 7) : "sin-fecha";
      if (monthKey !== previousMonthKey) {
        rows.push({ kind: "month", key: `month-${monthKey}`, label: formatHistoryMonthLabel(`${monthKey}-01`) });
        previousMonthKey = monthKey;
        previousDayKey = "";
      }
      if (historyGrouping !== "anio" && dayKey !== previousDayKey) {
        rows.push({ kind: "day", key: `day-${dayKey}`, label: formatHistoryDayLabel(dayKey) });
        previousDayKey = dayKey;
      }
      rows.push({ kind: "record", key: `${record.historyType}-${record.id}`, record });
    });

    return rows;
  }, [historyGrouping, visibleHistoryRecords]);

  const totalActive = activeTransportRecords.length + activeDocRecords.length;
  const totalHistory = historyTransportRecords.length + historyDocRecords.length;
  const filteredHistoryTotal = visibleHistoryRecords.length;

  const closeDeleteHistoryModal = () => {
    setDeleteHistoryModal({
      open: false,
      recordId: "",
      destination: "",
      submitting: false,
      error: "",
    });
  };

  const sendStatusUpdate = async (routeType, recordId, nextStatus, reason = "") => {
    setIsUpdating(true);
    setUpdateError("");

    try {
      const endpoint = routeType === "documentacion"
        ? `/warehouse/documentacion/records/${recordId}/status`
        : `/warehouse/transport/records/${recordId}/status`;

      const result = await requestJson(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason }),
      });

      if (result.ok) {
        setReasonState({ open: false, routeType: "", recordId: "", destination: "", nextStatus: "", reason: "" });
        onStatusUpdated?.();
      } else {
        setUpdateError(result?.message || "No fue posible actualizar el estado");
      }
    } catch (error) {
      setUpdateError(error?.message || "Error actualizando estado");
    } finally {
      setIsUpdating(false);
    }
  };

  const requestStatusChange = (record, routeType, nextStatus, options = {}) => {
    if (options?.requiresReason) {
      setReasonState({
        open: true,
        routeType,
        recordId: record.id,
        destination: routeType === "documentacion" ? (record.area || "Documentación") : (record.destination || "Destino"),
        nextStatus,
        reason: "",
      });
      return;
    }
    sendStatusUpdate(routeType, record.id, nextStatus, "");
  };

  const openDeleteHistoryRecordModal = (record) => {
    if (!canDeleteHistoryTransportRecords || String(record?.historyType || "") !== "transport") return;
    setDeleteHistoryModal({
      open: true,
      recordId: String(record?.id || "").trim(),
      destination: String(record?.historyDestination || record?.destination || "").trim() || "Destino",
      submitting: false,
      error: "",
    });
  };

  const submitDeleteHistoryRecord = async () => {
    const recordId = String(deleteHistoryModal.recordId || "").trim();
    if (!recordId || !canDeleteHistoryTransportRecords || deleteHistoryModal.submitting) return;

    setDeleteHistoryModal((current) => ({ ...current, submitting: true, error: "" }));
    try {
      const result = await requestJson(`/warehouse/transport/records/${recordId}`, { method: "DELETE" });
      if (!result?.ok) {
        setDeleteHistoryModal((current) => ({
          ...current,
          submitting: false,
          error: result?.message || "No fue posible eliminar el registro.",
        }));
        return;
      }
      closeDeleteHistoryModal();
      onStatusUpdated?.();
    } catch (error) {
      setDeleteHistoryModal((current) => ({
        ...current,
        submitting: false,
        error: error?.message || "No fue posible eliminar el registro.",
      }));
    }
  };

  useEffect(() => {
    if (!deleteHistoryModal.open) return undefined;

    const handleDeleteHistoryModalKeys = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDeleteHistoryModal();
        return;
      }
      if (event.key === "Enter") {
        const targetTag = String(event.target?.tagName || "").toLowerCase();
        if (targetTag === "textarea") return;
        event.preventDefault();
        submitDeleteHistoryRecord();
      }
    };

    globalThis.addEventListener("keydown", handleDeleteHistoryModalKeys);
    return () => globalThis.removeEventListener("keydown", handleDeleteHistoryModalKeys);
  }, [deleteHistoryModal.open, deleteHistoryModal.recordId, deleteHistoryModal.submitting, canDeleteHistoryTransportRecords]);

  const getNextActions = (statusValue = "") => {
    const status = String(statusValue || "").trim();
    if (status === "Asignado") {
      return [
        { id: "en-camino", label: "En camino", nextStatus: "En camino", tone: "primary" },
        { id: "cancelar", label: "Cancelar ruta", nextStatus: "Cancelado", tone: "secondary" },
      ];
    }
    if (status === "En camino") {
      return [
        { id: "entregado", label: "Entregado", nextStatus: "Entregado", tone: "success" },
        { id: "retorno", label: "Retorno", nextStatus: "Retorno", tone: "warning", requiresReason: true },
      ];
    }
    if (status === "Retorno") {
      return [
        { id: "devuelto", label: "Devuelto", nextStatus: "Devuelto", tone: "danger" },
      ];
    }
    return [];
  };

  const getStatusBadge = (status) => {
    const styles = {
      Pendiente: { bg: "#fff3cd", color: "#856404" },
      Asignado: { bg: "#cfe2ff", color: "#084298" },
      "En camino": { bg: "#d1ecf1", color: "#0c5460" },
      Retorno: { bg: "#ffe8cc", color: "#7a4100" },
      Entregado: { bg: "#dbe7f2", color: "#1d384f" },
      Devuelto: { bg: "#f8d7da", color: "#842029" },
      Cancelado: { bg: "#e2e3e5", color: "#41464b" },
    };
    const style = styles[status] || { bg: "#e2e3e5", color: "#383d41" };
    return (
      <span style={{
        display: "inline-block",
        padding: "0.25rem 0.5rem",
        background: style.bg,
        color: style.color,
        borderRadius: "0.25rem",
        fontSize: "0.85rem",
        fontWeight: "500",
      }}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="card-header-row" style={{ marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0 }}>Mis Rutas Asignadas</h3>
        <span className="chip" style={{ background: "#eaeff3", color: "#385773" }}>
          {totalActive} activa{totalActive !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="transport-view-tabs" style={{ marginBottom: "0.8rem" }}>
        <button
          type="button"
          className={`transport-view-tab ${routesViewTab === "active" ? "is-active" : ""}`}
          onClick={() => setRoutesViewTab("active")}
        >
          Mis rutas activas
        </button>
        <button
          type="button"
          className={`transport-view-tab ${routesViewTab === "history" ? "is-active" : ""}`}
          onClick={() => setRoutesViewTab("history")}
        >
          Historial mis rutas ({totalHistory})
        </button>
      </div>

      {updateError && (
        <div style={{
          padding: "0.75rem",
          background: "#ffebee",
          border: "1px solid #ff5252",
          borderRadius: "0.5rem",
          color: "#d32f2f",
          marginBottom: "0.75rem",
          fontSize: "0.9rem",
        }}>
          {updateError}
        </div>
      )}

      {routesViewTab === "history" ? (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.85rem",
          alignItems: "flex-end",
          marginBottom: "0.9rem",
          padding: "0.9rem 1rem",
          border: "1px solid rgba(49, 77, 105, 0.12)",
          borderRadius: "1rem",
          background: "linear-gradient(180deg, rgba(49, 77, 105, 0.04), rgba(49, 77, 105, 0.01))",
        }}>
          <label className="dashboard-filter-field dashboard-filter-field-range" style={{ minWidth: "min(100%, 340px)", margin: 0 }}>
            <span>Calendario del historial</span>
            <DashboardDateRangePicker
              startDate={historyStartDate}
              endDate={historyEndDate}
              grouping={historyGrouping}
              onGroupingChange={setHistoryGrouping}
              selectedYear={historyYear}
              yearOptions={historyYearOptions}
              onYearChange={setHistoryYear}
              onChange={({ startDate, endDate }) => {
                const nextStart = startDate || historyStartDate;
                const nextEnd = endDate || startDate || historyEndDate || nextStart;
                setHistoryStartDate(nextStart);
                setHistoryEndDate(nextEnd);
              }}
            />
          </label>

          <div className="subtle-line" style={{ display: "grid", gap: "0.2rem", minWidth: "220px" }}>
            <span>Mostrando {filteredHistoryTotal} registro{filteredHistoryTotal !== 1 ? "s" : ""} en el rango.</span>
            <span>Agrupación: {historyGrouping === "anio" ? "por meses" : "por fechas"}.</span>
          </div>
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="inventory-table-clean">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Destino</th>
              <th>Cajas</th>
              <th>Piezas</th>
              <th>Estado</th>
              <th>{routesViewTab === "history" ? "Cerrado" : "Asignado el"}</th>
              <th>Detalle</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(routesViewTab === "active" ? activeTransportRecords : []).map((record) => (
              <tr key={record.id}>
                <td>Transporte</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                    <span>{record.destination}</span>
                    <TransportRoadAlertBadge recordId={record.id} roadMonitors={transportState?.roadMonitors} />
                  </div>
                </td>
                <td>{record.boxes}</td>
                <td>{record.pieces}</td>
                <td>{getStatusBadge(record.status)}</td>
                <td>{formatDateTime((routesViewTab === "history" ? (record.deliveredAt || record.updatedAt) : (record.assignedAt || record.createdAt)) || record.createdAt)}</td>
                <td>{record.returnReason || record.canceledReason || "-"}</td>
                <td>
                  {routesViewTab === "active" ? (
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {getNextActions(record.status).map((action) => (
                        <button
                          key={`${record.id}-${action.id}`}
                          type="button"
                          className={action.tone === "primary" ? "primary-button" : "icon-button"}
                          onClick={() => requestStatusChange(record, "transport", action.nextStatus, { requiresReason: action.requiresReason })}
                          disabled={isUpdating}
                          style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="subtle-line">Ciclo cerrado</span>
                  )}
                </td>
              </tr>
            ))}
            {(routesViewTab === "active" ? activeDocRecords : []).map((record) => (
                <tr key={record.id}>
                  <td>Documentación</td>
                  <td>{record.area || "-"}</td>
                  <td>-</td>
                  <td>-</td>
                  <td>{getStatusBadge(record.status)}</td>
                <td>{formatDateTime((routesViewTab === "history" ? (record.deliveredAt || record.updatedAt) : (record.assignedAt || record.createdAt)) || record.createdAt)}</td>
                  <td>{record.returnReason || record.canceledReason || "-"}</td>
                  <td>
                  {routesViewTab === "active" ? (
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {getNextActions(record.status).map((action) => (
                        <button
                          key={`${record.id}-${action.id}`}
                          type="button"
                          className={action.tone === "primary" ? "primary-button" : "icon-button"}
                          onClick={() => requestStatusChange(record, "documentacion", action.nextStatus, { requiresReason: action.requiresReason })}
                          disabled={isUpdating}
                          style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem" }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="subtle-line">Ciclo cerrado</span>
                  )}
                  </td>
                </tr>
              ))}
            {routesViewTab === "history" ? historyRenderRows.map((entry) => {
              if (entry.kind === "month") {
                return (
                  <tr key={entry.key}>
                    <td colSpan="8" style={{ background: "rgba(49, 77, 105, 0.08)", color: "#314d69", fontWeight: 700 }}>
                      {entry.label}
                    </td>
                  </tr>
                );
              }
              if (entry.kind === "day") {
                return (
                  <tr key={entry.key}>
                    <td colSpan="8" style={{ background: "rgba(49, 77, 105, 0.04)", color: "#315753", fontWeight: 600 }}>
                      {entry.label}
                    </td>
                  </tr>
                );
              }

              const record = entry.record;
              return (
                <tr key={entry.key}>
                  <td>{record.historyTypeLabel}</td>
                  <td>{record.historyDestination}</td>
                  <td>{record.historyBoxes}</td>
                  <td>{record.historyPieces}</td>
                  <td>{getStatusBadge(record.status)}</td>
                  <td>{formatDateTime(record.historyClosedAt || record.createdAt)}</td>
                  <td>{record.historyDetail}</td>
                  <td>
                    {canDeleteHistoryTransportRecords && record.historyType === "transport" ? (
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() => openDeleteHistoryRecordModal(record)}
                        disabled={deleteHistoryModal.submitting}
                      >
                        Eliminar registro
                      </button>
                    ) : (
                      <span className="subtle-line">Ciclo cerrado</span>
                    )}
                  </td>
                </tr>
              );
            }) : null}
            {routesViewTab === "active" && !totalActive ? (
              <tr>
                <td colSpan="8" className="subtle-line">
                  No tienes rutas asignadas en este momento.
                </td>
              </tr>
            ) : null}
            {routesViewTab === "history" && !filteredHistoryTotal ? (
              <tr>
                <td colSpan="8" className="subtle-line">
                  No hay rutas cerradas dentro del rango seleccionado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {reasonState.open && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setReasonState({ open: false, routeType: "", recordId: "", destination: "", nextStatus: "", reason: "" })}>
          <div className="transport-reason-modal" style={{
            background: "#ffffff",
            padding: "1.5rem",
            borderRadius: "1rem",
            width: "min(92vw, 420px)",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              Motivo de retorno
            </h3>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: "500" }}>
                Escribe el motivo para {reasonState.destination}:
              </label>
              <textarea
                value={reasonState.reason}
                onChange={(e) => setReasonState((prev) => ({ ...prev, reason: e.target.value }))}
                rows={4}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #cccccc",
                  borderRadius: "0.25rem",
                  fontSize: "0.9rem",
                }}
                placeholder="Ejemplo: Cliente no recibió, reprogramar para mañana"
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setReasonState({ open: false, routeType: "", recordId: "", destination: "", nextStatus: "", reason: "" })}
                disabled={isUpdating}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => sendStatusUpdate(reasonState.routeType, reasonState.recordId, reasonState.nextStatus, reasonState.reason)}
                disabled={isUpdating || !String(reasonState.reason || "").trim()}
              >
                {isUpdating ? "Guardando..." : "Guardar motivo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteHistoryModal.open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeDeleteHistoryModal}
        >
          <div
            className="transport-reason-modal"
            style={{
              background: "#ffffff",
              padding: "1.5rem",
              borderRadius: "1rem",
              width: "min(92vw, 420px)",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Eliminar registro histórico</h3>
            <p className="subtle-line" style={{ marginBottom: "0.75rem" }}>
              Vas a eliminar permanentemente la ruta de {deleteHistoryModal.destination}.
            </p>
            <p className="subtle-line" style={{ marginBottom: "1rem" }}>
              Esta acción solo está habilitada para tu cuenta principal Lead. Presiona Enter para confirmar o Esc para cancelar.
            </p>

            {deleteHistoryModal.error ? (
              <div style={{
                padding: "0.75rem",
                background: "#ffebee",
                border: "1px solid #ff5252",
                borderRadius: "0.5rem",
                color: "#d32f2f",
                marginBottom: "1rem",
                fontSize: "0.9rem",
              }}>
                {deleteHistoryModal.error}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={closeDeleteHistoryModal}
                disabled={deleteHistoryModal.submitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="icon-button danger"
                onClick={submitDeleteHistoryRecord}
                disabled={deleteHistoryModal.submitting}
              >
                {deleteHistoryModal.submitting ? "Eliminando..." : "Eliminar registro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
