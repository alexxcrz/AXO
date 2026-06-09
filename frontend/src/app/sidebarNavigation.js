import {
  PAGE_DASHBOARD,
  PAGE_GLOBAL_DASHBOARD,
  PAGE_PROCESS_AUDITS,
} from "../utils/constantes.js";
import { normalizeAreaSectionId } from "./areaNavigationConfig.js";

const ADMIN_GROUP_LABEL = "Admin";
const ADMIN_AREA_ID = "admin";
const GLOBAL_AREA_ID = "all";

/** Area operativa (ESTO, LIMPIEZA, etc.) */
export function isSelectedAreaSection(section, selectedAreaSectionId) {
  if (!section || !selectedAreaSectionId) return false;
  const selected = String(selectedAreaSectionId).trim().toLowerCase();
  if (!selected || selected === GLOBAL_AREA_ID || selected === ADMIN_AREA_ID) return false;

  const sectionId = String(section.id || "").trim().toLowerCase();
  if (sectionId === selected) return true;

  const sectionLabel = String(section.label || "").trim().toLowerCase();
  if (sectionLabel === selected) return true;

  const normalizedSelected = normalizeAreaSectionId(selectedAreaSectionId);
  const normalizedSectionId = normalizeAreaSectionId(section.id);
  if (normalizedSectionId && normalizedSelected && normalizedSectionId === normalizedSelected) return true;

  return (section.scopes || []).some((scope) => {
    const scopeNorm = String(scope || "").trim().toLowerCase();
    return scopeNorm === selected || normalizeAreaSectionId(scope) === normalizedSelected;
  });
}

export function resolveUtilityItemActive(item, groupLabel, page, selectedAreaSectionId, navAuditTab = "") {
  if (!item) return false;
  const area = String(selectedAreaSectionId || "").trim().toLowerCase();
  const isAdminGroup = groupLabel === ADMIN_GROUP_LABEL;

  if (isAdminGroup) {
    if (area !== ADMIN_AREA_ID) return false;
    if (item.id === PAGE_GLOBAL_DASHBOARD) return page === PAGE_DASHBOARD;
    return page === item.id;
  }

  if (area !== GLOBAL_AREA_ID) return false;

  const isAuditHistory = item.id === "auditHistory";
  const isAuditCapture = item.id === PAGE_PROCESS_AUDITS;
  const isAuditDashboard = item.id === "auditDashboard";
  const hrefPageId = (isAuditHistory || isAuditDashboard) ? PAGE_PROCESS_AUDITS : item.id;

  if (isAuditHistory) return page === PAGE_PROCESS_AUDITS && navAuditTab === "history";
  if (isAuditDashboard) return page === PAGE_PROCESS_AUDITS && navAuditTab === "dashboard";
  if (isAuditCapture && item.auditPreset?.tab) {
    return page === PAGE_PROCESS_AUDITS && navAuditTab === item.auditPreset.tab;
  }

  return page === hrefPageId;
}

/** Grupos utilitarios: Admin, Produccion, Recursos, etc. */
export function isSelectedUtilityGroup(group, page, selectedAreaSectionId, navAuditTab = "") {
  if (!group) return false;
  const label = String(group.label || "").trim();
  const items = Array.isArray(group.items) ? group.items : [];
  const area = String(selectedAreaSectionId || "").trim().toLowerCase();

  if (label === ADMIN_GROUP_LABEL) {
    return area === ADMIN_AREA_ID;
  }

  if (area !== GLOBAL_AREA_ID) return false;

  return items.some((item) => resolveUtilityItemActive(item, label, page, selectedAreaSectionId, navAuditTab));
}

export function normalizeSidebarGroupKey(groupLabel) {
  return String(groupLabel || "").trim().toLowerCase().replace(/\s+/g, "-");
}
