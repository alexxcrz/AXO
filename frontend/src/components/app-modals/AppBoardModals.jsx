import { Modal } from "../Modal";
import {
  formatDurationClock,
  getElapsedSeconds,
  getOperationalElapsedSeconds,
} from "../../utils/utilidades.jsx";

/** Modales extra�dos de App.jsx � AppBoardModals */

/** Modales extraidos de App.jsx � AppBoardModals */
export function AppBoardModals(props) {
  const {
  boardFinishConfirm,
  boardId,
  boardStartConfirm,
  Boolean,
  confirmFinishBoardRow,
  confirmPieceDeductionAndStart,
  confirmStartBoardRow,
  controlBoards,
  deleteBoardId,
  deleteBoardRow,
  deleteBoardRowState,
  deleteControlBoard,
  Desde,
  Esta,
  finBoard,
  find,
  finRow,
  formatDurationClock,
  getElapsedSeconds,
  getOperationalElapsedSeconds,
  map,
  Math,
  operationalPauseState,
  pauseSecs,
  pieceDeductionModal,
  productionSecs,
  Quieres,
  rowId,
  setBoardFinishConfirm,
  setBoardStartConfirm,
  setDeleteBoardId,
  setDeleteBoardRowState,
  Si,
  Solo,
  startTime,
  Stock,
  Tiempo,
  totalSecs,
  } = props;

  return (
    <>
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
          return (
            <div className="board-finish-time-breakdown">
              <div className="board-finish-time-row production">
                <div className="board-finish-time-icon production-icon" />
                <div className="board-finish-time-info">
                  <span className="board-finish-time-label">Tiempo de producción</span>
                  <small className="board-finish-time-hint">Solo cuando estuvo activa</small>
                </div>
                <strong className="board-finish-time-value">{formatDurationClock(productionSecs)}</strong>
              </div>
              <div className="board-finish-time-row pause">
                <div className="board-finish-time-icon pause-icon" />
                <div className="board-finish-time-info">
                  <span className="board-finish-time-label">Tiempo en pausa</span>
                  <small className="board-finish-time-hint">Tiempo detenida (no productivo)</small>
                </div>
                <strong className="board-finish-time-value">{formatDurationClock(pauseSecs)}</strong>
              </div>
              <div className="board-finish-time-row total">
                <div className="board-finish-time-icon total-icon" />
                <div className="board-finish-time-info">
                  <span className="board-finish-time-label">Tiempo total</span>
                  <small className="board-finish-time-hint">Desde inicio hasta ahora</small>
                </div>
                <strong className="board-finish-time-value">{formatDurationClock(totalSecs)}</strong>
              </div>
              <div className="board-finish-efficiency-bar">
                <div className="board-finish-efficiency-track">
                  <div className="board-finish-efficiency-fill" style={{ width: `${efficiency}%` }} />
                </div>
                <span className="board-finish-efficiency-label">{efficiency}% eficiencia productiva</span>
              </div>
            </div>
          );
        })()}
        <p className="board-finish-confirm-note">{boardFinishConfirm.message}</p>
      </div>
    </Modal>

    <Modal
      open={boardStartConfirm.open}
      title={boardStartConfirm.title || "Confirmar inicio"}
      confirmLabel="Confirmar"
      cancelLabel="Cancelar"
      onClose={() => setBoardStartConfirm({ open: false, boardId: null, rowId: null, title: "", message: "" })}
      onConfirm={confirmStartBoardRow}
    >
      <div className="modal-form-grid">
        <p>{boardStartConfirm.message || "¿Deseas iniciar esta actividad?"}</p>
        <p className="modal-footnote">Solo puedes tener una actividad en curso por player, entre actividades y tableros.</p>
      </div>
    </Modal>

    <Modal open={deleteBoardRowState.open} title="Eliminar fila" confirmLabel="Eliminar fila" cancelLabel="Cancelar" onClose={() => setDeleteBoardRowState({ open: false, boardId: null, rowId: null })} onConfirm={() => deleteBoardRow(deleteBoardRowState.boardId, deleteBoardRowState.rowId)}>
      <div className="modal-form-grid">
        <p>Esta fila se eliminará del tablero.</p>
        <p>Úsalo cuando la actividad se creó por error o ya no se va a realizar.</p>
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
      <p>Úsalo cuando el tablero ya no se vaya a ocupar para que no quede abandonado.</p>
    </Modal>
    </>

    </>
  );
}
