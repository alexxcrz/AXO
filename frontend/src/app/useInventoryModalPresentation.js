import { useMemo } from "react";
import {
  getInventoryEntityLabel,
  getInventoryPresentationLabel,
  getInventoryPresentationPlaceholder,
  getInventoryUnitPlaceholder,
  getInventoryStoragePlaceholder,
  inventoryDomainUsesPresentation,
  inventoryDomainUsesPackagingMetrics,
  mergeInventoryColumnsWithSystem,
  normalizeInventoryDomain,
} from "../utils/utilidades.jsx";
import {
  INVENTORY_DOMAIN_BASE,
  INVENTORY_DOMAIN_CLEANING,
} from "../utils/constantes.js";

export function buildInventoryModalPresentation({ inventoryModal, state, allInventoryItems }) {
  const inventoryEntityLabel = getInventoryEntityLabel(inventoryModal.domain);
  const shouldShowInventoryPresentationField = inventoryDomainUsesPresentation(inventoryModal.domain);
  const shouldShowInventoryPackagingFields = inventoryDomainUsesPackagingMetrics(inventoryModal.domain);
  const shouldShowInventoryStockFields = inventoryModal.domain !== INVENTORY_DOMAIN_BASE;
  const shouldShowCleaningLinkFields = inventoryModal.domain === INVENTORY_DOMAIN_CLEANING;
  const inventoryPresentationLabel = getInventoryPresentationLabel(inventoryModal.domain);
  const inventoryPresentationPlaceholder = getInventoryPresentationPlaceholder(inventoryModal.domain);
  const inventoryUnitPlaceholder = getInventoryUnitPlaceholder(inventoryModal.domain);
  const inventoryStoragePlaceholder = getInventoryStoragePlaceholder(inventoryModal.domain);

  const inventoryUnitOptions = (() => {
    const presetUnits = ["pzas", "piezas", "rollos", "bidones", "bolsas", "litros", "kg", "cajas", "paquetes", "galones", "latas", "metros", "sacos", "cubetas"];
    const existing = new Set(presetUnits);
    (state.inventory || []).forEach((item) => {
      const unit = String(item.unitLabel || "").trim().toLowerCase();
      if (unit) existing.add(unit);
    });
    return Array.from(existing).sort((a, b) => a.localeCompare(b, "es-MX"));
  })();

  const inventoryCustomColumnsForModal = mergeInventoryColumnsWithSystem(state.inventoryColumns || [])
    .filter((column) => column.domain === inventoryModal.domain);

  const inventorySystemColumnSuggestions = (() => {
    const lots = new Set();
    const expiries = new Set();
    const etiquetas = new Set();

    allInventoryItems
      .filter((item) => normalizeInventoryDomain(item.domain) === normalizeInventoryDomain(inventoryModal.domain))
      .forEach((item) => {
        const lotValue = String(item?.customFields?.lote || "").trim();
        const expiryValue = String(item?.customFields?.caducidad || "").trim();
        const etiquetaValue = String(item?.customFields?.etiqueta || "").trim();
        if (lotValue) lots.add(lotValue);
        if (expiryValue) expiries.add(expiryValue);
        if (etiquetaValue) etiquetas.add(etiquetaValue);

        try {
          const history = JSON.parse(String(item?.customFields?.lotesCaducidades || "[]"));
          if (!Array.isArray(history)) return;
          history.forEach((entry) => {
            const lot = String(entry?.lot || "").trim();
            const expiry = String(entry?.expiry || "").trim();
            const etiqueta = String(entry?.etiqueta || "").trim();
            if (lot) lots.add(lot);
            if (expiry) expiries.add(expiry);
            if (etiqueta) etiquetas.add(etiqueta);
          });
        } catch {
          // Ignorar historiales corruptos para no romper el modal.
        }
      });

    return {
      lote: Array.from(lots).sort((a, b) => a.localeCompare(b, "es-MX")),
      caducidad: Array.from(expiries).sort((a, b) => a.localeCompare(b, "es-MX")),
      etiqueta: Array.from(etiquetas).sort((a, b) => a.localeCompare(b, "es-MX")),
    };
  })();

  const shouldShowTransferRemainingUnits = (movement) => movement.remainingUnits !== null;

  return {
    inventoryEntityLabel,
    shouldShowInventoryPresentationField,
    shouldShowInventoryPackagingFields,
    shouldShowInventoryStockFields,
    shouldShowCleaningLinkFields,
    inventoryPresentationLabel,
    inventoryPresentationPlaceholder,
    inventoryUnitPlaceholder,
    inventoryStoragePlaceholder,
    inventoryUnitOptions,
    inventoryCustomColumnsForModal,
    inventorySystemColumnSuggestions,
    shouldShowTransferRemainingUnits,
  };
}

export function useInventoryModalPresentation({ inventoryModal, state, allInventoryItems }) {
  return useMemo(
    () => buildInventoryModalPresentation({ inventoryModal, state, allInventoryItems }),
    [inventoryModal, state, allInventoryItems],
  );
}
