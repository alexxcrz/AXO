import {
  STATUS_FINISHED,
  STATUS_PAUSED,
  STATUS_RUNNING,
} from "../utils/constantes.js";
import {
  getElapsedSeconds,
  isBoardFieldValueFilled,
  applyRemoteWarehouseState,
  normalizeKey,
  findBoardFinishGateField,
  isBoardFinishGateValueEnabled,
} from "../utils/utilidades.jsx";

/** Acciones runtime de tablero para modales */
export function createBoardRuntimeModalActions(deps) {
  const {
    state,
    currentUser,
    normalizedPermissions,
    operationalPauseState,
    selectedCustomBoard,
    boardStartConfirm,
    setBoardStartConfirm,
    boardStartConflictRows,
    boardFinishConfirm,
    setBoardFinishConfirm,
    pieceDeductionModal,
    setPieceDeductionModal,
    setDeleteBoardRowState,
    canOperateBoardRowRecord,
    canDeleteBoardRowRecord,
    canManageDashboardState,
    resolveBoardMutationBoard,
    getBoardRowPatchEndpoint,
    applyOptimisticBoardRowPatch,
    getBoardFieldValue,
    starterByRowIdRef,
    setBoardRuntimeFeedback,
    requestJson,
    setState,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
  } = deps;

    function deleteBoardRow(boardId, rowId) {
      const board = (state.controlBoards || []).find((item) => item.id === boardId);
      const row = board?.rows?.find((item) => item.id === rowId);
      if (!board || !row || !canDeleteBoardRowRecord(currentUser, board, row, normalizedPermissions)) {
        setDeleteBoardRowState({ open: false, boardId: null, rowId: null });
        setBoardRuntimeFeedback({ tone: "danger", message: "No tienes permiso para eliminar filas en este tablero." });
        return;
      }

      requestJson(`/warehouse/boards/${boardId}/rows/${rowId}`, {
        method: "DELETE",
      }).then((remoteState) => {
        applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setDeleteBoardRowState({ open: false, boardId: null, rowId: null });
        setBoardRuntimeFeedback({ tone: "success", message: "La fila fue eliminada del tablero." });
      }).catch((error) => {
        if (error?.status === 404) {
          // Another device/process may have already removed this row.
          setState((current) => ({
            ...current,
            controlBoards: (current.controlBoards || []).map((controlBoard) => {
              if (controlBoard.id !== boardId) return controlBoard;
              return {
                ...controlBoard,
                rows: (controlBoard.rows || []).filter((boardRow) => boardRow.id !== rowId),
              };
            }),
          }));
          setDeleteBoardRowState({ open: false, boardId: null, rowId: null });
          setBoardRuntimeFeedback({ tone: "warning", message: "La fila ya no existía. Se actualizó la vista." });
          return;
        }
        setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo eliminar la fila." });
      });
    }

    function changeBoardRowStatus(boardId, rowId, status, options = {}) {
      const permissionBoard = selectedCustomBoard?.id === boardId ? selectedCustomBoard : resolveBoardMutationBoard(boardId);
      const board = resolveBoardMutationBoard(boardId);
      const row = board?.rows?.find((item) => item.id === rowId);
      if (!board || !row || !canOperateBoardRowRecord(currentUser, permissionBoard, row, normalizedPermissions)) return false;

      // Control de permiso para pausar/finalizar:
      // - El botón de inicio puede accionarlo cualquier persona con permiso de operación sobre la fila.
      // - Pausa y fin están reservados al iniciador o a cualquier player seleccionado en la actividad.
      if (status === STATUS_PAUSED || status === STATUS_FINISHED) {
        const rawResponsible = Array.isArray(row?.responsibleIds) ? row.responsibleIds : (row?.responsibleId ? [row.responsibleId] : []);
        const responsibleIds = (rawResponsible || []).map((id) => String(id || "").trim()).filter(Boolean);
        const currentId = String(currentUser?.id || "");
        const starterId = String(starterByRowIdRef.current[rowId] || "");
        const isResponsibleUser = responsibleIds.includes(currentId);
        const isStarter = starterId && starterId === currentId;

        if (!isResponsibleUser && !isStarter && !canManageDashboardState) {
          setBoardRuntimeFeedback({
            tone: "danger",
            message: "Solo la persona que inició o los players asignados a esta actividad pueden pausarla o finalizarla (excepto Leads).",
          });
          return;
        }
      }

      if (status === STATUS_FINISHED) {
        const finishGateField = findBoardFinishGateField(board?.fields || []);
        if (finishGateField && !isBoardFinishGateValueEnabled(getBoardFieldValue(board, row, finishGateField))) {
          setBoardRuntimeFeedback({
            tone: "danger",
            message: `Debes activar «${finishGateField.label}» antes de finalizar.`,
          });
          return false;
        }
      }

      if (status === STATUS_RUNNING && row.status !== STATUS_RUNNING && !options.skipStartConfirm) {
        setBoardStartConfirm({
          open: true,
          boardId,
          rowId,
          title: row.status === STATUS_PAUSED ? "Confirmar reanudación" : "Confirmar inicio",
          message: row.status === STATUS_PAUSED
            ? "Vas a reanudar esta actividad."
            : "Vas a iniciar esta actividad.",
        });
        return true;
      }

      // When starting a row, check if there are linked cleaning inventory items measured in piezas
      if (status === STATUS_RUNNING && row.status !== STATUS_RUNNING) {
        const activityCatalogId = row.catalogActivityId || null;
        if (activityCatalogId) {
          const pieceItems = (state.inventory || []).filter((invItem) => {
            if (invItem.isDeleted) return false;
            const unit = String(invItem.unitLabel || "").trim().toLowerCase();
            const isPieces = unit === "pzas" || unit === "piezas" || unit === "pz";
            if (!isPieces) return false;
            return (invItem.activityConsumptions || []).some((entry) => entry.catalogActivityId === activityCatalogId && Number(entry.quantity) > 0);
          });
          if (pieceItems.length) {
            setPieceDeductionModal({
              open: true,
              boardId,
              rowId,
              items: pieceItems.map((invItem) => {
                const consumption = invItem.activityConsumptions.find((entry) => entry.catalogActivityId === activityCatalogId);
                return { id: invItem.id, name: invItem.name, quantity: consumption?.quantity || 1, unit: invItem.unitLabel || "pzas", stock: invItem.stockUnits };
              }),
            });
            return;
          }
        }
      }

      executeBoardRowStatusChange(boardId, rowId, status);
      return true;
    }

    function closeBoardStartConfirm() {
      setBoardStartConfirm({ open: false, boardId: null, rowId: null, title: "", message: "" });
    }

    function confirmStartBoardRow() {
      if (!boardStartConfirm.boardId || !boardStartConfirm.rowId) return;
      const boardId = boardStartConfirm.boardId;
      const rowId = boardStartConfirm.rowId;
      closeBoardStartConfirm();
      changeBoardRowStatus(boardId, rowId, STATUS_RUNNING, { skipStartConfirm: true });
    }

    async function finishPreviousActivityAndStart() {
      const conflict = boardStartConflictRows[0];
      const { boardId, rowId } = boardStartConfirm;
      if (!boardId || !rowId) return;
      closeBoardStartConfirm();
      if (conflict?.boardId && conflict?.rowId) {
        try {
          await executeBoardRowStatusChange(conflict.boardId, conflict.rowId, STATUS_FINISHED);
        } catch {
          return;
        }
      }
      changeBoardRowStatus(boardId, rowId, STATUS_RUNNING, { skipStartConfirm: true });
    }

    function applyOptimisticBoardRowStatus(boardId, rowId, updater) {
      applyOptimisticBoardRowPatch(boardId, rowId, updater);
    }

    function executeBoardRowStatusChange(boardId, rowId, status) {
      const permissionBoard = selectedCustomBoard?.id === boardId ? selectedCustomBoard : resolveBoardMutationBoard(boardId);
      const board = resolveBoardMutationBoard(boardId);
      const row = board?.rows?.find((item) => item.id === rowId);
      if (!board || !row || !canOperateBoardRowRecord(currentUser, permissionBoard, row, normalizedPermissions)) {
        return Promise.resolve(false);
      }

      const nowTime = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const autoTimeValues = (board.fields || []).reduce((accumulator, field) => {
        if (field.type !== "time") return accumulator;
        const normalizedLabel = normalizeKey(field.label || "");
        const currentValue = String(row.values?.[field.id] || "").trim();
        if (status === STATUS_RUNNING && (normalizedLabel.includes("inicio") || normalizedLabel.includes("start")) && !currentValue) {
          accumulator[field.id] = nowTime;
        }
        if (status === STATUS_FINISHED && (normalizedLabel.includes("fin") || normalizedLabel.includes("final") || normalizedLabel.includes("end"))) {
          accumulator[field.id] = nowTime;
        }
        return accumulator;
      }, {});

      if (status === STATUS_FINISHED) {
        const missingFields = (board.fields || []).filter((field) => {
          if (!field.required) return false;
          const effectiveValue = Object.hasOwn(autoTimeValues, field.id)
            ? autoTimeValues[field.id]
            : getBoardFieldValue(board, row, field);
          return !isBoardFieldValueFilled(effectiveValue, field.type);
        });

        if (missingFields.length) {
          setBoardRuntimeFeedback({
            tone: "danger",
            message: `Completa los campos obligatorios antes de terminar: ${missingFields.map((field) => field.label).join(", ")}.`,
          });
          return Promise.resolve(false);
        }
      }

      setBoardRuntimeFeedback({ tone: "", message: "" });
      const nowIso = new Date().toISOString();
      const previousRowSnapshot = JSON.parse(JSON.stringify(row));

      applyOptimisticBoardRowStatus(boardId, rowId, (currentRow) => {
        const optimisticValues = {
          ...(currentRow.values || {}),
          ...autoTimeValues,
        };
        const currentElapsedSeconds = getElapsedSeconds(currentRow, Date.now(), operationalPauseState);

        if (status === STATUS_RUNNING) {
          return {
            ...currentRow,
            status,
            values: optimisticValues,
            startTime: currentRow.startTime || nowIso,
            endTime: currentRow.status === STATUS_FINISHED ? null : currentRow.endTime,
            lastResumedAt: nowIso,
            pauseStartedAt: null,
            pauseAffectsTimer: false,
            pauseAuthorizedSeconds: 0,
            // Preserve the stored accumulatedSeconds on resume to avoid adding paused duration
            // (some pause overflow is shown in `totalTime` but should not be merged into `time`).
            accumulatedSeconds: Math.max(0, Number(currentRow.accumulatedSeconds || 0)),
          };
        }

        if (status === STATUS_PAUSED) {
          return {
            ...currentRow,
            status,
            values: optimisticValues,
            accumulatedSeconds: currentElapsedSeconds,
            lastResumedAt: null,
            pauseStartedAt: nowIso,
          };
        }

        if (status === STATUS_FINISHED) {
          return {
            ...currentRow,
            status,
            values: optimisticValues,
            accumulatedSeconds: currentElapsedSeconds,
            endTime: nowIso,
            lastResumedAt: null,
            pauseStartedAt: null,
            pauseAffectsTimer: false,
            pauseAuthorizedSeconds: 0,
          };
        }

        return {
          ...currentRow,
          status,
          values: optimisticValues,
        };
      });

      // Registrar localmente quién inició la fila (para control de pausa/fin)
      try {
        if (previousRowSnapshot.status !== STATUS_RUNNING && status === STATUS_RUNNING) {
          starterByRowIdRef.current[rowId] = String(currentUser?.id || "");
        }
        if (status === STATUS_FINISHED) {
          delete starterByRowIdRef.current[rowId];
        }
      } catch (_error) {
        // ignore
      }

      return requestJson(getBoardRowPatchEndpoint(boardId, rowId), {
        method: "PATCH",
        body: JSON.stringify({
          status,
          ...(Object.keys(autoTimeValues).length ? { values: autoTimeValues } : {}),
        }),
      }).then((remoteState) => {
        applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        return true;
      }).catch((error) => {
        applyOptimisticBoardRowStatus(boardId, rowId, () => previousRowSnapshot);
        setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo cambiar el estado de la fila." });
        throw error;
      });
    }

    async function confirmPieceDeductionAndStart(deduct) {
      const { boardId, rowId, items } = pieceDeductionModal;
      setPieceDeductionModal({ open: false, boardId: null, rowId: null, items: [] });
      if (deduct && items.length) {
        try {
          for (const item of items) {
            await requestJson(`/warehouse/inventory/movements`, {
              method: "POST",
              body: JSON.stringify({
                itemId: item.id,
                movementType: "Salida",
                quantity: item.quantity,
                notes: "Descuento automático al iniciar actividad en tablero",
                storageLocation: "",
              }),
            });
          }
        } catch {
          // Non-blocking: proceed to start row even if deduction fails
        }
      }
      executeBoardRowStatusChange(boardId, rowId, STATUS_RUNNING);
    }

    function openFinishBoardRowConfirm(boardId, rowId) {
      const permissionBoard = selectedCustomBoard?.id === boardId ? selectedCustomBoard : resolveBoardMutationBoard(boardId);
      const board = resolveBoardMutationBoard(boardId);
      const row = board?.rows?.find((item) => item.id === rowId);
      if (!board || !row || !canOperateBoardRowRecord(currentUser, permissionBoard, row, normalizedPermissions)) return;
      setBoardFinishConfirm({
        open: true,
        boardId,
        rowId,
        message: "Al finalizar esta fila, su información quedará bloqueada para mantener la trazabilidad del registro.",
      });
    }

    function confirmFinishBoardRow() {
      if (!boardFinishConfirm.boardId || !boardFinishConfirm.rowId) return;
      const success = changeBoardRowStatus(boardFinishConfirm.boardId, boardFinishConfirm.rowId, STATUS_FINISHED);
      if (success) {
        setBoardFinishConfirm({ open: false, boardId: null, rowId: null, message: "" });
      }
    }


  return {
        deleteBoardRow,
    changeBoardRowStatus,
    closeBoardStartConfirm,
    confirmStartBoardRow,
    finishPreviousActivityAndStart,
    confirmPieceDeductionAndStart,
    openFinishBoardRowConfirm,
    confirmFinishBoardRow,
  };
}
