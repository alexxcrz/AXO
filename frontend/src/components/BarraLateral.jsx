// ── Barra Lateral (Sidebar) ──────────────────────────────────────────────────
// Sidebar: navegación principal colapsable con perfil de usuario.
// InventoryActivityConsumptionEditor: editor de consumos por actividad.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  BarChart3,
  LayoutDashboard,
  Layers3,
  Package,
  OctagonAlert,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  ScanSearch,
  Search,
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
import { PAGE_AREA_SHELL, PAGE_DASHBOARD, PAGE_GLOBAL_DASHBOARD, PAGE_PROCESS_AUDITS, PAGE_ROUTE_SLUGS, PAGE_TRANSPORT, PAGE_RETAIL } from "../utils/constantes";
import { AREA_SECTIONS_WITHOUT_TABS } from "../app/areaNavigationConfig.js";
import {
  isSelectedAreaSection,
  isSelectedUtilityGroup,
  resolveUtilityItemActive,
} from "../app/sidebarNavigation.js";
import { formatNavNotificationCount } from "../utils/processAuditMetrics.js";

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
  dashboard: BarChart3,
  esto: ScanSearch,
  transporte: Truck,
  limpieza: Sparkles,
  regulatorio: FileText,
  calidad: BadgeCheck,
  inventario: Boxes,
  pedidos: Package,
  pedido: Package,
  "recepcion-pedidos": PackageSearch,
  operaciones: Settings2,
  mantenimiento: Factory,
  "mayoreo-comercio": Store,
  retail: ClipboardList,
  fullfilment: Warehouse,
  admin: Users,
  "mejora-continua": Target,
  problemas: OctagonAlert,
  propuestas: ClipboardCheck,
  autorizar: BadgeCheck,
  seguimiento: CircleGauge,
  "produccion": Hammer,
  "recursos": Building2,
};

const TAB_ICON_BY_KEY = {
  dashboard: BarChart3,
  board: Layers3,
  customboards: ClipboardList,
  historial: ClipboardList,
  incidencias: OctagonAlert,
  "registros-envios": Truck,
  "control-transporte": ClipboardCheck,
  "incidencias-transporte": OctagonAlert,
  consolidados: CircleGauge,
  "dashboard-transporte": BarChart3,
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
  const key = normalizeSidebarKey(sectionId);
  if (SECTION_ICON_BY_ID[key]) return SECTION_ICON_BY_ID[key];
  if (key.includes("pedido")) return Package;
  if (key.includes("inventario")) return Boxes;
  if (key.includes("transporte")) return Truck;
  if (key.includes("mantenimiento")) return Factory;
  if (key.includes("limpieza")) return Sparkles;
  if (key.includes("calidad")) return BadgeCheck;
  if (key.includes("operacion")) return Settings2;
  if (key.includes("retail") || key.includes("mayoreo") || key.includes("ecommerce")) return Store;
  if (key.includes("fullfil") || key.includes("fulfil")) return Warehouse;
  return LayoutDashboard;
}

function getSidebarTabIcon(item = {}) {
  const pageKey = normalizeSidebarKey(item.pageId || item.id || "");
  const isGlobalDashboard = pageKey === "dashboard"
    && !item.transportSection
    && !item.transportTab
    && !item.auditPreset?.tab;
  if (isGlobalDashboard) return BarChart3;

  const auditTab = normalizeSidebarKey(item.auditPreset?.tab || "");
  if (auditTab === "dashboard") return BarChart3;
  if (auditTab === "problemas") return OctagonAlert;
  if (auditTab === "propuestas") return ClipboardCheck;
  if (auditTab === "seguimiento") return BadgeCheck;
  if (auditTab === "implementacion") return CircleGauge;
  if (auditTab === "history") return ClipboardList;
  if (auditTab === "auditoria" || auditTab === "capture") return ClipboardCheck;

  const candidates = [item.transportTab, item.transportSection, item.pageId, item.shortLabel, item.label];
  for (const candidate of candidates) {
    const normalized = normalizeSidebarKey(candidate).replaceAll(/\s+/g, "");
    if (TAB_ICON_BY_KEY[normalized]) return TAB_ICON_BY_KEY[normalized];
    if (normalized.includes("pedido")) return Package;
    if (normalized.includes("dashboard")) return BarChart3;
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

export const Sidebar = React.memo(function Sidebar({ currentUser, page, onPageChange, isOpen, isCollapsed, onClose, onOpenProfile, onToggleCollapsed, areaSections, utilityNavItems, selectedAreaSectionId, navTransportSection, navTransportTab, navRetailTab = "ordenes-compra", navAuditTab, canUseAI, onOpenAI }) {
  const avatarUrl = getUserAvatarUrl(currentUser);
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

  const [navSearch, setNavSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [focusedAreaId, setFocusedAreaId] = useState(() => {
    const activeId = String(selectedAreaSectionId || "").trim().toLowerCase();
    if (activeId && activeId !== "all" && activeId !== "admin") return activeId;
    return sortedAreaSections[0]?.id || "";
  });

  const normalizedNavSearch = navSearch.trim().toLowerCase();

  const filteredAreaSections = useMemo(() => {
    if (!normalizedNavSearch) return sortedAreaSections;
    return sortedAreaSections
      .map((section) => {
        const sectionMatches = String(section.label || "").toLowerCase().includes(normalizedNavSearch);
        if (sectionMatches) return section;
        const items = section.items.filter((item) => {
          const label = String(item.shortLabel || item.label || "").toLowerCase();
          return label.includes(normalizedNavSearch);
        });
        return items.length ? { ...section, items } : null;
      })
      .filter(Boolean);
  }, [normalizedNavSearch, sortedAreaSections]);

  const filteredUtilityGroups = useMemo(() => {
    if (!normalizedNavSearch) return utilityGroups;
    return utilityGroups
      .map((group) => {
        const groupMatches = String(group.label || "").toLowerCase().includes(normalizedNavSearch);
        if (groupMatches) return group;
        const items = group.items.filter((item) => {
          const label = String(item.shortLabel || item.label || "").toLowerCase();
          return label.includes(normalizedNavSearch);
        });
        return items.length ? { ...group, items } : null;
      })
      .filter(Boolean);
  }, [normalizedNavSearch, utilityGroups]);

  const focusedSection = filteredAreaSections.find((section) => section.id === focusedAreaId)
    || filteredAreaSections[0]
    || null;

  useEffect(() => {
    const activeId = String(selectedAreaSectionId || "").trim().toLowerCase();
    if (!activeId || activeId === "all" || activeId === "admin") return;
    setFocusedAreaId(activeId);
  }, [selectedAreaSectionId]);

  useEffect(() => {
    if (!searchOpen) return;
    globalThis.setTimeout(() => searchInputRef.current?.focus?.(), 0);
  }, [searchOpen]);

  useEffect(() => {
    const activeId = String(selectedAreaSectionId || "").trim().toLowerCase();
    if (activeId === "admin" || activeId === "all") {
      setSystemOpen(true);
    }
  }, [selectedAreaSectionId, page]);

  function handleAreaChipClick(section) {
    setFocusedAreaId(section.id);
    if (!section.items?.length && AREA_SECTIONS_WITHOUT_TABS.has(section.id)) {
      onPageChange(PAGE_AREA_SHELL, section.id, "", "", null, "");
      onClose?.();
    }
  }

  function renderAreaNavLink(section, item, index) {
    const activeInSection = isSelectedAreaSection(section, selectedAreaSectionId);
    const itemActive = page === item.pageId && activeInSection && (
      !item.transportSection || navTransportSection === item.transportSection
    ) && (!item.transportTab || navTransportTab === item.transportTab) && (
      !item.retailTab || navRetailTab === item.retailTab
    ) && (
      !item.auditPreset?.tab || item.auditPreset.tab === navAuditTab
    );

    return (
      <a
        key={`${section.id}-${item.pageId}-${item.transportSection || ""}-${item.transportTab || ""}-${normalizeSidebarKey(item.label)}-${index}`}
        className={`sidebar-pro-link ${itemActive ? "is-active" : ""}`}
        href={getPageHref(item.pageId, section.id, item.transportSection)}
        title={item.label}
        aria-label={`${section.label} · ${item.label}`}
        onClick={(event) => {
          event.preventDefault();
          onPageChange(item.pageId, section.id, item.transportSection, item.transportTab, item.auditPreset, item.retailTab);
          onClose?.();
        }}
      >
        <SidebarIcon icon={getSidebarTabIcon(item)} className="nav-item-icon" />
        <span className="sidebar-pro-link-label">{item.label || item.shortLabel}</span>
        {formatNavNotificationCount(item.notificationCount) ? (
          <span className="nav-item-badge-count" aria-label={`${item.notificationCount} pendientes`}>
            {formatNavNotificationCount(item.notificationCount)}
          </span>
        ) : null}
      </a>
    );
  }

  function renderUtilityNavLink(group, item) {
    const Icon = item.icon;
    const isAuditHistory = item.id === "auditHistory";
    const isAuditCapture = item.id === PAGE_PROCESS_AUDITS;
    const isAuditDashboard = item.id === "auditDashboard";
    const isGlobalDashboard = item.id === PAGE_GLOBAL_DASHBOARD;
    const isAdminGroup = group.label === "Admin";
    const nextAreaId = isAdminGroup ? "admin" : "all";
    const hrefPageId = isGlobalDashboard
      ? PAGE_DASHBOARD
      : ((isAuditHistory || isAuditDashboard) ? PAGE_PROCESS_AUDITS : item.id);
    const itemActive = resolveUtilityItemActive(
      item,
      group.label,
      page,
      selectedAreaSectionId,
      navAuditTab,
    );

    return (
      <a
        key={item.id}
        className={`sidebar-pro-link ${itemActive ? "is-active" : ""}`}
        href={getPageHref(hrefPageId, nextAreaId)}
        title={item.label}
        aria-label={item.label}
        onClick={(event) => {
          event.preventDefault();
          if (isGlobalDashboard) {
            onPageChange(PAGE_DASHBOARD, "admin");
          } else if (isAuditHistory) {
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
        <span className="sidebar-pro-link-label">{item.label || item.shortLabel}</span>
      </a>
    );
  }

  return (
    <aside className={`sidebar-shell sidebar-pro ui-surface-dark ${isOpen ? "open" : ""} ${isCollapsed && !isOpen ? "collapsed" : ""}`}>
      <div className="sidebar-mobile-actions">
        <button type="button" className="sidebar-close-button" onClick={onClose} aria-label="Cerrar menú">
          <X size={18} />
        </button>
      </div>

      <div className="sidebar-v3-header">
        <div className="brand-block">
          <CopmecBrand headingTag="h1" compact={isCollapsed} showKicker={false} />
        </div>
        <div className="sidebar-v3-header-tools">
          {!isCollapsed ? (
            searchOpen || navSearch ? (
              <div className="sidebar-v3-search-inline" role="search">
                <Search size={14} className="sidebar-v3-search-icon" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  className="sidebar-v3-search-input"
                  value={navSearch}
                  onChange={(event) => setNavSearch(event.target.value)}
                  placeholder="Buscar..."
                  aria-label="Buscar en el menú"
                  onBlur={() => {
                    if (!navSearch.trim()) setSearchOpen(false);
                  }}
                />
                <button
                  type="button"
                  className="sidebar-v3-icon-btn"
                  aria-label={navSearch ? "Limpiar búsqueda" : "Cerrar búsqueda"}
                  onClick={() => {
                    if (navSearch) {
                      setNavSearch("");
                      globalThis.setTimeout(() => searchInputRef.current?.focus?.(), 0);
                    } else {
                      setSearchOpen(false);
                    }
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="sidebar-v3-icon-btn"
                onClick={() => setSearchOpen(true)}
                aria-label="Abrir búsqueda"
                title="Buscar"
              >
                <Search size={15} aria-hidden="true" />
              </button>
            )
          ) : null}
          <button type="button" className="sidebar-v3-icon-btn sidebar-collapse-button" onClick={onToggleCollapsed} aria-label={isCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"} title={isCollapsed ? "Expandir menú" : "Contraer menú"}>
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
      </div>

      <nav className="sidebar-nav sidebar-pro-nav" aria-label="Navegación principal">
        <div className="sidebar-pro-rail" aria-label="Accesos rápidos por área">
          {sortedAreaSections.map((section) => {
            const activeInSection = isSelectedAreaSection(section, selectedAreaSectionId);
            const isFocused = focusedAreaId === section.id;
            return (
              <button
                key={`rail-${section.id}`}
                type="button"
                className={`sidebar-pro-rail-btn ${isFocused ? "is-active" : ""} ${activeInSection ? "is-route" : ""}`.trim()}
                title={section.label}
                aria-label={section.label}
                onClick={() => {
                  handleAreaChipClick(section);
                  if (isCollapsed) onToggleCollapsed?.();
                }}
              >
                <SidebarIcon icon={getSidebarSectionIcon(section.id)} />
              </button>
            );
          })}
          {utilityGroups.map((group) => {
            const activeInGroup = isSelectedUtilityGroup(group, page, selectedAreaSectionId, navAuditTab);
            return (
              <button
                key={`rail-util-${group.label}`}
                type="button"
                className={`sidebar-pro-rail-btn ${activeInGroup ? "is-active is-route" : ""}`.trim()}
                title={group.label}
                aria-label={group.label}
                onClick={() => {
                  if (isCollapsed) onToggleCollapsed?.();
                }}
              >
                <SidebarIcon icon={getSidebarSectionIcon(group.label)} />
              </button>
            );
          })}
        </div>

        {normalizedNavSearch ? (
          <div className="sidebar-pro-search-results">
            {filteredAreaSections.length === 0 && filteredUtilityGroups.length === 0 ? (
              <p className="sidebar-pro-empty">Sin resultados para “{navSearch.trim()}”.</p>
            ) : null}
            {filteredAreaSections.map((section) => (
              <div key={`search-area-${section.id}`} className="sidebar-pro-search-group">
                <span className="sidebar-pro-search-group-label">{section.label}</span>
                {section.items.map((item, index) => renderAreaNavLink(section, item, index))}
              </div>
            ))}
            {filteredUtilityGroups.map((group) => (
              <div key={`search-util-${group.label}`} className="sidebar-pro-search-group">
                <span className="sidebar-pro-search-group-label">{group.label}</span>
                {group.items.map((item) => renderUtilityNavLink(group, item))}
              </div>
            ))}
          </div>
        ) : (
          <div className="sidebar-pro-split">
            <div className="sidebar-pro-areas" role="listbox" aria-label="Áreas operativas">
              {sortedAreaSections.map((section) => {
                const activeInSection = isSelectedAreaSection(section, selectedAreaSectionId);
                const isFocused = focusedAreaId === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    role="option"
                    aria-selected={isFocused}
                    className={`sidebar-pro-area-btn ${isFocused ? "is-active" : ""} ${activeInSection ? "is-route" : ""}`.trim()}
                    onClick={() => handleAreaChipClick(section)}
                    title={section.label}
                  >
                    <SidebarIcon icon={getSidebarSectionIcon(section.id)} />
                    <span className="sidebar-pro-area-label">{section.label}</span>
                    {formatNavNotificationCount(section.sectionNotificationCount) ? (
                      <span className="sidebar-pro-area-badge" aria-label={`${section.sectionNotificationCount} pendientes`}>
                        {formatNavNotificationCount(section.sectionNotificationCount)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="sidebar-pro-detail">
              {focusedSection ? (
                <>
                  <p className="sidebar-pro-detail-title">{focusedSection.label}</p>
                  <div className="sidebar-pro-links">
                    {focusedSection.items.length
                      ? focusedSection.items.map((item, index) => renderAreaNavLink(focusedSection, item, index))
                      : <p className="sidebar-pro-empty">Sin módulos visibles.</p>}
                  </div>
                </>
              ) : null}

              {utilityGroups.length ? (
                <div className="sidebar-pro-system">
                  <button
                    type="button"
                    className="sidebar-pro-system-toggle"
                    onClick={() => setSystemOpen((current) => !current)}
                    aria-expanded={systemOpen}
                  >
                    <span>Sistema</span>
                    {systemOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  {systemOpen ? (
                    <div className="sidebar-pro-system-body">
                      {utilityGroups.map((group) => (
                        <div key={group.label} className="sidebar-pro-system-group">
                          <span className="sidebar-pro-system-group-name">{group.label}</span>
                          <div className="sidebar-pro-links">
                            {group.items.map((item) => renderUtilityNavLink(group, item))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}
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
