import { findAreaSectionByLabel } from "../app/areaNavigationConfig.js";

export function resolveAreaSectionForLabel(areaLabel, sections = []) {
  const normalized = String(areaLabel || "").trim();
  if (!normalized) return null;
  return findAreaSectionByLabel(normalized, sections)
    || sections.find((section) => (section.scopes || []).some((scope) => (
      String(scope || "").trim().toLowerCase() === normalized.toLowerCase()
      || String(scope || "").trim().toLowerCase().includes(normalized.toLowerCase())
    )))
    || null;
}

export function navigateToAreaDashboard(section, handlers = {}) {
  if (!section?.id) return;
  const {
    setSelectedAreaSectionId,
    setPage,
    PAGE_DASHBOARD,
    PAGE_PROCESS_AUDITS,
    PAGE_TRANSPORT,
    setNavTransportSection,
    setAuditShortcutPreset,
  } = handlers;

  setSelectedAreaSectionId?.(section.id);

  if (section.id === "mejora-continua") {
    setPage?.(PAGE_PROCESS_AUDITS);
    setAuditShortcutPreset?.({ tab: "dashboard" });
    return;
  }

  if (section.id === "transporte") {
    setPage?.(PAGE_TRANSPORT);
    setNavTransportSection?.("dashboard-transporte");
    return;
  }

  setPage?.(PAGE_DASHBOARD);
}

export function openGeneralDashboard(handlers = {}) {
  const { setSelectedAreaSectionId, setPage, PAGE_DASHBOARD, setDashboardFilters } = handlers;
  setSelectedAreaSectionId?.("all");
  setPage?.(PAGE_DASHBOARD);
  setDashboardFilters?.((current) => ({ ...current, area: "all", source: "all" }));
}
