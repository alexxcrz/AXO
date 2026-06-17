import {
  STATUS_PAUSED,
  STATUS_RUNNING,
  CUSTOM_PAUSE_REASON_VALUE,
} from "../utils/constantes.js";
import { updateElapsedForFinish, makeId } from "../utils/utilidades.jsx";

/** Acciones de modales de pausa */
export function createPauseModalActions(deps) {
  const {
    pauseState,
    setPauseState,
    pauseContinueTimerRef,
    boardPauseState,
    setBoardPauseState,
    boardPauseContinueTimerRef,
    operationalPauseState,
    setState,
    requestJson,
    applyRemoteWarehouseState,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
    enabledPauseReasons,
  } = deps;

    function resolvePauseReasonValue(pauseEntry) {
      const isCustomReasonSelected = String(pauseEntry?.reason || "").trim() === CUSTOM_PAUSE_REASON_VALUE;
      const customReason = String(pauseEntry?.customReason || "").trim();
      if (isCustomReasonSelected) return customReason;
      if (customReason) return customReason;
      return String(pauseEntry?.reason || "").trim();
    }

    function findEnabledPauseReasonByLabel(label) {
      const normalizedLabel = String(label || "").trim().toLowerCase();
      if (!normalizedLabel) return null;
      return enabledPauseReasons.find((entry) => String(entry.label || "").trim().toLowerCase() === normalizedLabel) || null;
    }

    function handleConfirmPause() {
      if (pauseState.completed) {
        if (!pauseState.continueReady) return;
        // Reanudar actividad al presionar Continuar
        const resumeIso = new Date().toISOString();
        setState((current) => ({
          ...current,
          activities: current.activities.map((activity) => {
            if (activity.id !== pauseState.activityId) return activity;
            return { ...activity, status: STATUS_RUNNING, lastResumedAt: resumeIso };
          }),
          pauseLogs: current.pauseLogs.map((log) => {
            if (log.id !== pauseState.pauseLogId) return log;
            const pausedAt = new Date(log.pausedAt).getTime();
            const resumedAt = new Date(resumeIso).getTime();
            return { ...log, resumedAt: resumeIso, pauseDurationSeconds: Math.round((resumedAt - pausedAt) / 1000) };
          }),
        }));
        if (pauseContinueTimerRef.current) clearTimeout(pauseContinueTimerRef.current);
        setPauseState({ open: false, activityId: null, reason: "", customReason: "", error: "", completed: false, continueReady: false, pauseLogId: null });
        return;
      }

      const pauseReasonValue = resolvePauseReasonValue(pauseState);
      if (!pauseReasonValue) {
        setPauseState((current) => ({ ...current, error: "El motivo es obligatorio para poder pausar." }));
        return;
      }
      if (String(pauseReasonValue).trim().toLowerCase() === "ajuste manual de contadores") {
        setPauseState((current) => ({ ...current, error: "Este motivo no está permitido para pausar actividades." }));
        return;
      }

      const nowIso = new Date().toISOString();
      const pauseLogId = makeId("pause");

      setState((current) => ({
        ...current,
        activities: current.activities.map((activity) => {
          if (activity.id !== pauseState.activityId) return activity;
          return {
            ...activity,
            status: STATUS_PAUSED,
              accumulatedSeconds: updateElapsedForFinish(activity, nowIso, operationalPauseState),
            lastResumedAt: null,
          };
        }),
        pauseLogs: current.pauseLogs.concat({
          id: pauseLogId,
          weekActivityId: pauseState.activityId,
          pauseReason: pauseReasonValue,
          pausedAt: nowIso,
          resumedAt: null,
          pauseDurationSeconds: 0,
        }),
      }));

      if (pauseContinueTimerRef.current) clearTimeout(pauseContinueTimerRef.current);
      pauseContinueTimerRef.current = setTimeout(() => {
        setPauseState((current) => (current.completed ? { ...current, continueReady: true } : current));
      }, 3000);

      setPauseState((current) => ({
        ...current,
        error: "",
        completed: true,
        continueReady: false,
        pauseLogId,
      }));
    }

    function handleConfirmBoardPause() {
      if (boardPauseState.completed) {
        if (!boardPauseState.continueReady) return;
        // Reanudar fila al presionar Continuar
        const resumeEndpoint = boardPauseState.historySnapshotId
          ? `/warehouse/board-history/${boardPauseState.historySnapshotId}/rows/${boardPauseState.rowId}`
          : `/warehouse/boards/${boardPauseState.boardId}/rows/${boardPauseState.rowId}`;
        requestJson(resumeEndpoint, {
          method: "PATCH",
          body: JSON.stringify({ status: STATUS_RUNNING }),
        }).then((remoteState) => {
          applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        }).catch(() => {});
        if (boardPauseContinueTimerRef.current) clearTimeout(boardPauseContinueTimerRef.current);
        setBoardPauseState({
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
        });
        return;
      }

      const boardPauseReasonValue = resolvePauseReasonValue(boardPauseState);
      if (!boardPauseReasonValue) {
        setBoardPauseState((current) => ({ ...current, error: "El motivo es obligatorio para poder pausar." }));
        return;
      }
      if (String(boardPauseReasonValue).trim().toLowerCase() === "ajuste manual de contadores") {
        setBoardPauseState((current) => ({ ...current, error: "Este motivo no está permitido para pausar filas." }));
        return;
      }

      const pauseEndpoint = boardPauseState.historySnapshotId
        ? `/warehouse/board-history/${boardPauseState.historySnapshotId}/rows/${boardPauseState.rowId}`
        : `/warehouse/boards/${boardPauseState.boardId}/rows/${boardPauseState.rowId}`;
      requestJson(pauseEndpoint, {
        method: "PATCH",
        body: JSON.stringify({
          status: STATUS_PAUSED,
          lastPauseReason: boardPauseReasonValue,
        }),
      }).then((remoteState) => {
        const normalizedState = applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        const pausedBoard = boardPauseState.historySnapshotId
          ? (normalizedState?.boardWeekHistory || []).find((snapshot) => snapshot.id === boardPauseState.historySnapshotId)
          : (normalizedState?.controlBoards || []).find((board) => board.id === boardPauseState.boardId);
        const pausedRow = (pausedBoard?.rows || []).find((row) => row.id === boardPauseState.rowId);
        const pauseRule = findEnabledPauseReasonByLabel(boardPauseReasonValue);
        const startedAtMsCandidate = pausedRow?.pauseStartedAt ? new Date(pausedRow.pauseStartedAt).getTime() : Date.now();
        const fallbackAuthorizedSeconds = Math.max(0, Math.round(Number(pauseRule?.authorizedMinutes || 0) * 60));
        const authorizedPauseSeconds = Math.max(0, Number(pausedRow?.pauseAuthorizedSeconds ?? fallbackAuthorizedSeconds));
        if (boardPauseContinueTimerRef.current) clearTimeout(boardPauseContinueTimerRef.current);
        boardPauseContinueTimerRef.current = setTimeout(() => {
          setBoardPauseState((current) => (current.completed ? { ...current, continueReady: true } : current));
        }, 3000);
        setBoardPauseState((current) => ({
          ...current,
          error: "",
          completed: true,
          continueReady: false,
          authorizedPauseSeconds,
          pauseStartedAtMs: Number.isFinite(startedAtMsCandidate) ? startedAtMsCandidate : Date.now(),
        }));
      }).catch((error) => {
        setBoardPauseState((current) => ({ ...current, error: error?.message || "No se pudo pausar la fila." }));
      });
    }


  return {
        handleConfirmPause,
    handleConfirmBoardPause,
  };
}
