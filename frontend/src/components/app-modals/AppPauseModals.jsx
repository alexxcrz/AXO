import { Modal } from "../Modal";
import { formatDateTime, formatDurationClock } from "../../utils/utilidades.jsx";

/** Modales extra�dos de App.jsx � AppPauseModals */

/** Modales extraidos de App.jsx � AppPauseModals */
export function AppPauseModals(props) {
  const {
  activityId,
  authorizedPauseSeconds,
  boardId,
  boardPauseContinueTimerRef,
  boardPauseIsOutOfTime,
  boardPauseOvertimeSeconds,
  boardPauseState,
  Boolean,
  clearTimeout,
  Continuemos,
  continueReady,
  CUSTOM_PAUSE_REASON_VALUE,
  customReason,
  El,
  formatDateTime,
  formatDurationClock,
  handleConfirmBoardPause,
  handleConfirmPause,
  historyPauseActivityId,
  historyPauseLogs,
  La,
  map,
  Motivo,
  No,
  Number,
  optionLabel,
  Otro,
  Pausado,
  pauseContinueTimerRef,
  pausedAt,
  pauseDurationSeconds,
  pauseLogId,
  pauseReason,
  pauseReasonOptions,
  pauseStartedAtMs,
  pauseState,
  Reanuda,
  Reanudado,
  resumedAt,
  rowId,
  setBoardPauseState,
  setHistoryPauseActivityId,
  setPauseState,
  Tiempo,
  } = props;

  return (
    <>
return (
    <>
    <Modal open={pauseState.open} title="Actividad en pausa" confirmLabel={pauseState.completed ? (pauseState.continueReady ? "Continuar" : "Espera un momento...") : "Confirmar pausa"} cancelLabel="Cancelar" hideCancel={pauseState.completed} confirmDisabled={pauseState.completed && !pauseState.continueReady} onClose={() => { if (pauseContinueTimerRef.current) clearTimeout(pauseContinueTimerRef.current); setPauseState({ open: false, activityId: null, reason: "", customReason: "", error: "", completed: false, continueReady: false, pauseLogId: null }); }} onConfirm={handleConfirmPause}>
      <div className="modal-form-grid">
        {pauseState.completed ? (
          <>
            <p className="validation-text success">Continuemos. La pausa de la actividad quedó registrada correctamente.</p>
            <p className="modal-footnote">{pauseState.continueReady ? "Cuando pulses continuar la actividad se reanudará." : "El botón Continuar se habilitará en unos segundos..."}</p>
          </>
        ) : (
          <>
            <label className="app-modal-field">
              <span>Motivo de pausa</span>
              <select value={pauseState.reason} onChange={(event) => setPauseState((current) => ({ ...current, reason: event.target.value, error: "" }))}>
                {pauseReasonOptions.map((optionLabel) => <option key={optionLabel} value={optionLabel}>{optionLabel}</option>)}
                <option value={CUSTOM_PAUSE_REASON_VALUE}>Otro (especificar)</option>
              </select>
            </label>
            {pauseState.reason === CUSTOM_PAUSE_REASON_VALUE ? (
              <label className="app-modal-field">
                <span>Otro motivo</span>
                <input value={pauseState.customReason} onChange={(event) => setPauseState((current) => ({ ...current, customReason: event.target.value, error: "" }))} placeholder="Especifica el motivo" />
              </label>
            ) : null}
            {pauseState.error ? <p className="validation-text">{pauseState.error}</p> : null}
          </>
        )}
      </div>
    </Modal>

    <Modal open={boardPauseState.open} title="Pausar fila" confirmLabel={boardPauseState.completed ? (boardPauseState.continueReady ? "Continuar" : "Espera un momento...") : "Confirmar pausa"} cancelLabel="Cancelar" hideCancel={boardPauseState.completed} confirmDisabled={boardPauseState.completed && !boardPauseState.continueReady} onClose={() => { if (boardPauseContinueTimerRef.current) clearTimeout(boardPauseContinueTimerRef.current); setBoardPauseState({ open: false, boardId: null, rowId: null, reason: "", customReason: "", error: "", completed: false, continueReady: false, authorizedPauseSeconds: 0, pauseStartedAtMs: 0 }); }} onConfirm={handleConfirmBoardPause} className="board-pause-reason-modal">
      <div className="modal-form-grid">
        {boardPauseState.completed ? (
          <>
            <p className="validation-text success">Continuemos. La fila quedó pausada y el motivo se guardó correctamente.</p>
            <p className="modal-footnote">{boardPauseState.continueReady ? "Pulsa continuar para reanudar la fila." : "El botón Continuar se habilitará en unos segundos..."}</p>
            {Number(boardPauseState.authorizedPauseSeconds || 0) > 0 ? (
              boardPauseIsOutOfTime ? (
                <div className="board-pause-overtime-alert">
                  <span className="board-pause-overtime-icon" aria-hidden="true">ÔÜá</span>
                  <div>
                    <strong>Tiempo de pausa excedido</strong>
                        <span>El tiempo autorizado se agotó. Reanuda la fila cuanto antes.</span>
                        {boardPauseOvertimeSeconds > 0 ? (
                          <div className="board-pause-overtime-detail">Tiempo fuera: {formatDurationClock(boardPauseOvertimeSeconds)}</div>
                        ) : null}
                  </div>
                </div>
              ) : (
                <p className="modal-footnote">
                  {`Tiempo autorizado restante: ${formatDurationClock(boardPauseRemainingSeconds)}`}
                </p>
              )
            ) : null}
          </>
        ) : (
          <>
            <label className="app-modal-field">
              <span>Motivo de pausa</span>
              <select value={boardPauseState.reason} onChange={(event) => setBoardPauseState((current) => ({ ...current, reason: event.target.value, error: "" }))}>
                {pauseReasonOptions.map((optionLabel) => <option key={optionLabel} value={optionLabel}>{optionLabel}</option>)}
                <option value={CUSTOM_PAUSE_REASON_VALUE}>Otro (especificar)</option>
              </select>
            </label>
            {boardPauseState.reason === CUSTOM_PAUSE_REASON_VALUE ? (
              <label className="app-modal-field">
                <span>Otro motivo</span>
                <input value={boardPauseState.customReason} onChange={(event) => setBoardPauseState((current) => ({ ...current, customReason: event.target.value, error: "" }))} placeholder="Especifica el motivo" />
              </label>
            ) : null}
            {boardPauseState.error ? <p className="validation-text">{boardPauseState.error}</p> : null}
          </>
        )}
      </div>
    </Modal>
    <Modal open={Boolean(historyPauseActivityId)} title="Pausas de la actividad" confirmLabel="Aceptar" cancelLabel="Cerrar" onClose={() => setHistoryPauseActivityId(null)}>
      <div className="modal-form-grid">
        {historyPauseLogs.length ? historyPauseLogs.map((log) => (
          <div key={log.id} className="week-activity-item pause-item">
            <div>
              <strong>{log.pauseReason}</strong>
              <span>Pausado: {formatDateTime(log.pausedAt)}</span>
              <span>Reanudado: {formatDateTime(log.resumedAt)}</span>
            </div>
            <strong>{formatDurationClock(log.pauseDurationSeconds)}</strong>
          </div>
        )) : <p>No hay pausas registradas para esta actividad.</p>}
      </div>
    </Modal>
    </>

    </>
  );
}
