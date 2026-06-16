import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MantenimientoInsumosForm from "../components/MantenimientoInsumosForm";

function InventoryLotBadges({ item, columnKey }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const rootRef = useRef(null);

  let history = [];
  try {
    const raw = String(item?.customFields?.lotesCaducidades || "[]");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) history = parsed;
  } catch { /* ignore */ }

  const currentVal = String(item?.customFields?.[columnKey] || "").trim();
  const allValues = Array.from(
    new Set([
      ...history.map((e) => String(columnKey === "lote" ? (e?.lot || "") : (e?.expiry || "")).trim()).filter(Boolean),
      ...(currentVal ? [currentVal] : []),
    ]),
  );

  const displayValue = currentVal || (allValues[0] || "-");
  const hasHistory = allValues.length > 0;

  function handleToggle() {
    if (!hasHistory || !rootRef.current) return;
    if (open) {
      setOpen(false);
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 140) });
    setOpen(true);
  }

  return (
    <span
      ref={rootRef}
      style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", cursor: hasHistory ? "pointer" : "default", userSelect: "none" }}
      onClick={handleToggle}
    >
      <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>{displayValue}</span>
      {allValues.length > 1 ? (
        <span style={{ color: "#5c6f74", fontSize: "0.65rem", lineHeight: 1 }}>{open ? "▲" : "▼"}</span>
      ) : null}
      {open && pos ? createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9100 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width,
            zIndex: 9200, background: "#ffffff", border: "1px solid rgba(162, 170, 181, 0.28)",
            borderRadius: "0.7rem", boxShadow: "0 12px 24px rgba(49, 77, 105, 0.12)",
            padding: "0.32rem", display: "flex", flexDirection: "column", gap: "0.2rem",
            maxHeight: "12rem", overflowY: "auto",
          }}>
            {allValues.map((val) => (
              <span key={val} style={{
                display: "block", padding: "0.3rem 0.5rem", borderRadius: "0.5rem",
                fontSize: "0.78rem", fontWeight: val === displayValue ? 700 : 500,
                background: val === displayValue ? "rgba(42, 96, 143, 0.08)" : "#f9fbfb",
                color: "#244040",
              }}>{val}</span>
            ))}
          </div>
        </>,
        document.body,
      ) : null}
    </span>
  );
}

export default function GestionInventario({ contexto }) {
  const {
    inventoryFileInputRef,
    handleInventoryImport,
    inventoryTab,
    setInventoryTab,
    inventoryCleaningSite,
    setInventoryCleaningSite,
    inventoryDestinationWarehouse,
    setInventoryDestinationWarehouse,
    INVENTORY_DOMAIN_BASE,
    INVENTORY_DOMAIN_CLEANING,
    INVENTORY_DOMAIN_ORDERS,
    INVENTORY_DOMAIN_MAINTENANCE,
    INVENTORY_DOMAIN_DESTINATIONS,
    CLEANING_SITE_OPTIONS,
    inventoryActionsMenuRef,
    openCreateInventoryItem,
    currentInventoryManagePermission,
    currentInventoryDeletePermission,
    Plus,
    Menu,
    inventoryActionsMenuOpen,
    setInventoryActionsMenuOpen,
    downloadInventoryTemplate,
    currentInventoryImportPermission,
    inventoryStats,
    StatTile,
    currentInventoryItems,
    Package,
    Eye,
    inventorySearch,
    setInventorySearch,
    Search,
    RotateCcw,
    catalogMap,
    InventoryStockBar,
    openInventoryMovement,
    INVENTORY_MOVEMENT_CONSUME,
    openInventoryRestockModal,
    openEditInventoryItem,
    Pencil,
    setDeleteInventoryId,
    Trash2,
    ArrowUp,
    lowStockInventoryItems,
    inventoryLinkedCleaningRows,
    openInventoryTransferViewer,
    openInventoryTransferHistory,
    openOrderInventoryTransfer,
    openInventoryDestinationModal,
    inventoryTransferAvailableWarehouses,
    orderInventoryTransferMovements,
    maintenanceInventoryTransferMovements,
    orderInventoryTransferSummary,
    maintenanceInventoryTransferSummary,
    maintenanceInventoryItems,
    submitMaintenanceUsage,
    exportMaintenanceInventoryItemsToCsv,
    actionPermissions,
    duplicateInventoryItem,
    Copy,
    inventoryColumns,
    createInventoryColumn,
    deleteInventoryColumn,
    state,
  } = contexto;

  const inventoryAutoPalletUpdates = useMemo(() => {
    const updates = state?.inventoryAutoPalletTimes?.updates;
    return Array.isArray(updates) ? updates : [];
  }, [state?.inventoryAutoPalletTimes?.updates]);

  function renderInventoryColumnCell(item, column) {
    if (column.key === "tiempoPorCaja") {
      const minutes = Math.max(0, Number(item.minutesPerBox || 0));
      if (!minutes) return "—";
      return (
        <>
          {minutes} min/caja
          {item.autoPalletTimeMeta?.updatedAt ? (
            <span
              className="chip chip-soft catalog-auto-limit-chip"
              title={`Promedio por caja ajustado el ${new Date(item.autoPalletTimeMeta.updatedAt).toLocaleDateString("es-MX")} (${item.autoPalletTimeMeta.avgMinutesPerBox || item.autoPalletTimeMeta.avgMinutes} min/caja, ${item.autoPalletTimeMeta.sampleWeeks} sem.)`}
            >
              auto
            </span>
          ) : null}
        </>
      );
    }
    if (column.key === "tiempoPorTarima") {
      const minutes = Math.max(0, Number(item.minutesPerPallet || 0));
      if (!minutes) return "—";
      return (
        <>
          {minutes} min
          {item.autoPalletTimeMeta?.updatedAt ? (
            <span
              className="chip chip-soft catalog-auto-limit-chip"
              title={`Tarima completa estimada (${item.boxesPerPallet || "?"} cajas) · ajustado el ${new Date(item.autoPalletTimeMeta.updatedAt).toLocaleDateString("es-MX")}`}
            >
              auto
            </span>
          ) : null}
        </>
      );
    }
    if (column.isSystem && (column.key === "lote" || column.key === "caducidad")) {
      return <InventoryLotBadges item={item} columnKey={column.key} />;
    }
    return item.customFields?.[column.key] || "—";
  }

  const [newColumnLabel, setNewColumnLabel] = useState("");

  const canViewBaseInventory = Boolean(actionPermissions.viewBaseInventory || actionPermissions.manageInventory || actionPermissions.deleteInventory || actionPermissions.importInventory);
  const canViewCleaningInventory = Boolean(actionPermissions.viewCleaningInventory || actionPermissions.manageCleaningInventory || actionPermissions.deleteCleaningInventory || actionPermissions.importCleaningInventory);
  const canViewOrderInventory = Boolean(actionPermissions.viewOrderInventory || actionPermissions.manageOrderInventory || actionPermissions.deleteOrderInventory || actionPermissions.importOrderInventory);
  const canViewMaintenanceInventory = Boolean(actionPermissions.viewMaintenanceInventory || actionPermissions.manageMaintenanceInventory || actionPermissions.deleteMaintenanceInventory || actionPermissions.importMaintenanceInventory);
  const hasInventoryTabAccess = canViewBaseInventory || canViewCleaningInventory || canViewOrderInventory || canViewMaintenanceInventory;

  const getTransferredUnits = (item) => (item?.transferTargets || []).reduce((sum, target) => sum + Number(target?.availableUnits || 0), 0);
  const getAvailableTransferUnits = (item) => Math.max(0, Number(item?.stockUnits || 0));
  const getTransferBarTargetUnits = (item) => Math.max(getAvailableTransferUnits(item) + getTransferredUnits(item), Number(item?.minStockUnits || 0), 1);
  const currentInventoryTransferSummary = inventoryTab === INVENTORY_DOMAIN_MAINTENANCE ? maintenanceInventoryTransferSummary : orderInventoryTransferSummary;
  const currentInventoryTransferMovements = inventoryTab === INVENTORY_DOMAIN_MAINTENANCE ? maintenanceInventoryTransferMovements : orderInventoryTransferMovements;
  const orderItemsWithTransfers = currentInventoryTransferSummary.filter((item) => item.transferTargets.length > 0);
  const isBaseInventoryTab = inventoryTab === INVENTORY_DOMAIN_BASE;
  const isCleaningInventoryTab = inventoryTab === INVENTORY_DOMAIN_CLEANING;
  const isOrderInventoryTab = inventoryTab === INVENTORY_DOMAIN_ORDERS;
  const isMaintenanceInventoryTab = inventoryTab === INVENTORY_DOMAIN_MAINTENANCE;
  const showPresentationColumn = isBaseInventoryTab || isCleaningInventoryTab;
  const currentInventoryColumns = useMemo(
    () => (inventoryColumns || []).filter((column) => column.domain === inventoryTab),
    [inventoryColumns, inventoryTab],
  );
  const customInventoryColumns = useMemo(
    () => currentInventoryColumns.filter((column) => !column.isSystem),
    [currentInventoryColumns],
  );

  if (!hasInventoryTabAccess) {
    return (
      <section className="inventory-page-layout">
        <article className="surface-card admin-tabs full-width admin-tabs-shell">
          <div className="card-header-row">
            <div>
              <h3>Inventario</h3>
              <p>No tienes permiso para ver ninguna pestaña de inventario.</p>
            </div>
          </div>
        </article>
      </section>
    );
  }

  const inventoryTitle = inventoryTab === INVENTORY_DOMAIN_CLEANING
    ? "Insumos de limpieza"
    : inventoryTab === INVENTORY_DOMAIN_ORDERS
      ? "Insumos para pedidos"
      : inventoryTab === INVENTORY_DOMAIN_MAINTENANCE
        ? "Insumos de mantenimiento"
        : "Productos";

  function formatCleaningLocation(item) {
    return [item?.cleaningSite || "C3", item?.storageLocation || "Sin ubicación"].join(" · ");
  }

  function getCleaningActivitySummary(item) {
    return (item?.activityConsumptions || [])
      .filter((entry) => Number(entry?.quantity || 0) > 0)
      .map((entry) => `${catalogMap.get(entry.catalogActivityId)?.name || entry.catalogActivityId} · ${entry.quantity}`);
  }

  function renderInventoryStockCell(item) {
    if (isBaseInventoryTab) {
      return item.piecesPerBox;
    }

    if (isOrderInventoryTab) {
      return (
        <InventoryStockBar
          current={getAvailableTransferUnits(item)}
          minimum={item.minStockUnits}
          target={getTransferBarTargetUnits(item)}
          unitLabel={item.unitLabel}
          primaryLabel={`Stock origen ${getAvailableTransferUnits(item)} ${item.unitLabel || "pzas"}`}
          secondaryLabel={`Transferido ${getTransferredUnits(item)} ${item.unitLabel || "pzas"}`}
          className="inventory-stock-bar"
        />
      );
    }

    if (isMaintenanceInventoryTab) {
      const currentStock = Number(item.stockUnits || 0);
      const target = Math.max(currentStock, Number(item.minStockUnits || 0), 1);
      return (
        <InventoryStockBar
          current={currentStock}
          minimum={item.minStockUnits}
          target={target}
          unitLabel={item.unitLabel}
          primaryLabel={`Stock disponible ${currentStock} ${item.unitLabel || "pzas"}`}
          secondaryLabel={item.minStockUnits ? `Mínimo ${item.minStockUnits} ${item.unitLabel || "pzas"}` : ""}
          className="inventory-stock-bar"
        />
      );
    }

    return <InventoryStockBar current={item.stockUnits} minimum={item.minStockUnits} unitLabel={item.unitLabel} className="inventory-stock-bar" />;
  }

  function renderInventoryLocationCell(item) {
    if (isBaseInventoryTab) {
      return item.boxesPerPallet;
    }
    if (isCleaningInventoryTab) {
      return formatCleaningLocation(item);
    }
    return item.storageLocation || "Sin ubicación";
  }

  function renderInventoryControlCell(item) {
    if (isOrderInventoryTab || isMaintenanceInventoryTab) {
      return (
        <div className="saved-board-list board-builder-launch-list">
          <button type="button" className="icon-button inventory-inline-action" onClick={() => openInventoryTransferHistory(item)} disabled={!currentInventoryManagePermission}>
            <Eye size={15} /> Historial
          </button>
          <span className="chip">Mínimo · {item.minStockUnits} {item.unitLabel || "pzas"}</span>
        </div>
      );
    }

    return (
      <div className="saved-board-list board-builder-launch-list">
        <span className="chip">Sede · {item.cleaningSite || "C3"}</span>
        <span className="chip">Unidad · {item.unitLabel || "pzas"}</span>
        <span className="chip">Mínimo · {item.minStockUnits} {item.unitLabel || "pzas"}</span>
        {getCleaningActivitySummary(item).slice(0, 2).map((entry) => <span key={`${item.id}-${entry}`} className="chip">{entry}</span>)}
      </div>
    );
  }

  return (
    <section className="inventory-page-layout">
      <input ref={inventoryFileInputRef} type="file" accept=".csv,.xlsx,.xls" className="inventory-file-input" onChange={handleInventoryImport} />

      <article className="surface-card admin-tabs full-width admin-tabs-shell">
        <div className="card-header-row">
          <div>
            <div className="tab-strip">
              {(actionPermissions.viewBaseInventory || actionPermissions.manageInventory || actionPermissions.deleteInventory || actionPermissions.importInventory) ? (
                <button type="button" className={inventoryTab === INVENTORY_DOMAIN_BASE ? "tab active" : "tab"} onClick={() => setInventoryTab(INVENTORY_DOMAIN_BASE)}>Productos</button>
              ) : null}
              {(actionPermissions.viewCleaningInventory || actionPermissions.manageCleaningInventory || actionPermissions.deleteCleaningInventory || actionPermissions.importCleaningInventory) ? (
                <button type="button" className={inventoryTab === INVENTORY_DOMAIN_CLEANING ? "tab active" : "tab"} onClick={() => setInventoryTab(INVENTORY_DOMAIN_CLEANING)}>Insumos de limpieza</button>
              ) : null}
              {(actionPermissions.viewOrderInventory || actionPermissions.manageOrderInventory || actionPermissions.deleteOrderInventory || actionPermissions.importOrderInventory) ? (
                <>
                  <button type="button" className={inventoryTab === INVENTORY_DOMAIN_ORDERS ? "tab active" : "tab"} onClick={() => setInventoryTab(INVENTORY_DOMAIN_ORDERS)}>Insumos para pedidos</button>
                  {canViewMaintenanceInventory ? (
                  <button type="button" className={inventoryTab === INVENTORY_DOMAIN_MAINTENANCE ? "tab active" : "tab"} onClick={() => setInventoryTab(INVENTORY_DOMAIN_MAINTENANCE)}>Insumos de mantenimiento</button>
                  ) : null}
                </>
              ) : null}
            </div>
            {inventoryTab === INVENTORY_DOMAIN_CLEANING ? (
              <div className="tab-strip inventory-subtab-strip">
                {CLEANING_SITE_OPTIONS.map((option) => (
                  <button key={option.value} type="button" className={inventoryCleaningSite === option.value ? "tab active" : "tab"} onClick={() => setInventoryCleaningSite(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
            {isOrderInventoryTab ? (
              <div className="tab-strip inventory-subtab-strip">
                <button type="button" className="icon-button" title="Agregar nave de destino" onClick={() => openInventoryDestinationModal("create")} disabled={!currentInventoryManagePermission}>
                  <Plus size={14} /> Nueva nave
                </button>
                {inventoryTransferAvailableWarehouses.map((warehouse) => (
                  <button
                    key={warehouse}
                    type="button"
                    className={inventoryDestinationWarehouse === warehouse ? "tab active" : "tab"}
                    onClick={() => setInventoryDestinationWarehouse(inventoryDestinationWarehouse === warehouse ? "" : warehouse)}
                  >
                    {warehouse}
                  </button>
                ))}
                {!inventoryTransferAvailableWarehouses.length ? <span className="subtle-line">Sin naves registradas</span> : null}
              </div>
            ) : null}
          </div>
          <div className="custom-board-actions-menu-shell inventory-actions-menu-shell" ref={inventoryActionsMenuRef}>
            <button
              type="button"
              className="primary-button custom-board-add-row-button"
              title="Agregar artículo"
              aria-label="Agregar artículo"
              onClick={() => openCreateInventoryItem(inventoryTab)}
              disabled={!currentInventoryManagePermission}
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              className="icon-button custom-board-menu-trigger"
              aria-label="Abrir acciones de inventario"
              aria-expanded={inventoryActionsMenuOpen}
              onClick={() => setInventoryActionsMenuOpen((current) => !current)}
              disabled={!currentInventoryImportPermission}
            >
              <Menu size={16} />
            </button>
            {inventoryActionsMenuOpen ? (
              <div className="custom-board-actions-dropdown">
                <button type="button" className="custom-board-menu-item" onClick={() => { setInventoryActionsMenuOpen(false); downloadInventoryTemplate(); }} disabled={!currentInventoryImportPermission}>
                  Plantilla Excel
                </button>
                {isMaintenanceInventoryTab ? (
                  <button type="button" className="custom-board-menu-item" onClick={() => { setInventoryActionsMenuOpen(false); exportMaintenanceInventoryItemsToCsv(); }} disabled={!currentInventoryImportPermission}>
                    Exportar insumos de mantenimiento
                  </button>
                ) : null}
                <button type="button" className="custom-board-menu-item" onClick={() => { setInventoryActionsMenuOpen(false); inventoryFileInputRef.current?.click(); }} disabled={!currentInventoryImportPermission}>
                  Importar CSV / Excel
                </button>
                {createInventoryColumn ? (
                  <div className="custom-board-menu-item" style={{ display: "grid", gap: "0.45rem" }}>
                    <input
                      value={newColumnLabel}
                      onChange={(event) => setNewColumnLabel(event.target.value)}
                      placeholder="Nueva columna"
                      disabled={!currentInventoryManagePermission}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      disabled={!currentInventoryManagePermission || !newColumnLabel.trim()}
                      onClick={async () => {
                        try {
                          await createInventoryColumn({ domain: inventoryTab, label: newColumnLabel.trim() });
                          setNewColumnLabel("");
                          setInventoryActionsMenuOpen(false);
                        } catch {
                          // El toast de error se gestiona en App.jsx
                        }
                      }}
                    >
                      <Plus size={14} /> Agregar columna
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </article>
      {customInventoryColumns.length ? (
        <article className="surface-card inventory-surface-card table-card">
          <div className="card-header-row">
            <div>
              <h3>Columnas personalizadas</h3>
              <p>Información adicional para {inventoryTitle.toLowerCase()}.</p>
            </div>
          </div>
          <div className="saved-board-list board-builder-launch-list">
            {customInventoryColumns.map((column) => (
              <span key={column.id} className="chip">
                {column.label}
                {deleteInventoryColumn ? (
                  <button type="button" className="icon-button danger" onClick={() => deleteInventoryColumn(column.id)} disabled={!currentInventoryManagePermission}>
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        </article>
      ) : null}
      <details className="inventory-stat-collapsible">
        <summary className="inventory-stat-summary">Indicadores</summary>
        <div className="inventory-stat-grid inventory-stat-grid-collapsed">
          <StatTile label="Artículos registrados" value={inventoryStats.total} />
          {isBaseInventoryTab ? (
            <>
              <StatTile label="Piezas por caja" value={inventoryStats.totalPiecesPerBox} tone="soft" />
              <StatTile label="Cajas por tarima" value={inventoryStats.totalBoxesPerPallet} tone="success" />
            </>
          ) : (
            <>
              <StatTile label="Stock total" value={inventoryStats.totalStockUnits} tone="soft" />
              <StatTile label="Bajo mínimo" value={inventoryStats.lowStockCount} tone="danger" />
              <StatTile label="Movimientos" value={inventoryStats.movementCount} tone="success" />
            </>
          )}
        </div>
      </details>

      {/* Alertas de stock — solo para insumos de limpieza (arriba de la tabla) */}
      {isCleaningInventoryTab ? (
        <article className="surface-card inventory-surface-card table-card">
          <div className="card-header-row">
            <div>
              <h3>Alertas de insumos</h3>
              <p>Lista rápida de compras o reabasto por debajo del mínimo en {inventoryCleaningSite}.</p>
            </div>
            <span className="chip primary">{lowStockInventoryItems.length}</span>
          </div>
          <div className="saved-board-list board-builder-launch-list">
            {lowStockInventoryItems.map((item) => (
              <article key={item.id} className="surface-card">
                <div className="card-header-row">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{item.code} · {formatCleaningLocation(item)}</p>
                  </div>
                  <span className="chip danger">{item.stockUnits}/{item.minStockUnits}</span>
                </div>
                <InventoryStockBar current={item.stockUnits} minimum={item.minStockUnits} unitLabel={item.unitLabel} className="inventory-stock-bar" />
              </article>
            ))}
            {!lowStockInventoryItems.length ? <p className="subtle-line">No hay artículos por debajo del mínimo.</p> : null}
          </div>
        </article>
      ) : null}

      {/* Control de transferencias — insumos para pedidos (vista compacta colapsable) */}
      {isOrderInventoryTab ? (
        <article className="surface-card inventory-surface-card inventory-transfer-panel-card">
          <div className="card-header-row">
            <div>
              <h3>Control de transferencias</h3>
              <p className="subtle-line inventory-transfer-panel-lead">
                {orderItemsWithTransfers.length
                  ? `${orderItemsWithTransfers.length} producto${orderItemsWithTransfers.length === 1 ? "" : "s"} con saldo en destino`
                  : "Sin saldos transferidos registrados"}
              </p>
            </div>
            <div className="inventory-transfer-card-actions">
              <button type="button" className="icon-button" onClick={() => openOrderInventoryTransfer()} disabled={!currentInventoryManagePermission}><ArrowUp size={15} /> Nueva transferencia</button>
              <button type="button" className="icon-button" onClick={openInventoryTransferViewer} disabled={!currentInventoryManagePermission}><Eye size={15} /> Ver saldos</button>
              <span className="chip primary">{currentInventoryTransferMovements.length}</span>
            </div>
          </div>
          {orderItemsWithTransfers.length ? (
            <details className="inventory-transfer-panel-details">
              <summary className="inventory-transfer-panel-toggle">
                Ver resumen de destinos
                <span className="chip soft">{orderItemsWithTransfers.length}</span>
              </summary>
              <div className="inventory-transfer-control-scroll">
                <div className="inventory-transfer-control-table" role="table" aria-label="Saldos por producto transferido">
                  <div className="inventory-transfer-control-head" role="row">
                    <span role="columnheader">Producto</span>
                    <span role="columnheader">Stock</span>
                    <span role="columnheader">Destinos</span>
                  </div>
                  {orderItemsWithTransfers.map((item) => (
                    <article key={item.id} className="inventory-transfer-control-row" role="row">
                      <div className="inventory-transfer-control-product" role="cell">
                        <strong>{item.name}</strong>
                        <span className="subtle-line">{item.code}</span>
                      </div>
                      <div className="inventory-transfer-control-stock" role="cell">
                        <span className="inventory-transfer-stock-pill">Origen {item.stockUnits}</span>
                        <span className="inventory-transfer-stock-pill primary">Disp. {item.availableToTransferUnits}</span>
                      </div>
                      <div className="inventory-transfer-dest-inline" role="cell">
                        {item.transferTargets.map((target) => (
                          <span key={target.destinationKey} className="inventory-transfer-dest-chip" title={target.storageLocation || undefined}>
                            {(target.warehouse || "Sin nave")} · {target.availableUnits} {target.unitLabel || item.unitLabel || "pzas"}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </details>
          ) : (
            <p className="subtle-line inventory-transfer-panel-empty">No hay transferencias registradas.</p>
          )}
        </article>
      ) : null}
      {isMaintenanceInventoryTab ? (
        <MantenimientoInsumosForm
          inventoryItems={maintenanceInventoryItems}
          onSubmit={submitMaintenanceUsage}
          disabled={!currentInventoryManagePermission}
        />
      ) : null}

      <section className="page-grid">
        <article className="surface-card inventory-surface-card full-width table-card">
          <div className="card-header-row">
            <div>
              <h3>{inventoryTitle}</h3>
            </div>
            <label className="users-search-field inventory-search-field">
              <span>Buscar</span>
              <div className="users-search-input-wrap">
                <Search size={16} />
                <input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Buscar por código, nombre o ubicación..." />
              </div>
            </label>
            {inventorySearch ? (
              <button type="button" className="icon-button" onClick={() => setInventorySearch("")}>
                <RotateCcw size={15} /> Limpiar búsqueda
              </button>
            ) : null}
          </div>

          {!currentInventoryItems.length ? (
            <div className="empty-state inventory-empty-state">
              <Package size={42} />
            </div>
          ) : (
            <>
            <div className="inventory-mobile-list">
              {currentInventoryItems.map((item) => (
                <article key={item.id} className="inventory-mobile-card">
                  <div className="inventory-mobile-card-head">
                    <span className="inventory-code-badge">{item.code}</span>
                    <strong>{item.name}</strong>
                  </div>
                  {showPresentationColumn ? <p className="inventory-mobile-card-line">{item.presentation || "Sin presentación"}</p> : null}
                  <div className="inventory-mobile-card-grid">
                    <span><em>{isBaseInventoryTab ? "Piezas/caja" : "Stock"}</em>{renderInventoryStockCell(item)}</span>
                    <span><em>{isBaseInventoryTab ? "Cajas/tarima" : "Ubicación"}</em>{renderInventoryLocationCell(item)}</span>
                    {isBaseInventoryTab && item.minutesPerBox > 0 ? <span><em>Tiempo/caja</em>{item.minutesPerBox} min</span> : null}
                    {isBaseInventoryTab && item.minutesPerPallet > 0 ? <span><em>Tiempo/tarima</em>{item.minutesPerPallet} min</span> : null}
                    {currentInventoryColumns.map((column) => (
                      <span key={`${item.id}-${column.id}-mobile`}>
                        <em>{column.label}</em>
                        {renderInventoryColumnCell(item, column)}
                      </span>
                    ))}
                  </div>
                  <div className="row-actions compact inventory-mobile-card-actions">
                    {!isBaseInventoryTab ? <button type="button" className="icon-button" title="Surtir" onClick={() => openInventoryRestockModal(item)} disabled={!currentInventoryManagePermission}><Plus size={15} /></button> : null}
                    {!isBaseInventoryTab ? <button type="button" className="icon-button" title={isOrderInventoryTab ? "Transferir" : "Descontar"} onClick={() => isOrderInventoryTab ? openOrderInventoryTransfer(item) : openInventoryMovement(item, INVENTORY_MOVEMENT_CONSUME)} disabled={!currentInventoryManagePermission}><ArrowUp size={15} /></button> : null}
                    <button type="button" className="icon-button" title="Editar" onClick={() => openEditInventoryItem(item)} disabled={!currentInventoryManagePermission}><Pencil size={15} /></button>
                    <button type="button" className="icon-button danger" title="Eliminar" onClick={() => setDeleteInventoryId(item.id)} disabled={!currentInventoryDeletePermission}><Trash2 size={15} /></button>
                  </div>
                </article>
              ))}
            </div>
            <div className="table-wrap inventory-table-desktop">
              {isBaseInventoryTab && inventoryAutoPalletUpdates.length ? (
                <div className="dashboard-auto-limit-banner inventory-auto-pallet-banner" role="status">
                  <strong>Tiempos por tarima actualizados automáticamente:</strong>
                  {" "}
                  {inventoryAutoPalletUpdates.map((entry) => {
                    const boxPart = entry.nextMinutesPerBox
                      ? `${entry.name}: ${entry.previousMinutesPerBox || 0} → ${entry.nextMinutesPerBox} min/caja`
                      : "";
                    const palletPart = entry.nextMinutesPerPallet
                      ? `${entry.name}: tarima ${entry.previousMinutesPerPallet || 0} → ${entry.nextMinutesPerPallet} min`
                      : "";
                    return boxPart || palletPart;
                  }).filter(Boolean).join(" · ")}
                </div>
              ) : null}
              {(() => {
                const showControlColumn = !isBaseInventoryTab;
                return (
              <table className="inventory-table-clean">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    {showPresentationColumn ? <th>{isCleaningInventoryTab ? "Formato / contenido" : "Presentación"}</th> : null}
                    <th>{isBaseInventoryTab ? "Piezas por caja" : "Stock"}</th>
                    <th>{isBaseInventoryTab ? "Cajas por tarima" : "Ubicación / resguardo"}</th>
                    {showControlColumn ? <th>{isCleaningInventoryTab ? "Consumo / control" : "Control"}</th> : null}
                    {currentInventoryColumns.map((column) => <th key={column.id}>{column.label}</th>)}
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentInventoryItems.map((item) => (
                    <tr key={item.id}>
                      <td><span className="inventory-code-badge">{item.code}</span></td>
                      <td>
                        <div>
                          <strong>{item.name}</strong>
                          {isCleaningInventoryTab && item.activityCatalogIds.length ? <span className="subtle-line">{item.activityCatalogIds.map((catalogId) => catalogMap.get(catalogId)?.name || catalogId).join(" · ")}</span> : null}
                        </div>
                      </td>
                      {showPresentationColumn ? <td>{item.presentation || (isCleaningInventoryTab ? "Sin formato capturado" : "Sin presentación")}</td> : null}
                      <td style={isBaseInventoryTab ? undefined : { minWidth: "min(100%, 220px)" }}>
                        {renderInventoryStockCell(item)}
                      </td>
                      <td>{renderInventoryLocationCell(item)}</td>
                      {showControlColumn ? (
                        <td>{renderInventoryControlCell(item)}</td>
                      ) : null}
                      {currentInventoryColumns.map((column) => (
                        <td key={`${item.id}-${column.id}`}>
                          {renderInventoryColumnCell(item, column)}
                        </td>
                      ))}
                      <td>
                        <div className="row-actions compact">
                          {!isBaseInventoryTab ? <button type="button" className="icon-button" title="Surtir" onClick={() => openInventoryRestockModal(item)} disabled={!currentInventoryManagePermission}><Plus size={15} /></button> : null}
                          {!isBaseInventoryTab ? <button type="button" className="icon-button" title={isOrderInventoryTab ? "Transferir" : isMaintenanceInventoryTab ? "Descontar" : "Descontar"} onClick={() => isOrderInventoryTab ? openOrderInventoryTransfer(item) : isMaintenanceInventoryTab ? openInventoryMovement(item, INVENTORY_MOVEMENT_CONSUME) : openInventoryMovement(item, INVENTORY_MOVEMENT_CONSUME)} disabled={!currentInventoryManagePermission}><ArrowUp size={15} /></button> : null}
                          <button type="button" className="icon-button" title="Editar" onClick={() => openEditInventoryItem(item)} disabled={!currentInventoryManagePermission}><Pencil size={15} /></button>
                          {duplicateInventoryItem ? <button type="button" className="icon-button" title="Duplicar artículo" onClick={() => duplicateInventoryItem(item.id)} disabled={!currentInventoryManagePermission}><Copy size={15} /></button> : null}
                          <button type="button" className="icon-button danger" title="Eliminar" onClick={() => setDeleteInventoryId(item.id)} disabled={!currentInventoryDeletePermission}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                );
              })()}
            </div>
            </>
          )}
        </article>

        {isCleaningInventoryTab ? (
          <article className="surface-card inventory-surface-card full-width table-card">
            <div className="card-header-row">
              <div>
                <h3>Consumo automático por actividad</h3>
                <p>Estos insumos se descuentan al iniciar actividades ligadas en la sede {inventoryCleaningSite}.</p>
              </div>
            </div>
            <div className="saved-board-list permissions-preset-list">
              {inventoryLinkedCleaningRows.map((item) => (
                <article key={item.id} className="surface-card" style={{ minWidth: "min(100%, 320px)", flex: "1 1 360px" }}>
                  <div className="card-header-row">
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.cleaningSite || "C3"} · {item.storageLocation || "Sin ubicación"}</p>
                    </div>
                    <span className="chip primary">{item.stockUnits} disponibles</span>
                  </div>
                  <div className="saved-board-list board-builder-launch-list">
                    {getCleaningActivitySummary(item).map((entry) => <span key={`${item.id}-${entry}`} className="chip">{entry} {item.unitLabel || "pzas"}</span>)}
                  </div>
                </article>
              ))}
              {!inventoryLinkedCleaningRows.length ? <p className="subtle-line">Asigna actividades del catálogo a un insumo para habilitar el descuento automático.</p> : null}
            </div>
          </article>
        ) : null}
      </section>
    </section>
  );
}
