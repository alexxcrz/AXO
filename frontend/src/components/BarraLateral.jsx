// ── Barra Lateral (Sidebar) ──────────────────────────────────────────────────
// Sidebar: navegación principal colapsable con perfil de usuario.
// InventoryActivityConsumptionEditor: editor de consumos por actividad.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import {
  BadgeCheck,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CircleGauge,
  Cog,
  Factory,
  FileText,
  HardHat,
  Hammer,
  LayoutDashboard,
  Layers3,
  OctagonAlert,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  ScanSearch,
  Settings2,
  Sparkles,
  Store,
  Target,
  Truck,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { CopmecBrand } from "./ComponentesDashboard";
import logoIA from "../assets/AXOIA.png";
import { PAGE_DASHBOARD, PAGE_PROCESS_AUDITS, PAGE_ROUTE_SLUGS, PAGE_TRANSPORT } from "../utils/constantes";

// No hay atajos dentro de Mejora continua. Auditoría e Historial son entradas separadas en NAV_ITEMS.

const DEFAULT_JOB_TITLE_BY_ROLE = {
  "Lead":              "Líder de Operaciones",
  "Senior (Sr)":       "Senior de Operaciones",
  "Semi-Senior (Ssr)": "Operador Semi-Senior",
  "Junior (Jr)":       "Operador Junior",
};

function getUserJobTitle(user) {
  return String(user?.jobTitle || DEFAULT_JOB_TITLE_BY_ROLE[user?.role] || "").trim();
}

function getPageHref(pageId, areaId = "all", subPath = "") {
  const pageSlug = PAGE_ROUTE_SLUGS?.[pageId];
  if (!pageSlug) return "/";

  const normalizedArea = normalizeSidebarKey(areaId);
  const normalizedSubPath = String(subPath || "").trim().toLowerCase().replaceAll(/\s+/g, "-").replace(/(^-|-$)/g, "");

  if (!normalizedArea || normalizedArea === "all") {
    if (pageId === PAGE_TRANSPORT && normalizedSubPath) {
      return `/${pageSlug}/${normalizedSubPath}`;
    }
    return normalizedSubPath ? `/${normalizedSubPath}` : `/${pageSlug}`;
  }

  if (pageId === PAGE_TRANSPORT && normalizedSubPath) {
    return `/${normalizedArea}/${normalizedSubPath}`;
  }

  return normalizedSubPath
    ? `/${normalizedArea}/${pageSlug}/${normalizedSubPath}`
    : `/${normalizedArea}/${pageSlug}`;
}

function getUserAvatarUrl(user) {
  return String((user?.photoThumbnailUrl || user?.photo) || "").trim();
}

function getUserInitial(name) {
  return String(name || "?").trim().charAt(0).toUpperCase() || "?";
}

const SECTION_ICON_BY_ID = {
  dashboard: LayoutDashboard,
  esto: ScanSearch,
  transporte: Truck,
  limpieza: Sparkles,
  regulatorio: FileText,
  calidad: BadgeCheck,
  inventario: Boxes,
  "recepcion-pedidos": PackageSearch,
  operaciones: Settings2,
  mantenimiento: Factory,
  "mayoreo-comercio": Store,
  retail: ClipboardList,
  fullfilment: Warehouse,
  admin: Users,
  "mejora-continua": Target,
  "produccion": Hammer,
  "recursos": Building2,
};

const TAB_ICON_BY_KEY = {
  dashboard: LayoutDashboard,
  board: Layers3,
  customboards: ClipboardList,
  historial: ClipboardList,
  incidencias: OctagonAlert,
  "registros-envios": Truck,
  "control-transporte": ClipboardCheck,
  "incidencias-transporte": OctagonAlert,
  consolidados: CircleGauge,
  "dashboard-transporte": LayoutDashboard,
  "direcciones-gastos": Building2,
};

function normalizeSidebarKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[\s/]+/g, "-")
    .trim();
}

function getSidebarSectionIcon(sectionId) {
  return SECTION_ICON_BY_ID[normalizeSidebarKey(sectionId)] || LayoutDashboard;
}

function getSidebarTabIcon(item = {}) {
  const candidates = [item.transportTab, item.transportSection, item.pageId, item.shortLabel, item.label];
  for (const candidate of candidates) {
    const normalized = normalizeSidebarKey(candidate).replaceAll(/\s+/g, "");
    if (TAB_ICON_BY_KEY[normalized]) return TAB_ICON_BY_KEY[normalized];
    if (normalized.includes("dashboard")) return LayoutDashboard;
    if (normalized.includes("board") || normalized.includes("creador")) return Layers3;
    if (normalized.includes("incidencias")) return OctagonAlert;
    if (normalized.includes("hist")) return ClipboardList;
  }
  return LayoutDashboard;
}

function SidebarIcon({ icon: Icon, className = "" }) {
  if (!Icon) return null;
  return (
    <span className={`sidebar-nav-icon ${className}`.trim()} aria-hidden="true">
      <Icon size={15} strokeWidth={2} />
    </span>
  );
}

export const Sidebar = React.memo(function Sidebar({ currentUser, page, onPageChange, isOpen, isCollapsed, onClose, onOpenProfile, onToggleCollapsed, areaSections, utilityNavItems, selectedAreaSectionId, navTransportSection, navTransportTab, navAuditTab, canUseAI, onOpenAI }) {
  const avatarUrl = getUserAvatarUrl(currentUser);
  const globalDashboardItem = (Array.isArray(utilityNavItems) ? utilityNavItems : []).find((item) => item.id === PAGE_DASHBOARD) || null;
  const sortedAreaSections = (Array.isArray(areaSections) ? areaSections : [])
    .map((section) => ({
      ...section,
      items: [...(Array.isArray(section.items) ? section.items : [])].sort((left, right) => {
        const leftOrder = typeof left?.order === "number" ? left.order : Number.POSITIVE_INFINITY;
        const rightOrder = typeof right?.order === "number" ? right.order : Number.POSITIVE_INFINITY;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return String(left?.label || "").localeCompare(String(right?.label || ""), "es-MX");
      }),
    }))
    .sort((left, right) => String(left?.label || "").localeCompare(String(right?.label || ""), "es-MX"));

  const [collapsedAreaSections, setCollapsedAreaSections] = useState(() => Object.fromEntries(
    sortedAreaSections.map((section) => [section.id, true]),
  ));

  const utilityGroups = (() => {
    const groups = [];
    const groupMap = {};
    (Array.isArray(utilityNavItems) ? utilityNavItems : []).forEach((item) => {
      if (item.id === PAGE_DASHBOARD) return;
      const g = item.group || "";
      if (!groupMap[g]) {
        groupMap[g] = { label: g, items: [] };
        groups.push(groupMap[g]);
      }
      groupMap[g].items.push(item);
    });
    return groups
      .map((group) => ({
        ...group,
        items: [...group.items].sort((left, right) => String(left?.label || "").localeCompare(String(right?.label || ""), "es-MX")),
      }))
      .sort((left, right) => String(left?.label || "").localeCompare(String(right?.label || ""), "es-MX"));
  })();

  const sortedSidebarSections = [
    ...sortedAreaSections.map((section) => ({ type: "area", id: section.id, label: section.label, section })),
    ...utilityGroups.map((group) => ({ type: "utility", id: `util-${group.label}`, label: group.label, group })),
  ].sort((left, right) => String(left?.label || "").localeCompare(String(right?.label || ""), "es-MX", { sensitivity: "base" }));

  const [collapsedUtilityGroups, setCollapsedUtilityGroups] = useState(() =>
    Object.fromEntries(utilityGroups.map((g) => [g.label, true])),
  );

  function toggleUtilityGroup(label) {
    setCollapsedUtilityGroups((current) => ({ ...current, [label]: !current[label] }));
  }

  useEffect(() => {
    setCollapsedUtilityGroups((current) => {
      const next = { ...current };
      const knownGroupLabels = new Set(utilityGroups.map((group) => group.label));
      let changed = false;

      utilityGroups.forEach((group) => {
        if (!(group.label in next)) {
          next[group.label] = true;
          changed = true;
        }
      });

      Object.keys(next).forEach((groupLabel) => {
        if (!knownGroupLabels.has(groupLabel)) {
          delete next[groupLabel];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [utilityGroups]);

  useEffect(() => {
    setCollapsedAreaSections((current) => {
      const next = { ...current };
      const knownSectionIds = new Set(sortedAreaSections.map((section) => section.id));
      let changed = false;

      sortedAreaSections.forEach((section) => {
        if (!(section.id in next)) {
          next[section.id] = true;
          changed = true;
        }
      });

      Object.keys(next).forEach((sectionId) => {
        if (!knownSectionIds.has(sectionId)) {
          delete next[sectionId];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [sortedAreaSections]);

  function toggleAreaSection(sectionId) {
    setCollapsedAreaSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }

  return (
    <aside className={`sidebar-shell ${isOpen ? "open" : ""} ${isCollapsed && !isOpen ? "collapsed" : ""}`}>
      <div className="sidebar-mobile-actions">
        <button type="button" className="sidebar-close-button" onClick={onClose} aria-label="Cerrar menú">
          <X size={18} />
        </button>
      </div>
      <div className="sidebar-desktop-toggle">
        <button type="button" className="sidebar-collapse-button" onClick={onToggleCollapsed} aria-label={isCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"} title={isCollapsed ? "Expandir menú" : "Contraer menú"}>
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      <div className="brand-block">
        <CopmecBrand headingTag="h1" compact={isCollapsed} showKicker={false} />
      </div>

      <nav className="sidebar-nav">
        {globalDashboardItem ? (
          <a
            className={`nav-item nav-item-dashboard-global ${page === PAGE_DASHBOARD && selectedAreaSectionId === "all" ? "active" : ""}`}
            href={getPageHref(globalDashboardItem.id)}
            title={globalDashboardItem.label}
            aria-label={globalDashboardItem.label}
            onClick={(event) => {
              event.preventDefault();
              onPageChange(globalDashboardItem.id, "all");
              onClose?.();
            }}
          >
            <SidebarIcon icon={getSidebarTabIcon(globalDashboardItem)} />
            <span>{globalDashboardItem.shortLabel || globalDashboardItem.label}</span>
          </a>
        ) : null}
        {(() => {
          const elements = [];
          sortedSidebarSections.forEach((entry) => {
            if (entry.type === "area") {
              const section = entry.section;
              const activeInSection = selectedAreaSectionId === section.id;
              const sectionCollapsed = Boolean(collapsedAreaSections[section.id]);
              elements.push(
                <section key={`area-group-${section.id}`} className={`nav-section ${sectionCollapsed ? "collapsed" : "expanded"} ${activeInSection ? "active" : ""}`}>
                  <button
                    type="button"
                    className="nav-section-toggle"
                    onClick={() => toggleAreaSection(section.id)}
                    aria-expanded={!sectionCollapsed}
                    aria-controls={`nav-section-panel-${section.id}`}
                  >
                    <SidebarIcon icon={getSidebarSectionIcon(section.id)} className="nav-section-toggle-icon" />
                    <span className="nav-section-toggle-label">{section.label}</span>
                    <span className="nav-section-toggle-chevron" aria-hidden="true">
                      {sectionCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>
                  <div id={`nav-section-panel-${section.id}`} className="nav-section-items" hidden={sectionCollapsed}>
                    {section.items.map((item, _idx) => {
                      const itemActive = page === item.pageId && activeInSection && (
                        !item.transportSection || navTransportSection === item.transportSection
                      ) && (!item.transportTab || navTransportTab === item.transportTab) && (
                        !item.auditPreset?.tab || item.auditPreset.tab === navAuditTab
                      );
                      return (
                        <a
                          key={`${section.id}-${item.pageId}-${item.transportSection || ""}-${item.transportTab || ""}-${normalizeSidebarKey(item.label)}-${_idx}`}
                          className={`nav-item nav-area-item ${itemActive ? "active" : ""}`}
                          href={getPageHref(item.pageId, section.id, item.transportSection)}
                          title={item.label}
                          aria-label={`${section.label} · ${item.label}`}
                          onClick={(event) => {
                            event.preventDefault();
                            onPageChange(item.pageId, section.id, item.transportSection, item.transportTab, item.auditPreset);
                            onClose?.();
                          }}
                        >
                          <SidebarIcon icon={getSidebarTabIcon(item)} className="nav-item-icon" />
                          <span>{item.shortLabel || item.label}</span>
                          {item.notificationCount > 0 ? <span className="nav-item-badge" aria-hidden="true" /> : null}
                        </a>
                      );
                    })}
                  </div>
                </section>,
              );
              return;
            }

            const group = entry.group;
            const groupCollapsed = Boolean(collapsedUtilityGroups[group.label]);
            elements.push(
              <section key={`util-group-${group.label}`} className={`nav-section ${groupCollapsed ? "collapsed" : "expanded"}`}>
                <button
                  type="button"
                  className="nav-section-toggle"
                  onClick={() => toggleUtilityGroup(group.label)}
                  aria-expanded={!groupCollapsed}
                  aria-controls={`nav-util-panel-${group.label}`}
                >
                  <SidebarIcon icon={getSidebarSectionIcon(group.label)} className="nav-section-toggle-icon" />
                  <span className="nav-section-toggle-label">{group.label}</span>
                  <span className="nav-section-toggle-chevron" aria-hidden="true">
                    {groupCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>
                <div id={`nav-util-panel-${group.label}`} className="nav-section-items" hidden={groupCollapsed}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isAuditHistory = item.id === "auditHistory";
                    const isAuditCapture = item.id === PAGE_PROCESS_AUDITS;
                    const isAuditDashboard = item.id === "auditDashboard";
                    const isAdminGroup = group.label === "Admin";
                    const nextAreaId = isAdminGroup ? "admin" : "all";
                    const hrefPageId = (isAuditHistory || isAuditDashboard) ? PAGE_PROCESS_AUDITS : item.id;
                    const itemActive = page === hrefPageId || (isAuditCapture && page === PAGE_PROCESS_AUDITS);
                    return (
                      <a
                        key={item.id}
                        className={`nav-item ${itemActive ? "active" : ""}`}
                        href={getPageHref(hrefPageId, nextAreaId)}
                        title={item.label}
                        aria-label={item.label}
                        onClick={(event) => {
                          event.preventDefault();
                          if (isAuditHistory) {
                            onPageChange(PAGE_PROCESS_AUDITS, "all", undefined, undefined, { tab: "history" });
                          } else if (isAuditDashboard) {
                            onPageChange(PAGE_PROCESS_AUDITS, "all", undefined, undefined, { tab: "dashboard" });
                          } else if (isAuditCapture) {
                            onPageChange(PAGE_PROCESS_AUDITS, "all", undefined, undefined, { tab: "capture" });
                          } else {
                            onPageChange(item.id, nextAreaId);
                          }
                          onClose?.();
                        }}
                      >
                        <SidebarIcon icon={Icon || getSidebarTabIcon(item)} className="nav-item-icon" />
                        <span>{item.shortLabel || item.label}</span>
                      </a>
                    );
                  })}
                </div>
              </section>,
            );
          });
          return elements;
        })()}
      </nav>

      {canUseAI && (
        <button
          type="button"
          className="sidebar-ai-btn"
          onClick={onOpenAI}
          title="AXO AI — Cerebro Operativo"
        >
          <img src={logoIA} alt="AI" className="sidebar-ai-logo" />
          <span className="sidebar-ai-label">AXO AI</span>
        </button>
      )}

      <button type="button" className="sidebar-profile-card" onClick={onOpenProfile} title={currentUser.name}>
        <span className="avatar-circle sidebar-profile-avatar">
          {avatarUrl
            ? <img src={avatarUrl} alt={`Avatar de ${currentUser.name}`} className="sidebar-profile-avatar-image" />
            : getUserInitial(currentUser.name)}
        </span>
        <div className="sidebar-profile-meta">
          <strong>{currentUser.name}</strong>
          <span>{getUserJobTitle(currentUser) || currentUser.role}</span>
        </div>
      </button>
    </aside>
  );
});

export const InventoryActivityConsumptionEditor = React.memo(function InventoryActivityConsumptionEditor({ activeCatalogItems, activityConsumptions, onToggle, onQuantityChange }) {
  if (!activeCatalogItems.length) {
    return <p className="inventory-activity-consumption-empty">Primero agrega actividades activas al catalogo para definir el consumo automatico por inicio.</p>;
  }

  return (
    <div className="inventory-activity-consumption-editor">
      {activeCatalogItems.map((item) => {
        const currentConsumption = activityConsumptions.find((entry) => entry.catalogActivityId === item.id);
        const isEnabled = Boolean(currentConsumption);
        return (
          <article key={item.id} className={`inventory-activity-consumption-row ${isEnabled ? "active" : ""}`.trim()}>
            <div className="inventory-activity-consumption-main">
              <div className="inventory-activity-consumption-copy">
                <strong>{item.name}</strong>
              </div>
              <button
                type="button"
                className={`switch-button ${isEnabled ? "on" : ""}`}
                onClick={() => onToggle(item.id, !isEnabled)}
                aria-pressed={isEnabled}
                aria-label={`${isEnabled ? "Desactivar" : "Activar"} consumo para ${item.name}`}
              >
                <span className="switch-thumb" />
              </button>
            </div>
            <label className="inventory-activity-consumption-quantity">
              <span>Cantidad por inicio</span>
              <input
                type="number"
                min="0"
                value={currentConsumption?.quantity || ""}
                onChange={(event) => onQuantityChange(item.id, event.target.value)}
                disabled={!isEnabled}
                placeholder={isEnabled ? "0" : "Activa la actividad"}
              />
            </label>
          </article>
        );
      })}
    </div>
  );
});
