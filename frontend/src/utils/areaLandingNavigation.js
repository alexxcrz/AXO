import {
  PAGE_AREA_SHELL,
  PAGE_BIBLIOTECA,
  PAGE_BOARD,
  PAGE_CUSTOM_BOARDS,
  PAGE_DASHBOARD,
  PAGE_HISTORY,
  PAGE_INCIDENCIAS,
  PAGE_PROCESS_AUDITS,
  PAGE_RETAIL,
  PAGE_TRANSPORT,
} from "./constantes.js";
import {
  AREA_SECTIONS_WITHOUT_TABS,
  normalizeAreaSectionId,
} from "../app/areaNavigationConfig.js";
import {
  canAccessAreaNavItem,
  canAccessAreaShellPage,
} from "./permissionResolver.js";
import {
  getAreaRoot,
  getUserArea,
  normalizeAreaOption,
} from "./utilidades.jsx";

const AREA_SCOPED_PAGES = new Set([
  PAGE_DASHBOARD,
  PAGE_CUSTOM_BOARDS,
  PAGE_BOARD,
  PAGE_HISTORY,
  PAGE_TRANSPORT,
  PAGE_PROCESS_AUDITS,
  PAGE_RETAIL,
  PAGE_INCIDENCIAS,
]);

const AREA_LANDING_TAB_PRIORITY = [
  PAGE_DASHBOARD,
  PAGE_CUSTOM_BOARDS,
  PAGE_BOARD,
  PAGE_TRANSPORT,
  PAGE_RETAIL,
  PAGE_INCIDENCIAS,
  PAGE_PROCESS_AUDITS,
  PAGE_HISTORY,
];

function sectionMatchesUserArea(section, userAreaRoot) {
  if (!section || !userAreaRoot) return false;
  if (section.id === normalizeAreaSectionId(userAreaRoot)) return true;
  return (section.scopes || []).some((scope) => (
    normalizeAreaOption(getAreaRoot(scope) || scope) === userAreaRoot
  ));
}

function resolveLandingForAreaSection(user, permissions, section) {
  if (!section) return null;

  if (AREA_SECTIONS_WITHOUT_TABS.has(section.id)) {
    if (!canAccessAreaShellPage(user, section.id, permissions)) return null;
    return { areaSectionId: section.id, page: PAGE_AREA_SHELL };
  }

  const accessibleItems = (section.items || []).filter((item) => (
    canAccessAreaNavItem(user, item, permissions)
  ));
  if (!accessibleItems.length) return null;

  const sortedItems = [...accessibleItems].sort((left, right) => {
    const leftIndex = AREA_LANDING_TAB_PRIORITY.indexOf(left.pageId);
    const rightIndex = AREA_LANDING_TAB_PRIORITY.indexOf(right.pageId);
    return (leftIndex === -1 ? 999 : leftIndex) - (rightIndex === -1 ? 999 : rightIndex);
  });

  const item = sortedItems[0];
  return {
    areaSectionId: section.id,
    page: item.pageId,
    transportSection: item.transportSection || "",
    transportTab: item.transportTab || "",
    auditPreset: item.auditPreset || null,
    retailTab: item.retailTab || "dashboard",
  };
}

/** Rutas que deben vivir dentro de un area (no /tableros, /dashboard global, etc.). */
export function isGlobalAreaRouteContext(page, areaSectionId) {
  const normalizedArea = String(areaSectionId || "all").trim().toLowerCase();
  if (normalizedArea && normalizedArea !== "all") return false;
  return AREA_SCOPED_PAGES.has(page);
}

/** Primera pantalla accesible dentro del area del usuario (o la primera area visible). */
export function resolveFirstAccessibleAreaLanding(user, permissions, areaNavSections = []) {
  const sections = Array.isArray(areaNavSections) ? areaNavSections.filter(Boolean) : [];
  if (!user || !sections.length) {
    return { areaSectionId: "all", page: PAGE_BIBLIOTECA };
  }

  const userAreaRoot = normalizeAreaOption(getAreaRoot(getUserArea(user)));
  const orderedSections = [...sections].sort((left, right) => {
    const leftMatch = sectionMatchesUserArea(left, userAreaRoot) ? 0 : 1;
    const rightMatch = sectionMatchesUserArea(right, userAreaRoot) ? 0 : 1;
    return leftMatch - rightMatch || String(left.label || "").localeCompare(String(right.label || ""), "es-MX");
  });

  for (const section of orderedSections) {
    const landing = resolveLandingForAreaSection(user, permissions, section);
    if (landing) return landing;
  }

  return { areaSectionId: sections[0].id, page: PAGE_BIBLIOTECA };
}

/** Aterrizaje por area para un pageId concreto (p. ej. tableros del area ESTO). */
export function resolveAreaLandingForPage(user, permissions, areaNavSections, targetPage) {
  const sections = Array.isArray(areaNavSections) ? areaNavSections.filter(Boolean) : [];
  if (!user || !targetPage || !sections.length) return null;

  const userAreaRoot = normalizeAreaOption(getAreaRoot(getUserArea(user)));
  const orderedSections = [...sections].sort((left, right) => {
    const leftMatch = sectionMatchesUserArea(left, userAreaRoot) ? 0 : 1;
    const rightMatch = sectionMatchesUserArea(right, userAreaRoot) ? 0 : 1;
    return leftMatch - rightMatch || String(left.label || "").localeCompare(String(right.label || ""), "es-MX");
  });

  for (const section of orderedSections) {
    if (AREA_SECTIONS_WITHOUT_TABS.has(section.id)) continue;
    const item = (section.items || []).find((entry) => (
      entry.pageId === targetPage && canAccessAreaNavItem(user, entry, permissions)
    ));
    if (!item) continue;
    return {
      areaSectionId: section.id,
      page: item.pageId,
      transportSection: item.transportSection || "",
      transportTab: item.transportTab || "",
      auditPreset: item.auditPreset || null,
      retailTab: item.retailTab || "dashboard",
    };
  }

  return resolveFirstAccessibleAreaLanding(user, permissions, sections);
}

export function applyAreaLandingState(landing, setters) {
  if (!landing) return;
  if (landing.areaSectionId) setters.setSelectedAreaSectionId(landing.areaSectionId);
  if (landing.page) setters.setPage(landing.page);
  if (landing.transportSection) setters.setNavTransportSection(landing.transportSection);
  if (landing.transportTab) setters.setNavTransportTab(landing.transportTab);
  if (landing.retailTab) setters.setNavRetailTab(landing.retailTab);
  if (landing.auditPreset) {
    setters.setAuditShortcutPreset(landing.auditPreset);
    setters.setNavAuditTab(landing.auditPreset?.tab || "");
  }
}
