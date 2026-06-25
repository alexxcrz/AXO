/* eslint-disable no-unused-vars -- props desde App.jsx */
import { Lock, PauseCircle, Timer } from "lucide-react";
import { Modal } from "../Modal";
import {
  formatDurationClock,
  getElapsedSeconds,
  getOperationalElapsedSeconds,
} from "../../utils/utilidades.jsx";
import { STATUS_RUNNING } from "../../utils/constantes.js";

/** Modales extra�dos de App.jsx � AppBoardModals */
export function AppBoardModals(props) {
  const {
    boardFinishConfirm,
    setBoardFinishConfirm,
    confirmFinishBoardRow,
    state,
    now,
    operationalPauseState,
    boardStartConfirm,
    boardStartConflictRows,
    closeBoardStartConfirm,
    confirmStartBoardRow,
    finishPreviousActivityAndStart,
    deleteBoardRowState,
    setDeleteBoardRowState,
    deleteBoardRow,
    pieceDeductionModal,
    confirmPieceDeductionAndStart,
    deleteBoardId,
    setDeleteBoardId,
    deleteControlBoard,
  } = props;

  return (
    <>
<Modal className="modal-wide board-finish-modal" open={boardFinishConfirm.open} title="Finalizar fila" confirmLabel="Confirmar fin" cancelLabel="Cancelar" onClose={() => setBoardFinishConfirm({ open: false, boardId: null, rowId: null, message: "" })} onConfirm={confirmFinishBoardRow}>
      <div className="modal-form-grid">
        {(() => {
          const finBoard = boardFinishConfirm.boardId ? (state.controlBoards || []).find((b) => b.id === boardFinishConfirm.boardId) : null;
          const finRow = finBoard?.rows?.find((r) => r.id === boardFinishConfirm.rowId) || null;
          if (!finRow) return null;
          const productionSecs = getElapsedSeconds(finRow, now, operationalPauseState);
          const totalSecs = finRow.startTime
            ? Math.max(productionSecs, getOperationalElapsedSeconds(finRow.startTime, now, operationalPauseState))
            : productionSecs;
          const pauseSecs = Math.max(0, totalSecs - productionSecs);
          const efficiency = totalSecs > 0 ? Math.round((productionSecs / totalSecs) * 100) : 100;
          const productionRatio = totalSecs > 0 ? productionSecs / totalSecs : 1;
          const pauseRatio = totalSecs > 0 ? pauseSecs / totalSecs : 0;
          return (
            <div className="board-finish-panel">
              <header className="board-finish-panel-head ui-surface-dark">
                <span className="board-finish-panel-kicker">Cierre de actividad</span>
                <p className="board-finish-panel-lead">
                  Tiempo registrado hasta este momento
                </p>
              </header>

              <div className="board-finish-panel-main">
                <div
                  className="board-finish-donut"
                  style={{ "--prod-ratio": productionRatio }}
                  role="img"
                  aria-label={`${efficiency}% eficiencia productiva`}
                >
                  <div className="board-finish-donut-hole">
                    <strong className="board-finish-donut-value">{efficiency}%</strong>
                    <span className="board-finish-donut-caption">productivo</span>
                  </div>
                </div>

                <div className="board-finish-stats">
                  <article className="board-finish-stat">
                    <span className="board-finish-stat-icon production" aria-hidden="true">
                      <Timer strokeWidth={2.2} />
                    </span>
                    <div className="board-finish-stat-copy">
                      <span className="board-finish-stat-label">Producción</span>
                      <small>Activa</small>
                    </div>
                    <strong className="board-finish-stat-value">{formatDurationClock(productionSecs)}</strong>
                  </article>
                  <article className="board-finish-stat is-pause">
                    <span className="board-finish-stat-icon pause" aria-hidden="true">
                      <PauseCircle strokeWidth={2.2} />
                    </span>
                    <div className="board-finish-stat-copy">
                      <span className="board-finish-stat-label">Pausa</span>
                      <small>No productivo</small>
                    </div>
                    <strong className="board-finish-stat-value">{formatDurationClock(pauseSecs)}</strong>
                  </article>
                  <article className="board-finish-stat is-total">
                    <span className="board-finish-stat-icon total" aria-hidden="true">
                      <Timer strokeWidth={2.2} />
                    </span>
                    <div className="board-finish-stat-copy">
                      <span className="board-finish-stat-label">Total</span>
                      <small>Inicio → ahora</small>
                    </div>
                    <strong className="board-finish-stat-value">{formatDurationClock(totalSecs)}</strong>
                  </article>
                </div>
              </div>

              <div className="board-finish-track">
                <div className="board-finish-track-bar" aria-hidden="true">
                  <span className="board-finish-track-segment production" style={{ width: `${productionRatio * 100}%` }} />
                  {pauseRatio > 0 ? (
                    <span className="board-finish-track-segment pause" style={{ width: `${pauseRatio * 100}%` }} />
                  ) : null}
                </div>
                <div className="board-finish-track-legend">
                  <span><i className="dot production" /> Producción {formatDurationClock(productionSecs)}</span>
                  <span><i className="dot pause" /> Pausa {formatDurationClock(pauseSecs)}</span>
                </div>
              </div>

              <aside className="board-finish-lock-banner">
                <span className="board-finish-lock-icon" aria-hidden="true">
                  <Lock strokeWidth={2.2} />
                </span>
                <p>{boardFinishConfirm.message}</p>
              </aside>
            </div>
          );
        })()}
      </div>
    </Modal>

    <Modal
      open={boardStartConfirm.open}
      title={boardStartConfirm.title || "Confirmar inicio"}
      confirmLabel={boardStartConflictRows.length ? "Iniciar de todos modos" : "Confirmar"}
      cancelLabel="Cancelar"
      onClose={closeBoardStartConfirm}
      onConfirm={confirmStartBoardRow}
      footerActions={boardStartConflictRows.length ? (
        <button
          type="button"
          className="sicfla-button danger"
          onClick={() => { void finishPreviousActivityAndStart(); }}
        >
          Terminar anterior e iniciar esta
        </button>
      ) : null}
    >
      <div className="modal-form-grid">
        <p>{boardStartConfirm.message || "¿Deseas iniciar esta actividad?"}</p>
        {boardStartConflictRows.length ? (
          <div className="board-start-conflict-alert" role="alert">
            <strong>Ya tienes otra actividad en curso</strong>
            <p>
              Detectamos {boardStartConflictRows.length === 1 ? "una actividad activa" : `${boardStartConflictRows.length} actividades activas`} vinculada a tu usuario.
              Puedes terminarla desde aquí o iniciar esta actividad de todos modos si la anterior la iniciaste para otra persona.
            </p>
            <div className="board-start-conflict-list">
              {boardStartConflictRows.map((conflict) => {
                const elapsedSecs = conflict.row?.startTime
                  ? Math.max(
                    getElapsedSeconds(conflict.row, now, operationalPauseState),
                    getOperationalElapsedSeconds(conflict.row.startTime, now, operationalPauseState),
                  )
                  : 0;
                return (
                  <article key={`${conflict.boardId}-${conflict.rowId}`} className="board-start-conflict-card">
                    <div className="board-start-conflict-card-main">
                      <strong>{conflict.activityLabel}</strong>
                      <span>{conflict.boardName}</span>
                    </div>
                    <div className="board-start-conflict-card-meta">
                      <span className={`chip ${conflict.status === STATUS_RUNNING ? "success" : "soft"}`.trim()}>
                        {conflict.status}
                      </span>
                      {elapsedSecs > 0 ? <span>{formatDurationClock(elapsedSecs)} transcurridos</span> : null}
                      {conflict.isStarter && !conflict.isAssignedPlayer ? (
                        <span className="board-start-conflict-note">La iniciaste tú</span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="modal-footnote">Solo puedes tener una actividad en curso por player, entre actividades y tableros.</p>
        )}
      </div>
    </Modal>

    <Modal open={deleteBoardRowState.open} title="Eliminar fila" confirmLabel="Eliminar fila" cancelLabel="Cancelar" onClose={() => setDeleteBoardRowState({ open: false, boardId: null, rowId: null })} onConfirm={() => deleteBoardRow(deleteBoardRowState.boardId, deleteBoardRowState.rowId)}>
      <div className="modal-form-grid">
        <p>Esta fila se eliminará del tablero.</p>
        <p>Ásalo cuando la actividad se creó por error o ya no se va a realizar.</p>
      </div>
    </Modal>
    <Modal
      open={pieceDeductionModal.open}
      title="¿Descontar insumos al iniciar?"
      confirmLabel="Sí, descontar y comenzar"
      cancelLabel="Comenzar sin descontar"
      onClose={() => confirmPieceDeductionAndStart(false)}
      onConfirm={() => confirmPieceDeductionAndStart(true)}
    >
      <div className="modal-form-grid">
        <p className="modal-footnote">Esta actividad tiene insumos en piezas vinculados. ¿Quieres descontar automáticamente del inventario al iniciar?</p>
        <div className="piece-deduction-list">
          {pieceDeductionModal.items.map((item) => (
            <div key={item.id} className="piece-deduction-row">
              <strong>{item.name}</strong>
              <span className="chip">{item.quantity} {item.unit} · Stock actual: {item.stock}</span>
            </div>
          ))}
        </div>
        <p className="modal-footnote">Si eliges "Comenzar sin descontar", la actividad inicia normalmente y el inventario no cambia.</p>
      </div>
    </Modal>
    <Modal open={Boolean(deleteBoardId)} title="Eliminar tablero" confirmLabel="Eliminar tablero" cancelLabel="Cancelar" onClose={() => setDeleteBoardId(null)} onConfirm={() => deleteControlBoard(deleteBoardId)}>
      <p>Esta acción eliminará el tablero completo junto con sus filas guardadas.</p>
      <p>Ásalo cuando el tablero ya no se vaya a ocupar para que no quede abandonado.</p>
    </Modal>
    </>
  );
}
