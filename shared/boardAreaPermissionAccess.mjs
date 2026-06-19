/** Board operational area token -> "Mis tableros" scope id. */
export const BOARD_AREA_TO_MY_BOARDS_SCOPE = Object.freeze({
  ESTO: "scopeEstoMyBoards",
  LIMPIEZA: "scopeLimpiezaMyBoards",
  REGULATORIO: "scopeRegulatorioMyBoards",
  CALIDAD: "scopeCalidadMyBoards",
  INVENTARIO: "scopeInventarioMyBoards",
  "RECEPCION DE PEDIDOS": "scopeRecepcionMyBoards",
  OPERACIONES: "scopeOperacionesMyBoards",
  MANTENIMIENTO: "scopeMantenimientoMyBoards",
  "MAYOREO-TELEMARKETING": "scopeMayoreoMyBoards",
  ECOMMERCE: "scopeMayoreoMyBoards",
  "PEDIDOS DETAL": "scopeMayoreoMyBoards",
  FULLFILMENT: "scopeFullfilmentMyBoards",
});

export const BOARD_OPERATION_ACTION_IDS = Object.freeze([
  "boardWorkflow",
  "createBoardRow",
  "deleteBoardRow",
  "editFinishedBoardRow",
  "exportBoardExcel",
  "previewBoardPdf",
  "exportBoardPdf",
]);

export function normalizeBoardAreaToken(value) {
  return String(value || "").trim().toUpperCase();
}

export function resolveMyBoardsScopeForAreaToken(areaToken) {
  return BOARD_AREA_TO_MY_BOARDS_SCOPE[normalizeBoardAreaToken(areaToken)] || "";
}

export function collectBoardAreaTokens(board, normalizeArea = (value) => String(value || "").trim()) {
  const tokens = new Set();
  const ownerArea = normalizeArea(board?.settings?.ownerArea || board?.ownerArea || "");
  if (ownerArea) tokens.add(normalizeBoardAreaToken(ownerArea));

  const visibilityType = String(board?.visibilityType || "department").trim().toLowerCase();
  if (visibilityType === "department") {
    (board?.sharedDepartments || []).forEach((entry) => {
      const normalized = normalizeArea(entry);
      if (normalized) tokens.add(normalizeBoardAreaToken(normalized));
    });
  }

  return [...tokens];
}

export function boardGrantsOperationalAccessViaConfiguredPermissions(areaTokens, canDoActionFn) {
  if (typeof canDoActionFn !== "function") return false;
  for (const areaToken of areaTokens || []) {
    const scopeId = resolveMyBoardsScopeForAreaToken(areaToken);
    if (!scopeId) continue;
    if (canDoActionFn(scopeId)) return true;
    for (const actionId of BOARD_OPERATION_ACTION_IDS) {
      if (canDoActionFn(`${scopeId}__${actionId}`)) return true;
    }
  }
  return false;
}
