import {
  AlertTriangle,
  Box,
  CircleCheckBig,
  ClipboardList,
  Gauge,
  Layers,
  OctagonAlert,
  Package,
  PauseCircle,
  Play,
  Search,
  Truck,
  Users,
  Zap,
} from "lucide-react";

function fmtNum(value, digits = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString("es-MX", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(value, digits = 0) {
  return `${fmtNum(value, digits)}%`;
}

function fmtHours(value) {
  return `${fmtNum(value, 1)} h`;
}

function sumMermaPieces(rows = []) {
  return rows.reduce((sum, row) => sum + Number(row.totalPiezas || 0), 0);
}

function sumMissingPieces(rows = []) {
  return rows.reduce((sum, row) => sum + Number(row.totalPiezasFaltantes || 0), 0);
}

function sumInventoryPieces(rows = []) {
  return rows.reduce((sum, row) => sum + Math.max(0, Number(row.piecesReviewed || 0)), 0);
}

function countUniqueProducts(rows = []) {
  return new Set(
    rows.map((row) => String(row.productKey || row.productValue || "").trim().toLowerCase()).filter(Boolean),
  ).size;
}

function countUniqueTarimas(rows = []) {
  return new Set(
    rows.map((row) => String(row.tarimaValue || "").trim()).filter((value) => value && value.toLowerCase() !== "sin tarima"),
  ).size;
}

function summarizeBoards(boardRows = []) {
  return boardRows.reduce(
    (acc, board) => ({
      pieces: acc.pieces + Number(board.piecesTotal || 0),
      tarimas: acc.tarimas + Number(board.tarimaCount || 0),
      returnsDev: acc.returnsDev + Number(board.returnsDevolucion || 0),
      returnsRecon: acc.returnsRecon + Number(board.returnsReacondicionado || 0),
      boards: acc.boards + 1,
    }),
    { pieces: 0, tarimas: 0, returnsDev: 0, returnsRecon: 0, boards: 0 },
  );
}

function card(cardKey, title, value, subtitle, tone = "cyan", icon = Gauge, progress = null, valueMeta = null) {
  return { cardKey, title, value, valueMeta, subtitle, tone, icon, progress };
}

function buildInventoryKpis(metrics, boards, inventoryRows, mermaRows, palletRows) {
  const boardSummary = summarizeBoards(boards);
  const mermaPieces = sumMermaPieces(mermaRows);
  const missingPieces = sumMissingPieces(mermaRows);
  const piecesReviewed = sumInventoryPieces(inventoryRows) || boardSummary.pieces;
  const products = countUniqueProducts(inventoryRows);
  const tarimas = countUniqueTarimas(inventoryRows) || boardSummary.tarimas || palletRows.length;

  return [
    card("inv-products", "Productos medidos", fmtNum(products), `${inventoryRows.length} sesión(es) de conteo`, "teal", Package),
    card("inv-pieces", "Piezas revisadas", fmtNum(piecesReviewed), "Volumen físico del periodo", "lime", Layers),
    card("inv-tarimas", "Tarimas trabajadas", fmtNum(tarimas), "Ubicaciones / pallets activos", "cyan", Box),
    card("inv-merma", "Piezas en merma", fmtNum(mermaPieces), `${mermaRows.length} motivo(s) registrados`, mermaPieces > 0 ? "red" : "slate", AlertTriangle),
    card("inv-missing", "Piezas faltantes", fmtNum(missingPieces), "Diferencias detectadas en conteo", missingPieces > 0 ? "amber" : "slate", OctagonAlert),
    card("inv-boards", "Tableros activos", fmtNum(boardSummary.boards || boards.length), `${fmtNum(metrics.completed)} cierre(s) en tableros`, "slate", ClipboardList),
    card("inv-records", "Registros inventario", fmtNum(metrics.total), `${fmtNum(metrics.running)} en curso · ${fmtNum(metrics.paused)} pausados`, "cyan", Gauge),
    card("inv-hours", "Horas de conteo", fmtHours(metrics.productionHours ?? metrics.totalHours), "Tiempo productivo del periodo", "green", Zap),
  ].filter((item) => {
    if (item.cardKey === "inv-merma" && mermaPieces <= 0 && mermaRows.length === 0) return false;
    if (item.cardKey === "inv-missing" && missingPieces <= 0) return false;
    return true;
  });
}

function buildQualityKpis(metrics, boards, pauseAnalysis) {
  const boardSummary = summarizeBoards(boards);
  const exceeded = Array.isArray(metrics.exceeded) ? metrics.exceeded.length : 0;

  return [
    card("qa-sla", "Cumplimiento SLA", fmtPct(metrics.withinPercent, 0), "Registros dentro del límite", metrics.withinPercent >= 80 ? "green" : metrics.withinPercent >= 50 ? "amber" : "red", Zap, metrics.withinPercent),
    card("qa-exceeded", "Fuera de tiempo", fmtNum(exceeded), `${fmtPct(metrics.outsidePercent, 0)} del periodo con límite`, exceeded > 0 ? "red" : "green", AlertTriangle),
    card("qa-pieces", "Piezas inspeccionadas", fmtNum(boardSummary.pieces), "Desde tableros de calidad / devoluciones", "lime", Layers),
    card("qa-returns", "Devoluciones", fmtNum(boardSummary.returnsDev), "Flujo devolución en tableros", boardSummary.returnsDev > 0 ? "amber" : "slate", Package),
    card("qa-recon", "Reacondicionado", fmtNum(boardSummary.returnsRecon), "Piezas o registros reacondicionados", "green", CircleCheckBig),
    card("qa-records", "Registros de calidad", fmtNum(metrics.total), `${fmtNum(metrics.completed)} cerrados`, "cyan", ClipboardList),
    card("qa-pauses", "Pausas en inspección", fmtNum(metrics.pauseCount), fmtHours(metrics.pauseHours), metrics.pauseCount > 0 ? "amber" : "slate", PauseCircle),
    card("qa-causes", "Causas de pausa", fmtNum(pauseAnalysis.length), "Motivos distintos en el periodo", pauseAnalysis.length > 0 ? "amber" : "slate", Search),
  ].filter((item) => {
    if (item.cardKey === "qa-returns" && boardSummary.returnsDev <= 0) return false;
    if (item.cardKey === "qa-recon" && boardSummary.returnsRecon <= 0) return false;
    if (item.cardKey === "qa-pieces" && boardSummary.pieces <= 0) return false;
    return true;
  });
}

function buildMaintenanceKpis(metrics, pauseAnalysis) {
  const exceeded = Array.isArray(metrics.exceeded) ? metrics.exceeded.length : 0;
  const topPause = pauseAnalysis[0];

  return [
    card("mnt-exceeded", "Excesos de tiempo", fmtNum(exceeded), "Actividades sobre el límite", exceeded > 0 ? "red" : "green", OctagonAlert),
    card("mnt-pause-hours", "Horas en pausa", fmtHours(metrics.pauseHours), `${fmtNum(metrics.pauseCount)} pausa(s) registradas`, metrics.pauseHours > 0 ? "amber" : "slate", PauseCircle),
    card("mnt-paused", "Registros pausados", fmtNum(metrics.paused), `${fmtNum(metrics.running)} aún en curso`, metrics.paused > 0 ? "amber" : "slate", PauseCircle),
    card("mnt-causes", "Causas de pausa", fmtNum(pauseAnalysis.length), topPause ? `Top: ${topPause.reason}` : "Sin pausas en el periodo", pauseAnalysis.length > 0 ? "amber" : "slate", Search),
    card("mnt-efficiency", "Eficiencia operativa", fmtPct(metrics.efficiency ?? 100, 1), "Producción vs tiempo total", (metrics.efficiency ?? 100) >= 80 ? "lime" : "amber", Zap, metrics.efficiency),
    card("mnt-records", "Órdenes / registros", fmtNum(metrics.total), `${fmtNum(metrics.completed)} cerrados`, "cyan", ClipboardList),
    card("mnt-running", "En ejecución", fmtNum(metrics.running), "Trabajos activos ahora", metrics.running > 0 ? "green" : "slate", Play),
    card("mnt-sla", "Cumplimiento SLA", fmtPct(metrics.withinPercent, 0), "Solo registros con límite", "lime", Gauge, metrics.withinPercent),
  ];
}

function buildMejoraContinuaKpis(auditMetrics = {}) {
  const m = auditMetrics;
  return [
    card("mc-problems", "Problemas sin propuesta", fmtNum(m.problemCount), "Auditorías abiertas con hallazgo", m.problemCount > 0 ? "red" : "green", AlertTriangle),
    card("mc-proposals", "Propuestas pendientes", fmtNum(m.pendingProposalCount), "Por revisar o autorizar", m.pendingProposalCount > 0 ? "amber" : "slate", ClipboardList),
    card("mc-auth", "Por autorizar", fmtNum(m.authorizationCount), "En cola de autorización", m.authorizationCount > 0 ? "amber" : "slate", Search),
    card("mc-impl", "En seguimiento", fmtNum(m.implementationCount), "Propuestas en implementación", "green", Play),
    card("mc-rejected", "Rechazadas", fmtNum(m.rejectedCount), "Propuestas no aprobadas", m.rejectedCount > 0 ? "red" : "slate", OctagonAlert),
    card("mc-accepted", "Aceptadas", fmtNum(m.acceptedCount), "Listas o en validación", "green", CircleCheckBig),
    card("mc-audits", "Auditorías totales", fmtNum(m.totalAudits), `${fmtNum(m.openAuditCount)} abiertas · ${fmtNum(m.closedAuditCount)} cerradas`, "cyan", Gauge),
    card("mc-attention", "Ítems de atención", fmtNum(m.attentionCount), "Suma de pendientes del ciclo", m.attentionCount > 0 ? "red" : "green", Zap),
  ];
}

function buildTransportKpis(metrics, boards, responsibleCount = 0, transportSummary = null) {
  if (transportSummary?.hasData) {
    return [
      card("tr-salidas", "Salidas del periodo", fmtNum(transportSummary.totalSalidas), "Módulo de transporte", "green", CircleCheckBig),
      card("tr-cajas", "Cajas del periodo", fmtNum(transportSummary.totalCajas), transportSummary.totalSalidas > 0 ? `Prom. ${(transportSummary.totalCajas / transportSummary.totalSalidas).toFixed(1)} por salida` : "Sin salidas", "cyan", Package),
      card("tr-piezas", "Piezas del periodo", fmtNum(transportSummary.totalPiezas), "Volumen físico movido", "lime", Layers),
      card("tr-destinos", "Destinos activos", fmtNum(transportSummary.totalDestinos), "Rutas / destinos distintos", "slate", Truck),
      card("tr-records", "Registros tableros", fmtNum(metrics.total), `${fmtNum(boards.length)} tablero(s) vinculados`, metrics.total > 0 ? "cyan" : "slate", ClipboardList),
      card("tr-hours", "Horas operativas", fmtHours(metrics.productionHours ?? metrics.totalHours), "Desde tableros del área", "green", Zap),
    ];
  }

  const boardSummary = summarizeBoards(boards);
  return [
    card("tr-salidas", "Salidas / cierres", fmtNum(metrics.completed), "Registros terminados en el periodo", "green", CircleCheckBig),
    card("tr-active", "En ruta / activos", fmtNum(metrics.running), `${fmtNum(metrics.paused)} pausados`, metrics.running > 0 ? "cyan" : "slate", Truck),
    card("tr-pieces", "Piezas movidas", fmtNum(boardSummary.pieces), "Desde tableros de transporte", boardSummary.pieces > 0 ? "lime" : "slate", Layers),
    card("tr-records", "Registros del periodo", fmtNum(metrics.total), `${fmtNum(boardSummary.boards || boards.length)} tablero(s)`, "cyan", ClipboardList),
    card("tr-hours", "Horas operativas", fmtHours(metrics.productionHours ?? metrics.totalHours), "Tiempo productivo acumulado", "green", Zap),
    card("tr-sla", "Cumplimiento SLA", fmtPct(metrics.withinPercent, 0), "Entregas dentro de tiempo", "lime", Gauge, metrics.withinPercent),
    card("tr-pauses", "Pausas en ruta", fmtNum(metrics.pauseCount), fmtHours(metrics.pauseHours), metrics.pauseCount > 0 ? "amber" : "slate", PauseCircle),
    card("tr-players", "Players activos", fmtNum(responsibleCount), "Personas con registros", "slate", Users),
  ];
}

function buildReceptionKpis(metrics) {
  return [
    card("rec-total", "Entradas registradas", fmtNum(metrics.total), "Recepciones en el periodo", "cyan", ClipboardList),
    card("rec-running", "En recepción", fmtNum(metrics.running), "Procesos abiertos ahora", metrics.running > 0 ? "amber" : "slate", Play),
    card("rec-done", "Cerradas", fmtNum(metrics.completed), `${fmtPct(metrics.total ? (metrics.completed / metrics.total) * 100 : 0, 0)} de avance`, "green", CircleCheckBig),
    card("rec-avg", "Tiempo promedio", `${fmtNum(metrics.averageMinutes, 1)} min`, "Por recepción cerrada", "cyan", Gauge),
    card("rec-pauses", "Pausas", fmtNum(metrics.pauseCount), fmtHours(metrics.pauseHours), metrics.pauseCount > 0 ? "amber" : "slate", PauseCircle),
    card("rec-sla", "SLA recepción", fmtPct(metrics.withinPercent, 0), "Dentro del tiempo objetivo", "lime", Zap, metrics.withinPercent),
  ];
}

function buildFulfillmentKpis(metrics, boards) {
  const boardSummary = summarizeBoards(boards);
  return [
    card("ff-running", "En preparación", fmtNum(metrics.running), `${fmtNum(metrics.paused)} pausados`, metrics.running > 0 ? "amber" : "slate", Play),
    card("ff-done", "Salidas completadas", fmtNum(metrics.completed), "Pedidos cerrados en el periodo", "green", CircleCheckBig),
    card("ff-pieces", "Piezas preparadas", fmtNum(boardSummary.pieces), "Unidades desde tableros", boardSummary.pieces > 0 ? "lime" : "slate", Package),
    card("ff-records", "Registros fulfillment", fmtNum(metrics.total), `${fmtNum(boardSummary.boards || boards.length)} tablero(s)`, "cyan", ClipboardList),
    card("ff-hours", "Horas de preparación", fmtHours(metrics.productionHours ?? metrics.totalHours), "Tiempo productivo", "green", Zap),
    card("ff-sla", "SLA de salida", fmtPct(metrics.withinPercent, 0), "Cumplimiento del periodo", "lime", Gauge, metrics.withinPercent),
  ];
}

function buildRetailCommerceKpis(metrics, boards, labelPrefix, responsibleCount = 0) {
  const boardSummary = summarizeBoards(boards);
  return [
    card(`${labelPrefix}-records`, "Atenciones registradas", fmtNum(metrics.total), `${fmtNum(metrics.completed)} cerradas`, "cyan", ClipboardList),
    card(`${labelPrefix}-running`, "En piso / activas", fmtNum(metrics.running), `${fmtNum(metrics.paused)} pausadas`, "amber", Play),
    card(`${labelPrefix}-sla`, "Cumplimiento SLA", fmtPct(metrics.withinPercent, 0), "Tiempos de atención", "lime", Zap, metrics.withinPercent),
    card(`${labelPrefix}-pieces`, "Piezas atendidas", fmtNum(boardSummary.pieces), "Volumen del periodo", boardSummary.pieces > 0 ? "lime" : "slate", Layers),
    card(`${labelPrefix}-players`, "Players en turno", fmtNum(responsibleCount), "Con actividad registrada", "slate", Users),
    card(`${labelPrefix}-hours`, "Horas operativas", fmtHours(metrics.productionHours ?? metrics.totalHours), "Tiempo productivo", "green", Gauge),
  ];
}

function buildEstoKpis(metrics, boards) {
  const boardSummary = summarizeBoards(boards);
  return [
    card("esto-records", "Registros ESTO", fmtNum(metrics.total), `${fmtNum(metrics.completed)} cerrados`, "cyan", ClipboardList),
    card("esto-running", "En ejecución", fmtNum(metrics.running), `${fmtNum(metrics.paused)} pausados`, "amber", Play),
    card("esto-hours", "Horas productivas", fmtHours(metrics.productionHours ?? metrics.totalHours), "Tiempo del periodo", "green", Zap),
    card("esto-sla", "Cumplimiento SLA", fmtPct(metrics.withinPercent, 0), "Objetivo de ciclo", "lime", Gauge, metrics.withinPercent),
    card("esto-pieces", "Piezas procesadas", fmtNum(boardSummary.pieces), "Volumen en tableros ESTO", boardSummary.pieces > 0 ? "lime" : "slate", Layers),
    card("esto-boards", "Tableros activos", fmtNum(boardSummary.boards || boards.length), "Fuentes con movimiento", "slate", Box),
  ];
}

function buildCleaningKpis(metrics, responsibleRows) {
  return [
    card("cl-records", "Actividades registradas", fmtNum(metrics.total), `${fmtNum(metrics.completed)} completadas`, "cyan", ClipboardList),
    card("cl-sla", "Cumplimiento SLA", fmtPct(metrics.withinPercent, 0), "Cobertura en tiempo", "lime", Zap, metrics.withinPercent),
    card("cl-team", "Equipo activo", fmtNum(responsibleRows.length), "Players con registros", "slate", Users),
    card("cl-pauses", "Pausas", fmtNum(metrics.pauseCount), fmtHours(metrics.pauseHours), metrics.pauseCount > 0 ? "amber" : "slate", PauseCircle),
    card("cl-running", "En curso", fmtNum(metrics.running), "Tareas abiertas", metrics.running > 0 ? "amber" : "slate", Play),
    card("cl-hours", "Horas de servicio", fmtHours(metrics.productionHours ?? metrics.totalHours), "Tiempo productivo", "green", Gauge),
  ];
}

function buildRegulatoryKpis(metrics, pauseAnalysis) {
  const exceeded = Array.isArray(metrics.exceeded) ? metrics.exceeded.length : 0;
  return [
    card("reg-sla", "Conformidad SLA", fmtPct(metrics.withinPercent, 0), "Registros auditables en tiempo", "lime", Zap, metrics.withinPercent),
    card("reg-exceeded", "No conformidades tiempo", fmtNum(exceeded), "Fuera del límite establecido", exceeded > 0 ? "red" : "green", AlertTriangle),
    card("reg-closed", "Cierres documentados", fmtNum(metrics.completed), `${fmtPct(metrics.total ? (metrics.completed / metrics.total) * 100 : 0, 0)} del periodo`, "green", CircleCheckBig),
    card("reg-records", "Registros regulatorios", fmtNum(metrics.total), `${fmtNum(metrics.running)} abiertos`, "cyan", ClipboardList),
    card("reg-pauses", "Pausas trazadas", fmtNum(metrics.pauseCount), `${fmtNum(pauseAnalysis.length)} causa(s)`, metrics.pauseCount > 0 ? "amber" : "slate", PauseCircle),
    card("reg-boards", "Tableros auditables", fmtNum(metrics.boardCount ?? 0), "Fuentes con evidencia", "slate", Search),
  ];
}

function buildOperationsKpis(metrics, boards) {
  const boardSummary = summarizeBoards(boards);
  return [
    card("ops-records", "Registros operativos", fmtNum(metrics.total), `${fmtNum(metrics.completed)} cerrados`, "cyan", ClipboardList),
    card("ops-areas", "Áreas con actividad", fmtNum(metrics.areaCount), "Departamentos con movimiento", "slate", Users),
    card("ops-boards", "Tableros activos", fmtNum(boardSummary.boards || boards.length), "Fuentes en el periodo", "cyan", Box),
    card("ops-efficiency", "Eficiencia global", fmtPct(metrics.efficiency ?? 100, 1), "Producción vs tiempo", "lime", Zap, metrics.efficiency),
    card("ops-sla", "SLA consolidado", fmtPct(metrics.withinPercent, 0), "Cumplimiento del periodo", "lime", Gauge, metrics.withinPercent),
    card("ops-hours", "Horas productivas", fmtHours(metrics.productionHours ?? metrics.totalHours), "Tiempo acumulado", "green", Gauge),
  ];
}

function buildDefaultAreaKpis(metrics) {
  return [
    card("def-total", "Registros", fmtNum(metrics.total), `${fmtNum(metrics.completed)} cerrados`, "cyan", ClipboardList),
    card("def-running", "En curso", fmtNum(metrics.running), `${fmtNum(metrics.paused)} pausados`, "amber", Play),
    card("def-sla", "Cumplimiento SLA", fmtPct(metrics.withinPercent, 0), "Dentro del límite", "lime", Zap, metrics.withinPercent),
    card("def-eff", "Eficiencia", fmtPct(metrics.efficiency ?? 100, 1), "Producción / tiempo", "lime", Zap, metrics.efficiency),
    card("def-hours", "Horas productivas", fmtHours(metrics.productionHours ?? metrics.totalHours), "Periodo filtrado", "green", Gauge),
    card("def-pauses", "Pausas", fmtNum(metrics.pauseCount), fmtHours(metrics.pauseHours), metrics.pauseCount > 0 ? "amber" : "slate", PauseCircle),
  ];
}

/**
 * KPIs ejecutivos adaptados al área (sin tarjetas genéricas por tablero).
 */
/** Tarjetas puente entre dashboard de área y corporativo (mismo periodo/filtros). */
export function buildAreaBridgeKpiCards(globalMetrics = {}, areaMetrics = {}) {
  const globalTotal = Number(globalMetrics.total || 0);
  const areaTotal = Number(areaMetrics.total || 0);
  const share = globalTotal > 0 ? Math.round((areaTotal / globalTotal) * 100) : 0;
  const globalCompleted = Number(globalMetrics.completed || 0);
  const areaCompleted = Number(areaMetrics.completed || 0);

  return [
    card(
      "bridge-share",
      "Participación en el general",
      `${share}%`,
      `${fmtNum(areaTotal)} de ${fmtNum(globalTotal)} registros del periodo`,
      share >= 25 ? "cyan" : "slate",
      Gauge,
      share,
    ),
    card(
      "bridge-global-total",
      "Total corporativo",
      fmtNum(globalTotal),
      "Mismas fechas, player y periodo",
      "slate",
      ClipboardList,
    ),
    card(
      "bridge-global-done",
      "Cierres corporativos",
      fmtNum(globalCompleted),
      `${fmtNum(areaCompleted)} cerrados en esta área`,
      "green",
      CircleCheckBig,
    ),
  ];
}

export function buildAreaExecutiveKpiCards(sectionId, data = {}) {
  const key = String(sectionId || "").trim().toLowerCase();
  const metrics = data.metrics || {};
  const boards = Array.isArray(data.boardRows) ? data.boardRows : [];
  const inventoryRows = Array.isArray(data.inventoryRows) ? data.inventoryRows : [];
  const mermaRows = Array.isArray(data.mermaRows) ? data.mermaRows : [];
  const pauseAnalysis = Array.isArray(data.pauseAnalysis) ? data.pauseAnalysis : [];
  const palletRows = Array.isArray(data.palletRows) ? data.palletRows : [];
  const responsibleRows = Array.isArray(data.responsibleRows) ? data.responsibleRows : [];
  const auditMetrics = data.auditMetrics || {};

  switch (key) {
    case "inventario":
      return buildInventoryKpis(metrics, boards, inventoryRows, mermaRows, palletRows);
    case "calidad":
      return buildQualityKpis(metrics, boards, pauseAnalysis);
    case "mantenimiento":
      return buildMaintenanceKpis(metrics, pauseAnalysis);
    case "mejora-continua":
      return buildMejoraContinuaKpis(auditMetrics);
    case "transporte":
      return buildTransportKpis(metrics, boards, responsibleRows.length, data.transportSummary);
    case "recepcion-pedidos":
      return buildReceptionKpis(metrics);
    case "fullfilment":
      return buildFulfillmentKpis(metrics, boards);
    case "retail":
      return buildRetailCommerceKpis(metrics, boards, "retail", responsibleRows.length);
    case "mayoreo-comercio":
      return buildRetailCommerceKpis(metrics, boards, "commerce", responsibleRows.length);
    case "esto":
      return buildEstoKpis(metrics, boards);
    case "limpieza":
      return buildCleaningKpis(metrics, responsibleRows);
    case "regulatorio":
      return buildRegulatoryKpis(metrics, pauseAnalysis);
    case "operaciones":
      return buildOperationsKpis(metrics, boards);
    default:
      return buildDefaultAreaKpis(metrics);
  }
}
