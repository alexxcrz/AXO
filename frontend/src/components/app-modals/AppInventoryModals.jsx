import { Modal } from "../Modal";
import { InventoryActivityConsumptionEditor } from "../BarraLateral";
import {
  createInventoryModalState,
  normalizeInventoryDomain,
  inventoryDomainUsesPresentation,
  inventoryDomainUsesPackagingMetrics,
  formatDateTime,
} from "../../utils/utilidades.jsx";
import { INVENTORY_DOMAIN_MAINTENANCE } from "../../utils/constantes.js";

/** Modales extra�dos de App.jsx � AppInventoryModals */

/** Modales extraidos de App.jsx � AppInventoryModals */
export function AppInventoryModals(props) {
  const {
  activeCatalogItems,
  Actividades,
  activityCatalogIds,
  activityConsumptions,
  Antes,
  applySavedInventoryLocation,
  Art,
  availableUnits,
  Boolean,
  boxesPerPallet,
  C,
  Cajas,
  cantidades,
  CLEANING_SITE_OPTIONS,
  cleaningSite,
  closeInventoryDestinationModal,
  closeInventoryMovementModal,
  closeInventoryRestockModal,
  closeInventoryTransferConfirmModal,
  confirma,
  confirmPieceDeductionAndStart,
  Costo,
  createdAt,
  createInventoryModalState,
  Cu,
  customFields,
  DEFAULT_CLEANING_SITE,
  deleteInventoryId,
  deleteInventoryItem,
  destinationBalanceUnits,
  destinationKey,
  Destino,
  Disponible,
  Dominio,
  Escribe,
  Ese,
  Esta,
  Este,
  Familia,
  formatDateTime,
  Insumo,
  INVENTORY_DOMAIN_CLEANING,
  INVENTORY_DOMAIN_MAINTENANCE,
  INVENTORY_DOMAIN_OPTIONS,
  inventoryCleaningSite,
  inventoryCustomColumnsForModal,
  inventoryDestinationModal,
  inventoryDomainUsesPackagingMetrics,
  inventoryDomainUsesPresentation,
  inventoryModal,
  inventoryMovementAvailableUnits,
  inventoryMovementModal,
  inventoryMovementModalTitle,
  inventoryMovementSavedLocations,
  inventoryMovementSelectedItem,
  inventoryMovementSelectedSavedLocation,
  inventoryMovementTransferTarget,
  inventoryMovementTypeOptions,
  inventoryPresentationLabel,
  inventoryPresentationPlaceholder,
  inventoryRestockModal,
  inventoryRestockModalItems,
  inventoryRestockModalTitle,
  inventoryStoragePlaceholder,
  inventorySystemColumnSuggestions,
  inventoryTransferAvailableWarehouses,
  inventoryTransferConfirmModal,
  inventoryTransferDestinationsByWarehouse,
  inventoryTransferViewerItem,
  inventoryTransferViewerState,
  inventoryTransferViewerTitle,
  inventoryUnitOptions,
  inventoryUnitPlaceholder,
  isOrderTransferMovementModal,
  itemCode,
  itemId,
  itemName,
  itemUnitLabel,
  La,
  lastKnownUnits,
  map,
  Math,
  minStockUnits,
  movementType,
  Movimientos,
  Nave,
  nextDomain,
  No,
  Nombre,
  normalizeInventoryDomain,
  Notas,
  Nueva,
  onQuantityChange,
  onToggle,
  orderInventoryItems,
  pieceDeductionModal,
  piecesPerBox,
  Piezas,
  Precio,
  Punto,
  Qui,
  Quieres,
  recipientName,
  remainingUnits,
  Resguardo,
  Resumen,
  Saldo,
  Saldos,
  Sede,
  Selecciona,
  selectedTransferDestinationTab,
  setDeleteInventoryId,
  setInventoryDestinationModal,
  setInventoryModal,
  setInventoryTransferConfirmModal,
  setInventoryTransferViewerState,
  shouldShowCleaningLinkFields,
  shouldShowInventoryPackagingFields,
  shouldShowInventoryPresentationField,
  shouldShowInventoryStockFields,
  shouldShowTransferRemainingUnits,
  Si,
  Stock,
  stockUnits,
  storageLocation,
  submitInventoryDestinationModal,
  submitInventoryModal,
  submitInventoryMovementModal,
  submitInventoryRestockModal,
  submitInventoryTransferConfirmModal,
  submitting,
  Tipo,
  Todav,
  toggleInventoryModalActivityCatalog,
  transferTargetKey,
  Ubicaci,
  Ubicaciones,
  Unidad,
  unitLabel,
  updatedAt,
  updateInventoryModalActivityConsumption,
  updateInventoryMovementModal,
  updateInventoryRestockQuantity,
  viewedOrderInventoryTransferMovements,
  viewedOrderInventoryTransferTargets,
  } = props;

  return (
    <>
return (
    <>
    <Modal className="inventory-item-modal" open={inventoryModal.open} title={inventoryModal.mode === "create" ? `Agregar ${inventoryEntityLabel}` : `Editar ${inventoryEntityLabel}`} confirmLabel={inventoryModal.mode === "create" ? `Guardar ${inventoryEntityLabel}` : "Guardar cambios"} cancelLabel="Cancelar" onClose={() => setInventoryModal(createInventoryModalState())} onConfirm={submitInventoryModal} confirmDisabled={inventoryModal.submitting}>
      <div className="modal-form-grid">
        {inventoryModal.domain !== INVENTORY_DOMAIN_MAINTENANCE ? (
          <label className="app-modal-field">
            <span>Dominio</span>
            <select
              value={inventoryModal.domain}
              onChange={(event) => {
                const nextDomain = normalizeInventoryDomain(event.target.value);
                setInventoryModal((current) => ({
                  ...current,
                  domain: nextDomain,
                  presentation: inventoryDomainUsesPresentation(nextDomain) ? current.presentation : "",
                  piecesPerBox: inventoryDomainUsesPackagingMetrics(nextDomain) ? current.piecesPerBox : "",
                  boxesPerPallet: inventoryDomainUsesPackagingMetrics(nextDomain) ? current.boxesPerPallet : "",
                  cleaningSite: nextDomain === INVENTORY_DOMAIN_CLEANING ? current.cleaningSite || inventoryCleaningSite || DEFAULT_CLEANING_SITE : DEFAULT_CLEANING_SITE,
                  activityCatalogIds: nextDomain === INVENTORY_DOMAIN_CLEANING ? current.activityCatalogIds : [],
                  activityConsumptions: nextDomain === INVENTORY_DOMAIN_CLEANING ? current.activityConsumptions : [],
                }));
              }}
            >
              {INVENTORY_DOMAIN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ) : null}
        <label className="app-modal-field">
          <span>Código</span>
          <input value={inventoryModal.code} onChange={(event) => setInventoryModal((current) => ({ ...current, code: event.target.value }))} />
        </label>
        <label className="app-modal-field">
          <span>Nombre</span>
          <input value={inventoryModal.name} onChange={(event) => setInventoryModal((current) => ({ ...current, name: event.target.value }))} />
        </label>
        {inventoryModal.domain === INVENTORY_DOMAIN_MAINTENANCE ? (
          <>
            <label className="app-modal-field">
              <span>Familia</span>
              <input value={inventoryModal.family} onChange={(event) => setInventoryModal((current) => ({ ...current, family: event.target.value }))} />
            </label>
            <label className="app-modal-field">
              <span>Precio unitario</span>
              <input type="number" value={inventoryModal.price} onChange={(event) => setInventoryModal((current) => ({ ...current, price: event.target.value }))} />
            </label>
            <label className="app-modal-field">
              <span>Costo</span>
              <input type="number" value={inventoryModal.cost} onChange={(event) => setInventoryModal((current) => ({ ...current, cost: event.target.value }))} />
            </label>
          </>
        ) : null}
        {shouldShowInventoryPresentationField ? (
          <label className="app-modal-field">
            <span>{inventoryPresentationLabel}</span>
            <input value={inventoryModal.presentation} onChange={(event) => setInventoryModal((current) => ({ ...current, presentation: event.target.value }))} placeholder={inventoryPresentationPlaceholder} />
          </label>
        ) : null}
        {shouldShowInventoryPackagingFields ? (
          <>
            <label className="app-modal-field">
              <span>Piezas por caja</span>
              <input type="number" value={inventoryModal.piecesPerBox} onChange={(event) => setInventoryModal((current) => ({ ...current, piecesPerBox: event.target.value }))} />
            </label>
            <label className="app-modal-field">
              <span>Cajas por tarima</span>
              <input type="number" value={inventoryModal.boxesPerPallet} onChange={(event) => setInventoryModal((current) => ({ ...current, boxesPerPallet: event.target.value }))} />
            </label>
          </>
        ) : null}
        {shouldShowInventoryStockFields && (
          <>
            <label className="app-modal-field">
              <span>Stock actual</span>
              <input type="number" value={inventoryModal.stockUnits} onChange={(event) => setInventoryModal((current) => ({ ...current, stockUnits: event.target.value }))} />
            </label>
            <label className="app-modal-field">
              <span>Stock mínimo</span>
              <input type="number" value={inventoryModal.minStockUnits} onChange={(event) => setInventoryModal((current) => ({ ...current, minStockUnits: event.target.value }))} />
            </label>
            <label className="app-modal-field">
              <span>Unidad</span>
              <input list="inventory-unit-datalist" value={inventoryModal.unitLabel} onChange={(event) => setInventoryModal((current) => ({ ...current, unitLabel: event.target.value }))} placeholder={inventoryUnitPlaceholder} />
              <datalist id="inventory-unit-datalist">
                {inventoryUnitOptions.map((unit) => <option key={unit} value={unit} />)}
              </datalist>
            </label>
            <label className="app-modal-field">
              <span>Ubicación / resguardo</span>
              <input value={inventoryModal.storageLocation} onChange={(event) => setInventoryModal((current) => ({ ...current, storageLocation: event.target.value }))} placeholder={inventoryStoragePlaceholder} />
            </label>
          </>
        )}
        {inventoryCustomColumnsForModal.map((column) => (
          <label key={column.id} className="app-modal-field">
            <span>{column.label}</span>
            <input
              list={
                column.key === "lote"
                  ? "inventory-system-lote-options"
                  : column.key === "caducidad"
                    ? "inventory-system-caducidad-options"
                    : column.key === "etiqueta"
                      ? "inventory-system-etiqueta-options"
                      : undefined
              }
              value={inventoryModal.customFields?.[column.key] || ""}
              onChange={(event) => setInventoryModal((current) => ({
                ...current,
                customFields: {
                  ...(current.customFields || {}),
                  [column.key]: event.target.value,
                },
              }))}
              placeholder={`Captura ${String(column.label || "dato").toLowerCase()}`}
            />
          </label>
        ))}
        <datalist id="inventory-system-lote-options">
          {inventorySystemColumnSuggestions.lote.map((option) => <option key={option} value={option} />)}
        </datalist>
        <datalist id="inventory-system-caducidad-options">
          {inventorySystemColumnSuggestions.caducidad.map((option) => <option key={option} value={option} />)}
        </datalist>
        <datalist id="inventory-system-etiqueta-options">
          {inventorySystemColumnSuggestions.etiqueta.map((option) => <option key={option} value={option} />)}
        </datalist>
        {shouldShowCleaningLinkFields ? (
          <>
            <label className="app-modal-field">
              <span>Sede de limpieza</span>
              <select value={inventoryModal.cleaningSite} onChange={(event) => setInventoryModal((current) => ({ ...current, cleaningSite: event.target.value }))}>
                {CLEANING_SITE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <div className="app-modal-field app-modal-field-full inventory-activity-consumption-field">
              <span>Actividades y consumo por inicio</span>
              <InventoryActivityConsumptionEditor
                activeCatalogItems={activeCatalogItems}
                activityConsumptions={inventoryModal.activityConsumptions}
                onToggle={toggleInventoryModalActivityCatalog}
                onQuantityChange={updateInventoryModalActivityConsumption}
              />
            </div>
          </>
        ) : null}
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

    <Modal open={inventoryMovementModal.open} title={inventoryMovementModalTitle} confirmLabel={isOrderTransferMovementModal ? "Guardar transferencia" : "Guardar movimiento"} cancelLabel="Cancelar" onClose={closeInventoryMovementModal} onConfirm={submitInventoryMovementModal} confirmDisabled={inventoryMovementModal.submitting}>
      <div className="modal-form-grid">
        {isOrderTransferMovementModal ? (
          <label className="app-modal-field">
            <span>Insumo</span>
            <select value={inventoryMovementModal.itemId || ""} onChange={(event) => updateInventoryMovementModal({ itemId: event.target.value || null })}>
              <option value="">Selecciona un insumo</option>
              {orderInventoryItems.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
            </select>
          </label>
        ) : (
          <label className="app-modal-field">
            <span>Artículo</span>
            <input value={inventoryMovementModal.itemName} readOnly />
          </label>
        )}
        <label className="app-modal-field">
          <span>Tipo de movimiento</span>
          {isOrderTransferMovementModal ? (
            <input value="Transferencia" readOnly />
          ) : (
            <select value={inventoryMovementModal.movementType} onChange={(event) => updateInventoryMovementModal({ movementType: event.target.value })}>
              {inventoryMovementTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          )}
        </label>
        <label className="app-modal-field">
          <span>{isOrderTransferMovementModal ? "Cantidad a transferir" : "Cantidad"}</span>
          <input type="number" min="0" value={inventoryMovementModal.quantity} onChange={(event) => updateInventoryMovementModal({ quantity: event.target.value })} />
        </label>
        {!isOrderTransferMovementModal && inventoryMovementSavedLocations.length ? (
          <label className="app-modal-field">
            <span>Ubicaciones guardadas</span>
            <select value={inventoryMovementSelectedSavedLocation} onChange={(event) => applySavedInventoryLocation(event.target.value)}>
              <option value="">Selecciona una ubicación previa</option>
              {inventoryMovementSavedLocations.map((entry) => <option key={entry.key} value={entry.key}>{entry.label}</option>)}
            </select>
          </label>
        ) : null}
        {!isOrderTransferMovementModal ? (
          <label className="app-modal-field">
            <span>Ubicación / resguardo</span>
            <input value={inventoryMovementModal.storageLocation} onChange={(event) => updateInventoryMovementModal({ storageLocation: event.target.value })} placeholder="Ej: Nave 2 · Estante 4" />
          </label>
        ) : null}
        {isOrderTransferMovementModal ? (
          <>
            <label className="app-modal-field">
              <span>Resguardo actual del insumo</span>
              <input value={inventoryMovementSelectedItem?.storageLocation || "Sin resguardo asignado"} readOnly />
            </label>

            <div className="app-modal-field app-modal-field-full">
              <span>Nave destino</span>
              <div className="inventory-transfer-warehouse-tabs">
                {inventoryTransferAvailableWarehouses.map((warehouse) => (
                  <button key={warehouse} type="button" className={`warehouse-tab ${inventoryMovementModal.selectedTransferDestinationTab === warehouse ? "active" : ""}`} onClick={() => updateInventoryMovementModal({ selectedTransferDestinationTab: warehouse })}>
                    {warehouse}
                  </button>
                ))}
              </div>
            </div>

            {inventoryMovementModal.selectedTransferDestinationTab && (
              <div className="app-modal-field app-modal-field-full">
                <span>Punto de entrega en {inventoryMovementModal.selectedTransferDestinationTab}</span>
                <div className="inventory-transfer-destinations-list">
                  {(inventoryTransferDestinationsByWarehouse[inventoryMovementModal.selectedTransferDestinationTab] || []).map((destination) => (
                    <button key={destination.destinationKey} type="button" className={`destination-button ${inventoryMovementModal.transferTargetKey === destination.destinationKey ? "selected" : ""}`} onClick={() => updateInventoryMovementModal({ warehouse: destination.warehouse, storageLocation: destination.storageLocation, recipientName: destination.recipientName, transferTargetKey: destination.destinationKey })}>
                      <div className="destination-name">{destination.storageLocation || "Sin nombre"}</div>
                      {destination.recipientName && <div className="destination-recipient">{destination.recipientName}</div>}
                      <div className="destination-stock">{destination.availableUnits} {destination.unitLabel || "pzas"}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="app-modal-field">
              <span>Quién recibe el material</span>
              <input value={inventoryMovementModal.recipientName} onChange={(event) => updateInventoryMovementModal({ recipientName: event.target.value })} placeholder="Nombre del responsable destino" />
            </label>

            <div className="app-modal-field app-modal-field-full inventory-transfer-modal-summary">
              <span>Resumen actual</span>
              <div className="inventory-transfer-modal-summary-grid">
                <p><strong>Stock origen:</strong> {inventoryMovementSelectedItem?.stockUnits || 0} {inventoryMovementSelectedItem?.unitLabel || "pzas"}</p>
                <p><strong>Disponible para transferir:</strong> {inventoryMovementAvailableUnits} {inventoryMovementSelectedItem?.unitLabel || "pzas"}</p>
              </div>
              {inventoryMovementTransferTarget ? (
                <p className="subtle-line">Último saldo registrado en el destino {inventoryMovementTransferTarget.warehouse || "sin nave"} / {inventoryMovementTransferTarget.storageLocation || "sin punto de entrega"}: {inventoryMovementTransferTarget.availableUnits} {inventoryMovementTransferTarget.unitLabel || inventoryMovementSelectedItem?.unitLabel || "pzas"}. Ese saldo solo actualiza el destino y no devuelve piezas al stock origen.</p>
              ) : (
                <p className="subtle-line">Este destino se registrará como un nuevo punto de resguardo para el insumo seleccionado.</p>
              )}
            </div>
          </>
        ) : null}
        <label className="app-modal-field">
          <span>Notas</span>
          <input value={inventoryMovementModal.notes} onChange={(event) => updateInventoryMovementModal({ notes: event.target.value })} placeholder="Detalle del movimiento" />
        </label>
      </div>
    </Modal>

    <Modal open={inventoryDestinationModal.open} title={inventoryDestinationModal.mode === "create" ? "Agregar nueva nave" : "Editar nave"} confirmLabel={inventoryDestinationModal.mode === "create" ? "Guardar nave" : "Guardar cambios"} cancelLabel="Cancelar" onClose={closeInventoryDestinationModal} onConfirm={submitInventoryDestinationModal} confirmDisabled={inventoryDestinationModal.submitting}>
      <div className="modal-form-grid">
        <label className="app-modal-field">
          <span>Nave</span>
          <input value={inventoryDestinationModal.warehouse} onChange={(event) => setInventoryDestinationModal((current) => ({ ...current, warehouse: event.target.value }))} placeholder="Ej: Nave 1" />
        </label>
        <label className="app-modal-field">
          <span>Punto de entrega</span>
          <input value={inventoryDestinationModal.storageLocation} onChange={(event) => setInventoryDestinationModal((current) => ({ ...current, storageLocation: event.target.value }))} placeholder="Ej: Estante 4 / Área de empaque" />
        </label>
        <label className="app-modal-field">
          <span>Quién recibe el material</span>
          <input value={inventoryDestinationModal.recipientName} onChange={(event) => setInventoryDestinationModal((current) => ({ ...current, recipientName: event.target.value }))} placeholder="Nombre del responsable destino" />
        </label>
      </div>
    </Modal>

    <Modal open={inventoryTransferConfirmModal.open} title="Confirmar saldo del destino" confirmLabel="Aplicar ajuste y transferir" cancelLabel="Volver" onClose={() => closeInventoryTransferConfirmModal(true)} onConfirm={submitInventoryTransferConfirmModal}>
      <div className="modal-form-grid">
        <div className="app-modal-field app-modal-field-full inventory-transfer-modal-summary">
          <span>Destino a actualizar</span>
          <div className="inventory-transfer-modal-summary-grid">
            <p><strong>Insumo:</strong> {inventoryTransferConfirmModal.itemName || "Sin insumo"}</p>
            <p><strong>Nueva transferencia:</strong> {inventoryTransferConfirmModal.quantity || 0} {inventoryTransferConfirmModal.unitLabel || "pzas"}</p>
            <p><strong>Nave destino:</strong> {inventoryTransferConfirmModal.warehouse || "Sin nave"}</p>
            <p><strong>Punto de entrega destino:</strong> {inventoryTransferConfirmModal.storageLocation || "Sin punto de entrega"}</p>
          </div>
          <p className="subtle-line">Antes de sumar esta nueva transferencia, confirma cuántas piezas siguen quedando actualmente en ese mismo destino. Ese dato solo ajusta el control del destino.</p>
        </div>
        <label className="app-modal-field app-modal-field-full">
          <span>¿Cuántas piezas quedan ahorita en ese destino?</span>
          <input type="number" min="0" value={inventoryTransferConfirmModal.remainingUnits} onChange={(event) => setInventoryTransferConfirmModal((current) => ({ ...current, remainingUnits: event.target.value }))} placeholder={inventoryTransferConfirmModal.lastKnownUnits === null ? "Ej: 50" : `Último saldo registrado: ${inventoryTransferConfirmModal.lastKnownUnits}`} />
        </label>
      </div>
    </Modal>

    <Modal open={inventoryRestockModal.open} title={inventoryRestockModalTitle} confirmLabel="Surtir" cancelLabel="Cancelar" onClose={closeInventoryRestockModal} onConfirm={submitInventoryRestockModal}>
      <div className="inventory-restock-modal">
        <p className="subtle-line">Escribe solo las cantidades a sumar. Si una queda en 0, no se agrega nada a ese insumo.</p>
        <div className="inventory-restock-modal-list">
          {inventoryRestockModalItems.map((item) => (
            <label key={item.id} className="inventory-restock-row">
              <span className="inventory-restock-name">{item.name}</span>
              <input type="number" min="0" value={inventoryRestockModal.quantities[item.id] || ""} onChange={(event) => updateInventoryRestockQuantity(item.id, event.target.value)} placeholder="0" />
            </label>
          ))}
          {inventoryRestockModalItems.length ? null : <p className="subtle-line">No hay insumos disponibles para surtir.</p>}
        </div>
      </div>
    </Modal>

    <Modal open={inventoryTransferViewerState.open} title={inventoryTransferViewerTitle} confirmLabel="Cerrar" hideCancel onClose={() => setInventoryTransferViewerState({ open: false, itemId: null })}>
      <div className="inventory-transfer-view">
        <section className="surface-card inventory-transfer-view-card">
          <div className="card-header-row">
            <div>
              <h3>Saldos por destino</h3>
              <p>Resumen compacto de lo que sigue disponible en cada destino.</p>
            </div>
            <span className="chip primary">{viewedOrderInventoryTransferTargets.length}</span>
          </div>
          <div className="inventory-transfer-compact-list">
            {viewedOrderInventoryTransferTargets.map((target) => (
              <article key={`${target.itemId}-${target.destinationKey}`} className="inventory-transfer-compact-row">
                <div className="inventory-transfer-compact-main">
                  <strong>{target.warehouse || target.storageLocation || "Destino sin nombre"}</strong>
                  {inventoryTransferViewerItem ? null : <p>{target.itemCode} · {target.itemName}</p>}
                  <p className="subtle-line">{target.storageLocation || "Sin punto de entrega"}{target.recipientName ? ` · ${target.recipientName}` : ""}</p>
                </div>
                <div className="inventory-transfer-compact-side">
                  <span className="chip">{target.availableUnits} {target.unitLabel || target.itemUnitLabel}</span>
                  <small>{target.updatedAt ? formatDateTime(target.updatedAt) : "Sin fecha"}</small>
                </div>
              </article>
            ))}
            {!viewedOrderInventoryTransferTargets.length && <p className="subtle-line">Todavía no hay saldos por destino registrados para este filtro.</p>}
          </div>
        </section>

        <section className="surface-card inventory-transfer-view-card">
          <div className="card-header-row">
            <div>
              <h3>Movimientos recientes</h3>
              <p>Últimas transferencias registradas, sin detalle duplicado.</p>
            </div>
            <span className="chip">{Math.min(viewedOrderInventoryTransferMovements.length, 10)}</span>
          </div>
          <div className="inventory-transfer-compact-list">
            {viewedOrderInventoryTransferMovements.slice(0, 10).map((movement) => (
              <article key={movement.id} className="inventory-transfer-compact-row">
                <div className="inventory-transfer-compact-main">
                  <strong>{movement.warehouse || movement.storageLocation || "Destino sin nombre"}</strong>
                  <p>{movement.quantity} {movement.unitLabel || "pzas"}{movement.recipientName ? ` · ${movement.recipientName}` : ""}</p>
                  <p className="subtle-line">{movement.storageLocation || "Sin punto de entrega"}{shouldShowTransferRemainingUnits(movement) ? ` · Antes quedaban ${movement.remainingUnits} ${movement.unitLabel || "pzas"}` : ""}</p>
                </div>
                <div className="inventory-transfer-compact-side">
                  <span className="chip">Saldo {movement.destinationBalanceUnits ?? movement.quantity}</span>
                  <small>{formatDateTime(movement.createdAt)}</small>
                </div>
              </article>
            ))}
            {!viewedOrderInventoryTransferMovements.length && <p className="subtle-line">No hay transferencias registradas para este filtro.</p>}
          </div>
        </section>
      </div>
    </Modal>

    <Modal open={Boolean(deleteInventoryId)} title="Eliminar artículo" confirmLabel="Eliminar artículo" cancelLabel="Cancelar" onClose={() => setDeleteInventoryId(null)} onConfirm={() => deleteInventoryItem(deleteInventoryId)}>
      <p>Esta acción quitará el artículo del inventario compartido.</p>
      <p>La información dejará de estar disponible para todos los dispositivos conectados.</p>
    </Modal>
    </>

    </>
  );
}
