import { createEmptyCatalogModalState } from "./catalogHelpers.js";
import {
  createInventoryDestinationModalState,
  createInventoryModalState,
  createInventoryMovementModalState,
  createInventoryRestockModalState,
  createInventoryTransferConfirmModalState,
} from "../utils/utilidades.jsx";

const CLOSED_BOARD_CONFIRM = { open: false, boardId: null, rowId: null, message: "" };
const CLOSED_BOARD_START = { open: false, boardId: null, rowId: null, title: "", message: "" };

/** Valores por defecto para evitar crashes si falta alguna prop del contexto de modales. */
export const MODAL_CONTEXT_DEFAULTS = {
  pauseState: { open: false, activityId: null, reason: "", customReason: "", error: "", completed: false, continueReady: false, pauseLogId: null },
  boardPauseState: {
    open: false,
    boardId: null,
    rowId: null,
    historySnapshotId: null,
    reason: "",
    customReason: "",
    error: "",
    completed: false,
    continueReady: false,
    authorizedPauseSeconds: 0,
    pauseStartedAtMs: 0,
  },
  boardFinishConfirm: CLOSED_BOARD_CONFIRM,
  boardStartConfirm: CLOSED_BOARD_START,
  boardStartConflictRows: [],
  deleteBoardRowState: { open: false, boardId: null, rowId: null },
  pieceDeductionModal: { open: false, boardId: null, rowId: null, items: [] },
  templateEditorModal: {
    open: false,
    id: null,
    name: "",
    description: "",
    category: "",
    visibilityType: "department",
    sharedDepartments: [],
    sharedUserIds: [],
    submitting: false,
  },
  templateDeleteModal: { open: false, id: null, name: "" },
  boardBuilderModal: { open: false, mode: "create", boardId: null },
  excelFormulaWizard: { open: false, items: [] },
  excelSheetSelector: { open: false, sheets: [], fileName: "" },
  resetUserPasswordModal: { open: false, userId: null, userName: "", password: "", message: "", submitting: false },
  areaModal: { open: false, target: "user", name: "", parentArea: "", error: "" },
  areaDeleteModal: { open: false, areaName: "", label: "", error: "", submitting: false },
  inventoryTransferViewerState: { open: false, itemId: null },
  state: { controlBoards: [], users: [], catalog: [], inventoryItems: [] },
  historyPauseLogs: [],
  pauseReasonOptions: [],
};

function cloneDefault(value) {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...value };
  return value;
}

export function withModalContextDefaults(props = {}) {
  const next = { ...props };
  for (const [key, defaultValue] of Object.entries(MODAL_CONTEXT_DEFAULTS)) {
    if (next[key] === undefined) next[key] = cloneDefault(defaultValue);
  }
  if (next.catalogModal === undefined) next.catalogModal = createEmptyCatalogModalState();
  if (next.inventoryModal === undefined) next.inventoryModal = createInventoryModalState();
  if (next.inventoryMovementModal === undefined) next.inventoryMovementModal = createInventoryMovementModalState();
  if (next.inventoryDestinationModal === undefined) next.inventoryDestinationModal = createInventoryDestinationModalState();
  if (next.inventoryTransferConfirmModal === undefined) next.inventoryTransferConfirmModal = createInventoryTransferConfirmModalState();
  if (next.inventoryRestockModal === undefined) next.inventoryRestockModal = createInventoryRestockModalState();
  return next;
}
