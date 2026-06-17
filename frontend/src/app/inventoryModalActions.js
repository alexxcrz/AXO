import {
  INVENTORY_DOMAIN_BASE,
  INVENTORY_DOMAIN_CLEANING,
  INVENTORY_DOMAIN_MAINTENANCE,
  INVENTORY_DOMAIN_ORDERS,
  INVENTORY_MOVEMENT_CONSUME,
  INVENTORY_MOVEMENT_RESTOCK,
  INVENTORY_MOVEMENT_TRANSFER,
  ORDER_INVENTORY_PRIMARY_WAREHOUSE,
  DEFAULT_CLEANING_SITE,
} from "../utils/constantes.js";
import {
  createInventoryModalState,
  createInventoryMovementModalState,
  createInventoryTransferConfirmModalState,
  createInventoryRestockModalState,
  createInventoryDestinationModalState,
  inventoryDomainUsesPresentation,
  inventoryDomainUsesPackagingMetrics,
  normalizeCleaningSite,
  getInventoryDefaultTransferDestination,
  findInventoryTransferTarget,
  hasInventoryBalanceInput,
  getInventoryManageActionId,
  getInventoryDeleteActionId,
  applyRemoteWarehouseState,
  isOrderInventoryPrimaryWarehouse,
} from "../utils/utilidades.jsx";

/** Acciones de modales de inventario � extra�das de App.jsx */
export function createInventoryModalActions(deps) {
  const {
    actionPermissions,
    inventoryTab,
    inventoryCleaningSite,
    inventoryModal,
    inventoryMovementModal,
    inventoryTransferConfirmModal,
    inventoryRestockModal,
    inventoryRestockModalItems,
    inventoryMovementAvailableUnits,
    inventoryMovementTransferTarget,
    inventoryItemsById,
    inventoryMovements,
    inventoryTransferDestinationWarehouses,
    currentInventoryDomainItems,
    allInventoryItemsByDomain,
    inventoryMovementSavedLocations,
    inventoryDestinationModal,
    state,
    setInventoryModal,
    setInventoryMovementModal,
    setInventoryTransferConfirmModal,
    setInventoryRestockModal,
    setInventoryDestinationModal,
    setInventoryTransferViewerState,
    setDeleteInventoryId,
    setInventoryImportFeedback,
    setInventoryDestinationWarehouse,
    requestJson,
    setState,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
  } = deps;

    function openCreateInventoryItem(domain = inventoryTab) {
      if (!actionPermissions[getInventoryManageActionId(domain)]) return;
      setInventoryImportFeedback({ tone: "", message: "" });
      setInventoryModal({
        ...createInventoryModalState("create", {}, domain),
        cleaningSite: domain === INVENTORY_DOMAIN_CLEANING ? inventoryCleaningSite : DEFAULT_CLEANING_SITE,
        open: true,
      });
    }

    function openEditInventoryItem(item) {
      if (!actionPermissions[getInventoryManageActionId(item?.domain)]) return;
      setInventoryModal({ ...createInventoryModalState("edit", item, item.domain), open: true });
    }

    function toggleInventoryModalActivityCatalog(itemId, isChecked) {
      setInventoryModal((current) => {
        const nextActivityCatalogIds = isChecked
          ? Array.from(new Set(current.activityCatalogIds.concat(itemId)))
          : current.activityCatalogIds.filter((catalogId) => catalogId !== itemId);
        const nextActivityConsumptions = isChecked
          ? current.activityConsumptions.some((entry) => entry.catalogActivityId === itemId)
            ? current.activityConsumptions
            : current.activityConsumptions.concat({ catalogActivityId: itemId, quantity: "" })
          : current.activityConsumptions.filter((entry) => entry.catalogActivityId !== itemId);

        return {
          ...current,
          activityCatalogIds: nextActivityCatalogIds,
          activityConsumptions: nextActivityConsumptions,
        };
      });
    }

    function updateInventoryModalActivityConsumption(itemId, value) {
      setInventoryModal((current) => ({
        ...current,
        activityConsumptions: current.activityConsumptions.map((entry) => (
          entry.catalogActivityId === itemId ? { ...entry, quantity: value } : entry
        )),
      }));
    }

    function closeInventoryMovementModal() {
      setInventoryMovementModal(createInventoryMovementModalState());
    }

    function closeInventoryTransferConfirmModal(shouldReopenMovementModal = false) {
      if (shouldReopenMovementModal && inventoryTransferConfirmModal.draftMovementModal) {
        setInventoryMovementModal(inventoryTransferConfirmModal.draftMovementModal);
      }
      setInventoryTransferConfirmModal(createInventoryTransferConfirmModalState());
    }

    function updateInventoryMovementModal(updates) {
      setInventoryMovementModal((current) => {
        const next = { ...current, ...updates };
        const hasItemChange = Object.hasOwn(updates, "itemId");
        const hasWarehouseChange = Object.hasOwn(updates, "warehouse");
        const hasStorageChange = Object.hasOwn(updates, "storageLocation");
        const hasMovementTypeChange = Object.hasOwn(updates, "movementType");
        const selectedItem = next.itemId ? inventoryItemsById.get(next.itemId) || null : null;
        const defaultTransferDestination = next.movementType === INVENTORY_MOVEMENT_TRANSFER && selectedItem?.domain === INVENTORY_DOMAIN_ORDERS
          ? getInventoryDefaultTransferDestination(selectedItem, inventoryMovements)
          : null;

        if (hasItemChange) {
          next.itemCode = selectedItem?.code || "";
          next.itemName = selectedItem?.name || "";
          next.unitLabel = selectedItem?.unitLabel || "pzas";
          next.domain = selectedItem?.domain || current.domain;
          if (next.movementType === INVENTORY_MOVEMENT_TRANSFER && selectedItem?.domain === INVENTORY_DOMAIN_ORDERS) {
            next.warehouse = defaultTransferDestination?.warehouse || "";
            next.storageLocation = defaultTransferDestination?.storageLocation || "";
            next.recipientName = defaultTransferDestination?.recipientName || "";
            next.transferTargetKey = defaultTransferDestination?.destinationKey || "";
          } else {
            next.storageLocation = selectedItem?.storageLocation || "";
          }
        }

        if (hasMovementTypeChange && next.movementType !== INVENTORY_MOVEMENT_TRANSFER) {
          next.warehouse = "";
          next.recipientName = "";
          next.remainingUnits = "";
          next.transferTargetKey = "";
          next.storageLocation = selectedItem?.storageLocation || next.storageLocation;
        }

        if (next.movementType === INVENTORY_MOVEMENT_TRANSFER && selectedItem?.domain === INVENTORY_DOMAIN_ORDERS) {
          const matchedTarget = findInventoryTransferTarget(selectedItem, next.warehouse, next.storageLocation);
          const nextTargetKey = matchedTarget?.destinationKey || "";
          const shouldResetRemaining = (hasItemChange || hasWarehouseChange || hasStorageChange) && current.transferTargetKey !== nextTargetKey;
          next.transferTargetKey = nextTargetKey;
          if (shouldResetRemaining) {
            next.remainingUnits = "";
          }
        } else {
          next.transferTargetKey = "";
          if (next.movementType !== INVENTORY_MOVEMENT_TRANSFER) {
            next.remainingUnits = "";
          }
        }

        return next;
      });
    }

    function openInventoryMovement(item, movementType = INVENTORY_MOVEMENT_RESTOCK) {
      if (!actionPermissions[getInventoryManageActionId(item?.domain)]) return;
      setInventoryImportFeedback({ tone: "", message: "" });
      const defaultTransferDestination = movementType === INVENTORY_MOVEMENT_TRANSFER && item?.domain === INVENTORY_DOMAIN_ORDERS
        ? getInventoryDefaultTransferDestination(item, inventoryMovements)
        : null;
      setInventoryMovementModal({
        ...createInventoryMovementModalState(item, movementType, item?.domain || inventoryTab, { defaultDestination: defaultTransferDestination }),
        selectedTransferDestinationTab: inventoryTransferDestinationWarehouses[0] || defaultTransferDestination?.warehouse || "",
        open: true,
      });
    }

    function openOrderInventoryTransfer(item = null) {
      const transferDomain = inventoryTab === INVENTORY_DOMAIN_MAINTENANCE ? INVENTORY_DOMAIN_MAINTENANCE : INVENTORY_DOMAIN_ORDERS;
      if (!actionPermissions[getInventoryManageActionId(transferDomain)]) return;
      setInventoryImportFeedback({ tone: "", message: "" });
      setInventoryMovementModal({
        ...createInventoryMovementModalState(item, INVENTORY_MOVEMENT_TRANSFER, transferDomain),
        selectedTransferDestinationTab: inventoryTransferDestinationWarehouses[0] || "",
        open: true,
      });
    }

    function openInventoryTransferViewer() {
      const transferDomain = inventoryTab === INVENTORY_DOMAIN_MAINTENANCE ? INVENTORY_DOMAIN_MAINTENANCE : INVENTORY_DOMAIN_ORDERS;
      if (!actionPermissions[getInventoryManageActionId(transferDomain)]) return;
      setInventoryTransferViewerState({ open: true, itemId: null });
    }

    function openInventoryTransferHistory(item = null) {
      const transferDomain = inventoryTab === INVENTORY_DOMAIN_MAINTENANCE ? INVENTORY_DOMAIN_MAINTENANCE : INVENTORY_DOMAIN_ORDERS;
      if (!actionPermissions[getInventoryManageActionId(transferDomain)]) return;
      setInventoryTransferViewerState({ open: true, itemId: item?.id || null });
    }

    function closeInventoryRestockModal() {
      setInventoryRestockModal(createInventoryRestockModalState(inventoryTab));
    }

    function openInventoryRestockModal(item) {
      if (!item || item.domain === INVENTORY_DOMAIN_BASE || !actionPermissions[getInventoryManageActionId(item.domain)]) return;
      setInventoryImportFeedback({ tone: "", message: "" });
      setInventoryRestockModal({
        ...createInventoryRestockModalState(item.domain, [item.id]),
        open: true,
      });
    }

    function openInventoryBulkRestockModal(domain = inventoryTab) {
      if (domain === INVENTORY_DOMAIN_BASE || !actionPermissions[getInventoryManageActionId(domain)]) return;
      const items = domain === INVENTORY_DOMAIN_CLEANING
        ? currentInventoryDomainItems
        : allInventoryItemsByDomain[domain] || [];
      if (!items.length) {
        setInventoryImportFeedback({ tone: "danger", message: "No hay insumos disponibles para surtir en esta sección." });
        return;
      }
      setInventoryImportFeedback({ tone: "", message: "" });
      setInventoryRestockModal({
        ...createInventoryRestockModalState(domain, items.map((item) => item.id)),
        open: true,
      });
    }

    function updateInventoryRestockQuantity(itemId, value) {
      setInventoryRestockModal((current) => ({
        ...current,
        quantities: {
          ...current.quantities,
          [itemId]: value,
        },
      }));
    }

    function applySavedInventoryLocation(locationKey) {
      const selectedLocation = inventoryMovementSavedLocations.find((entry) => entry.key === locationKey);
      if (!selectedLocation) return;
      updateInventoryMovementModal({ storageLocation: selectedLocation.label });
    }

    async function requestInventoryMovement(payload) {
      const result = await requestJson("/warehouse/inventory/movements", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      return result;
    }

    async function persistInventoryMovement(payload, successMessage) {
      try {
        await requestInventoryMovement(payload);
        setInventoryTransferConfirmModal(createInventoryTransferConfirmModalState());
        closeInventoryMovementModal();
        setInventoryImportFeedback({ tone: "success", message: successMessage });
      } catch (error) {
        setInventoryImportFeedback({ tone: "danger", message: error?.message || "No se pudo registrar el movimiento." });
      }
    }

    async function submitInventoryRestockModal() {
      if (!actionPermissions[getInventoryManageActionId(inventoryRestockModal.domain)]) return;

      const pendingRestocks = inventoryRestockModalItems
        .map((item) => ({
          item,
          quantity: Number(inventoryRestockModal.quantities[item.id] || 0),
        }))
        .filter(({ quantity }) => quantity > 0 && !Number.isNaN(quantity));

      if (!pendingRestocks.length) {
        closeInventoryRestockModal();
        setInventoryImportFeedback({ tone: "success", message: "No se agregó surtido porque todas las cantidades quedaron en 0." });
        return;
      }

      try {
        for (const { item, quantity } of pendingRestocks) {
          await requestInventoryMovement({
            itemId: item.id,
            movementType: INVENTORY_MOVEMENT_RESTOCK,
            quantity,
            notes: inventoryRestockModal.itemIds.length === 1 ? "Surtido por insumo" : "Surtido general",
            warehouse: "",
            recipientName: "",
            storageLocation: item.storageLocation || "",
            unitLabel: item.unitLabel || "pzas",
            remainingUnits: null,
          });
        }

        closeInventoryRestockModal();
        setInventoryImportFeedback({
          tone: "success",
          message: pendingRestocks.length === 1
            ? `Surtido registrado para ${pendingRestocks[0].item.name}.`
            : `Surtido general aplicado a ${pendingRestocks.length} insumos.`,
        });
      } catch (error) {
        setInventoryImportFeedback({ tone: "danger", message: error?.message || "No se pudo registrar el surtido." });
      }
    }

    async function submitInventoryModal() {
      setInventoryModal((current) => ({ ...current, submitting: true }));
      if (!actionPermissions[getInventoryManageActionId(inventoryModal.domain)]) {
        setInventoryModal((current) => ({ ...current, submitting: false }));
        return;
      }
      const usesPresentation = inventoryDomainUsesPresentation(inventoryModal.domain);
      const usesPackagingMetrics = inventoryDomainUsesPackagingMetrics(inventoryModal.domain);
      const normalizedActivityConsumptions = inventoryModal.domain === INVENTORY_DOMAIN_CLEANING
        ? inventoryModal.activityConsumptions
          .map((entry) => ({
            catalogActivityId: entry.catalogActivityId,
            quantity: Number(entry.quantity || 0),
          }))
          .filter((entry) => entry.catalogActivityId)
        : [];
      const payload = {
        domain: inventoryModal.domain,
        code: inventoryModal.code.trim(),
        name: inventoryModal.name.trim(),
        presentation: usesPresentation ? inventoryModal.presentation.trim() : "",
        piecesPerBox: usesPackagingMetrics ? Number(inventoryModal.piecesPerBox || 0) : 0,
        boxesPerPallet: usesPackagingMetrics ? Number(inventoryModal.boxesPerPallet || 0) : 0,
        stockUnits: inventoryModal.domain === INVENTORY_DOMAIN_BASE ? 0 : Number(inventoryModal.stockUnits || 0),
        minStockUnits: inventoryModal.domain === INVENTORY_DOMAIN_BASE ? 0 : Number(inventoryModal.minStockUnits || 0),
        storageLocation: inventoryModal.domain === INVENTORY_DOMAIN_BASE ? "" : inventoryModal.storageLocation.trim(),
        family: inventoryModal.domain === INVENTORY_DOMAIN_MAINTENANCE ? inventoryModal.family.trim() : "",
        price: inventoryModal.domain === INVENTORY_DOMAIN_MAINTENANCE ? Number(inventoryModal.price || 0) : 0,
        cost: inventoryModal.domain === INVENTORY_DOMAIN_MAINTENANCE ? Number(inventoryModal.cost || 0) : 0,
        cleaningSite: inventoryModal.domain === INVENTORY_DOMAIN_CLEANING ? normalizeCleaningSite(inventoryModal.cleaningSite) : "",
        unitLabel: inventoryModal.unitLabel.trim() || "pzas",
        activityCatalogIds: inventoryModal.domain === INVENTORY_DOMAIN_CLEANING ? normalizedActivityConsumptions.map((entry) => entry.catalogActivityId) : [],
        activityConsumptions: normalizedActivityConsumptions,
        consumptionPerStart: inventoryModal.domain === INVENTORY_DOMAIN_CLEANING ? Number(normalizedActivityConsumptions[0]?.quantity || 0) : 0,
        customFields: Object.fromEntries(
          Object.entries(inventoryModal.customFields || {})
            .map(([key, value]) => [String(key || "").trim(), String(value || "").trim()])
            .filter(([key]) => key),
        ),
      };

      if (!payload.code || !payload.name) {
        setInventoryModal((current) => ({ ...current, submitting: false }));
        return;
      }

      if (usesPackagingMetrics && Number(payload.boxesPerPallet || 0) <= 0) {
        setInventoryModal((current) => ({ ...current, submitting: false }));
        setInventoryImportFeedback({ tone: "danger", message: "Indica cuántas cajas trae una tarima completa (mayor a 0)." });
        return;
      }

      if (usesPackagingMetrics && Number(payload.piecesPerBox || 0) <= 0) {
        setInventoryModal((current) => ({ ...current, submitting: false }));
        setInventoryImportFeedback({ tone: "danger", message: "Indica cuántas piezas trae cada caja (mayor a 0)." });
        return;
      }

      try {
        const result = await requestJson(
          inventoryModal.mode === "create" ? "/warehouse/inventory" : `/warehouse/inventory/${inventoryModal.id}`,
          {
            method: inventoryModal.mode === "create" ? "POST" : "PATCH",
            body: JSON.stringify(payload),
          },
        );
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setInventoryModal(createInventoryModalState());
        setInventoryImportFeedback({ tone: "success", message: inventoryModal.mode === "create" ? "Artículo agregado al inventario." : "Artículo actualizado correctamente." });
      } catch (error) {
        setInventoryModal((current) => ({ ...current, submitting: false }));
        setInventoryImportFeedback({ tone: "danger", message: error?.message || "No se pudo guardar el artículo de inventario." });
      }
    }

    async function submitInventoryMovementModal() {
      if (!actionPermissions[getInventoryManageActionId(inventoryMovementModal.domain)] || !inventoryMovementModal.itemId) return;

      const selectedItem = inventoryItemsById.get(inventoryMovementModal.itemId) || null;
      const quantity = Number(inventoryMovementModal.quantity || 0);
      const isOrderTransfer = inventoryMovementModal.movementType === INVENTORY_MOVEMENT_TRANSFER && selectedItem?.domain === INVENTORY_DOMAIN_ORDERS;

      if (!selectedItem || !quantity || Number.isNaN(quantity)) {
        setInventoryImportFeedback({ tone: "danger", message: "Define el artículo y una cantidad válida para continuar." });
        return;
      }

      if (isOrderTransfer) {
        if (!inventoryMovementModal.warehouse.trim() && !inventoryMovementModal.storageLocation.trim()) {
          setInventoryImportFeedback({ tone: "danger", message: "Define una nave destino o un punto de entrega destino para registrar la transferencia." });
          return;
        }
        if (quantity > inventoryMovementAvailableUnits) {
          setInventoryImportFeedback({ tone: "danger", message: `Solo hay ${inventoryMovementAvailableUnits} ${selectedItem.unitLabel || "pzas"} disponibles para transferir con el saldo actual.` });
          return;
        }
      }

      setInventoryMovementModal((current) => ({ ...current, submitting: true }));

      const payload = {
        itemId: selectedItem.id,
        movementType: inventoryMovementModal.movementType,
        quantity,
        notes: inventoryMovementModal.notes.trim(),
        warehouse: inventoryMovementModal.warehouse.trim(),
        recipientName: inventoryMovementModal.recipientName.trim(),
        storageLocation: inventoryMovementModal.storageLocation.trim(),
        unitLabel: inventoryMovementModal.unitLabel.trim() || "pzas",
        remainingUnits: hasInventoryBalanceInput(inventoryMovementModal.remainingUnits) ? Number(inventoryMovementModal.remainingUnits || 0) : null,
      };

      if (isOrderTransfer && inventoryMovementTransferTarget && !hasInventoryBalanceInput(inventoryMovementModal.remainingUnits)) {
        setInventoryMovementModal((current) => ({ ...current, submitting: false }));
        setInventoryTransferConfirmModal({
          open: true,
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          warehouse: payload.warehouse,
          storageLocation: payload.storageLocation,
          recipientName: payload.recipientName,
          quantity,
          unitLabel: payload.unitLabel,
          remainingUnits: "",
          lastKnownUnits: inventoryMovementTransferTarget.availableUnits,
          pendingPayload: payload,
          draftMovementModal: { ...inventoryMovementModal, open: true },
        });
        setInventoryMovementModal((current) => ({ ...current, open: false }));
        return;
      }

      try {
        await persistInventoryMovement(payload, isOrderTransfer ? "Transferencia registrada." : "Movimiento de inventario registrado.");
      } catch (_error) {
        setInventoryMovementModal((current) => ({ ...current, submitting: false }));
      }
    }

    async function submitInventoryTransferConfirmModal() {
      const quantity = Number(inventoryTransferConfirmModal.quantity || 0);
      const remainingUnits = Number(inventoryTransferConfirmModal.remainingUnits || 0);

      if (!inventoryTransferConfirmModal.pendingPayload || !quantity || Number.isNaN(quantity)) {
        setInventoryImportFeedback({ tone: "danger", message: "No se encontró la transferencia pendiente para confirmar." });
        return;
      }

      if (!hasInventoryBalanceInput(inventoryTransferConfirmModal.remainingUnits) || Number.isNaN(remainingUnits)) {
        setInventoryImportFeedback({ tone: "danger", message: "Indica cuántas piezas quedan actualmente en ese destino para completar la transferencia." });
        return;
      }

      await persistInventoryMovement({
        ...inventoryTransferConfirmModal.pendingPayload,
        remainingUnits,
      }, "Transferencia registrada y saldo destino actualizado.");
    }

    function openInventoryDestinationModal(mode = "create", destination = {}) {
      if (!actionPermissions.manageOrderInventory) return;
      setInventoryImportFeedback({ tone: "", message: "" });
      setInventoryDestinationModal({ ...createInventoryDestinationModalState(mode, destination), open: true });
    }

    function closeInventoryDestinationModal() {
      setInventoryDestinationModal(createInventoryDestinationModalState());
    }

    async function submitInventoryDestinationModal() {
      if (!actionPermissions.manageOrderInventory) return;

      const { mode, warehouse, storageLocation, recipientName } = inventoryDestinationModal;
      if (!warehouse.trim() || !storageLocation.trim()) {
        setInventoryImportFeedback({ tone: "danger", message: "Define la nave y punto de entrega para continuar." });
        return;
      }

      if (isOrderInventoryPrimaryWarehouse(warehouse)) {
        setInventoryImportFeedback({ tone: "danger", message: `${ORDER_INVENTORY_PRIMARY_WAREHOUSE} es la nave principal y no se registra como destino.` });
        return;
      }

      setInventoryDestinationModal((current) => ({ ...current, submitting: true }));

      try {
        const payload = {
          warehouse: warehouse.trim(),
          storageLocation: storageLocation.trim(),
          recipientName: recipientName.trim(),
        };

        const result = await requestJson(
          mode === "create" ? "/warehouse/inventory/destinations" : `/warehouse/inventory/destinations/${inventoryDestinationModal.id}`,
          {
            method: mode === "create" ? "POST" : "PATCH",
            body: JSON.stringify(payload),
          },
        );
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setInventoryDestinationModal(createInventoryDestinationModalState());
        setInventoryImportFeedback({ tone: "success", message: mode === "create" ? "Nave destino agregada." : "Nave destino actualizada." });
      } catch (error) {
        setInventoryDestinationModal((current) => ({ ...current, submitting: false }));
        setInventoryImportFeedback({ tone: "danger", message: error?.message || "No se pudo guardar la nave destino." });
      }
    }

    async function returnAllInventoryToAlmacen(warehouse) {
      if (!actionPermissions.manageOrderInventory || !warehouse || isOrderInventoryPrimaryWarehouse(warehouse)) return;

      const normalizedWarehouse = String(warehouse || "").trim().toLowerCase();
      const pendingUnits = (state.inventoryItems || [])
        .filter((item) => item.domain === INVENTORY_DOMAIN_ORDERS)
        .reduce((sum, item) => {
          const targetUnits = (item.transferTargets || [])
            .filter((target) => String(target.warehouse || "").trim().toLowerCase() === normalizedWarehouse)
            .reduce((targetSum, target) => targetSum + Number(target.availableUnits || 0), 0);
          return sum + targetUnits;
        }, 0);

      if (!pendingUnits) {
        setInventoryImportFeedback({ tone: "danger", message: `No hay saldo transferido en ${warehouse} para devolver a ${ORDER_INVENTORY_PRIMARY_WAREHOUSE}.` });
        return;
      }

      const confirmed = window.confirm(
        `¿Devolver todo el saldo de ${warehouse} a ${ORDER_INVENTORY_PRIMARY_WAREHOUSE}? Se moverán ${pendingUnits} unidades en total.`,
      );
      if (!confirmed) return;

      try {
        const result = await requestJson("/warehouse/inventory/return-to-almacen", {
          method: "POST",
          body: JSON.stringify({ warehouse }),
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setInventoryDestinationWarehouse(ORDER_INVENTORY_PRIMARY_WAREHOUSE);
        setInventoryImportFeedback({
          tone: "success",
          message: `Se devolvieron ${result.data.returnedUnits || pendingUnits} unidades de ${warehouse} a ${ORDER_INVENTORY_PRIMARY_WAREHOUSE}.`,
        });
      } catch (error) {
        setInventoryImportFeedback({ tone: "danger", message: error?.message || "No se pudo devolver el saldo a Almacén." });
      }
    }

    async function deleteInventoryDestination(destinationId) {
      if (!actionPermissions.manageOrderInventory || !destinationId) return;

      try {
        const result = await requestJson(`/warehouse/inventory/destinations/${destinationId}`, {
          method: "DELETE",
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setInventoryImportFeedback({ tone: "success", message: "Nave destino eliminada." });
      } catch (error) {
        setInventoryImportFeedback({ tone: "danger", message: error?.message || "No se pudo eliminar la nave destino." });
      }
    }
    async function deleteInventoryItem(itemId) {
      const item = (state.inventoryItems || []).find((entry) => entry.id === itemId);
      if (!itemId || !actionPermissions[getInventoryDeleteActionId(item?.domain)]) return;
      try {
        const result = await requestJson(`/warehouse/inventory/${itemId}`, {
          method: "DELETE",
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setDeleteInventoryId(null);
        setInventoryImportFeedback({ tone: "success", message: "Artículo eliminado del inventario." });
      } catch (error) {
        setInventoryImportFeedback({ tone: "danger", message: error?.message || "No se pudo eliminar el artículo de inventario." });
      }
    }

  return {
    openCreateInventoryItem,
    openEditInventoryItem,
    toggleInventoryModalActivityCatalog,
    updateInventoryModalActivityConsumption,
    closeInventoryMovementModal,
    closeInventoryTransferConfirmModal,
    updateInventoryMovementModal,
    openInventoryMovement,
    openOrderInventoryTransfer,
    openInventoryTransferViewer,
    openInventoryTransferHistory,
    closeInventoryRestockModal,
    openInventoryRestockModal,
    openInventoryBulkRestockModal,
    updateInventoryRestockQuantity,
    applySavedInventoryLocation,
    submitInventoryRestockModal,
    submitInventoryModal,
    submitInventoryMovementModal,
    submitInventoryTransferConfirmModal,
    openInventoryDestinationModal,
    closeInventoryDestinationModal,
    submitInventoryDestinationModal,
    deleteInventoryDestination,
    returnAllInventoryToAlmacen,
    deleteInventoryItem,
  };
}
