import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CircleCheckBig,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  Gauge,
  LayoutDashboard,
  Menu,
  OctagonAlert,
  Package,
  Pause,
  PauseCircle,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  PieChart,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Square,
  Trash2,
  Type,
  Upload,
  Eye,
  EyeOff,
  X,
  Users,
  Zap,
} from "lucide-react";
import { Modal } from "./components/Modal";
import { BoardBuilderModal, BoardComponentStudioModal } from "./components/ModalesConstructorTableros";
import GestionInventario from "./paginas/GestionInventario";
import GestionTransporte from "./paginas/GestionTransporte";
import GestionIncidencias from "./paginas/GestionIncidencias";
import GestionUsuarios from "./paginas/GestionUsuarios";
import HistorialSemanas from "./paginas/HistorialSemanas";
import AuditoriasProcesos from "./paginas/AuditoriasProcesosCompact";
import MisTableros from "./paginas/MisTableros";
import ConfiguracionSistema from "./paginas/ConfiguracionSistema";
import PaginaNoEncontrada from "./paginas/PaginaNoEncontrada";
import PanelIndicadores from "./paginas/PanelIndicadores";
import DashboardBuilder from "./paginas/DashboardBuilder";
import TablerosCreados from "./paginas/TablerosCreados";
import BibliotecaPage from "./paginas/BibliotecaPage";
import CopmecAIWidget from "./components/CopmecAIWidget";
import "./App.css";


// â”€â”€ Modulos extraidos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import {

  StatusBadge, MetricCard, InventoryStockBar, DashboardKpiCard, DashboardBarRow,

  DashboardRankItem, DashboardProgressMetric, DashboardParetoRow, DashboardCauseCard,

  DashboardSection, DashboardPieChart, DashboardColumnChart, DashboardLineChart,

  DashboardParetoChart, DashboardIshikawaDiagram, CopmecBrand, StatTile,

} from "./components/ComponentesDashboard";

import { LoginScreen, BootstrapLeadSetup } from "./components/ComponentesAutenticacion";

import { Sidebar, InventoryActivityConsumptionEditor } from "./components/BarraLateral";

import {

  EmployeeProfileSummarySection,

  EmployeeProfileDetailsSection,

  EmployeeProfilePasswordSection,

  EmployeeProfileMessages,

  EmployeeProfileModal,

  ForcedPasswordChangeModal,

} from "./components/PerfilEmpleado";

import {

  EXCEL_FUNCTION_DESCRIPTIONS,

  FORMULA_MEMORY_LS_KEY,

  loadFormulasMemory,

  saveFormulaToMemory,

} from "./utils/utilidadesFormulas.js";

import {

  getExcelJsModule,

  parseBoardStructureImportFile,

} from "./utils/utilidadesImportExcel.js";
import { normalizeOperationalInspectionTemplate } from "./utils/operationalInspectionTemplate";

// â”€â”€ Constantes globales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import {

  STORAGE_KEY, SIDEBAR_COLLAPSED_KEY, ACTIVE_PAGE_KEY, DASHBOARD_SECTIONS_KEY,

  NOTIFICATION_READ_KEY, NOTIFICATION_DELETED_KEY, NOTIFICATION_INBOX_KEY,

  EMPTY_OBJECT, BOOTSTRAP_MASTER_ID, MASTER_USERNAME, API_BASE_URL,

  ENABLE_LEGACY_WHOLE_STATE_SYNC,

  PAGE_BOARD, PAGE_CUSTOM_BOARDS, PAGE_ADMIN, PAGE_DASHBOARD, PAGE_DASHBOARD_BUILDER, PAGE_HISTORY, PAGE_PROCESS_AUDITS,

  PAGE_INVENTORY, PAGE_USERS, PAGE_BIBLIOTECA, PAGE_INCIDENCIAS, PAGE_NOT_FOUND,
  PAGE_TRANSPORT,
  PAGE_SYSTEM_SETTINGS,

  PAGE_ROUTE_SLUGS, PAGE_ROUTE_ALIASES, EMPTY_LOGIN_DIRECTORY,

  ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR,

  STATUS_PENDING, STATUS_RUNNING, STATUS_PAUSED, STATUS_FINISHED,

  INVENTORY_DOMAIN_BASE, INVENTORY_DOMAIN_CLEANING, INVENTORY_DOMAIN_ORDERS, INVENTORY_DOMAIN_MAINTENANCE, INVENTORY_DOMAIN_DESTINATIONS,

  INVENTORY_MOVEMENT_RESTOCK, INVENTORY_MOVEMENT_CONSUME, INVENTORY_MOVEMENT_TRANSFER,

  CONTROL_STATUS_OPTIONS, USER_ROLES, PERMISSION_SCHEMA_VERSION, ROLE_LEVEL,

  TEMPORARY_PASSWORD_MIN_LENGTH, PROFILE_SELF_EDIT_LIMIT,

  DEFAULT_AREA_OPTIONS, DEFAULT_BOARD_SECTION_OPTIONS,

  INVENTORY_LOOKUP_LOGISTICS_FIELD, BOARD_ACTIVITY_LIST_FIELD,

  DEFAULT_JOB_TITLE_BY_ROLE, DASHBOARD_CHART_PALETTE, DEFAULT_DASHBOARD_SECTION_STATE,

  DEFAULT_ADMIN_TAB, ACTIVITY_FREQUENCY_OPTIONS, ACTIVITY_FREQUENCY_LABELS,

  ACTIVITY_FREQUENCY_DAY_OFFSETS,

  BOARD_FIELD_TYPES, BOARD_FIELD_TYPE_DETAILS, BOARD_FIELD_WIDTHS,

  COLOR_RULE_OPERATORS, BOARD_FIELD_WIDTH_STYLES, BOARD_FIELD_MIN_WIDTH_BY_TYPE,

  DEFAULT_BOARD_AUX_COLUMNS_ORDER, BOARD_AUX_COLUMN_DEFINITIONS, BOARD_AUX_COLUMN_IDS,

  BOARD_TEMPLATES, FORMULA_OPERATIONS, OPTION_SOURCE_TYPES, INVENTORY_PROPERTIES,

  INVENTORY_IMPORT_FIELD_ALIASES, INVENTORY_DOMAIN_OPTIONS, INVENTORY_MOVEMENT_OPTIONS,

  CLEANING_SITE_OPTIONS, DEFAULT_CLEANING_SITE,

  BOARD_OPERATIONAL_CONTEXT_NONE, BOARD_OPERATIONAL_CONTEXT_CLEANING_SITE,

  BOARD_OPERATIONAL_CONTEXT_CUSTOM, BOARD_OPERATIONAL_CONTEXT_OPTIONS,

  NAV_ITEMS, ACTION_DEFINITIONS, BOARD_PERMISSION_ACTION_IDS, BOARD_PERMISSION_ACTIONS,

  getScopedAreaActionPermissionId,

  PAGE_ACTION_GROUPS, PERMISSION_PRESETS, RESPONSIBLE_VISUALS,

  ALL_PAGES, ALL_ACTION_IDS, ROLE_PERMISSION_MATRIX, KPI_STYLES,

} from "./utils/constantes.js";

// â”€â”€ Utilidades puras â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import {

  getInitialRouteState,

  getNormalizedBoardColumnOrder,

  sortBoardFieldsByColumnOrder,

  syncBoardFieldOrderIntoColumnOrder,

  reorderBoardColumnOrderTokens,

  getOrderedBoardColumns,

  normalizeInventoryDomain,

  inventoryDomainUsesPresentation,

  inventoryDomainUsesPackagingMetrics,

  getInventoryPresentationLabel,

  getInventoryPresentationPlaceholder,

  getInventoryUnitPlaceholder,

  getInventoryStoragePlaceholder,

  getInventoryEntityLabel,

  normalizeCleaningSite,

  normalizeBoardOperationalContextValue,

  normalizeInventoryItemRecord,

  normalizeInventoryMovementRecord,
  normalizeInventoryTransferTargetRecord,

  findInventoryTransferTarget,

  hasInventoryBalanceInput,

  getInventoryAllocatedUnits,

  getInventoryAvailableToTransfer,

  getComparableDateMs,

  getInventorySavedStorageLocations,

  getInventorySavedTransferDestinations,

  getInventoryDefaultTransferDestination,

  formatInventoryTransferDestinationLabel,

  getInventoryDeleteActionId,

  getInventoryManageActionId,

  getInventoryImportActionId,

  createInventoryModalState,

  createInventoryMovementModalState,

  createInventoryDestinationModalState,

  createInventoryTransferConfirmModalState,

  readNotificationReadState,

  readNotificationDeletedState,

  readNotificationInboxState,

  createInventoryRestockModalState,

  inferFeedbackToneFromMessage,

  normalizePermissions,

  normalizeBoardPermissions,

  buildPermissionsFromPreset,

  buildAuditEntry,

  appendAuditLog,

  makeId,

  SESSION_STORAGE_KEY,

  setSessionExpiredHandler,

  clearSessionExpiredHandler,

  requestJson,

  isSessionRequiredError,

  applyRemoteWarehouseState,

  createWarehouseEventSource,

  buildLoginDirectoryFromState,

  buildRouteQuery,

  buildRoutePath,

  normalizeAdminTab,

  normalizeActivityFrequency,

  getActivityFrequencyLabel,

  normalizeCatalogScheduledDays,

  normalizeCatalogCleaningSites,

  normalizeCatalogArea,

  normalizeCatalogScheduledDaysBySite,

  buildWeekActivitiesFromCatalogItem,

  isStrongPassword,

  isTemporaryPassword,

  withDefaultBoardSettings,

  getDashboardPeriodTypeLabel,

  getDashboardPeriodRange,

  getDashboardPeriodKey,

  formatDashboardPeriodLabel,

  getDashboardFilterStartDate,

  getDashboardFilterEndDate,

  formatDate,

  formatTime,

  formatDateTime,

  formatDurationClock,

  formatMinutes,

  formatPercent,

  formatMetricNumber,

  getAuditPeriodMs,

  normalizeKey,

  buildUniquePlayerAccess,

  getIshikawaCategory,

  getFieldColorRule,

  formatInventoryLookupLabel,

  resolveInventoryPropertySourceFieldId,

  resolveInventoryPropertyValue,

  getBoardFieldDisplayType,

  buildInventoryBundleFields,

  buildUpdatedDraftColumns,

  createEmptyFieldDraft,

  createEmptyBoardDraft,

  createBoardDraftFromBoard,

  buildDraftPreviewBoard,

  buildTemplatePreviewBoard,

  formatBoardPreviewValue,

  getBoardFieldTypeDescription,

  renderBoardFieldLabel,

  getHeaderEyebrowText,

  buildTemplateColumns,

  getBoardTemplateCategory,

  isBoardFieldValueFilled,

  getBoardSectionGroups,

  mapColumnToFieldDraft,

  triggerBrowserDownload,

  parseInventoryImportFile,

  buildImportedBoardRowValuesPatch,

  buildBoardSavePayload,

  formatBoardExportFieldValue,

  downloadInventoryTemplateFile,

  formatBoardRowAssigneeLabel,

  getResponsibleVisual,

  getRoleBadgeClass,

  normalizeRole,

  canCreateRole,

  supportsManagedPermissionOverrides,

  createUserModalState,

  getManagedUserIds,

  normalizeAreaOption,

  splitAreaAndSubArea,

  joinAreaAndSubArea,

  getAreaRoot,

  normalizeBoardVisibilityType,

  normalizeBoardSharedDepartments,

  normalizeBoardAccessUserIds,

  getNormalizedBoardVisibility,

  getBoardAssignmentSummary,

  buildAreaCatalog,

  getUserArea,

  getUserJobTitle,

  normalizeUserRecord,

  canBypassSelfProfileEditLimit,

  canViewUserByAreaScope,

  canAccessPage,

  canDoAction,

  canUserAccessTemplate,

  canEditBoard,

  getBoardVisibleToUser,

  canDoBoardAction,

  canEditBoardRowRecord,

  canOperateBoardRowRecord,

  buildSelectOptions,

  getActivityLabel,

  getTimeLimitMinutes,

  getElapsedSeconds,

  getLivePauseOverflowSeconds,

  getOperationalElapsedSeconds,

  getNormalizedFormulaTerms,

  evaluateFormulaFieldValue,

  normalizeWarehouseState,

  loadState,

  updateElapsedForFinish,

  mergeInventoryColumnsWithSystem,

} from "./utils/utilidades.jsx";

// â”€â”€ Componentes menores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { AppToastStack, AppNotificationCenter } from "./components/Notificaciones.jsx";

import { InventoryLookupInput } from "./components/BuscadorInventario.jsx";
import { io } from "socket.io-client";
import ChatPro from "./components/ChatPro.jsx";
import { AlertModalProvider } from "./components/AlertModal.jsx";
import { initNotificationService, showTransportNotification, showTransportNotificationForNewRecord, showTransportNotificationForAssignment, showTransportNotificationForStatusUpdate } from "./services/notification.service.js";



const INITIAL_ROUTE_STATE = getInitialRouteState();
const HIDDEN_BASE_TEMPLATES_KEY = "copmec-hidden-base-templates";
const UI_THEME_KEY = "copmec-ui-theme";
const UI_FONT_KEY = "copmec-ui-font";
const UI_FONT_SIZE_KEY = "copmec-ui-font-size";
const getUserUiThemeKey = (userId) => `${UI_THEME_KEY}:${String(userId || "anon")}`;
const getUserUiFontKey = (userId) => `${UI_FONT_KEY}:${String(userId || "anon")}`;
const getUserUiFontSizeKey = (userId) => `${UI_FONT_SIZE_KEY}:${String(userId || "anon")}`;
const UI_THEME_OPTIONS = [
  { id: "copmec-bosque", label: "Acero AXO", icon: Palette, primary: "#385878", shell: "#22384f" },
  { id: "copmec-arenisca", label: "Arenisca", icon: Palette, primary: "#6a5a3f", shell: "#3f3526" },
  { id: "copmec-noche", label: "Grafito", icon: Palette, primary: "#2f3642", shell: "#1f242d" },
  { id: "copmec-oceano", label: "Oceano", icon: Palette, primary: "#0f4c5c", shell: "#083742" },
  { id: "copmec-cobre", label: "Cobre", icon: Palette, primary: "#8a4f2d", shell: "#5e341c" },
  { id: "copmec-vino", label: "Vino", icon: Palette, primary: "#7d2245", shell: "#551731" },
  { id: "copmec-ceniza", label: "Ceniza", icon: Palette, primary: "#3f4654", shell: "#2b303b" },
  { id: "copmec-indigo", label: "Indigo", icon: Palette, primary: "#2f3f87", shell: "#202c5f" },
  { id: "copmec-oliva", label: "Oliva", icon: Palette, primary: "#314658", shell: "#212f3c" },
  { id: "copmec-coral", label: "Coral", icon: Palette, primary: "#b44b46", shell: "#7f2f2b" },
  { id: "copmec-menta", label: "Menta", icon: Palette, primary: "#36546f", shell: "#263b4d" },
  { id: "copmec-solar", label: "Solar", icon: Palette, primary: "#b37a18", shell: "#7e5411" },
  { id: "copmec-ciruela", label: "Ciruela", icon: Palette, primary: "#6b2f6f", shell: "#48204b" },
  { id: "copmec-petroleo", label: "Petroleo", icon: Palette, primary: "#245964", shell: "#173b42" },
  { id: "copmec-aurora", label: "Aurora", icon: Palette, primary: "#2c7a7b", shell: "#553c9a" },
  { id: "copmec-atardecer", label: "Atardecer", icon: Palette, primary: "#f97316", shell: "#be185d" },
  { id: "copmec-laguna", label: "Laguna", icon: Palette, primary: "#0ea5e9", shell: "#405db0" },
  { id: "copmec-flama", label: "Flama", icon: Palette, primary: "#f59e0b", shell: "#ef4444" },
  { id: "copmec-neon", label: "Neon", icon: Palette, primary: "#5f8fbe", shell: "#0ea5e9" },
  { id: "copmec-berry", label: "Berry", icon: Palette, primary: "#e11d48", shell: "#7c3aed" },
];
const UI_FONT_OPTIONS = [
  { id: "bahnschrift", label: "Bahnschrift", icon: Type, family: '"Bahnschrift", "Segoe UI", sans-serif' },
  { id: "trebuchet", label: "Trebuchet", icon: Type, family: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: "serif", label: "Serif Clasica", icon: Type, family: '"Book Antiqua", "Cambria", serif' },
  { id: "mono", label: "Mono Tecnica", icon: Type, family: '"Consolas", "Cascadia Mono", monospace' },
  { id: "segoe", label: "Segoe Moderna", icon: Type, family: '"Segoe UI", "Franklin Gothic Medium", sans-serif' },
  { id: "georgia", label: "Georgia Editorial", icon: Type, family: '"Georgia", "Times New Roman", serif' },
  { id: "candara", label: "Candara Humana", icon: Type, family: '"Candara", "Gill Sans MT", sans-serif' },
  { id: "tahoma", label: "Tahoma Compacta", icon: Type, family: '"Tahoma", "Verdana", sans-serif' },
  { id: "palatino", label: "Palatino Elegante", icon: Type, family: '"Palatino Linotype", "Book Antiqua", serif' },
  { id: "verdana", label: "Verdana Clara", icon: Type, family: '"Verdana", "Segoe UI", sans-serif' },
  { id: "calibri", label: "Calibri Fluida", icon: Type, family: '"Calibri", "Segoe UI", sans-serif' },
  { id: "corbel", label: "Corbel Pro", icon: Type, family: '"Corbel", "Candara", sans-serif' },
  { id: "garamond", label: "Garamond", icon: Type, family: '"Garamond", "Times New Roman", serif' },
  { id: "century", label: "Century Gothic", icon: Type, family: '"Century Gothic", "Trebuchet MS", sans-serif' },
  { id: "lucida", label: "Lucida Sans", icon: Type, family: '"Lucida Sans Unicode", "Lucida Grande", sans-serif' },
  { id: "arialn", label: "Arial Narrow", icon: Type, family: '"Arial Narrow", "Arial", sans-serif' },
  { id: "cambria", label: "Cambria", icon: Type, family: '"Cambria", "Georgia", serif' },
  { id: "franklin", label: "Franklin", icon: Type, family: '"Franklin Gothic Medium", "Arial", sans-serif' },
  { id: "bookman", label: "Bookman", icon: Type, family: '"Bookman Old Style", "Garamond", serif' },
  { id: "gill", label: "Gill Sans", icon: Type, family: '"Gill Sans MT", "Trebuchet MS", sans-serif' },
  { id: "optima", label: "Optima", icon: Type, family: '"Optima", "Segoe UI", sans-serif' },
  { id: "constantia", label: "Constantia", icon: Type, family: '"Constantia", "Cambria", serif' },
  { id: "rockwell", label: "Rockwell", icon: Type, family: '"Rockwell", "Georgia", serif' },
  { id: "futura", label: "Futura", icon: Type, family: '"Futura", "Century Gothic", sans-serif' },
];
const UI_FONT_SIZE_OPTIONS = [
  { id: "compacta", label: "Compacta", scale: 0.94 },
  { id: "normal", label: "Normal", scale: 1 },
  { id: "grande", label: "Grande", scale: 1.08 },
  { id: "gigante", label: "Gigante", scale: 1.16 },
];
const CATALOG_WEEKDAY_OPTIONS = [
  { value: 0, short: "L", label: "Lunes" },
  { value: 1, short: "M", label: "Martes" },
  { value: 2, short: "M", label: "Miercoles" },
  { value: 3, short: "J", label: "Jueves" },
  { value: 4, short: "V", label: "Viernes" },
  { value: 5, short: "S", label: "Sabado" },
];

function serializeCatalogScheduledDaysBySite(value) {
  const normalized = normalizeCatalogScheduledDaysBySite(value, []);
  const entries = Object.entries(normalized)
    .map(([site, days]) => `${site}:${days.join(";")}`)
    .filter((entry) => entry.endsWith(":") === false);
  return entries.join("|");
}

function parseCatalogScheduledDaysBySite(value, fallbackDays = []) {
  const raw = String(value || "").trim();
  if (!raw) return {};
  const parsed = raw
    .split("|")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const [rawSite, rawDays = ""] = entry.split(":");
      const site = String(rawSite || "").trim().toUpperCase();
      if (!site) return accumulator;
      const dayValues = rawDays
        .split(/[;|,\s]+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => {
          const normalized = token.toLowerCase();
          if (normalized === "l" || normalized === "lun" || normalized === "lunes") return 0;
          if (normalized === "m" || normalized === "mar" || normalized === "martes") return 1;
          if (normalized === "x" || normalized === "mie" || normalized === "miércoles" || normalized === "miercoles") return 2;
          if (normalized === "j" || normalized === "jue" || normalized === "jueves") return 3;
          if (normalized === "v" || normalized === "vie" || normalized === "viernes") return 4;
          if (normalized === "s" || normalized === "sab" || normalized === "sábado" || normalized === "sabado") return 5;
          if (normalized === "d" || normalized === "dom" || normalized === "domingo") return 6;
          const numeric = Number(normalized);
          return Number.isFinite(numeric) ? numeric : null;
        })
        .filter((entryDay) => entryDay !== null);
      accumulator[site] = dayValues;
      return accumulator;
    }, {});
  return normalizeCatalogScheduledDaysBySite(parsed, fallbackDays);
}

function createEmptyCatalogModalState() {
  return {
    open: false,
    mode: "create",
    id: null,
    name: "",
    limit: "",
    mandatory: "true",
    frequency: "weekly",
    category: "General",
    area: "General",
    scheduledDays: [0, 1, 2, 3, 4, 5],
    scheduledDaysBySite: {},
    cleaningSites: [],
    siteMode: "general",
    submitting: false,
  };
}

const HORIZONTAL_SCROLL_CONTAINER_SELECTORS = [
  ".table-wrap",
  ".board-table-wrap",
  ".custom-board-table-wrap",
  ".board-preview-table-wrap",
  ".dashboard-table-wrap",
  ".smart-grid-table-wrap",
];

const HORIZONTAL_SCROLL_INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a",
  "label",
  "[role='button']",
  "[contenteditable='true']",
  "[contenteditable='']",
].join(",");

function setupGlobalHorizontalScrollEnhancements() {
  if (typeof document === "undefined") {
    return () => {};
  }

  const selector = HORIZONTAL_SCROLL_CONTAINER_SELECTORS.join(",");
  const bindings = new Map();
  let scanRafId = 0;

  const clearDragState = (binding) => {
    if (!binding?.isDragging) return;
    binding.isDragging = false;
    binding.container.classList.remove("is-horizontal-dragging");
    document.body.classList.remove("horizontal-dragging-active");
    window.removeEventListener("mousemove", binding.handleDragMove, { passive: false });
    window.removeEventListener("mouseup", binding.handleDragEnd);
    window.removeEventListener("mouseleave", binding.handleDragEnd);
  };

  const enhanceContainer = (container) => {
    if (!container || bindings.has(container)) return;

    const topScrollbar = document.createElement("div");
    topScrollbar.className = "table-scroll-top";
    topScrollbar.setAttribute("aria-hidden", "true");

    const topScrollbarTrack = document.createElement("div");
    topScrollbarTrack.className = "table-scroll-top-track";
    topScrollbar.appendChild(topScrollbarTrack);

    container.parentNode?.insertBefore(topScrollbar, container);

    const binding = {
      container,
      topScrollbar,
      topScrollbarTrack,
      isDragging: false,
      dragStartX: 0,
      dragStartScrollLeft: 0,
      syncingSource: "",
      resizeObserver: null,
      handleContainerScroll: null,
      handleTopScroll: null,
      handleMouseDown: null,
      handleDragMove: null,
      handleDragEnd: null,
      updateMetrics: null,
    };

    binding.updateMetrics = () => {
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      topScrollbarTrack.style.width = `${container.scrollWidth}px`;
      topScrollbar.style.display = maxScroll > 0 ? "block" : "none";
      if (Math.abs(topScrollbar.scrollLeft - container.scrollLeft) > 1) {
        topScrollbar.scrollLeft = container.scrollLeft;
      }
      container.classList.toggle("is-horizontal-draggable", maxScroll > 0);
    };

    binding.handleContainerScroll = () => {
      if (binding.syncingSource === "top") return;
      binding.syncingSource = "container";
      topScrollbar.scrollLeft = container.scrollLeft;
      binding.syncingSource = "";
    };

    binding.handleTopScroll = () => {
      if (binding.syncingSource === "container") return;
      binding.syncingSource = "top";
      container.scrollLeft = topScrollbar.scrollLeft;
      binding.syncingSource = "";
    };

    binding.handleDragMove = (event) => {
      if (!binding.isDragging) return;
      event.preventDefault();
      const deltaX = event.clientX - binding.dragStartX;
      container.scrollLeft = binding.dragStartScrollLeft - deltaX;
    };

    binding.handleDragEnd = () => {
      clearDragState(binding);
    };

    binding.handleMouseDown = (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest(HORIZONTAL_SCROLL_INTERACTIVE_SELECTOR)) return;
      if (container.scrollWidth <= container.clientWidth) return;

      binding.isDragging = true;
      binding.dragStartX = event.clientX;
      binding.dragStartScrollLeft = container.scrollLeft;
      container.classList.add("is-horizontal-dragging");
      document.body.classList.add("horizontal-dragging-active");
      window.addEventListener("mousemove", binding.handleDragMove, { passive: false });
      window.addEventListener("mouseup", binding.handleDragEnd);
      window.addEventListener("mouseleave", binding.handleDragEnd);
    };

    container.addEventListener("scroll", binding.handleContainerScroll, { passive: true });
    topScrollbar.addEventListener("scroll", binding.handleTopScroll, { passive: true });
    container.addEventListener("mousedown", binding.handleMouseDown);

    if (typeof ResizeObserver !== "undefined") {
      binding.resizeObserver = new ResizeObserver(() => binding.updateMetrics());
      binding.resizeObserver.observe(container);
      const tableElement = container.querySelector("table");
      if (tableElement) {
        binding.resizeObserver.observe(tableElement);
      }
    }

    bindings.set(container, binding);
    binding.updateMetrics();
  };

  const cleanupMissingContainers = () => {
    Array.from(bindings.entries()).forEach(([container, binding]) => {
      if (document.contains(container)) return;
      clearDragState(binding);
      binding.resizeObserver?.disconnect();
      container.removeEventListener("scroll", binding.handleContainerScroll);
      container.removeEventListener("mousedown", binding.handleMouseDown);
      binding.topScrollbar.removeEventListener("scroll", binding.handleTopScroll);
      binding.topScrollbar.remove();
      bindings.delete(container);
    });
  };

  const scan = () => {
    document.querySelectorAll(selector).forEach((container) => enhanceContainer(container));
    cleanupMissingContainers();
  };

  const scheduleScan = () => {
    if (scanRafId) return;
    scanRafId = window.requestAnimationFrame(() => {
      scanRafId = 0;
      scan();
    });
  };

  const mutationObserver = new MutationObserver(() => scheduleScan());
  mutationObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", scheduleScan);

  scan();

  return () => {
    if (scanRafId) {
      window.cancelAnimationFrame(scanRafId);
      scanRafId = 0;
    }
    mutationObserver.disconnect();
    window.removeEventListener("resize", scheduleScan);
    Array.from(bindings.values()).forEach((binding) => {
      clearDragState(binding);
      binding.resizeObserver?.disconnect();
      binding.container.removeEventListener("scroll", binding.handleContainerScroll);
      binding.container.removeEventListener("mousedown", binding.handleMouseDown);
      binding.topScrollbar.removeEventListener("scroll", binding.handleTopScroll);
      binding.topScrollbar.remove();
      binding.container.classList.remove("is-horizontal-draggable");
    });
    bindings.clear();
    document.body.classList.remove("horizontal-dragging-active");
  };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = globalThis.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function uint8ArrayEquals(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

const APP_AREA_SECTIONS = [
  { id: "esto", label: "ESTO", scopes: ["ESTO"] },
  { id: "transporte", label: "TRANSPORTE", scopes: ["TRANSPORTE"] },
  { id: "limpieza", label: "LIMPIEZA", scopes: ["LIMPIEZA"] },
  { id: "regulatorio", label: "REGULATORIO", scopes: ["REGULATORIO"] },
  { id: "calidad", label: "CALIDAD", scopes: ["CALIDAD"] },
  { id: "inventario", label: "INVENTARIO", scopes: ["INVENTARIO"] },
  { id: "recepcion-pedidos", label: "RECEPCION DE PEDIDOS", scopes: ["RECEPCION DE PEDIDOS"] },
  { id: "operaciones", label: "OPERACIONES", scopes: ["OPERACIONES"] },
  { id: "mantenimiento", label: "MANTENIMIENTO", scopes: ["MANTENIMIENTO"] },
  { id: "mejora-continua", label: "MEJORA CONTINUA", scopes: ["MEJORA CONTINUA"] },
  { id: "mayoreo-comercio", label: "MAYOREO / ECOMMERCE / PEDIDOS DETAL", scopes: ["MAYOREO-TELEMARKETING", "ECOMMERCE", "PEDIDOS DETAL"] },
  { id: "retail", label: "RETAIL", scopes: ["RETAIL"] },
  { id: "fullfilment", label: "FULLFILMENT", scopes: ["FULLFILMENT"] },
];

const NAV_AREA_ACTION_BY_SECTION = {
  "esto": "accessNavEsto",
  "transporte": "accessNavTransporte",
  "limpieza": "accessNavLimpieza",
  "regulatorio": "accessNavRegulatorio",
  "calidad": "accessNavCalidad",
  "inventario": "accessNavInventario",
  "recepcion-pedidos": "accessNavRecepcion",
  "operaciones": "accessNavOperaciones",
  "mantenimiento": "accessNavMantenimiento",
  "mayoreo-comercio": "accessNavMayoreo",
  "retail": "accessNavRetail",
  "fullfilment": "accessNavFullfilment",
  "mejora-continua": "accessNavMejoraContinua",
};

const NAV_UTILITY_ACTION_BY_GROUP = {
  "Mejora continua": "accessNavMejoraContinua",
  "Producción": "accessNavProduccion",
  "Recursos": "accessNavRecursos",
  "Admin": "accessNavEquipo",
};

const AREA_TAB_PERMISSION_ACTIONS = {
  "esto": {
    dashboard: "scopeEstoDashboard",
    board: "scopeEstoBoardBuilder",
    customBoards: "scopeEstoMyBoards",
    history: "scopeEstoHistory",
  },
  "limpieza": {
    dashboard: "scopeLimpiezaDashboard",
    board: "scopeLimpiezaBoardBuilder",
    customBoards: "scopeLimpiezaMyBoards",
    history: "scopeLimpiezaHistory",
  },
  "regulatorio": {
    dashboard: "scopeRegulatorioDashboard",
    board: "scopeRegulatorioBoardBuilder",
    customBoards: "scopeRegulatorioMyBoards",
    history: "scopeRegulatorioHistory",
  },
  "calidad": {
    dashboard: "scopeCalidadDashboard",
    board: "scopeCalidadBoardBuilder",
    customBoards: "scopeCalidadMyBoards",
    history: "scopeCalidadHistory",
  },
  "inventario": {
    dashboard: "scopeInventarioDashboard",
    board: "scopeInventarioBoardBuilder",
    customBoards: "scopeInventarioMyBoards",
    history: "scopeInventarioHistory",
  },
  "recepcion-pedidos": {
    dashboard: "scopeRecepcionDashboard",
    board: "scopeRecepcionBoardBuilder",
    customBoards: "scopeRecepcionMyBoards",
    history: "scopeRecepcionHistory",
  },
  "operaciones": {
    dashboard: "scopeOperacionesDashboard",
    board: "scopeOperacionesBoardBuilder",
    customBoards: "scopeOperacionesMyBoards",
    history: "scopeOperacionesHistory",
  },
  "mantenimiento": {
    incidencias: "scopeMantenimientoIncidencias",
    dashboard: "scopeMantenimientoDashboard",
    board: "scopeMantenimientoBoardBuilder",
    customBoards: "scopeMantenimientoMyBoards",
    history: "scopeMantenimientoHistory",
  },
  "mayoreo-comercio": {
    dashboard: "scopeMayoreoDashboard",
    board: "scopeMayoreoBoardBuilder",
    customBoards: "scopeMayoreoMyBoards",
    history: "scopeMayoreoHistory",
  },
  "retail": {
    dashboard: "scopeRetailDashboard",
    board: "scopeRetailBoardBuilder",
    customBoards: "scopeRetailMyBoards",
    history: "scopeRetailHistory",
  },
  "fullfilment": {
    dashboard: "scopeFullfilmentDashboard",
    board: "scopeFullfilmentBoardBuilder",
    customBoards: "scopeFullfilmentMyBoards",
    history: "scopeFullfilmentHistory",
  },
  "transporte": {
    "registros-envios": "scopeTransporteRegistrosEnvios",
    "control-transporte": "scopeTransporteControl",
    "incidencias-transporte": "scopeTransporteIncidencias",
    "consolidados": "scopeTransporteConsolidados",
    "dashboard-transporte": "scopeTransporteDashboard",
    "direcciones-gastos": "scopeTransporteLogistica",
  },
};

const TRANSPORT_SECTION_ACTIONS = {
  "registros-envios": [
    "viewTransportRetail",
    "manageTransportRetail",
    "viewTransportPedidos",
    "manageTransportPedidos",
    "viewTransportInventario",
    "manageTransportInventario",
  ],
  "control-transporte": [
    "viewTransportDocumentacion",
    "manageTransportDocumentacion",
    "viewTransportAssignments",
    "manageTransportAssignments",
    "viewTransportPostponed",
    "manageTransportPostponed",
    "viewTransportMyRoutes",
  ],
  "incidencias-transporte": [],
  "consolidados": ["viewTransportConsolidated"],
  "dashboard-transporte": [],
  "direcciones-gastos": ["viewTransportLogistics", "manageTransportLogistics"],
};

const AREA_TAB_BASE_ACTIONS = {
  dashboard: ["exportDashboardData", "manageDashboardState"],
  board: ["createCatalog", "editCatalog", "deleteCatalog", "createBoard", "editBoard", "saveTemplate", "editTemplate", "deleteTemplate", "duplicateBoard", "duplicateBoardWithRows", "deleteBoard", "deleteWeekActivity"],
  customBoards: ["createBoardRow", "deleteBoardRow", "editFinishedBoardRow", "viewHistoricalBoardScopes", "boardWorkflow", "exportBoardExcel", "previewBoardPdf", "exportBoardPdf"],
  history: ["editHistoryRecords"],
};

function normalizeAreaSectionId(areaValue) {
  const normalized = String(areaValue || "").trim().toLowerCase();
  if (!normalized) return "";
  return `area-${normalized.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
}

function findAreaSectionByLabel(areaValue, sections = []) {
  const normalized = String(areaValue || "").trim().toLowerCase();
  if (!normalized) return null;
  return sections.find((section) => {
    const label = String(section.label || "").trim().toLowerCase();
    return label === normalized || section.id === normalized || section.id === normalizeAreaSectionId(normalized);
  }) || null;
}

function App() { // NOSONAR
  const socketRef = useRef(null);
  const [socketConnectCount, setSocketConnectCount] = useState(0);
  const [_socketResetKey, _setSocketResetKey] = useState(0);
  const [state, setState] = useState(loadState);
  const [page, setPage] = useState(() => {
    const urlPage = INITIAL_ROUTE_STATE.page;
    const urlArea = String(INITIAL_ROUTE_STATE.area || "all").trim().toLowerCase();
    if (urlPage && urlPage !== PAGE_DASHBOARD && urlArea !== "all") return urlPage;
    if (urlArea === "all") return PAGE_DASHBOARD;
    try {
      const saved = localStorage.getItem(ACTIVE_PAGE_KEY);
      return saved && PAGE_ROUTE_ALIASES[saved] ? PAGE_ROUTE_ALIASES[saved] : PAGE_DASHBOARD;
    } catch {
      return PAGE_DASHBOARD;
    }
  });
  const [selectedAreaSectionId, setSelectedAreaSectionId] = useState(() => String(INITIAL_ROUTE_STATE.area || "all").trim() || "all");
  const [navTransportSection, setNavTransportSection] = useState(() => String(INITIAL_ROUTE_STATE.transportSection || "registros-envios").trim() || "registros-envios");
  const [navTransportTab, setNavTransportTab] = useState("");
  const [auditShortcutPreset, setAuditShortcutPreset] = useState(null);
  const [dashboardSectionsOpen, setDashboardSectionsOpen] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DASHBOARD_SECTIONS_KEY) || "null");
      const storedSections = saved && typeof saved === "object" ? saved : EMPTY_OBJECT;
      return { ...DEFAULT_DASHBOARD_SECTION_STATE, ...storedSections };
    } catch {
      return DEFAULT_DASHBOARD_SECTION_STATE;
    }
  });
  const [adminTab, setAdminTab] = useState(() => normalizeAdminTab(INITIAL_ROUTE_STATE.adminTab));
  const [selectedWeekId] = useState(() => {
    const initial = loadState();
    return INITIAL_ROUTE_STATE.selectedWeekId || initial.weeks.find((week) => week.isActive)?.id || initial.weeks[0]?.id || "";
  });
  const [selectedHistoryWeekId, setSelectedHistoryWeekId] = useState(() => {
    const initial = loadState();
    return INITIAL_ROUTE_STATE.selectedHistoryWeekId || initial.weeks[0]?.id || "";
  });
  const [inventoryTab, setInventoryTab] = useState(INVENTORY_DOMAIN_BASE);
  const [inventoryCleaningSite, setInventoryCleaningSite] = useState(DEFAULT_CLEANING_SITE);
  const [inventoryDestinationWarehouse, setInventoryDestinationWarehouse] = useState("");
  const [inventoryDestinationWarehouseAutoSet, setInventoryDestinationWarehouseAutoSet] = useState(false);
  const [inventoryActionsMenuOpen, setInventoryActionsMenuOpen] = useState(false);
  const [inventorySearch, setInventorySearch] = useState("");
  const [dashboardFilters, setDashboardFilters] = useState({ periodType: "week", periodKey: "all", responsibleId: "all", area: "all", source: "all", startDate: "", endDate: "" });
  const [pauseState, setPauseState] = useState({ open: false, activityId: null, reason: "", customReason: "", error: "", completed: false, continueReady: false, pauseLogId: null });
  const [boardPauseState, setBoardPauseState] = useState({
    open: false,
    boardId: null,
    rowId: null,
    reason: "",
    customReason: "",
    error: "",
    completed: false,
    continueReady: false,
    authorizedPauseSeconds: 0,
    pauseStartedAtMs: 0,
  });
  const [pieceDeductionModal, setPieceDeductionModal] = useState({ open: false, boardId: null, rowId: null, items: [] });
  const [catalogModal, setCatalogModal] = useState(() => createEmptyCatalogModalState());
  const [editWeekId, setEditWeekId] = useState(null);
  const [editWeekActivityId, setEditWeekActivityId] = useState("");
  const [historyPauseActivityId, setHistoryPauseActivityId] = useState(null);
  const [userModal, setUserModal] = useState(() => createUserModalState());
  const [userModalMessage, setUserModalMessage] = useState({ tone: "", text: "" });
  const [expandedPermissionTabs, setExpandedPermissionTabs] = useState([]);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [transferLeadTargetId, setTransferLeadTargetId] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [resetUserPasswordModal, setResetUserPasswordModal] = useState({ open: false, userId: null, userName: "", password: "", message: "", submitting: false });
  const [showUserModalPassword, setShowUserModalPassword] = useState(false);
  const [showResetUserPassword, setShowResetUserPassword] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("Todos los roles");
  const [usersViewTab, setUsersViewTab] = useState("table");
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "", message: "" });
  const [areaModal, setAreaModal] = useState({ open: false, target: "user", name: "", parentArea: "", error: "" });
  const [areaDeleteModal, setAreaDeleteModal] = useState({ open: false, areaName: "", label: "", error: "", submitting: false });
  const [controlBoardDraft, setControlBoardDraft] = useState(createEmptyBoardDraft);
  const [isBoardSaveSubmitting, setIsBoardSaveSubmitting] = useState(false);
  const [controlBoardFeedback, setControlBoardFeedback] = useState("");
  const [boardImportedRowsDraft, setBoardImportedRowsDraft] = useState([]);
  const [excelFormulaWizard, setExcelFormulaWizard] = useState({ open: false, items: [] });
  const [excelSheetSelector, setExcelSheetSelector] = useState({ open: false, sheets: [], fileName: "" });
  const [boardBuilderModal, setBoardBuilderModal] = useState({ open: false, mode: "create", boardId: null });
  const [customBoardSearch, setCustomBoardSearch] = useState("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState("Todas");
  const [templateEditorModal, setTemplateEditorModal] = useState({ open: false, id: null, name: "", description: "", category: "", visibilityType: "department", sharedDepartments: [], sharedUserIds: [], submitting: false });
  const [templateDeleteModal, setTemplateDeleteModal] = useState({ open: false, id: null, name: "" });
  const [hiddenBaseTemplateIds, setHiddenBaseTemplateIds] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(HIDDEN_BASE_TEMPLATES_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      const protectedSystemTemplateIds = new Set([
        "actividades-limpieza",
        "revision-tarimas",
        "devoluciones-reacondicionado",
      ]);
      return parsed.filter((id) => id && !protectedSystemTemplateIds.has(String(id).trim()));
    } catch {
      return [];
    }
  });
  const [templatePreviewId, setTemplatePreviewId] = useState(null);
  const [componentStudioOpen, setComponentStudioOpen] = useState(false);
  const [editingDraftColumnId, setEditingDraftColumnId] = useState(null);
  const [boardRuntimeFeedback, setBoardRuntimeFeedback] = useState({ tone: "", message: "" });
  const [boardFinishConfirm, setBoardFinishConfirm] = useState({ open: false, boardId: null, rowId: null, message: "" });
  const [boardStartConfirm, setBoardStartConfirm] = useState({ open: false, boardId: null, rowId: null, title: "", message: "" });
  const [deleteBoardRowState, setDeleteBoardRowState] = useState({ open: false, boardId: null, rowId: null });
  const [inventoryModal, setInventoryModal] = useState(() => createInventoryModalState());
  const [inventoryMovementModal, setInventoryMovementModal] = useState(() => createInventoryMovementModalState());
  const [inventoryTransferViewerState, setInventoryTransferViewerState] = useState({ open: false, itemId: null });
  const [inventoryTransferConfirmModal, setInventoryTransferConfirmModal] = useState(() => createInventoryTransferConfirmModalState());
  const [inventoryRestockModal, setInventoryRestockModal] = useState(() => createInventoryRestockModalState());
  const [inventoryDestinationModal, setInventoryDestinationModal] = useState(() => createInventoryDestinationModalState());
  const [inventoryImportFeedback, setInventoryImportFeedback] = useState({ tone: "", message: "" });
  const [permissionsFeedback, setPermissionsFeedback] = useState({ tone: "", message: "" });
  const [appToasts, setAppToasts] = useState([]);
  const [globalCaptureShieldActive, setGlobalCaptureShieldActive] = useState(false);
  const [notificationInboxState, setNotificationInboxState] = useState(() => readNotificationInboxState());
  const [notificationReadState, setNotificationReadState] = useState(() => readNotificationReadState());
  const [notificationDeletedState, setNotificationDeletedState] = useState(() => readNotificationDeletedState());
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [notificationPanelTab, setNotificationPanelTab] = useState("unread");
  const [notificationAttentionTick, setNotificationAttentionTick] = useState(0);
  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState("");
  const [deleteInventoryId, setDeleteInventoryId] = useState(null);
  const [deleteBoardId, setDeleteBoardId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
  const [selectedCustomBoardId, setSelectedCustomBoardId] = useState(INITIAL_ROUTE_STATE.selectedBoardId);
  const [selectedCustomBoardViewId, setSelectedCustomBoardViewId] = useState("current");
  const [customBoardActionsMenuOpen, setCustomBoardActionsMenuOpen] = useState(false);
  const [uiTheme, setUiTheme] = useState("copmec-bosque");
  const [uiFont, setUiFont] = useState("bahnschrift");
  const [uiFontSize, setUiFontSize] = useState("normal");
  const [selectedPermissionBoardId, setSelectedPermissionBoardId] = useState("");
  const [loginForm, setLoginForm] = useState({ login: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginDirectory, setLoginDirectory] = useState(EMPTY_LOGIN_DIRECTORY);
  const [bootstrapLeadForm, setBootstrapLeadForm] = useState({ name: "", username: "", area: "", jobTitle: "", password: "" });
  const [bootstrapLeadError, setBootstrapLeadError] = useState("");
  const [auditFilters, setAuditFilters] = useState({ scope: "all", userId: "all", period: "all", search: "" });
  const [sessionUserId, setSessionUserId] = useState("");
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [syncStatus, setSyncStatus] = useState("Conectando");
  const [securityEvents, setSecurityEvents] = useState([]);
  const [securityEventsStatus, setSecurityEventsStatus] = useState("idle");

  const operationalPauseState = useMemo(() => ({
    areaPauseControls: state?.system?.operational?.pauseControl?.areaPauseControls || EMPTY_OBJECT,
  }), [state?.system?.operational]);
  const enabledPauseReasons = useMemo(() => {
    const blockedReasonKey = "ajuste manual de contadores";
    const source = Array.isArray(state?.system?.operational?.pauseControl?.reasons)
      ? state.system.operational.pauseControl.reasons
      : [];
    const seen = new Set();
    return source
      .filter((entry) => entry?.enabled !== false)
      .map((entry) => ({
        id: String(entry?.id || "").trim(),
        label: String(entry?.label || "").trim(),
        authorizedMinutes: Math.max(0, Number(entry?.authorizedMinutes || 0)),
        dailyUsageLimit: Math.max(0, Number(entry?.dailyUsageLimit || 0)),
      }))
      .filter((entry) => {
        const key = String(entry.label || "").trim().toLowerCase();
        if (!key || key === blockedReasonKey || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [state?.system?.operational?.pauseControl?.reasons]);
  const pauseReasonOptions = useMemo(() => {
    const labels = enabledPauseReasons.map((entry) => entry.label);
    return labels.length ? labels : ["Falta de material", "Detención operativa", "Ajuste de calidad"];
  }, [enabledPauseReasons]);
  const boardPauseElapsedSeconds = boardPauseState.pauseStartedAtMs
    ? Math.max(0, Math.floor((now - boardPauseState.pauseStartedAtMs) / 1000))
    : 0;
  const boardPauseRemainingSeconds = Math.max(
    0,
    Number(boardPauseState.authorizedPauseSeconds || 0) - boardPauseElapsedSeconds,
  );
  const boardPauseIsOutOfTime = Number(boardPauseState.authorizedPauseSeconds || 0) > 0
    && boardPauseRemainingSeconds <= 0;
  const CUSTOM_PAUSE_REASON_VALUE = "__custom__";
  const sessionRole = normalizeRole(state.users.find((user) => user.id === sessionUserId)?.role);
  const antiCaptureEnabled = import.meta.env.PROD && sessionRole !== ROLE_LEAD;
  const [isDemoMode, setIsDemoMode] = useState(false);
  const preDemoStateRef = useRef(null);
  const isHydratedRef = useRef(false);
  const uiPrefsHydratedRef = useRef(false);
  const skipNextSyncRef = useRef(false);
  const contentShellRef = useRef(null);
  const notificationCenterRef = useRef(null);
  const prevUnreadNotificationsCountRef = useRef(0);
  const unreadNotificationSyncReadyRef = useRef(false);
  const inventoryFileInputRef = useRef(null);
  const boardExcelFileInputRef = useRef(null);
  const permissionFileInputRef = useRef(null);
  const customBoardActionsMenuRef = useRef(null);
  const inventoryActionsMenuRef = useRef(null);
  const sessionSnapshotRef = useRef({ userId: "", sessionVersion: 0 });
  const pauseContinueTimerRef = useRef(null);
  const boardPauseContinueTimerRef = useRef(null);
  const globalCaptureShieldTimerRef = useRef(null);
  const boardCellSaveTimersRef = useRef(new Map());
  const boardCellSaveVersionRef = useRef(new Map());
  const boardCellDraftValueRef = useRef(new Map());
  const routeLastUrlRef = useRef(`${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash || ""}`);
  const routeSyncFromPopRef = useRef(false);
  const BOARD_CELL_DRAFT_TTL_MS = 4500;

  useEffect(() => {
    const cleanup = setupGlobalHorizontalScrollEnhancements();
    return cleanup;
  }, []);

  useEffect(() => () => {
    boardCellSaveTimersRef.current.forEach((timerId) => {
      globalThis.clearTimeout(timerId);
    });
    boardCellSaveTimersRef.current.clear();
    boardCellSaveVersionRef.current.clear();
    boardCellDraftValueRef.current.clear();
  }, []);

  function mergeRemoteStateWithBoardDrafts(remoteState) {
    const normalizedState = normalizeWarehouseState(remoteState);
    const nowMs = Date.now();
    const activeDraftEntries = [];
    boardCellDraftValueRef.current.forEach((entry, key) => {
      if (!entry || typeof entry !== "object") {
        boardCellDraftValueRef.current.delete(key);
        return;
      }
      if (entry.expiresAtMs <= nowMs) {
        boardCellDraftValueRef.current.delete(key);
        return;
      }
      activeDraftEntries.push([key, entry]);
    });

    if (!activeDraftEntries.length) return normalizedState;

    const controlBoards = Array.isArray(normalizedState.controlBoards)
      ? normalizedState.controlBoards.map((board) => ({
        ...board,
        rows: Array.isArray(board.rows)
          ? board.rows.map((row) => ({
            ...row,
            values: {
              ...(row.values || {}),
            },
          }))
          : [],
      }))
      : [];

    const boardById = new Map(controlBoards.map((board) => [board.id, board]));
    activeDraftEntries.forEach(([key, entry]) => {
      const [boardId, rowId, fieldId] = String(key || "").split(":");
      if (!boardId || !rowId || !fieldId) return;
      const board = boardById.get(boardId);
      if (!board) return;
      const row = (board.rows || []).find((currentRow) => currentRow.id === rowId);
      if (!row) return;
      row.values[fieldId] = entry.value;
    });

    return {
      ...normalizedState,
      controlBoards,
    };
  }

  function applyRemoteStatePreservingBoardDrafts(remoteState) {
    skipNextSyncRef.current = true;
    const mergedState = mergeRemoteStateWithBoardDrafts(remoteState);
    setState(mergedState);
    setLoginDirectory(buildLoginDirectoryFromState(mergedState));
    setSyncStatus("Sincronizado");
    return mergedState;
  }

  function armGlobalCaptureShield(nextMs = 1600, notify = false) {
    if (!antiCaptureEnabled) return;
    setGlobalCaptureShieldActive(true);
    if (notify) {
      pushAppToast("Captura detectada. Pantalla protegida temporalmente.", "warning");
    }
    if (globalCaptureShieldTimerRef.current) {
      globalThis.clearTimeout(globalCaptureShieldTimerRef.current);
    }
    globalCaptureShieldTimerRef.current = globalThis.setTimeout(() => {
      if (!document.hidden) {
        setGlobalCaptureShieldActive(false);
      }
    }, nextMs);
  }

  function dismissAppToast(toastId) {
    let shouldClose = false;
    setAppToasts((current) => current.map((toast) => {
      if (toast.id !== toastId) return toast;
      if (toast.pinned) return toast;
      shouldClose = true;
      return { ...toast, isClosing: true };
    }));
    if (!shouldClose) return;
    globalThis.setTimeout(() => {
      setAppToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 180);
  }

  function dismissAppToastForced(toastId) {
    setAppToasts((current) => current.map((toast) => (toast.id === toastId ? { ...toast, isClosing: true } : toast)));
    globalThis.setTimeout(() => {
      setAppToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 180);
  }

  function pinAppToast(toastId) {
    setAppToasts((current) => current.map((toast) => (
      toast.id === toastId ? { ...toast, pinned: true } : toast
    )));
  }

  function pushAppToast(message, tone = "success") {
    const trimmedMessage = String(message || "").trim();
    if (!trimmedMessage) return;

    const nextToastId = makeId("toast");
    const normalizedTone = ["success", "danger", "warning"].includes(String(tone || "").toLowerCase())
      ? String(tone || "").toLowerCase()
      : "success";
    const durationMs = normalizedTone === "danger" ? 5200 : normalizedTone === "warning" ? 4600 : 3800;
    setAppToasts((current) => current.concat({ id: nextToastId, message: trimmedMessage, tone: normalizedTone, isClosing: false, createdAt: Date.now(), durationMs, pinned: false }).slice(-4));
    globalThis.setTimeout(() => {
      dismissAppToast(nextToastId);
    }, durationMs);
  }

  function pushNotificationToInbox(notification) {
    if (!sessionUserId || !notification?.id) return;
    setNotificationInboxState((current) => {
      const currentInbox = Array.isArray(current[sessionUserId]) ? current[sessionUserId] : [];
      const mergedById = new Map(currentInbox.map((entry) => [entry.id, entry]));
      mergedById.set(notification.id, {
        ...mergedById.get(notification.id),
        ...notification,
      });
      return {
        ...current,
        [sessionUserId]: Array.from(mergedById.values())
          .toSorted((left, right) => getComparableDateMs(right.timestamp) - getComparableDateMs(left.timestamp))
          .slice(0, 400),
      };
    });
  }

  function markNotificationIdsAsRead(notificationIds = []) {
    if (!sessionUserId || !notificationIds.length) return;
    setNotificationReadState((current) => {
      const knownIds = new Set(Array.isArray(current[sessionUserId]) ? current[sessionUserId] : []);
      notificationIds.forEach((notificationId) => {
        if (notificationId) knownIds.add(notificationId);
      });
      return {
        ...current,
        [sessionUserId]: Array.from(knownIds).slice(-300),
      };
    });
  }

  function handleToggleNotificationPanel() {
    setNotificationPanelOpen((current) => !current);
  }

  function deleteNotificationIds(notificationIds = []) {
    if (!sessionUserId || !notificationIds.length) return;
    setNotificationDeletedState((current) => {
      const knownIds = new Set(Array.isArray(current[sessionUserId]) ? current[sessionUserId] : []);
      notificationIds.forEach((notificationId) => {
        if (notificationId) knownIds.add(notificationId);
      });
      return {
        ...current,
        [sessionUserId]: Array.from(knownIds).slice(-500),
      };
    });
  }

  function handleDeleteNotification(notificationId) {
    deleteNotificationIds([notificationId]);
  }

  function handleDeleteAllReadNotifications() {
    deleteNotificationIds(readNotifications.map((notification) => notification.id));
  }

  function handleOpenNotification(notification) {
    if (!notification) return;
    if (!notification.isLocked) {
      markNotificationIdsAsRead([notification.id]);
    }
    setNotificationPanelOpen(false);

    if (notification.targetAction === "profile") {
      setProfileModalOpen(true);
    }

    if (notification.targetDomain) {
      setInventoryTab(notification.targetDomain);
    }
    if (notification.targetPage) {
      setPage(notification.targetPage);
    }
  }

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 1000);
    return () => globalThis.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!antiCaptureEnabled) {
      setGlobalCaptureShieldActive(false);
      return undefined;
    }
    if (!sessionUserId) return undefined;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setGlobalCaptureShieldActive(true);
        return;
      }
      setGlobalCaptureShieldActive(false);
    };

    const handleWindowBlur = () => setGlobalCaptureShieldActive(true);
    const handleWindowFocus = () => setGlobalCaptureShieldActive(false);

    const handleClipboardBlock = (event) => {
      const tagName = String(event.target?.tagName || "").toLowerCase();
      if (tagName === "input" || tagName === "textarea") return;
      event.preventDefault();
    };

    const handleDragStart = (event) => event.preventDefault();

    const handleKeyDown = (event) => {
      const key = String(event.key || "").toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "p") {
        event.preventDefault();
        armGlobalCaptureShield(1200, true);
        return;
      }
      if (event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key)) {
        armGlobalCaptureShield(1500, true);
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === "PrintScreen") {
        armGlobalCaptureShield(1500, true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleClipboardBlock);
    document.addEventListener("cut", handleClipboardBlock);
    document.addEventListener("dragstart", handleDragStart);
    globalThis.addEventListener("blur", handleWindowBlur);
    globalThis.addEventListener("focus", handleWindowFocus);
    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("keyup", handleKeyUp);

    return () => {
      if (globalCaptureShieldTimerRef.current) {
        globalThis.clearTimeout(globalCaptureShieldTimerRef.current);
        globalCaptureShieldTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleClipboardBlock);
      document.removeEventListener("cut", handleClipboardBlock);
      document.removeEventListener("dragstart", handleDragStart);
      globalThis.removeEventListener("blur", handleWindowBlur);
      globalThis.removeEventListener("focus", handleWindowFocus);
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [antiCaptureEnabled, sessionUserId]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_READ_KEY, JSON.stringify(notificationReadState));
  }, [notificationReadState]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_DELETED_KEY, JSON.stringify(notificationDeletedState));
  }, [notificationDeletedState]);

  useEffect(() => {
    localStorage.setItem(NOTIFICATION_INBOX_KEY, JSON.stringify(notificationInboxState));
  }, [notificationInboxState]);

  useEffect(() => {
    if (!notificationPanelOpen) return undefined;

    function handleDocumentPointerDown(event) {
      if (!notificationCenterRef.current?.contains(event.target)) {
        setNotificationPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);
    return () => document.removeEventListener("mousedown", handleDocumentPointerDown);
  }, [notificationPanelOpen]);

  useEffect(() => {
    if (!boardRuntimeFeedback.message) return;
    pushAppToast(boardRuntimeFeedback.message, boardRuntimeFeedback.tone || "success");
    setBoardRuntimeFeedback({ tone: "", message: "" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardRuntimeFeedback]);

  useEffect(() => {
    if (!inventoryImportFeedback.message) return;
    pushAppToast(inventoryImportFeedback.message, inventoryImportFeedback.tone || "success");
    setInventoryImportFeedback({ tone: "", message: "" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryImportFeedback]);

  useEffect(() => {
    if (!permissionsFeedback.message) return;
    pushAppToast(permissionsFeedback.message, permissionsFeedback.tone || "success");
    setPermissionsFeedback({ tone: "", message: "" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsFeedback]);

  useEffect(() => {
    if (!controlBoardFeedback) return;
    pushAppToast(controlBoardFeedback, inferFeedbackToneFromMessage(controlBoardFeedback));
    setControlBoardFeedback("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlBoardFeedback]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    globalThis.scrollTo({ top: 0, left: 0, behavior: "instant" });
    contentShellRef.current?.scrollTo?.({ top: 0, left: 0, behavior: "instant" });
  }, [page]);

  useEffect(() => {
    if (!customBoardActionsMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!customBoardActionsMenuRef.current?.contains(event.target)) {
        setCustomBoardActionsMenuOpen(false);
      }
    }

    globalThis.addEventListener("pointerdown", handlePointerDown);
    return () => globalThis.removeEventListener("pointerdown", handlePointerDown);
  }, [customBoardActionsMenuOpen]);

  useEffect(() => {
    if (!inventoryActionsMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!inventoryActionsMenuRef.current?.contains(event.target)) {
        setInventoryActionsMenuOpen(false);
      }
    }

    globalThis.addEventListener("pointerdown", handlePointerDown);
    return () => globalThis.removeEventListener("pointerdown", handlePointerDown);
  }, [inventoryActionsMenuOpen]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    try { localStorage.setItem(ACTIVE_PAGE_KEY, page); } catch { /* noop */ }
  }, [page]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_SECTIONS_KEY, JSON.stringify(dashboardSectionsOpen));
  }, [dashboardSectionsOpen]);

  useEffect(() => {
    localStorage.setItem(HIDDEN_BASE_TEMPLATES_KEY, JSON.stringify(hiddenBaseTemplateIds));
  }, [hiddenBaseTemplateIds]);

  useEffect(() => {
    const root = document.documentElement;
    if (!root?.dataset) return;
    delete root.dataset.uiTheme;
    delete root.dataset.uiFont;
    delete root.dataset.uiFontSize;
  }, []);

  useEffect(() => {
    if (!sessionUserId) {
      uiPrefsHydratedRef.current = false;
      setUiTheme("copmec-bosque");
      setUiFont("bahnschrift");
      setUiFontSize("normal");
      return;
    }
    uiPrefsHydratedRef.current = false;
    // Obtener preferencias del servidor
    (async () => {
      try {
        const prefs = await requestJson("/chat/ui-preferences");
        if (prefs) {
          setUiTheme(UI_THEME_OPTIONS.some((option) => option.id === prefs.theme) ? prefs.theme : "copmec-bosque");
          setUiFont(UI_FONT_OPTIONS.some((option) => option.id === prefs.font) ? prefs.font : "bahnschrift");
          setUiFontSize(UI_FONT_SIZE_OPTIONS.some((option) => option.id === prefs.fontSize) ? prefs.fontSize : "normal");
          uiPrefsHydratedRef.current = true;
          return;
        }
      } catch {}
      // Fallback a localStorage si falla el servidor
      try {
        const savedTheme = String(localStorage.getItem(getUserUiThemeKey(sessionUserId)) || "").trim();
        const savedFont = String(localStorage.getItem(getUserUiFontKey(sessionUserId)) || "").trim();
        const savedFontSize = String(localStorage.getItem(getUserUiFontSizeKey(sessionUserId)) || "").trim();
        setUiTheme(UI_THEME_OPTIONS.some((option) => option.id === savedTheme) ? savedTheme : "copmec-bosque");
        setUiFont(UI_FONT_OPTIONS.some((option) => option.id === savedFont) ? savedFont : "bahnschrift");
        setUiFontSize(UI_FONT_SIZE_OPTIONS.some((option) => option.id === savedFontSize) ? savedFontSize : "normal");
        uiPrefsHydratedRef.current = true;
      } catch {
        setUiTheme("copmec-bosque");
        setUiFont("bahnschrift");
        setUiFontSize("normal");
        uiPrefsHydratedRef.current = true;
      }
    })();
  }, [sessionUserId]);

  useEffect(() => {
    if (!sessionUserId || !uiPrefsHydratedRef.current) return;
    const normalizedTheme = UI_THEME_OPTIONS.some((option) => option.id === uiTheme) ? uiTheme : "copmec-bosque";
    const normalizedFont = UI_FONT_OPTIONS.some((option) => option.id === uiFont) ? uiFont : "bahnschrift";
    const normalizedFontSize = UI_FONT_SIZE_OPTIONS.some((option) => option.id === uiFontSize) ? uiFontSize : "normal";
    document.documentElement.dataset.uiTheme = normalizedTheme;
    document.documentElement.dataset.uiFont = normalizedFont;
    document.documentElement.dataset.uiFontSize = normalizedFontSize;
    // Guardar en servidor
    (async () => {
      try {
        await requestJson("/chat/ui-preferences", {
          method: "POST",
          body: JSON.stringify({
            theme: normalizedTheme,
            font: normalizedFont,
            fontSize: normalizedFontSize,
          }),
        });
      } catch {}
      // Fallback a localStorage
      try {
        localStorage.setItem(getUserUiThemeKey(sessionUserId), normalizedTheme);
        localStorage.setItem(getUserUiFontKey(sessionUserId), normalizedFont);
        localStorage.setItem(getUserUiFontSizeKey(sessionUserId), normalizedFontSize);
      } catch {}
    })();
  }, [sessionUserId, uiTheme, uiFont, uiFontSize]);

  useEffect(() => {
    document.title = "AXO";
  }, []);

  useEffect(() => {
    const shouldPersistRoute = Boolean(sessionUserId && sessionUserId !== BOOTSTRAP_MASTER_ID);
    const nextQuery = shouldPersistRoute
      ? buildRouteQuery({
          page,
          adminTab,
          selectedBoardId: selectedCustomBoardId,
          selectedWeekId,
          selectedHistoryWeekId,
        })
      : "";
    const nextPath = shouldPersistRoute
      ? buildRoutePath(page, selectedAreaSectionId, page === PAGE_TRANSPORT ? navTransportSection : "")
      : "/";
    const queryPrefix = nextQuery ? `?${nextQuery}` : "";
    const nextUrl = `${nextPath}${queryPrefix}${globalThis.location.hash || ""}`;

    if (routeSyncFromPopRef.current) {
      routeSyncFromPopRef.current = false;
      routeLastUrlRef.current = `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash || ""}`;
      return;
    }

    if (routeLastUrlRef.current === nextUrl) return;

    globalThis.history.pushState(null, "", nextUrl);
    routeLastUrlRef.current = nextUrl;
  }, [adminTab, page, selectedAreaSectionId, selectedCustomBoardId, selectedHistoryWeekId, selectedWeekId, navTransportSection, sessionUserId]);

  useEffect(() => {
    function handlePopState() {
      const routeState = getInitialRouteState();
      routeSyncFromPopRef.current = true;
      setPage(routeState.page || PAGE_DASHBOARD);
      setAdminTab(normalizeAdminTab(routeState.adminTab));
      setSelectedCustomBoardId(routeState.selectedBoardId || "");
      setSelectedHistoryWeekId(routeState.selectedHistoryWeekId || "");
      setSelectedAreaSectionId(routeState.area || "all");
      setNavTransportSection(routeState.transportSection || "registros-envios");
    }

    globalThis.addEventListener("popstate", handlePopState);
    return () => globalThis.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrapAuth() {
      try {
        const directory = await requestJson("/auth/login-options");
        if (active) {
          setLoginDirectory({
            system: {
              masterBootstrapEnabled: Boolean(directory?.system?.masterBootstrapEnabled),
              masterUsername: directory?.system?.masterUsername || null,
              showBootstrapMasterHint: Boolean(directory?.system?.showBootstrapMasterHint),
            },
            demoUsers: Array.isArray(directory?.demoUsers) ? directory.demoUsers : [],
          });
        }
      } catch {
        if (active) {
          setLoginDirectory(EMPTY_LOGIN_DIRECTORY);
        }
      }

      // Only check session if we previously stored a session marker.
      // This prevents a spurious 401 in the console when the user is not logged in.
      const hadSession = localStorage.getItem(SESSION_STORAGE_KEY) === "1";
      if (!hadSession) {
        if (active) {
          setSessionUserId("");
          isHydratedRef.current = true;
          setSyncStatus("Modo local");
          setIsAuthChecking(false);
        }
        return;
      }

      try {
        const session = await requestJson("/auth/session");
        if (!active) return;
        setSessionExpiredHandler(() => invalidateClientSession("Tu sesión expiró. Por favor inicia sesión nuevamente."));
        setSessionUserId(session.userId || "");
      } catch {
        if (active) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          setSessionUserId("");
          isHydratedRef.current = true;
          setSyncStatus("Modo local");
        }
      } finally {
        if (active) setIsAuthChecking(false);
      }
    }

    bootstrapAuth();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) {
      if (!sessionUserId) {
        setSyncStatus("Modo local");
      }
      isHydratedRef.current = true;
      return undefined;
    }

    let active = true;
    const events = createWarehouseEventSource();

    async function hydrate() {
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!active) return;
        const normalizedState = normalizeWarehouseState(remoteState);
        skipNextSyncRef.current = true;
        setState(normalizedState);
        setLoginDirectory(buildLoginDirectoryFromState(normalizedState));
        setSyncStatus("Sincronizado");
      } catch (error) {
        if (!active) return;
        if (isSessionRequiredError(error)) {
          invalidateClientSession("Tu sesión terminó. Vuelve a iniciar sesión.");
        }
        setSyncStatus("Modo local");
      } finally {
        isHydratedRef.current = true;
      }
    }

    hydrate();

    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== "state" || !payload.state) return;
        const mergedState = mergeRemoteStateWithBoardDrafts(payload.state);
        const nextSessionUser = mergedState.users.find((user) => user.id === sessionUserId) || null;
        const shouldRevalidateSession = Boolean(
          sessionUserId
          && sessionUserId !== BOOTSTRAP_MASTER_ID
          && (!nextSessionUser || Number(nextSessionUser.sessionVersion || 0) !== Number(sessionSnapshotRef.current.sessionVersion || 0)),
        );
        skipNextSyncRef.current = true;
        setState(mergedState);
        setLoginDirectory(buildLoginDirectoryFromState(mergedState));
        setSyncStatus("Sincronizado");
        if (shouldRevalidateSession) {
          requestJson("/auth/session").catch((error) => {
            if (error?.status === 401) {
              invalidateClientSession("Tu sesión se cerró porque tu acceso cambió. Si te restablecieron la contraseña, entra con la clave temporal.");
            }
          });
        }
      } catch {
        setSyncStatus("Sincronizado");
      }
    };

    events.onerror = () => {
      if (active) {
        setSyncStatus((current) => (current === "Modo local" ? current : "Reconectando"));
      }
    };

    return () => {
      active = false;
      events.close();
    };
  }, [sessionUserId]);

  // ── Sincronización en tiempo real: Socket.IO "warehouse_updated" ──────────────
  // Cuando el backend emite "warehouse_updated" (tras cualquier cambio de estado),
  // el cliente re-carga el estado completo como respaldo del SSE.
  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) return;
    const socket = socketRef.current;
    if (!socket) return;

    let ignoreResponse = false;
    const handleWarehouseUpdate = async () => {
      if (ignoreResponse) return;
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (ignoreResponse) return;
        applyRemoteStatePreservingBoardDrafts(remoteState);
      } catch (_) { /* SSE ya cubre este caso; ignorar silenciosamente */ }
    };

    socket.on("warehouse_updated", handleWarehouseUpdate);
    return () => {
      ignoreResponse = true;
      socket.off("warehouse_updated", handleWarehouseUpdate);
    };
  // socketConnectCount cambia cada vez que el socket se reconecta, lo que
  // obliga a re-registrar el listener en la nueva instancia del socket.
  }, [sessionUserId, socketConnectCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notificaciones de Transporte en tiempo real ──────────────────────────────
  // Escucha eventos de Socket.IO para crear/actualizar/asignar rutas y muestra notificaciones
  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) return;
    const socket = socketRef.current;
    if (!socket) return;

    // Inicializar servicio de notificaciones (solicitar permisos)
    initNotificationService();

    let ignoreResponse = false;
    const sessionUser = Array.isArray(state?.users)
      ? state.users.find((user) => user.id === sessionUserId) || null
      : null;
    const sessionPermissions = normalizePermissions(state?.permissions);
    const isLeadSession = normalizeRole(sessionUser?.role) === ROLE_LEAD;
    const isTransportOperator = Boolean(
      canDoAction(sessionUser, "viewTransportRetail", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportRetail", sessionPermissions)
      || canDoAction(sessionUser, "viewTransportPedidos", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportPedidos", sessionPermissions)
      || canDoAction(sessionUser, "viewTransportInventario", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportInventario", sessionPermissions)
      || canDoAction(sessionUser, "viewTransportDocumentacion", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportDocumentacion", sessionPermissions)
      || canDoAction(sessionUser, "viewTransportAssignments", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportAssignments", sessionPermissions)
    );
    const canReceiveTransportBellNotifications = isTransportOperator || isLeadSession;
    const shouldShowTransportDeviceNotification = isTransportOperator && !isLeadSession;

    const handleTransportRecordCreated = async (data) => {
      if (ignoreResponse) return;
      // Mostrar notificación de nuevo envío
      if (data?.record && canReceiveTransportBellNotifications) {
        if (shouldShowTransportDeviceNotification) {
          showTransportNotificationForNewRecord(data.record, { playAlert: false });
        }
        pushNotificationToInbox({
          id: `transport-created-${data.record.id}-${data.ts || Date.now()}`,
          title: "Nuevo envío registrado",
          message: `${data.record.destination || "Destino"} · ${data.record.boxes || 0} cajas · ${data.record.pieces || 0} piezas`,
          meta: `Capturado por: ${data.record.createdByName || "Sin nombre"}`,
          tone: "warning",
          timestamp: new Date(data.ts || Date.now()).toISOString(),
          targetPage: PAGE_TRANSPORT,
        });
      }
      // Actualizar estado del transporte
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!ignoreResponse) {
          applyRemoteStatePreservingBoardDrafts(remoteState);
        }
      } catch (_) { /* ignorar */ }
    };

    const handleTransportRouteAssigned = async (data) => {
      if (ignoreResponse) return;
      // Mostrar notificación de asignación
      if (data?.record && data?.driver && canReceiveTransportBellNotifications) {
        if (shouldShowTransportDeviceNotification) {
          showTransportNotificationForAssignment(data.record, data.driver?.name || "Conductor", { playAlert: false });
        }
        pushNotificationToInbox({
          id: `transport-assigned-${data.record.id}-${data.ts || Date.now()}`,
          title: "Ruta asignada",
          message: `${data.record.destination || "Destino"} fue asignado a ${data.driver?.name || "Conductor"}.`,
          meta: `Estado: ${data.record.status || "Asignado"}`,
          tone: "success",
          timestamp: new Date(data.ts || Date.now()).toISOString(),
          targetPage: PAGE_TRANSPORT,
        });
      }
      // Actualizar estado
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!ignoreResponse) {
          applyRemoteStatePreservingBoardDrafts(remoteState);
        }
      } catch (_) { /* ignorar */ }
    };

    const handleTransportStatusUpdated = async (data) => {
      if (ignoreResponse) return;
      // Mostrar notificación de cambio de estado
      if (data?.record && canReceiveTransportBellNotifications) {
        if (shouldShowTransportDeviceNotification) {
          showTransportNotificationForStatusUpdate(data.record, data.record?.status, { alertMode: "vibration-only" });
        }
        pushNotificationToInbox({
          id: `transport-status-${data.record.id}-${data.ts || Date.now()}`,
          title: "Estado de ruta actualizado",
          message: `${data.record.destination || "Destino"} ahora está en "${data.record.status || "Pendiente"}".`,
          meta: `Actualizado por flujo de transporte`,
          tone: data.record.status === "Entregado" ? "success" : "warning",
          timestamp: new Date(data.ts || Date.now()).toISOString(),
          targetPage: PAGE_TRANSPORT,
        });
      }
      // Actualizar estado
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!ignoreResponse) {
          applyRemoteStatePreservingBoardDrafts(remoteState);
        }
      } catch (_) { /* ignorar */ }
    };

    const handleTransportRecordPostponed = async (data) => {
      if (ignoreResponse) return;
      if (data?.record && canReceiveTransportBellNotifications) {
        if (shouldShowTransportDeviceNotification) {
          showTransportNotification("🗓️ Envío pospuesto", {
            body: `${data.record.destination || "Destino"} reprogramado para ${formatDateTime(data.record.postponedUntil || data.record.updatedAt)}`,
            tag: `transport-postponed-${data.record.id || Date.now()}`,
            playAlert: false,
          });
        }
        pushNotificationToInbox({
          id: `transport-postponed-${data.record.id}-${data.ts || Date.now()}`,
          title: "Envío pospuesto",
          message: `${data.record.destination || "Destino"} reprogramado para ${formatDateTime(data.record.postponedUntil || data.record.updatedAt)}`,
          meta: `Recordar: ${Number(data.record.postponedReminderMinutes || 0)} min antes`,
          tone: "warning",
          timestamp: new Date(data.ts || Date.now()).toISOString(),
          targetPage: PAGE_TRANSPORT,
        });
      }
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!ignoreResponse) {
          applyRemoteStatePreservingBoardDrafts(remoteState);
        }
      } catch (_) { /* ignorar */ }
    };

    const handleTransportRecordDeleted = async () => {
      if (ignoreResponse) return;
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!ignoreResponse) {
          applyRemoteStatePreservingBoardDrafts(remoteState);
        }
      } catch (_) { /* ignorar */ }
    };

    const handleDocumentacionRecordCreated = async (data) => {
      if (ignoreResponse) return;
      if (data?.record && canReceiveTransportBellNotifications) {
        if (shouldShowTransportDeviceNotification) {
          showTransportNotification("📄 Nuevo registro de documentación", {
            body: `${data.record.area || "Área"} · Dirigido a: ${data.record.dirigidoA || "-"}`,
            tag: `documentacion-record-${data.record.id || Date.now()}`,
            playAlert: false,
          });
        }
        pushNotificationToInbox({
          id: `documentacion-created-${data.record.id}-${data.ts || Date.now()}`,
          title: "Nuevo registro en Documentación",
          message: `${data.record.area || "Área"} · ${data.record.dirigidoA || "Sin destinatario"}`,
          meta: `Capturado por: ${data.record.createdByName || "Sin nombre"}`,
          tone: "warning",
          timestamp: new Date(data.ts || Date.now()).toISOString(),
          targetPage: PAGE_TRANSPORT,
        });
      }
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!ignoreResponse) {
          applyRemoteStatePreservingBoardDrafts(remoteState);
        }
      } catch (_) { /* ignorar */ }
    };

    const handleDocumentacionRecordUpdated = async (data) => {
      if (ignoreResponse) return;
      if (data?.record && canReceiveTransportBellNotifications) {
        if (shouldShowTransportDeviceNotification) {
          showTransportNotification("📝 Registro de documentación actualizado", {
            body: `${data.record.area || "Área"} · Dirigido a: ${data.record.dirigidoA || "-"}`,
            tag: `documentacion-record-updated-${data.record.id || Date.now()}`,
            playAlert: false,
          });
        }
        pushNotificationToInbox({
          id: `documentacion-updated-${data.record.id}-${data.ts || Date.now()}`,
          title: "Documentación actualizada",
          message: `${data.record.area || "Área"} · ${data.record.dirigidoA || "Sin destinatario"}`,
          meta: `Actualizado: ${formatDateTime(data.record.updatedAt || new Date().toISOString())}`,
          tone: "success",
          timestamp: new Date(data.ts || Date.now()).toISOString(),
          targetPage: PAGE_TRANSPORT,
        });
      }
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!ignoreResponse) {
          applyRemoteStatePreservingBoardDrafts(remoteState);
        }
      } catch (_) { /* ignorar */ }
    };

    const handleDocumentacionRouteAssigned = async (data) => {
      if (ignoreResponse) return;
      if (data?.record && data?.driver && canReceiveTransportBellNotifications) {
        if (shouldShowTransportDeviceNotification) {
          showTransportNotification("📄 Ruta de documentación asignada", {
            body: `${data.record.area || "Área"} fue asignada a ${data.driver?.name || "Conductor"}.`,
            tag: `documentacion-route-assigned-${data.record.id || Date.now()}`,
            playAlert: false,
          });
        }
        pushNotificationToInbox({
          id: `documentacion-assigned-${data.record.id}-${data.ts || Date.now()}`,
          title: "Ruta de documentación asignada",
          message: `${data.record.area || "Área"} asignada a ${data.driver?.name || "Conductor"}.`,
          meta: `Estado: ${data.record.status || "Asignado"}`,
          tone: "success",
          timestamp: new Date(data.ts || Date.now()).toISOString(),
          targetPage: PAGE_TRANSPORT,
        });
      }
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!ignoreResponse) {
          applyRemoteStatePreservingBoardDrafts(remoteState);
        }
      } catch (_) { /* ignorar */ }
    };

    const handleDocumentacionStatusUpdated = async (data) => {
      if (ignoreResponse) return;
      if (data?.record && canReceiveTransportBellNotifications) {
        if (shouldShowTransportDeviceNotification) {
          showTransportNotification("🧾 Estado de documentación actualizado", {
            body: `${data.record.area || "Área"} ahora está en "${data.record.status || "Pendiente"}".`,
            tag: `documentacion-status-updated-${data.record.id || Date.now()}`,
            alertMode: "vibration-only",
          });
        }
        pushNotificationToInbox({
          id: `documentacion-status-${data.record.id}-${data.ts || Date.now()}`,
          title: "Estado de documentación actualizado",
          message: `${data.record.area || "Área"} ahora está en "${data.record.status || "Pendiente"}".`,
          meta: `Actualizado por flujo operativo`,
          tone: data.record.status === "Entregado" ? "success" : "warning",
          timestamp: new Date(data.ts || Date.now()).toISOString(),
          targetPage: PAGE_TRANSPORT,
        });
      }
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (!ignoreResponse) {
          applyRemoteStatePreservingBoardDrafts(remoteState);
        }
      } catch (_) { /* ignorar */ }
    };

    socket.on("transport_record_created", handleTransportRecordCreated);
    socket.on("transport_route_assigned", handleTransportRouteAssigned);
    socket.on("transport_record_postponed", handleTransportRecordPostponed);
    socket.on("transport_record_deleted", handleTransportRecordDeleted);
    socket.on("transport_status_updated", handleTransportStatusUpdated);
    socket.on("documentacion_record_created", handleDocumentacionRecordCreated);
    socket.on("documentacion_record_updated", handleDocumentacionRecordUpdated);
    socket.on("documentacion_route_assigned", handleDocumentacionRouteAssigned);
    socket.on("documentacion_status_updated", handleDocumentacionStatusUpdated);

    return () => {
      ignoreResponse = true;
      socket.off("transport_record_created", handleTransportRecordCreated);
      socket.off("transport_route_assigned", handleTransportRouteAssigned);
      socket.off("transport_record_postponed", handleTransportRecordPostponed);
      socket.off("transport_record_deleted", handleTransportRecordDeleted);
      socket.off("transport_status_updated", handleTransportStatusUpdated);
      socket.off("documentacion_record_created", handleDocumentacionRecordCreated);
      socket.off("documentacion_record_updated", handleDocumentacionRecordUpdated);
      socket.off("documentacion_route_assigned", handleDocumentacionRouteAssigned);
      socket.off("documentacion_status_updated", handleDocumentacionStatusUpdated);
    };
  }, [sessionUserId, socketConnectCount, state?.permissions, state?.users]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) return;

    const sessionUser = Array.isArray(state?.users)
      ? state.users.find((user) => user.id === sessionUserId) || null
      : null;
    const sessionPermissions = normalizePermissions(state?.permissions);
    const isLeadSession = normalizeRole(sessionUser?.role) === ROLE_LEAD;
    const isTransportOperator = Boolean(
      canDoAction(sessionUser, "viewTransportRetail", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportRetail", sessionPermissions)
      || canDoAction(sessionUser, "viewTransportPedidos", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportPedidos", sessionPermissions)
      || canDoAction(sessionUser, "viewTransportInventario", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportInventario", sessionPermissions)
      || canDoAction(sessionUser, "viewTransportDocumentacion", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportDocumentacion", sessionPermissions)
      || canDoAction(sessionUser, "viewTransportAssignments", sessionPermissions)
      || canDoAction(sessionUser, "manageTransportAssignments", sessionPermissions)
    );
    const canReceiveTransportBellNotifications = isTransportOperator || isLeadSession;
    const shouldShowTransportDeviceNotification = isTransportOperator && !isLeadSession;
    if (!canReceiveTransportBellNotifications) return;

    const REMINDER_INTERVAL_MS = 15 * 60 * 1000;
    const toLocalDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    const reminderStorageKey = `transport-unassigned-reminders-${sessionUserId}`;
    const loadSent = () => {
      try {
        const raw = localStorage.getItem(reminderStorageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    };
    const saveSent = (payload) => {
      try {
        localStorage.setItem(reminderStorageKey, JSON.stringify(payload));
      } catch {
        // ignore localStorage quota errors
      }
    };

    const tick = () => {
      const now = Date.now();
      const todayDateKey = toLocalDateKey(new Date(now));
      const activeDateKey = String(state?.transport?.activeDateKey || "").trim();
      const sentMap = loadSent();
      const activeRecords = Array.isArray(state?.transport?.activeRecords) ? state.transport.activeRecords : [];
      const historyRecords = Array.isArray(state?.transport?.historyRecords) ? state.transport.historyRecords : [];
      const records = [...activeRecords, ...historyRecords];
      let hasChanges = false;
      const activeReminderIds = new Set();

      records
        .filter((record) => String(record?.status || "").trim() === "Pendiente")
        .forEach((record) => {
          const recordId = String(record?.id || "").trim();
          if (!recordId) return;

          const assignedTo = String(record?.assignedTo || "").trim();
          if (assignedTo) return;

          const recordDateKey = String(record?.dateKey || "").trim();
          if (recordDateKey && recordDateKey !== todayDateKey) return;
          if (!recordDateKey && activeDateKey && activeDateKey !== todayDateKey) return;

          activeReminderIds.add(recordId);
          const lastSentAt = Number(sentMap[recordId] || 0);
          if (Number.isFinite(lastSentAt) && lastSentAt > 0 && (now - lastSentAt) < REMINDER_INTERVAL_MS) {
            return;
          }

          if (shouldShowTransportDeviceNotification) {
            showTransportNotification("⏰ Ruta pendiente de tomar", {
              body: `${record.destination || "Destino"} sigue sin conductor asignado.`,
              tag: `transport-pending-reminder-${recordId}`,
              alertMode: "sound-only",
            });
          }
          pushNotificationToInbox({
            id: `transport-pending-reminder-${recordId}-${Date.now()}`,
            title: "Ruta pendiente por tomar",
            message: `${record.destination || "Destino"} sigue esperando asignación de conductor.`,
            meta: `Área: ${record.areaId || "Transporte"}`,
            tone: "warning",
            timestamp: new Date().toISOString(),
            targetPage: PAGE_TRANSPORT,
          });

          sentMap[recordId] = now;
          hasChanges = true;
        });

      Object.keys(sentMap).forEach((recordId) => {
        if (activeReminderIds.has(recordId)) return;
        delete sentMap[recordId];
        hasChanges = true;
      });

      if (hasChanges) saveSent(sentMap);
    };

    tick();
    const timer = window.setInterval(tick, 60000);
    return () => {
      window.clearInterval(timer);
    };
  }, [sessionUserId, state?.permissions, state?.users, state?.transport?.activeDateKey, state?.transport?.activeRecords, state?.transport?.historyRecords]);

  // ── Sincronización al volver a la pestaña (visibilitychange) ─────────────────
  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) return;

    let ignoreResponse = false;
    const handleVisibilityChange = async () => {
      if (document.hidden || ignoreResponse) return;
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (ignoreResponse) return;
        applyRemoteStatePreservingBoardDrafts(remoteState);
      } catch (_) { /* Ignorar; el SSE se encargará */ }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      ignoreResponse = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling de respaldo (cada 20 s) cuando el SSE está caído ─────────────────
  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) return;

    let ignoreResponse = false;
    const poll = async () => {
      if (ignoreResponse) return;
      try {
        const remoteState = await requestJson("/warehouse/state");
        if (ignoreResponse) return;
        applyRemoteStatePreservingBoardDrafts(remoteState);
      } catch (_) { /* Ignorar */ }
    };

    const intervalId = globalThis.setInterval(poll, 20_000);
    return () => {
      ignoreResponse = true;
      globalThis.clearInterval(intervalId);
    };
  }, [sessionUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ENABLE_LEGACY_WHOLE_STATE_SYNC) return;
    if (!sessionUserId) return;
    if (!isHydratedRef.current) return;
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    const timer = globalThis.setTimeout(async () => {
      try {
        const nextState = await requestJson("/warehouse/state", {
          method: "PUT",
          body: JSON.stringify(state),
        });
        skipNextSyncRef.current = true;
        const normalizedState = normalizeWarehouseState(nextState);
        setState(normalizedState);
        setLoginDirectory(buildLoginDirectoryFromState(normalizedState));
        setSyncStatus("Sincronizado");
      } catch (error) {
        if (isSessionRequiredError(error)) {
          invalidateClientSession("Tu sesión terminó. Vuelve a iniciar sesión.");
        } else if (error?.status === 409) {
          try {
            const remoteState = await requestJson("/warehouse/state");
            skipNextSyncRef.current = true;
            const normalizedState = normalizeWarehouseState(remoteState);
            setState(normalizedState);
            setLoginDirectory(buildLoginDirectoryFromState(normalizedState));
            setSyncStatus("Sincronizado");
            return;
          } catch {
            // Ignore and fall back to local mode.
          }
        }
        setSyncStatus("Modo local");
      }
    }, 250);

    return () => globalThis.clearTimeout(timer);
  }, [sessionUserId, state]);

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === sessionUserId) || null,
    [sessionUserId, state.users],
  );

  // Subscribe to push notifications once the user is logged in
  useEffect(() => {
    const nick = currentUser?.name;
    if (!nick) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in globalThis)) return;
    let cancelled = false;
    (async () => {
      try {
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        if (permission !== 'granted' || cancelled) return;

        const reg = await navigator.serviceWorker.ready;
        const keyRes = await fetch('/api/chat/push-key', { credentials: 'include' });
        if (!keyRes.ok || cancelled) return;
        const { publicKey } = await keyRes.json();
        if (!publicKey || cancelled) return;

        const appServerKey = urlBase64ToUint8Array(publicKey);
        let sub = await reg.pushManager.getSubscription();

        if (sub) {
          const existingKeyBuffer = sub.options?.applicationServerKey;
          const existingKey = existingKeyBuffer ? new Uint8Array(existingKeyBuffer) : null;
          if (!existingKey || !uint8ArrayEquals(existingKey, appServerKey)) {
            await sub.unsubscribe().catch(() => {});
            sub = null;
          }
        }

        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey,
          });
        }

        if (cancelled) return;
        await fetch('/api/chat/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
      } catch (_) {
        // Push subscription is optional; fail silently
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.name]);

  // Dismiss message notifications when the app becomes visible (user is using the app)
  useEffect(() => {
    if (!currentUser?.name) return;
    function onVisibilityChange() {
      if (!document.hidden && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'DISMISS_MESSAGE_NOTIFICATIONS' });
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [currentUser?.name]);
  const rootLeadId = useMemo(() => {
    const leads = state.users
      .filter((u) => u.role === ROLE_LEAD && u.createdById === BOOTSTRAP_MASTER_ID)
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    return leads[0]?.id || null;
  }, [state.users]);
  const isRootLead = Boolean(currentUser?.id && currentUser.id === rootLeadId);
  const canManageDashboardState = normalizeRole(currentUser?.role) === ROLE_LEAD;
  const managedUserIds = useMemo(
    () => (currentUser ? getManagedUserIds(state.users, currentUser.id) : new Set()),
    [currentUser, state.users],
  );
  const isBootstrapMasterSession = sessionUserId === BOOTSTRAP_MASTER_ID && loginDirectory.system?.masterBootstrapEnabled;
  const isForcedPasswordChange = Boolean(currentUser?.mustChangePassword && sessionUserId && !isBootstrapMasterSession);
  const catalogMap = useMemo(() => new Map(state.catalog.map((item) => [item.id, item])), [state.catalog]);
  const userMap = useMemo(() => new Map(state.users.map((item) => [item.id, item])), [state.users]);
  const activeWeek = useMemo(
    () => state.weeks.find((week) => week.id === selectedWeekId) || state.weeks.find((week) => week.isActive) || state.weeks[0] || null,
    [selectedWeekId, state.weeks],
  );
  const historyWeek = useMemo(
    () => state.weeks.find((week) => week.id === selectedHistoryWeekId) || state.weeks[0] || null,
    [selectedHistoryWeekId, state.weeks],
  );
  const visibleDashboardActivities = useMemo(() => {
    const scopedIds = currentUser ? getManagedUserIds(state.users, currentUser.id) : new Set();
    return state.activities.filter((activity) => !currentUser || currentUser.role === ROLE_LEAD || activity.responsibleId === currentUser.id || scopedIds.has(activity.responsibleId));
  }, [currentUser, state.activities, state.users]);

  const completedActivities = useMemo(
    () => visibleDashboardActivities.filter((activity) => activity.status === STATUS_FINISHED),
    [visibleDashboardActivities],
  );

  const dashboardVisibleControlBoards = useMemo(() => {
    if (!currentUser) return [];
    return (state.controlBoards || []).filter((board) => getBoardVisibleToUser(board, currentUser));
  }, [currentUser, state.controlBoards]);

  const dashboardVisibleBoardHistorySnapshots = useMemo(() => {
    if (!currentUser) return [];
    return (state.boardWeekHistory || []).filter((snapshot) => getBoardVisibleToUser(snapshot, currentUser));
  }, [currentUser, state.boardWeekHistory]);

  const activityPauseSummaryMap = useMemo(() => {
    const summary = new Map();
    (state.pauseLogs || []).forEach((log) => {
      if (!summary.has(log.weekActivityId)) {
        summary.set(log.weekActivityId, { count: 0, totalSeconds: 0, reasons: [], logs: [] });
      }
      const current = summary.get(log.weekActivityId);
      const reason = String(log.pauseReason || "").trim();
      const pausedAt = log.pausedAt || null;
      const resumedAt = log.resumedAt || null;
      const pauseDurationSeconds = Math.max(0, Number(log.pauseDurationSeconds || 0));
      current.count += 1;
      current.totalSeconds += pauseDurationSeconds;
      if (reason) current.reasons.push(reason);
      current.logs.push({
        reason,
        pausedAt,
        resumedAt,
        pauseDurationSeconds,
      });
    });
    return summary;
  }, [state.pauseLogs]);

  const dashboardRecords = useMemo(() => {
    const AREA_KEYWORD_MAP = [
      { keyword: "limpieza", area: "LIMPIEZA" },
      { keyword: "inventario", area: "INVENTARIO" },
      { keyword: "calidad", area: "CALIDAD" },
      { keyword: "embarque", area: "EMBARQUES" },
      { keyword: "pedidos", area: "PEDIDOS" },
      { keyword: "logistica", area: "LOGISTICA" },
    ];

    function normalizeAreaLabel(rawArea) {
      const normalized = normalizeAreaOption(rawArea);
      const trimmedArea = String(normalized || rawArea || "").trim();
      return trimmedArea || "Sin área";
    }

    function normalizeText(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function buildAreaAliases(areaValue) {
      const normalized = normalizeAreaLabel(areaValue);
      if (!normalized || normalized === "Sin área") return [];
      const root = normalizeAreaLabel(getAreaRoot(normalized));
      return Array.from(new Set([normalized, root].filter(Boolean)));
    }

    function getPrimaryArea(areaValue) {
      const normalized = normalizeAreaLabel(areaValue);
      if (!normalized || normalized === "Sin área") return "Sin área";
      return normalizeAreaLabel(getAreaRoot(normalized));
    }

    function resolveBoardAreaScope(board, responsibleUser) {
      const explicitOwnerArea = normalizeAreaLabel(board?.settings?.ownerArea || board?.ownerArea || "");
      if (explicitOwnerArea && explicitOwnerArea !== "Sin área") {
        const primaryArea = getPrimaryArea(explicitOwnerArea);
        return { primaryArea, areaScopes: [primaryArea] };
      }

      const visibility = getNormalizedBoardVisibility(board);
      const scopedAreas = (visibility.sharedDepartments || [])
        .map((area) => getPrimaryArea(area))
        .filter((area) => area && area !== "Sin área");

      if (scopedAreas.length) {
        const primaryArea = scopedAreas[0];
        return { primaryArea, areaScopes: [primaryArea] };
      }

      const ownerArea = normalizeAreaLabel(getUserArea(userMap.get(board?.ownerId)) || "");
      const responsibleArea = normalizeAreaLabel(getUserArea(responsibleUser) || "");
      const primaryArea = getPrimaryArea(ownerArea !== "Sin área" ? ownerArea : responsibleArea);
      return { primaryArea, areaScopes: [primaryArea] };
    }

    const areaRoots = Array.from(new Set((state.areaCatalog || [])
      .flatMap((entry) => buildAreaAliases(entry))
      .filter(Boolean)));

    function resolveActivityAreaScope(activity, responsibleUser) {
      const responsibleArea = normalizeAreaLabel(getUserArea(responsibleUser));
      const catalogItem = catalogMap.get(activity?.catalogActivityId);
      const explicitCatalogArea = normalizeAreaLabel(normalizeCatalogArea(catalogItem?.area, catalogItem?.category));
      if (explicitCatalogArea && explicitCatalogArea !== "Sin área") {
        const primaryArea = getPrimaryArea(explicitCatalogArea);
        return { primaryArea, areaScopes: [primaryArea] };
      }
      const categoryName = String(catalogItem?.category || "").trim();
      if (!categoryName) {
        const primaryArea = getPrimaryArea(responsibleArea);
        return { primaryArea, areaScopes: [primaryArea] };
      }

      const normalizedCategory = normalizeText(categoryName);
      const strictCategoryArea = AREA_KEYWORD_MAP.find((entry) => normalizedCategory.includes(entry.keyword))?.area || "";

      const strictAreaFromCatalog = strictCategoryArea
        ? areaRoots.find((areaRoot) => normalizeText(areaRoot) === normalizeText(strictCategoryArea)) || strictCategoryArea
        : "";

      const matchedArea = areaRoots.find((areaRoot) => {
        const normalizedArea = normalizeText(areaRoot);
        return normalizedArea.includes(normalizedCategory) || normalizedCategory.includes(normalizedArea);
      });

      const primaryArea = getPrimaryArea(strictAreaFromCatalog || matchedArea || responsibleArea);
      return { primaryArea, areaScopes: [primaryArea] };
    }

    function normalizePauseReason(reason) {
      const raw = String(reason || "").trim();
      return raw || "Pausa sin motivo";
    }

    function summarizePauseLogs(logs) {
      const normalizedLogs = (Array.isArray(logs) ? logs : []).map((entry) => ({
        reason: normalizePauseReason(entry?.reason),
        pausedAt: entry?.pausedAt || null,
        resumedAt: entry?.resumedAt || null,
        pauseDurationSeconds: Math.max(0, Number(entry?.pauseDurationSeconds || 0)),
        pauseAuthorizedSeconds: Math.max(0, Number(entry?.pauseAuthorizedSeconds || 0)),
        countedPauseDurationSeconds: (() => {
          const explicitCounted = Number(entry?.countedPauseDurationSeconds);
          if (Number.isFinite(explicitCounted)) return Math.max(0, explicitCounted);
          const fullPauseSeconds = Math.max(0, Number(entry?.pauseDurationSeconds || 0));
          const authorizedSeconds = Math.max(0, Number(entry?.pauseAuthorizedSeconds || 0));
          return Math.max(0, fullPauseSeconds - authorizedSeconds);
        })(),
      }));
      const totalSeconds = normalizedLogs.reduce((sum, entry) => sum + entry.countedPauseDurationSeconds, 0);
      return {
        count: normalizedLogs.length,
        totalSeconds,
        reasons: normalizedLogs.map((entry) => entry.reason),
        logs: normalizedLogs,
      };
    }

    function buildBoardRowPauseSummary(row) {
      const persistedLogs = Array.isArray(row?.pauseLogs) ? row.pauseLogs : [];
      const withLiveDurations = persistedLogs.map((entry) => {
        const pausedAt = entry?.pausedAt || null;
        const resumedAt = entry?.resumedAt || null;
        const reason = normalizePauseReason(entry?.reason || row?.lastPauseReason);
        if (!pausedAt) {
          return {
            reason,
            pausedAt,
            resumedAt,
            pauseDurationSeconds: Math.max(0, Number(entry?.pauseDurationSeconds || 0)),
            pauseAuthorizedSeconds: Math.max(0, Number(entry?.pauseAuthorizedSeconds || 0)),
            countedPauseDurationSeconds: (() => {
              const explicitCounted = Number(entry?.countedPauseDurationSeconds);
              if (Number.isFinite(explicitCounted)) return Math.max(0, explicitCounted);
              const fullPauseSeconds = Math.max(0, Number(entry?.pauseDurationSeconds || 0));
              const authorizedSeconds = Math.max(0, Number(entry?.pauseAuthorizedSeconds || 0));
              return Math.max(0, fullPauseSeconds - authorizedSeconds);
            })(),
          };
        }
        if (resumedAt) {
          return {
            reason,
            pausedAt,
            resumedAt,
            pauseDurationSeconds: Math.max(0, Number(entry?.pauseDurationSeconds || 0)),
            pauseAuthorizedSeconds: Math.max(0, Number(entry?.pauseAuthorizedSeconds || 0)),
            countedPauseDurationSeconds: (() => {
              const explicitCounted = Number(entry?.countedPauseDurationSeconds);
              if (Number.isFinite(explicitCounted)) return Math.max(0, explicitCounted);
              const fullPauseSeconds = Math.max(0, Number(entry?.pauseDurationSeconds || 0));
              const authorizedSeconds = Math.max(0, Number(entry?.pauseAuthorizedSeconds || 0));
              return Math.max(0, fullPauseSeconds - authorizedSeconds);
            })(),
          };
        }
        return {
          reason,
          pausedAt,
          resumedAt: null,
          pauseDurationSeconds: Math.max(0, getOperationalElapsedSeconds(pausedAt, now, operationalPauseState, row?.cleaningSite)),
          pauseAuthorizedSeconds: Math.max(0, Number(entry?.pauseAuthorizedSeconds || row?.pauseAuthorizedSeconds || 0)),
          countedPauseDurationSeconds: Math.max(0, getLivePauseOverflowSeconds({
            ...row,
            pauseStartedAt: pausedAt,
            pauseAuthorizedSeconds: Math.max(0, Number(entry?.pauseAuthorizedSeconds || row?.pauseAuthorizedSeconds || 0)),
          }, now, operationalPauseState)),
        };
      });

      if (!withLiveDurations.length && String(row?.status || "") === STATUS_PAUSED && row?.pauseStartedAt) {
        withLiveDurations.push({
          reason: normalizePauseReason(row?.lastPauseReason),
          pausedAt: row.pauseStartedAt,
          resumedAt: null,
          pauseDurationSeconds: Math.max(0, getOperationalElapsedSeconds(row.pauseStartedAt, now, operationalPauseState, row?.cleaningSite)),
          pauseAuthorizedSeconds: Math.max(0, Number(row?.pauseAuthorizedSeconds || 0)),
          countedPauseDurationSeconds: Math.max(0, getLivePauseOverflowSeconds(row, now, operationalPauseState)),
        });
      }

      return summarizePauseLogs(withLiveDurations);
    }

    const activityRecords = visibleDashboardActivities.map((activity) => {
      const responsibleUser = userMap.get(activity.responsibleId);
      const pauseSummary = activityPauseSummaryMap.get(activity.id) || { count: 0, totalSeconds: 0, reasons: [], logs: [] };
      const durationSeconds = getElapsedSeconds(activity, now, operationalPauseState);
      const limitMinutes = getTimeLimitMinutes(activity, catalogMap);
      const { primaryArea: activityArea, areaScopes } = resolveActivityAreaScope(activity, responsibleUser);
      return {
        id: `activity-${activity.id}`,
        rawId: activity.id,
        source: "activity",
        sourceLabel: "Actividad semanal",
        label: getActivityLabel(activity, catalogMap),
        boardName: "Actividades semanales",
        responsibleId: activity.responsibleId || "",
        responsibleName: responsibleUser?.name || "Sin player",
        area: activityArea,
        areaScopes,
        occurredAt: activity.endTime || activity.activityDate || activity.startTime || activity.lastResumedAt,
        status: activity.status || STATUS_PENDING,
        durationSeconds,
        limitMinutes,
        excessSeconds: limitMinutes > 0 ? Math.max(0, durationSeconds - limitMinutes * 60) : 0,
        pauseCount: pauseSummary.count,
        pauseSeconds: pauseSummary.totalSeconds,
        pauseReasons: pauseSummary.reasons,
        pauseLogEntries: pauseSummary.logs,
      };
    });

    const boardRecords = dashboardVisibleControlBoards.flatMap((board) => (board.rows || []).map((row) => {
      const responsibleUser = userMap.get(row.responsibleId);
      const { primaryArea, areaScopes } = resolveBoardAreaScope(board, responsibleUser);
      const durationSeconds = getElapsedSeconds(row, now, operationalPauseState);
      const totalElapsedSeconds = row.startTime
        ? Math.max(durationSeconds, getOperationalElapsedSeconds(row.startTime, now, operationalPauseState))
        : durationSeconds;
      const pauseSummary = buildBoardRowPauseSummary(row);
      return {
        id: `board-${board.id}-${row.id}`,
        rawId: row.id,
        boardId: board.id,
        source: "board",
        sourceLabel: "Tablero operativo",
        label: board.name,
        boardName: board.name,
        sourceFields: Array.isArray(board.fields) ? board.fields : [],
        rowValues: row.values && typeof row.values === "object" ? row.values : {},
        operationalContextValue: String(board?.settings?.operationalContextValue || "").trim(),
        operationalContextLabel: String(board?.settings?.operationalContextLabel || "").trim(),
        responsibleId: row.responsibleId || "",
        responsibleName: responsibleUser?.name || "Sin player",
        area: primaryArea,
        areaScopes,
        occurredAt: row.endTime || row.startTime || row.lastResumedAt || row.createdAt,
        status: row.status || STATUS_PENDING,
        durationSeconds,
        totalElapsedSeconds,
        limitMinutes: 0,
        excessSeconds: 0,
        pauseCount: pauseSummary.count,
        pauseSeconds: pauseSummary.totalSeconds,
        pauseReasons: pauseSummary.reasons,
        pauseLogEntries: pauseSummary.logs,
      };
    }));

    const historicalBoardRecords = dashboardVisibleBoardHistorySnapshots.flatMap((snapshot) => (snapshot.rows || []).map((row) => {
      const responsibleUser = userMap.get(row.responsibleId);
      const { primaryArea, areaScopes } = resolveBoardAreaScope(snapshot, responsibleUser);
      const resolvedSnapshotBoardId = String(snapshot.boardId || snapshot.sourceBoardId || snapshot.id || "").trim();
      const durationSeconds = getElapsedSeconds(row, now, operationalPauseState);
      const totalElapsedSeconds = row.startTime
        ? Math.max(durationSeconds, getOperationalElapsedSeconds(row.startTime, now, operationalPauseState))
        : durationSeconds;
      const pauseSummary = buildBoardRowPauseSummary(row);
      return {
        id: `board-history-${snapshot.id}-${row.id}`,
        rawId: `${snapshot.id}-${row.id}`,
        boardId: resolvedSnapshotBoardId,
        source: "board",
        sourceLabel: "Histórico de tablero",
        label: snapshot.boardName,
        boardName: snapshot.boardName,
        sourceFields: Array.isArray(snapshot.fields) ? snapshot.fields : [],
        rowValues: row.values && typeof row.values === "object" ? row.values : {},
        operationalContextValue: String(snapshot?.settings?.operationalContextValue || "").trim(),
        operationalContextLabel: String(snapshot?.settings?.operationalContextLabel || "").trim(),
        responsibleId: row.responsibleId || "",
        responsibleName: responsibleUser?.name || "Sin player",
        area: primaryArea,
        areaScopes,
        occurredAt: row.endTime || row.startTime || row.lastResumedAt || row.createdAt || snapshot.archivedAt,
        status: row.status || STATUS_PENDING,
        durationSeconds,
        totalElapsedSeconds,
        limitMinutes: 0,
        excessSeconds: 0,
        pauseCount: pauseSummary.count,
        pauseSeconds: pauseSummary.totalSeconds,
        pauseReasons: pauseSummary.reasons,
        pauseLogEntries: pauseSummary.logs,
      };
    }));

    return activityRecords
      .concat(boardRecords, historicalBoardRecords)
      .filter((record) => Boolean(record.occurredAt));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityPauseSummaryMap, catalogMap, dashboardVisibleBoardHistorySnapshots, dashboardVisibleControlBoards, now, operationalPauseState, state.activities, userMap, visibleDashboardActivities]);

  const dateFilteredDashboardRecords = useMemo(() => {
    const rawStartDate = getDashboardFilterStartDate(dashboardFilters.startDate);
    const rawEndDate = getDashboardFilterEndDate(dashboardFilters.endDate);
    const startDate = rawStartDate || (rawEndDate ? getDashboardFilterStartDate(dashboardFilters.endDate) : null);
    const endDate = rawEndDate || (rawStartDate ? getDashboardFilterEndDate(dashboardFilters.startDate) : null);
    return dashboardRecords.filter((record) => {
      const occurredAt = new Date(record.occurredAt);
      if (Number.isNaN(occurredAt.getTime())) return false;
      const startOk = !startDate || occurredAt >= startDate;
      const endOk = !endDate || occurredAt <= endDate;
      return startOk && endOk;
    });
  }, [dashboardFilters.endDate, dashboardFilters.startDate, dashboardRecords]);

  const dashboardPeriodOptions = useMemo(() => {
    const optionsMap = new Map();
    dateFilteredDashboardRecords.forEach((record) => {
      const key = getDashboardPeriodKey(record.occurredAt, dashboardFilters.periodType);
      if (!key || optionsMap.has(key)) return;
      const range = getDashboardPeriodRange(record.occurredAt, dashboardFilters.periodType);
      optionsMap.set(key, {
        value: key,
        label: formatDashboardPeriodLabel(key, dashboardFilters.periodType),
        sortTime: range?.start?.getTime() || 0,
      });
    });

    return [{ value: "all", label: `Todos los ${getDashboardPeriodTypeLabel(dashboardFilters.periodType).toLowerCase()}s` }].concat(
      Array.from(optionsMap.values()).sort((a, b) => b.sortTime - a.sortTime).map(({ value, label }) => ({ value, label })),
    );
  }, [dashboardFilters.periodType, dateFilteredDashboardRecords]);

  const dashboardEffectiveAreaFilter = useMemo(() => {
    return dashboardFilters.area;
  }, [dashboardFilters.area]);

  useEffect(() => {
    if (dashboardFilters.periodKey === "all") return;
    if (!dashboardPeriodOptions.some((option) => option.value === dashboardFilters.periodKey)) {
      setDashboardFilters((current) => ({ ...current, periodKey: "all" }));
    }
  }, [dashboardFilters.periodKey, dashboardPeriodOptions]);

  const filteredDashboardRecords = useMemo(() => {
    function normalizeAreaMatch(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function areaMatchesFilter(scopedAreas, areaFilter) {
      if (areaFilter === "all") return true;
      const filters = Array.isArray(areaFilter) ? areaFilter : [areaFilter];
      const normalizedFilters = filters.map((value) => normalizeAreaMatch(value)).filter(Boolean);
      if (!normalizedFilters.length) return true;

      return scopedAreas.some((area) => {
        const rootArea = normalizeAreaMatch(getAreaRoot(area) || area);
        return normalizedFilters.some((filter) => rootArea === filter || rootArea.includes(filter) || filter.includes(rootArea));
      });
    }

    return dateFilteredDashboardRecords.filter((record) => {
      const periodOk = dashboardFilters.periodKey === "all" || getDashboardPeriodKey(record.occurredAt, dashboardFilters.periodType) === dashboardFilters.periodKey;
      const responsibleOk = dashboardFilters.responsibleId === "all" || record.responsibleId === dashboardFilters.responsibleId;
      const scopedAreas = Array.isArray(record.areaScopes) && record.areaScopes.length ? record.areaScopes : [record.area];
      const areaOk = areaMatchesFilter(scopedAreas, dashboardEffectiveAreaFilter);
      const sourceOk = dashboardFilters.source === "all" || record.source === dashboardFilters.source;
      return periodOk && responsibleOk && areaOk && sourceOk;
    });
  }, [dashboardEffectiveAreaFilter, dashboardFilters, dateFilteredDashboardRecords]);

  const filteredDashboardActivities = useMemo(
    () => filteredDashboardRecords.filter((record) => record.source === "activity"),
    [filteredDashboardRecords],
  );

  const filteredDashboardCompleted = useMemo(
    () => filteredDashboardRecords.filter((record) => record.status === STATUS_FINISHED),
    [filteredDashboardRecords],
  );

  const dashboardPauseLogs = useMemo(
    () => filteredDashboardRecords.flatMap((record) => (Array.isArray(record.pauseLogEntries) ? record.pauseLogEntries : [])),
    [filteredDashboardRecords],
  );

  const dashboardMetrics = useMemo(() => {
    const activeCatalogSnapshot = (state.catalog || []).filter((item) => !item.isDeleted);
    const catalogItemsSnapshot = dashboardEffectiveAreaFilter === "all"
      ? activeCatalogSnapshot
      : activeCatalogSnapshot.filter((item) => {
        const itemArea = normalizeCatalogArea(item?.area, item?.category);
        const itemRoot = normalizeAreaOption(getAreaRoot(itemArea));
        const areaFilters = Array.isArray(dashboardEffectiveAreaFilter) ? dashboardEffectiveAreaFilter : [dashboardEffectiveAreaFilter];
        const normalizedFilters = areaFilters.map((value) => normalizeAreaOption(getAreaRoot(value) || value)).filter(Boolean);
        return normalizedFilters.some((selectedRoot) => selectedRoot !== "Sin área" && itemRoot === selectedRoot);
      });
    const total = filteredDashboardRecords.length;
    const activityRecords = filteredDashboardRecords.filter((record) => record.source === "activity").length;
    const boardRecords = filteredDashboardRecords.filter((record) => record.source === "board").length;
    const completed = filteredDashboardRecords.filter((record) => record.status === STATUS_FINISHED).length;
    const running = filteredDashboardRecords.filter((record) => record.status === STATUS_RUNNING).length;
    const paused = filteredDashboardRecords.filter((record) => record.status === STATUS_PAUSED).length;
    const totalSeconds = filteredDashboardCompleted.reduce((sum, record) => sum + record.durationSeconds, 0);
    const averageMinutes = filteredDashboardCompleted.length ? totalSeconds / filteredDashboardCompleted.length / 60 : 0;
    const medianMinutes = filteredDashboardCompleted.length
      ? [...filteredDashboardCompleted].sort((a, b) => a.durationSeconds - b.durationSeconds)[Math.floor(filteredDashboardCompleted.length / 2)].durationSeconds / 60
      : 0;
    const sorted = [...filteredDashboardCompleted].sort((a, b) => a.durationSeconds - b.durationSeconds);
    const slaScoped = filteredDashboardRecords.filter((record) => record.limitMinutes > 0);
    const within = slaScoped.filter((record) => record.durationSeconds <= record.limitMinutes * 60).length;
    const exceeded = slaScoped.filter((record) => record.durationSeconds > record.limitMinutes * 60);
    const totalPauseSeconds = dashboardPauseLogs.reduce((sum, log) => sum + (log.pauseDurationSeconds || 0), 0);
    const totalProductionSeconds = filteredDashboardRecords.reduce((sum, r) => sum + (r.durationSeconds || 0), 0);
    const totalElapsedSeconds = filteredDashboardRecords.reduce((sum, r) => sum + (r.totalElapsedSeconds || r.durationSeconds || 0), 0);
    const globalEfficiency = totalElapsedSeconds > 0 ? (totalProductionSeconds / totalElapsedSeconds) * 100 : 100;
    const catalogMandatoryCount = catalogItemsSnapshot.filter((item) => item.isMandatory).length;
    const catalogOptionalCount = Math.max(0, catalogItemsSnapshot.length - catalogMandatoryCount);
    const catalogFrequencyTypes = new Set(catalogItemsSnapshot.map((item) => String(item.frequency || "daily"))).size;
    return {
      total,
      activityRecords,
      boardRecords,
      completed,
      running,
      paused,
      totalHours: totalSeconds / 3600,
      averageMinutes,
      medianMinutes,
      fastest: sorted[0] || null,
      slowest: sorted.at(-1) || null,
      withinPercent: slaScoped.length ? (within / slaScoped.length) * 100 : 0,
      outsidePercent: slaScoped.length ? (exceeded.length / slaScoped.length) * 100 : 0,
      exceeded,
      pauseCount: dashboardPauseLogs.length,
      pauseHours: totalPauseSeconds / 3600,
      productionHours: totalProductionSeconds / 3600,
      efficiency: globalEfficiency,
      areaCount: new Set(filteredDashboardRecords.map((record) => record.area)).size,
      boardCount: new Set(filteredDashboardRecords.map((record) => record.boardName)).size,
      catalogActiveCount: catalogItemsSnapshot.length,
      catalogMandatoryCount,
      catalogOptionalCount,
      catalogFrequencyTypes,
    };
  }, [
    dashboardEffectiveAreaFilter,
    dashboardPauseLogs,
    filteredDashboardCompleted,
    filteredDashboardRecords,
    state.catalog,
  ]);

  const rankingByUser = useMemo(() => {
    const groups = new Map();
    filteredDashboardCompleted.forEach((record) => {
      if (!groups.has(record.responsibleId)) groups.set(record.responsibleId, []);
      groups.get(record.responsibleId).push(record.durationSeconds || 0);
    });
    return Array.from(groups.entries())
      .map(([responsibleId, values]) => ({
        responsibleId,
        averageMinutes: values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1) / 60,
        totalRecords: values.length,
      }))
      .sort((a, b) => a.averageMinutes - b.averageMinutes);
  }, [filteredDashboardCompleted]);

  const distributionByUser = useMemo(() => {
    const total = filteredDashboardRecords.length;
    if (!total) return [];
    const groups = new Map();
    filteredDashboardRecords.forEach((record) => {
      groups.set(record.responsibleId, (groups.get(record.responsibleId) || 0) + 1);
    });
    return Array.from(groups.entries()).map(([responsibleId, count]) => ({
      responsibleId,
      percent: (count / total) * 100,
      count,
    }));
  }, [filteredDashboardRecords]);

  const activityVsLimit = useMemo(() => {
    const groups = new Map();
    filteredDashboardActivities.forEach((record) => {
      if (!record.limitMinutes) return;
      const key = record.label;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record.durationSeconds || 0);
    });
    return Array.from(groups.entries()).map(([label, values]) => ({
      label,
      averageMinutes: values.reduce((sum, value) => sum + value, 0) / values.length / 60,
      limitMinutes: filteredDashboardActivities.find((record) => record.label === label)?.limitMinutes || 0,
    }));
  }, [filteredDashboardActivities]);

  const pauseAnalysis = useMemo(() => {
    const groups = new Map();

    function sanitizePauseReason(reason) {
      const base = String(reason || "").trim();
      if (!base) return "Pausa sin motivo";
      const normalized = base.replace(/\s+/g, " ");
      const suffixMatch = normalized.match(/^([\p{L}\s]{3,}?)(\d{1,4})$/u);
      return suffixMatch ? suffixMatch[1].trim() : normalized;
    }

    function registerPause(reason, seconds) {
      const normalizedReason = sanitizePauseReason(reason);
      if (!groups.has(normalizedReason)) {
        groups.set(normalizedReason, { reason: normalizedReason, count: 0, totalSeconds: 0 });
      }
      const item = groups.get(normalizedReason);
      item.count += 1;
      item.totalSeconds += Math.max(0, Number(seconds || 0));
    }

    dashboardPauseLogs.forEach((log) => {
      registerPause(log.pauseReason || log.reason, log.pauseDurationSeconds || 0);
    });

    const totalPauseSeconds = Array.from(groups.values()).reduce((sum, item) => sum + item.totalSeconds, 0);

    return Array.from(groups.values())
      .map((item) => ({
        ...item,
        percent: totalPauseSeconds ? (item.totalSeconds / totalPauseSeconds) * 100 : 0,
      }))
      .sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [dashboardPauseLogs]);

  const dashboardDynamicMetricRows = useMemo(() => {
    const boardRecords = filteredDashboardRecords.filter((record) => record.source === "board");
    if (!boardRecords.length) return [];

    const boardMap = new Map((dashboardVisibleControlBoards || []).map((board) => [String(board.id || ""), board]));
    const measurableTypes = new Set([
      "number",
      "currency",
      "percentage",
      "progress",
      "counter",
      "rating",
      "score",
      "time",
      "duration",
      "formula",
      "weight",
      "temperature",
    ]);
    const ignoredMetricLabelTokens = ["hora inicio", "hora fin", "fecha inicio", "fecha fin"];
    const metricMap = new Map();

    function parseNumericValue(rawValue) {
      if (typeof rawValue === "number") return Number.isFinite(rawValue) ? rawValue : null;
      const rawText = String(rawValue || "").trim();
      if (!rawText) return null;

      let cleaned = rawText.replace(/\s+/g, "");
      cleaned = cleaned.replace(/[^\d,.-]/g, "");
      if (!cleaned) return null;

      const hasComma = cleaned.includes(",");
      const hasDot = cleaned.includes(".");
      if (hasComma && hasDot) {
        if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
          cleaned = cleaned.replaceAll(".", "").replace(",", ".");
        } else {
          cleaned = cleaned.replaceAll(",", "");
        }
      } else if (hasComma && !hasDot) {
        cleaned = cleaned.replace(",", ".");
      }

      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    }

    function parseMetricValue(rawValue, fieldType) {
      if (fieldType === "time" || fieldType === "duration") {
        const normalized = String(rawValue || "").trim();
        if (!normalized) return null;

        const hhmmssMatch = normalized.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
        if (hhmmssMatch) {
          const hours = Number(hhmmssMatch[1]);
          const minutes = Number(hhmmssMatch[2]);
          const seconds = Number(hhmmssMatch[3]);
          if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
          return (hours * 60) + minutes + (seconds / 60);
        }

        const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
        if (hhmmMatch) {
          const hours = Number(hhmmMatch[1]);
          const minutes = Number(hhmmMatch[2]);
          if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
          return hours * 60 + minutes;
        }

        const numericMinutes = parseNumericValue(normalized);
        return Number.isFinite(numericMinutes) ? numericMinutes : null;
      }

      return parseNumericValue(rawValue);
    }

    boardRecords.forEach((record) => {
      const board = boardMap.get(String(record.boardId || "").trim());
      const recordFields = Array.isArray(record.sourceFields) ? record.sourceFields : [];
      const fields = recordFields.length > 0 ? recordFields : (Array.isArray(board?.fields) ? board.fields : []);
      const rowIdentifier = String(record.rawId || record.rowId || "").trim();
      const rowValues = record.rowValues && typeof record.rowValues === "object"
        ? record.rowValues
        : ((board?.rows || []).find((entry) => entry.id === rowIdentifier)?.values || null);
      if (!fields.length || !rowValues) return;

      fields.forEach((field) => {
        const fieldType = String(field?.type || "").trim();
        if (!measurableTypes.has(fieldType)) return;
        const normalizedLabel = String(field?.label || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim();
        if (ignoredMetricLabelTokens.some((token) => normalizedLabel.includes(token))) return;
        const numericValue = parseMetricValue(rowValues?.[field.id], fieldType);
        if (!Number.isFinite(numericValue)) return;

        const resolvedBoardId = String(record.boardId || board?.id || "sin-tablero").trim() || "sin-tablero";
        const key = `${record.area}::${resolvedBoardId}::${field.id}`;
        if (!metricMap.has(key)) {
          metricMap.set(key, {
            key,
            area: record.area || "Sin área",
            boardId: resolvedBoardId,
            boardName: record.boardName || board?.name || "Tablero",
            fieldId: field.id,
            fieldLabel: String(field.label || "Métrica"),
            fieldType,
            unit: (fieldType === "time" || fieldType === "duration")
              ? "min"
              : (fieldType === "percentage" || fieldType === "progress")
                ? "%"
                : fieldType === "currency"
                  ? "$"
                  : fieldType === "weight"
                    ? "kg"
                    : fieldType === "temperature"
                      ? "°C"
                      : fieldType === "score"
                        ? "pts"
                        : "",
            count: 0,
            sum: 0,
            min: Number.POSITIVE_INFINITY,
            max: Number.NEGATIVE_INFINITY,
          });
        }

        const metric = metricMap.get(key);
        metric.count += 1;
        metric.sum += numericValue;
        metric.min = Math.min(metric.min, numericValue);
        metric.max = Math.max(metric.max, numericValue);
      });
    });

    return Array.from(metricMap.values())
      .map((item) => ({
        ...item,
        average: item.count ? item.sum / item.count : 0,
      }))
      .sort((left, right) => {
        if (left.area !== right.area) return left.area.localeCompare(right.area, "es-MX");
        if (left.boardName !== right.boardName) return left.boardName.localeCompare(right.boardName, "es-MX");
        return left.fieldLabel.localeCompare(right.fieldLabel, "es-MX");
      });
  }, [dashboardVisibleControlBoards, filteredDashboardRecords]);

  const dashboardInventoryProductTimeRows = useMemo(() => {
    // Mostrar LITERALMENTE cada registro del tablero con sus campos REALES
    const inventoryRecords = filteredDashboardRecords.filter((record) => record.source === "board");
    if (!inventoryRecords.length) return [];

    return inventoryRecords.map((record, index) => {
      const recordFields = Array.isArray(record.sourceFields) ? record.sourceFields : [];
      return {
        key: `${record.id}-${index}`,
        id: record.id,
        area: record.area || "Sin área",
        boardId: String(record.boardId || "").trim() || "sin-tablero",
        boardName: record.boardName || "Tablero",
          rowLabel: String(record.label || record.name || "").trim(),
          rawRecord: record,
        rowValues: record.rowValues || {},
        sourceFields: recordFields,
        durationSeconds: record.durationSeconds || 0,
        occurredAt: record.occurredAt,
        responsibleName: record.responsibleName || "Sin responsable",
      };
    }).sort((left, right) => new Date(right.occurredAt || 0).getTime() - new Date(left.occurredAt || 0).getTime());
  }, [filteredDashboardRecords]);

  const dashboardProductAggregateRows = useMemo(() => {
    // Agregación por tarima + producto con tiempo REAL
    const aggregateMap = new Map();
    
    dashboardInventoryProductTimeRows.forEach((row) => {
      if (!row.rowValues || typeof row.rowValues !== "object") return;
      if (!Array.isArray(row.sourceFields)) return;
      
      // Buscar tarima
      let tarimValue = "Sin tarima";
      const tarimField = row.sourceFields.find((f) => {
        const label = String(f?.label || f?.name || "").toLowerCase();
        return label.includes("tarima") || label.includes("pallet") || label.includes("palet");
      });
      if (tarimField && row.rowValues[tarimField.id]) {
        tarimValue = String(row.rowValues[tarimField.id]);
      }
      
      // Buscar producto
      let productValue = "Sin producto";
      const prodField = row.sourceFields.find((f) => {
        const label = String(f?.label || f?.name || "").toLowerCase();
        return label.includes("producto") || label.includes("sku") || label.includes("articulo") || label.includes("item");
      });
      if (prodField && row.rowValues[prodField.id]) {
        productValue = String(row.rowValues[prodField.id]);
      }
      
      // Calcular tiempo en minutos (usar durationSeconds directamente)
      const timeMinutes = (row.durationSeconds || 0) / 60;
      
      // Clave de agregación: tarima|producto
      const aggregateKey = `${tarimValue}|${productValue}`;
      
      if (!aggregateMap.has(aggregateKey)) {
        aggregateMap.set(aggregateKey, {
          key: aggregateKey,
          tarima: tarimValue,
          product: productValue,
          area: row.area,
          boardId: row.boardId,
          boardName: row.boardName,
          count: 0,
          totalMinutes: 0,
          minMinutes: Infinity,
          maxMinutes: -Infinity,
        });
      }
      
      const entry = aggregateMap.get(aggregateKey);
      entry.count += 1;
      entry.totalMinutes += timeMinutes;
      if (timeMinutes > 0) {
        entry.minMinutes = Math.min(entry.minMinutes, timeMinutes);
        entry.maxMinutes = Math.max(entry.maxMinutes, timeMinutes);
      }
    });
    
    return Array.from(aggregateMap.values())
      .map((row) => ({
        ...row,
        minMinutes: row.minMinutes === Infinity ? 0 : row.minMinutes,
        maxMinutes: row.maxMinutes === -Infinity ? 0 : row.maxMinutes,
        averageMinutes: row.count > 0 ? row.totalMinutes / row.count : 0,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [dashboardInventoryProductTimeRows]);

  const dashboardAreaBoardDetailedRows = useMemo(() => {
    const areaMap = new Map();

    const metricsByAreaBoardKey = new Map();
    dashboardDynamicMetricRows.forEach((metric) => {
      const boardToken = metric.boardId ? `id:${metric.boardId}` : `name:${metric.boardName || "Tablero"}`;
      const key = `${metric.area || "Sin área"}::${boardToken}`;
      if (!metricsByAreaBoardKey.has(key)) metricsByAreaBoardKey.set(key, []);
      metricsByAreaBoardKey.get(key).push(metric);
    });

    const inventoryByAreaBoardKey = new Map();
    dashboardInventoryProductTimeRows.forEach((item) => {
      const boardToken = item.boardId ? `id:${item.boardId}` : `name:${item.boardName || "Tablero"}`;
      const key = `${item.area || "Sin área"}::${boardToken}`;
      if (!inventoryByAreaBoardKey.has(key)) inventoryByAreaBoardKey.set(key, []);
      inventoryByAreaBoardKey.get(key).push(item);
    });

    filteredDashboardRecords.forEach((record) => {
      const areaName = record.area || "Sin área";
      const boardName = record.boardName || "Tablero";
      const boardToken = record.boardId ? `id:${record.boardId}` : `name:${boardName}`;

      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, {
          area: areaName,
          totalRecords: 0,
          completed: 0,
          running: 0,
          paused: 0,
          totalSeconds: 0,
          pauseSeconds: 0,
          boardsMap: new Map(),
        });
      }

      const area = areaMap.get(areaName);
      area.totalRecords += 1;
      area.totalSeconds += Number(record.durationSeconds || 0);
      area.pauseSeconds += Number(record.pauseSeconds || 0);
      if (record.status === STATUS_FINISHED) area.completed += 1;
      if (record.status === STATUS_RUNNING) area.running += 1;
      if (record.status === STATUS_PAUSED) area.paused += 1;

      if (!area.boardsMap.has(boardToken)) {
        area.boardsMap.set(boardToken, {
          boardToken,
          boardId: record.boardId || "",
          boardName,
          sourceLabel: record.sourceLabel || "Operación",
          totalRecords: 0,
          completed: 0,
          running: 0,
          paused: 0,
          totalSeconds: 0,
          elapsedSeconds: 0,
          pauseSeconds: 0,
          responsibleSet: new Set(),
          pauseReasonMap: new Map(),
          latestOccurredAt: null,
        });
      }

      const board = area.boardsMap.get(boardToken);
      board.totalRecords += 1;
      board.totalSeconds += Number(record.durationSeconds || 0);
      board.elapsedSeconds += Number(record.totalElapsedSeconds || record.durationSeconds || 0);
      board.pauseSeconds += Number(record.pauseSeconds || 0);
      if (record.status === STATUS_FINISHED) board.completed += 1;
      if (record.status === STATUS_RUNNING) board.running += 1;
      if (record.status === STATUS_PAUSED) board.paused += 1;
      if (record.responsibleId) board.responsibleSet.add(record.responsibleId);

      const recordTime = new Date(record.occurredAt).getTime();
      if (Number.isFinite(recordTime) && (!board.latestOccurredAt || recordTime > board.latestOccurredAt)) {
        board.latestOccurredAt = recordTime;
      }

      const normalizedReasons = Array.isArray(record.pauseReasons)
        ? record.pauseReasons.map((reason) => String(reason || "").trim()).filter(Boolean)
        : [];
      const pauseReasonList = normalizedReasons.length ? normalizedReasons : (Number(record.pauseSeconds || 0) > 0 ? ["Pausa sin motivo"] : []);
      const splitSeconds = pauseReasonList.length > 0 ? Number(record.pauseSeconds || 0) / pauseReasonList.length : 0;
      pauseReasonList.forEach((reason) => {
        if (!board.pauseReasonMap.has(reason)) {
          board.pauseReasonMap.set(reason, { reason, count: 0, seconds: 0 });
        }
        const reasonEntry = board.pauseReasonMap.get(reason);
        reasonEntry.count += 1;
        reasonEntry.seconds += splitSeconds;
      });
    });

    return Array.from(areaMap.values())
      .map((area) => {
        const boards = Array.from(area.boardsMap.values())
          .map((board) => {
            const mapKey = `${area.area}::${board.boardToken}`;
            const dynamicMetrics = (metricsByAreaBoardKey.get(mapKey) || [])
              .slice()
              .sort((left, right) => right.count - left.count || right.average - left.average);
            const inventoryProducts = (inventoryByAreaBoardKey.get(mapKey) || [])
              .slice()
              .sort((left, right) => right.totalMinutes - left.totalMinutes || right.averageMinutes - left.averageMinutes)
              .slice(0, 6);
            const completionPercent = board.totalRecords ? (board.completed / board.totalRecords) * 100 : 0;
            const averageCycleMinutes = board.completed ? board.totalSeconds / board.completed / 60 : 0;
            const efficiencyPercent = board.elapsedSeconds > 0 ? (board.totalSeconds / board.elapsedSeconds) * 100 : 100;

            return {
              boardToken: board.boardToken,
              boardId: board.boardId,
              boardName: board.boardName,
              sourceLabel: board.sourceLabel,
              totalRecords: board.totalRecords,
              completed: board.completed,
              running: board.running,
              paused: board.paused,
              completionPercent,
              averageCycleMinutes,
              totalHours: board.totalSeconds / 3600,
              productionHours: board.totalSeconds / 3600,
              pauseHours: board.pauseSeconds / 3600,
              efficiencyPercent,
              responsibleCount: board.responsibleSet.size,
              latestOccurredAt: board.latestOccurredAt,
              topPauseReasons: Array.from(board.pauseReasonMap.values())
                .sort((left, right) => right.seconds - left.seconds || right.count - left.count)
                .slice(0, 4),
              dynamicMetrics,
              inventoryProducts,
            };
          })
          .sort((left, right) => right.totalRecords - left.totalRecords || left.boardName.localeCompare(right.boardName, "es-MX"));

        return {
          area: area.area,
          totalRecords: area.totalRecords,
          completed: area.completed,
          running: area.running,
          paused: area.paused,
          completionPercent: area.totalRecords ? (area.completed / area.totalRecords) * 100 : 0,
          totalHours: area.totalSeconds / 3600,
          pauseHours: area.pauseSeconds / 3600,
          boardCount: boards.length,
          boards,
        };
      })
      .sort((left, right) => right.totalRecords - left.totalRecords || left.area.localeCompare(right.area, "es-MX"));
  }, [dashboardDynamicMetricRows, dashboardInventoryProductTimeRows, filteredDashboardRecords]);

  const dashboardAreaRows = useMemo(() => {
    const groups = new Map();
    filteredDashboardRecords.forEach((record) => {
      if (!groups.has(record.area)) {
        groups.set(record.area, { area: record.area, total: 0, completed: 0, totalSeconds: 0, slaTotal: 0, slaWithin: 0, boards: new Set() });
      }
      const item = groups.get(record.area);
      item.total += 1;
      item.boards.add(record.boardName);
      if (record.status === STATUS_FINISHED) {
        item.completed += 1;
        item.totalSeconds += record.durationSeconds || 0;
      }
      if (record.limitMinutes > 0) {
        item.slaTotal += 1;
        if (record.durationSeconds <= record.limitMinutes * 60) item.slaWithin += 1;
      }
    });
    return Array.from(groups.values())
      .map((item) => ({
        area: item.area,
        total: item.total,
        completed: item.completed,
        averageMinutes: item.completed ? item.totalSeconds / item.completed / 60 : 0,
        slaPercent: item.slaTotal ? (item.slaWithin / item.slaTotal) * 100 : 0,
        boardCount: item.boards.size,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredDashboardRecords]);

  const dashboardTrendRows = useMemo(() => {
    function normalizeAreaMatch(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function areaMatchesFilter(scopedAreas, areaFilter) {
      if (areaFilter === "all") return true;
      const filters = Array.isArray(areaFilter) ? areaFilter : [areaFilter];
      const normalizedFilters = filters.map((value) => normalizeAreaMatch(value)).filter(Boolean);
      if (!normalizedFilters.length) return true;
      return scopedAreas.some((area) => {
        const root = normalizeAreaMatch(getAreaRoot(area) || area);
        return normalizedFilters.some((filter) => root === filter || root.includes(filter) || filter.includes(root));
      });
    }

    const groups = new Map();
    dashboardRecords
      .filter((record) => {
        const responsibleOk = dashboardFilters.responsibleId === "all" || record.responsibleId === dashboardFilters.responsibleId;
        const scopedAreas = Array.isArray(record.areaScopes) && record.areaScopes.length ? record.areaScopes : [record.area];
        const areaOk = areaMatchesFilter(scopedAreas, dashboardEffectiveAreaFilter);
        const sourceOk = dashboardFilters.source === "all" || record.source === dashboardFilters.source;
        return responsibleOk && areaOk && sourceOk;
      })
      .forEach((record) => {
        const key = getDashboardPeriodKey(record.occurredAt, dashboardFilters.periodType);
        if (!groups.has(key)) {
          groups.set(key, { key, label: formatDashboardPeriodLabel(key, dashboardFilters.periodType), total: 0, completed: 0, totalSeconds: 0, sortTime: getDashboardPeriodRange(record.occurredAt, dashboardFilters.periodType)?.start?.getTime() || 0 });
        }
        const item = groups.get(key);
        item.total += 1;
        if (record.status === STATUS_FINISHED) {
          item.completed += 1;
          item.totalSeconds += record.durationSeconds || 0;
        }
      });

    return Array.from(groups.values())
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, 6)
      .reverse();
  }, [dashboardEffectiveAreaFilter, dashboardFilters.periodType, dashboardFilters.responsibleId, dashboardFilters.source, dashboardRecords]);

  const dashboardParetoRows = useMemo(() => {
    const reasonMap = new Map();
    pauseAnalysis.forEach((item) => {
      reasonMap.set(`pause-${item.reason}`, {
        label: item.reason || "Pausa sin motivo",
        impactSeconds: item.totalSeconds,
        count: item.count,
      });
    });

    const excessGroups = new Map();
    dashboardMetrics.exceeded.forEach((record) => {
      if (!excessGroups.has(record.label)) {
        excessGroups.set(record.label, { label: `Exceso en ${record.label}`, impactSeconds: 0, count: 0 });
      }
      const item = excessGroups.get(record.label);
      item.impactSeconds += record.excessSeconds || 0;
      item.count += 1;
    });

    const combined = Array.from(reasonMap.values()).concat(Array.from(excessGroups.values())).sort((a, b) => b.impactSeconds - a.impactSeconds);
    const totalImpact = combined.reduce((sum, item) => sum + item.impactSeconds, 0);
    let cumulative = 0;

    return combined.slice(0, 8).map((item) => {
      const percent = totalImpact ? (item.impactSeconds / totalImpact) * 100 : 0;
      cumulative += percent;
      return {
        ...item,
        percent,
        cumulativePercent: cumulative,
      };
    });
  }, [dashboardMetrics.exceeded, pauseAnalysis]);

  const dashboardIshikawaRows = useMemo(() => {
    const groups = new Map();
    dashboardParetoRows.forEach((item) => {
      const category = getIshikawaCategory(item.label);
      if (!groups.has(category)) {
        groups.set(category, { category, impact: 0, count: 0, examples: [] });
      }
      const current = groups.get(category);
      current.impact += item.percent;
      current.count += item.count;
      if (current.examples.length < 3) current.examples.push(item.label);
    });
    return Array.from(groups.values()).sort((a, b) => b.impact - a.impact);
  }, [dashboardParetoRows]);

  const adminReportRows = useMemo(() => {
    return state.catalog
      .filter((item) => !item.isDeleted)
      .map((item) => {
        const exceeded = completedActivities.filter(
          (activity) => activity.catalogActivityId === item.id && activity.accumulatedSeconds > item.timeLimitMinutes * 60,
        );
        const averageExcessMinutes = exceeded.length
          ? exceeded.reduce((sum, activity) => sum + (activity.accumulatedSeconds - item.timeLimitMinutes * 60), 0) / exceeded.length / 60
          : 0;
        return {
          ...item,
          excessCount: exceeded.length,
          averageExcessMinutes,
        };
      })
      .sort((a, b) => b.excessCount - a.excessCount);
  }, [completedActivities, state.catalog]);

  const historyPauseLogs = useMemo(() => {
    if (!historyPauseActivityId) return [];
    return state.pauseLogs.filter((log) => log.weekActivityId === historyPauseActivityId);
  }, [historyPauseActivityId, state.pauseLogs]);

  const visibleUsers = useMemo(() => {
    if (!currentUser) return [];
    return state.users.filter((user) => canViewUserByAreaScope(currentUser, user));
  }, [currentUser, state.users]);
  const activeAssignableUsers = useMemo(() => visibleUsers.filter((user) => user.isActive), [visibleUsers]);

  // Todos los roles disponibles: base + personalizados
  const allRoles = useMemo(() => [
    ...USER_ROLES,
    ...(state.customRoles || []).map((r) => r.name),
  ], [state.customRoles]);

  const creatableRoles = useMemo(
    () => currentUser ? allRoles.filter((role) => canCreateRole(currentUser.role, role)) : [],
    [allRoles, currentUser],
  );

  const filteredUsers = useMemo(() => {
    return visibleUsers.filter((user) => {
      const matchesSearch = !userSearch.trim() || user.name.toLowerCase().includes(userSearch.trim().toLowerCase());
      const matchesRole = userRoleFilter === "Todos los roles" || user.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [userRoleFilter, userSearch, visibleUsers]);

  const userStats = useMemo(
    () => ({
      total: visibleUsers.length,
      active: visibleUsers.filter((user) => user.isActive).length,
      admins: visibleUsers.filter((user) => user.role === ROLE_SR || user.role === ROLE_SSR).length,
      inactive: visibleUsers.filter((user) => !user.isActive).length,
    }),
    [visibleUsers],
  );

  const boardAssignmentsByUser = useMemo(() => {
    const counts = new Map();
    (state.controlBoards || []).forEach((board) => {
      const relatedUserIds = new Set([board.createdById, board.ownerId, ...(board.accessUserIds || [])].filter(Boolean));
      relatedUserIds.forEach((userId) => {
        counts.set(userId, (counts.get(userId) || 0) + 1);
      });
    });
    return counts;
  }, [state.controlBoards]);

  const usersCreatedByMap = useMemo(() => {
    const counts = new Map();
    (state.users || []).forEach((user) => {
      if (!user.createdById) return;
      counts.set(user.createdById, (counts.get(user.createdById) || 0) + 1);
    });
    return counts;
  }, [state.users]);

  const usersByAreaGroups = useMemo(() => {
    const groups = new Map();
    filteredUsers.forEach((user) => {
      const area = getUserArea(user) || "Sin área";
      if (!groups.has(area)) groups.set(area, []);
      groups.get(area).push(user);
    });

    return Array.from(groups.entries())
      .map(([area, users]) => ({ area, users: users.sort((left, right) => left.name.localeCompare(right.name)) }))
      .sort((left, right) => left.area.localeCompare(right.area));
  }, [filteredUsers]);

  const usersByCreatorGroups = useMemo(() => {
    const groups = new Map();
    filteredUsers.forEach((user) => {
      const creatorId = user.createdById || "unassigned";
      if (!groups.has(creatorId)) groups.set(creatorId, []);
      groups.get(creatorId).push(user);
    });

    return Array.from(groups.entries())
      .map(([creatorId, users]) => ({
        creatorId,
        creatorName: creatorId === "unassigned" ? "Sin creador registrado" : userMap.get(creatorId)?.name || creatorId,
        creatorArea: creatorId === "unassigned" ? "Sin área" : getUserArea(userMap.get(creatorId)) || "Sin área",
        users: users.sort((left, right) => left.name.localeCompare(right.name)),
      }))
      .filter((group) => group.creatorId !== BOOTSTRAP_MASTER_ID)
      .sort((left, right) => left.creatorName.localeCompare(right.creatorName));
  }, [filteredUsers, userMap]);

  const allInventoryItems = useMemo(
    () => (state.inventoryItems || []).map((item) => normalizeInventoryItemRecord(item)),
    [state.inventoryItems],
  );

  const inventoryItems = useMemo(() => {
    return allInventoryItems.filter((item) => {
      const term = inventorySearch.trim().toLowerCase();
      if (!term) return true;
      return [item.code, item.name, item.presentation, item.storageLocation, item.cleaningSite].some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [allInventoryItems, inventorySearch]);

  const allInventoryItemsByDomain = useMemo(() => ({
    [INVENTORY_DOMAIN_BASE]: allInventoryItems.filter((item) => item.domain === INVENTORY_DOMAIN_BASE),
    [INVENTORY_DOMAIN_CLEANING]: allInventoryItems.filter((item) => item.domain === INVENTORY_DOMAIN_CLEANING),
    [INVENTORY_DOMAIN_ORDERS]: allInventoryItems.filter((item) => item.domain === INVENTORY_DOMAIN_ORDERS),
    [INVENTORY_DOMAIN_MAINTENANCE]: allInventoryItems.filter((item) => item.domain === INVENTORY_DOMAIN_MAINTENANCE),
  }), [allInventoryItems]);

  const inventoryItemsByDomain = useMemo(() => ({
    [INVENTORY_DOMAIN_BASE]: inventoryItems.filter((item) => item.domain === INVENTORY_DOMAIN_BASE),
    [INVENTORY_DOMAIN_CLEANING]: inventoryItems.filter((item) => item.domain === INVENTORY_DOMAIN_CLEANING),
    [INVENTORY_DOMAIN_ORDERS]: inventoryItems.filter((item) => item.domain === INVENTORY_DOMAIN_ORDERS),
    [INVENTORY_DOMAIN_MAINTENANCE]: inventoryItems.filter((item) => item.domain === INVENTORY_DOMAIN_MAINTENANCE),
  }), [inventoryItems]);

  const inventoryItemsById = useMemo(
    () => new Map(allInventoryItems.map((item) => [item.id, item])),
    [allInventoryItems],
  );

  const currentInventoryDomainItems = useMemo(() => {
    const items = allInventoryItemsByDomain[inventoryTab] || [];
    if (inventoryTab === INVENTORY_DOMAIN_CLEANING) {
      return items.filter((item) => item.cleaningSite === inventoryCleaningSite);
    }
    if (inventoryTab === INVENTORY_DOMAIN_ORDERS) {
      if (!inventoryDestinationWarehouse) return items;
      const normalizedWarehouse = String(inventoryDestinationWarehouse || "").trim().toLowerCase();
      return items.filter((item) => (item.transferTargets || []).some((target) => String(target.warehouse || "").trim().toLowerCase() === normalizedWarehouse));
    }
    if (inventoryTab === INVENTORY_DOMAIN_MAINTENANCE) {
      return items;
    }
    return items;
  }, [allInventoryItemsByDomain, inventoryCleaningSite, inventoryDestinationWarehouse, inventoryTab]);

  const currentInventoryItems = useMemo(() => {
    const items = inventoryItemsByDomain[inventoryTab] || [];
    if (inventoryTab === INVENTORY_DOMAIN_CLEANING) {
      return items.filter((item) => item.cleaningSite === inventoryCleaningSite);
    }
    if (inventoryTab === INVENTORY_DOMAIN_ORDERS) {
      if (!inventoryDestinationWarehouse) return items;
      const normalizedWarehouse = String(inventoryDestinationWarehouse || "").trim().toLowerCase();
      return items.filter((item) => (item.transferTargets || []).some((target) => String(target.warehouse || "").trim().toLowerCase() === normalizedWarehouse));
    }
    if (inventoryTab === INVENTORY_DOMAIN_MAINTENANCE) {
      return items;
    }
    return items;
  }, [inventoryCleaningSite, inventoryDestinationWarehouse, inventoryItemsByDomain, inventoryTab]);

  const inventoryMovements = useMemo(
    () => (state.inventoryMovements || []).map((movement) => normalizeInventoryMovementRecord(movement)).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    [state.inventoryMovements],
  );

  const currentInventoryMovements = useMemo(
    () => inventoryMovements.filter((movement) => {
      if (normalizeInventoryDomain(movement.domain) !== inventoryTab) {
        return false;
      }
      if (inventoryTab !== INVENTORY_DOMAIN_CLEANING) {
        return true;
      }
      const movementItem = inventoryItemsById.get(movement.itemId);
      return normalizeCleaningSite(movementItem?.cleaningSite || movement.cleaningSite) === inventoryCleaningSite;
    }),
    [inventoryCleaningSite, inventoryItemsById, inventoryMovements, inventoryTab],
  );

  const actionableLowStockInventoryItems = useMemo(
    () => allInventoryItems.filter((item) => item.domain !== INVENTORY_DOMAIN_BASE && Number(item.stockUnits || 0) <= Number(item.minStockUnits || 0)),
    [allInventoryItems],
  );

  const lowStockInventoryItems = useMemo(
    () => currentInventoryItems.filter((item) => Number(item.stockUnits || 0) <= Number(item.minStockUnits || 0)).sort((left, right) => (left.stockUnits - left.minStockUnits) - (right.stockUnits - right.minStockUnits)),
    [currentInventoryItems],
  );

  const inventoryLinkedCleaningRows = useMemo(
    () => currentInventoryDomainItems.filter((item) => item.domain === INVENTORY_DOMAIN_CLEANING && item.activityCatalogIds.length > 0),
    [currentInventoryDomainItems],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const orderInventoryItems = inventoryItemsByDomain[INVENTORY_DOMAIN_ORDERS] || [];
  const maintenanceInventoryItems = inventoryItemsByDomain[INVENTORY_DOMAIN_MAINTENANCE] || [];

  const orderInventoryTransferMovements = useMemo(
    () => inventoryMovements.filter((movement) => movement.domain === INVENTORY_DOMAIN_ORDERS && movement.movementType === INVENTORY_MOVEMENT_TRANSFER),
    [inventoryMovements],
  );

  const maintenanceInventoryTransferMovements = useMemo(
    () => inventoryMovements.filter((movement) => movement.domain === INVENTORY_DOMAIN_MAINTENANCE && movement.movementType === INVENTORY_MOVEMENT_TRANSFER),
    [inventoryMovements],
  );

  const orderInventoryTransferSummary = useMemo(
    () => orderInventoryItems
      .map((item) => ({
        ...item,
        allocatedUnits: getInventoryAllocatedUnits(item),
        availableToTransferUnits: getInventoryAvailableToTransfer(item),
      }))
      .sort((left, right) => {
        const balanceGap = right.allocatedUnits - left.allocatedUnits;
        if (balanceGap !== 0) return balanceGap;
        return left.name.localeCompare(right.name, "es-MX");
      }),
    [orderInventoryItems],
  );

  const maintenanceInventoryTransferSummary = useMemo(
    () => maintenanceInventoryItems
      .map((item) => ({
        ...item,
        allocatedUnits: getInventoryAllocatedUnits(item),
        availableToTransferUnits: getInventoryAvailableToTransfer(item),
      }))
      .sort((left, right) => {
        const balanceGap = right.allocatedUnits - left.allocatedUnits;
        if (balanceGap !== 0) return balanceGap;
        return left.name.localeCompare(right.name, "es-MX");
      }),
    [maintenanceInventoryItems],
  );

  const inventoryMovementSelectedItem = useMemo(
    () => (inventoryMovementModal.itemId ? inventoryItemsById.get(inventoryMovementModal.itemId) || null : null),
    [inventoryItemsById, inventoryMovementModal.itemId],
  );

  const inventoryMovementSavedLocations = useMemo(
    () => (inventoryMovementSelectedItem ? getInventorySavedStorageLocations(inventoryMovementSelectedItem, inventoryMovements) : []),
    [inventoryMovementSelectedItem, inventoryMovements],
  );

  const inventoryMovementSavedDestinations = useMemo(
    () => (inventoryMovementSelectedItem ? getInventorySavedTransferDestinations(inventoryMovementSelectedItem, inventoryMovements) : []),
    [inventoryMovementSelectedItem, inventoryMovements],
  );

  const inventoryDestinations = useMemo(
    () => Array.isArray(state.inventoryDestinations)
      ? state.inventoryDestinations
          .map((destination) => normalizeInventoryTransferTargetRecord(destination, "pzas"))
          .filter((destination) => destination.warehouse || destination.storageLocation)
      : [],
    [state.inventoryDestinations],
  );

  const inventoryTransferDefaultWarehouse = useMemo(() => {
    const counts = new Map();
    const rememberWarehouse = (warehouse) => {
      const normalized = String(warehouse || "").trim();
      if (!normalized) return;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    };

    inventoryDestinations.forEach((destination) => rememberWarehouse(destination.warehouse));
    [...orderInventoryTransferSummary, ...maintenanceInventoryTransferSummary].forEach((item) => {
      (item.transferTargets || []).forEach((target) => rememberWarehouse(target.warehouse));
    });

    const sorted = Array.from(counts.entries()).sort(([warehouseA, countA], [warehouseB, countB]) => {
      if (countA !== countB) return countB - countA;
      return warehouseA.localeCompare(warehouseB, "es-MX");
    });

    return sorted[0]?.[0] || "";
  }, [inventoryDestinations, orderInventoryTransferSummary, maintenanceInventoryTransferSummary]);

  const inventoryMovementSelectedSavedLocation = useMemo(() => {
    const normalizedStorageLocation = normalizeKey(inventoryMovementModal.storageLocation);
    return inventoryMovementSavedLocations.some((entry) => entry.key === normalizedStorageLocation)
      ? normalizedStorageLocation
      : "";
  }, [inventoryMovementModal.storageLocation, inventoryMovementSavedLocations]);

  const inventoryMovementTransferTarget = useMemo(
    () => inventoryMovementModal.movementType === INVENTORY_MOVEMENT_TRANSFER && inventoryMovementSelectedItem?.domain === INVENTORY_DOMAIN_ORDERS
      ? findInventoryTransferTarget(inventoryMovementSelectedItem, inventoryMovementModal.warehouse, inventoryMovementModal.storageLocation)
      : null,
    [inventoryMovementModal.movementType, inventoryMovementSelectedItem, inventoryMovementModal.warehouse, inventoryMovementModal.storageLocation],
  );

  const inventoryMovementAvailableUnits = useMemo(
    () => inventoryMovementSelectedItem
      ? getInventoryAvailableToTransfer(
          inventoryMovementSelectedItem,
          inventoryMovementModal.remainingUnits,
          inventoryMovementTransferTarget?.destinationKey || "",
        )
      : 0,
    [inventoryMovementModal.remainingUnits, inventoryMovementSelectedItem, inventoryMovementTransferTarget],
  );

  const inventoryTransferDestinationsByWarehouse = useMemo(() => {
    const grouped = {};
    const addDestination = (destination) => {
      const normalized = normalizeInventoryTransferTargetRecord(destination, inventoryMovementSelectedItem?.unitLabel || "pzas");
      if (!normalized.warehouse || !normalized.storageLocation) return;
      const warehouse = normalized.warehouse;
      if (!grouped[warehouse]) grouped[warehouse] = [];
      if (!grouped[warehouse].some((entry) => entry.destinationKey === normalized.destinationKey)) {
        grouped[warehouse].push(normalized);
      }
    };

    inventoryDestinations.forEach(addDestination);
    if (inventoryMovementSelectedItem?.transferTargets) {
      inventoryMovementSelectedItem.transferTargets.forEach(addDestination);
    }

    Object.values(grouped).forEach((list) => {
      list.sort((left, right) => formatInventoryTransferDestinationLabel(left).localeCompare(formatInventoryTransferDestinationLabel(right), "es-MX"));
    });
    return grouped;
  }, [inventoryDestinations, inventoryMovementSelectedItem]);

  const inventoryTransferAvailableWarehouses = useMemo(() => {
    const warehouses = new Set();
    inventoryDestinations.forEach((destination) => {
      const warehouse = String(destination.warehouse || "").trim();
      if (warehouse) warehouses.add(warehouse);
    });
    [...orderInventoryTransferSummary, ...maintenanceInventoryTransferSummary].forEach((item) => {
      (item.transferTargets || []).forEach((target) => {
        const warehouse = String(target.warehouse || "").trim();
        if (warehouse) warehouses.add(warehouse);
      });
    });
    return [...warehouses].sort((left, right) => left.localeCompare(right, "es-MX"));
  }, [inventoryDestinations, orderInventoryTransferSummary, maintenanceInventoryTransferSummary]);

  useEffect(() => {
    if (!inventoryDestinationWarehouse && !inventoryDestinationWarehouseAutoSet && inventoryTransferAvailableWarehouses.length) {
      setInventoryDestinationWarehouse(inventoryTransferDefaultWarehouse || inventoryTransferAvailableWarehouses[0]);
      setInventoryDestinationWarehouseAutoSet(true);
    }
  }, [inventoryDestinationWarehouse, inventoryDestinationWarehouseAutoSet, inventoryTransferAvailableWarehouses, inventoryTransferDefaultWarehouse]);

  const isOrderTransferMovementModal = inventoryMovementModal.movementType === INVENTORY_MOVEMENT_TRANSFER && inventoryMovementModal.domain === INVENTORY_DOMAIN_ORDERS;
  const inventoryMovementModalTitle = isOrderTransferMovementModal ? "Registrar transferencia" : "Registrar movimiento";
  const hasOrderTransferTargets = [...orderInventoryTransferSummary, ...maintenanceInventoryTransferSummary].some((item) => item.transferTargets.length > 0);
  const inventoryTransferViewerItem = useMemo(
    () => (inventoryTransferViewerState.itemId ? inventoryItemsById.get(inventoryTransferViewerState.itemId) || null : null),
    [inventoryItemsById, inventoryTransferViewerState.itemId],
  );

  const allInventoryTransferSummary = useMemo(
    () => [...orderInventoryTransferSummary, ...maintenanceInventoryTransferSummary],
    [orderInventoryTransferSummary, maintenanceInventoryTransferSummary],
  );

  const allInventoryTransferMovements = useMemo(
    () => [...orderInventoryTransferMovements, ...maintenanceInventoryTransferMovements],
    [orderInventoryTransferMovements, maintenanceInventoryTransferMovements],
  );

  const viewedOrderInventoryTransferSummary = useMemo(
    () => inventoryTransferViewerState.itemId
      ? allInventoryTransferSummary.filter((item) => item.id === inventoryTransferViewerState.itemId)
      : allInventoryTransferSummary,
    [inventoryTransferViewerState.itemId, allInventoryTransferSummary],
  );

  const viewedOrderInventoryTransferMovements = useMemo(
    () => inventoryTransferViewerState.itemId
      ? allInventoryTransferMovements.filter((movement) => movement.itemId === inventoryTransferViewerState.itemId)
      : allInventoryTransferMovements,
    [inventoryTransferViewerState.itemId, allInventoryTransferMovements],
  );

  const currentInventorySupplyableItems = useMemo(
    () => inventoryTab === INVENTORY_DOMAIN_BASE ? [] : currentInventoryDomainItems,
    [currentInventoryDomainItems, inventoryTab],
  );

  const inventoryRestockModalItems = useMemo(
    () => inventoryRestockModal.itemIds.map((itemId) => inventoryItemsById.get(itemId) || null).filter(Boolean),
    [inventoryItemsById, inventoryRestockModal.itemIds],
  );

  const inventoryRestockModalTitle = inventoryRestockModal.itemIds.length === 1 ? "Surtir insumo" : "Surtido general";

  const inventoryMovementTypeOptions = useMemo(() => {
    if (inventoryMovementSelectedItem?.domain === INVENTORY_DOMAIN_CLEANING) {
      return INVENTORY_MOVEMENT_OPTIONS.filter((option) => option.value === INVENTORY_MOVEMENT_CONSUME);
    }

    return INVENTORY_MOVEMENT_OPTIONS;
  }, [inventoryMovementSelectedItem]);

  const viewedOrderInventoryTransferTargets = useMemo(
    () => viewedOrderInventoryTransferSummary.flatMap((item) => item.transferTargets.map((target) => ({
      ...target,
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      itemUnitLabel: item.unitLabel || "pzas",
    }))),
    [viewedOrderInventoryTransferSummary],
  );

  const currentUserReadNotificationIds = useMemo(
    () => new Set(Array.isArray(notificationReadState[sessionUserId]) ? notificationReadState[sessionUserId] : []),
    [notificationReadState, sessionUserId],
  );

  const currentUserDeletedNotificationIds = useMemo(
    () => new Set(Array.isArray(notificationDeletedState[sessionUserId]) ? notificationDeletedState[sessionUserId] : []),
    [notificationDeletedState, sessionUserId],
  );

  const inventoryTransferViewerTitle = inventoryTransferViewerItem
    ? `Historial de transferencias · ${inventoryTransferViewerItem.name}`
    : "Transferencias por destino";

  const inventoryStats = useMemo(() => ({
    total: currentInventoryItems.length,
    totalPiecesPerBox: currentInventoryItems.reduce((sum, item) => sum + Number(item.piecesPerBox || 0), 0),
    totalBoxesPerPallet: currentInventoryItems.reduce((sum, item) => sum + Number(item.boxesPerPallet || 0), 0),
    totalStockUnits: currentInventoryItems.reduce((sum, item) => sum + Number(item.stockUnits || 0), 0),
    lowStockCount: lowStockInventoryItems.length,
    movementCount: currentInventoryMovements.length,
  }), [currentInventoryItems, currentInventoryMovements.length, lowStockInventoryItems.length]);

  const departmentOptions = useMemo(() => {
    const builtOptions = buildAreaCatalog(state.users, state.areaCatalog);
    const defaultSectionAreas = APP_AREA_SECTIONS.flatMap((section) => section.scopes || [])
      .map((area) => normalizeAreaOption(area))
      .filter(Boolean);
    return Array.from(new Set([...builtOptions, ...defaultSectionAreas])).sort((a, b) => a.localeCompare(b));
  }, [state.areaCatalog, state.users]);

  // Root areas (no slash) for the first-level selector in the user modal
  const rootAreaOptions = useMemo(
    () => Array.from(new Set(departmentOptions.map((area) => getAreaRoot(area) || area))).filter(Boolean).sort((a, b) => a.localeCompare(b)),
    [departmentOptions],
  );

  const dynamicAreaSectionRoots = useMemo(() => {
    const staticRoots = new Set(APP_AREA_SECTIONS
      .flatMap((section) => section.scopes || [])
      .map((scope) => normalizeAreaOption(scope))
      .filter(Boolean));

    return rootAreaOptions
      .map((rootArea) => normalizeAreaOption(rootArea))
      .filter((rootArea) => rootArea && !staticRoots.has(rootArea));
  }, [rootAreaOptions]);

  const activeAreaScopes = useMemo(() => {
    if (selectedAreaSectionId === "all") return [];
    const selectedStaticSection = APP_AREA_SECTIONS.find((section) => section.id === selectedAreaSectionId) || null;
    if (selectedStaticSection?.scopes?.length) return selectedStaticSection.scopes;
    const matchedDynamicRoot = dynamicAreaSectionRoots.find((root) => normalizeAreaSectionId(root) === selectedAreaSectionId);
    return matchedDynamicRoot ? [matchedDynamicRoot] : [];
  }, [selectedAreaSectionId, dynamicAreaSectionRoots]);

  // Sub-areas for a given root area
  const getSubAreaOptions = (rootArea) => {
    const normalizedRoot = normalizeAreaOption(rootArea);
    return departmentOptions
      .filter((area) => {
        const { area: r, subArea: s } = splitAreaAndSubArea(area);
        return r === normalizedRoot && Boolean(s);
      })
      .map((area) => splitAreaAndSubArea(area).subArea);
  };

  const userAreaOptions = useMemo(() => {
    if (!currentUser || currentUser.role === ROLE_LEAD) return departmentOptions;
    const actorRoot = getAreaRoot(getUserArea(currentUser));
    return departmentOptions.filter((area) => {
      const r = getAreaRoot(area);
      return !actorRoot || r === actorRoot;
    });
  }, [currentUser, departmentOptions]);

  const catalogAreaOptions = useMemo(() => {
    const roots = Array.from(new Set(departmentOptions
      .map((entry) => normalizeAreaOption(getAreaRoot(entry)))
      .filter((entry) => entry && entry !== "Sin área")));
    if (!roots.includes("General")) roots.unshift("General");
    return roots;
  }, [departmentOptions]);

  const activeCatalogItems = useMemo(
    () => (state.catalog || []).filter((item) => !item.isDeleted),
    [state.catalog],
  );

  const dashboardScopedCatalogItems = useMemo(() => {
    if (dashboardEffectiveAreaFilter === "all") return activeCatalogItems;
    const areaFilters = Array.isArray(dashboardEffectiveAreaFilter) ? dashboardEffectiveAreaFilter : [dashboardEffectiveAreaFilter];
    const selectedRoots = areaFilters.map((value) => normalizeAreaOption(getAreaRoot(value) || value)).filter(Boolean);
    if (!selectedRoots.length) return [];
    return activeCatalogItems.filter((item) => {
      const itemArea = normalizeCatalogArea(item?.area, item?.category);
      const itemRoot = normalizeAreaOption(getAreaRoot(itemArea));
      return selectedRoots.some((selectedRoot) => selectedRoot !== "Sin área" && itemRoot === selectedRoot);
    });
  }, [activeCatalogItems, dashboardEffectiveAreaFilter]);

  const dashboardCatalogTypeRows = useMemo(() => {
    const mandatory = dashboardScopedCatalogItems.filter((item) => item.isMandatory).length;
    const optional = Math.max(0, dashboardScopedCatalogItems.length - mandatory);
    return [
      { id: "mandatory", label: "Obligatorias", value: mandatory },
      { id: "optional", label: "Ocasionales", value: optional },
    ];
  }, [dashboardScopedCatalogItems]);

  const dashboardCatalogFrequencyRows = useMemo(() => {
    const grouped = new Map();
    dashboardScopedCatalogItems.forEach((item) => {
      const frequency = String(item.frequency || "daily");
      grouped.set(frequency, (grouped.get(frequency) || 0) + 1);
    });
    return Array.from(grouped.entries())
      .map(([id, value]) => ({ id, label: getActivityFrequencyLabel(id), value }))
      .sort((a, b) => b.value - a.value);
  }, [dashboardScopedCatalogItems]);

  const catalogWeekGroups = useMemo(() => ([
    {
      key: "mandatory",
      label: "Obligatorias",
      description: "Actividades base que deberían estar presentes en la operación semanal.",
      items: activeCatalogItems.filter((item) => item.isMandatory),
    },
    {
      key: "optional",
      label: "Ocasionales",
      description: "Actividades de apoyo que puedes sumar según la carga de la semana.",
      items: activeCatalogItems.filter((item) => !item.isMandatory),
    },
  ]), [activeCatalogItems]);

  const weeklyAreaCoverageRows = useMemo(() => {
    return (state.weeks || []).map((week) => {
      const areaCounts = new Map();
      (state.activities || [])
        .filter((activity) => activity.weekId === week.id)
        .forEach((activity) => {
          const area = getUserArea(userMap.get(activity.responsibleId)) || "Sin área";
          areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
        });

      return {
        ...week,
        areas: Array.from(areaCounts.entries())
          .map(([area, total]) => ({ area, total }))
          .sort((left, right) => right.total - left.total),
      };
    });
  }, [state.activities, state.weeks, userMap]);

  function handleAddAreaOption(parentArea = "") {
    if (currentUser && currentUser.role !== ROLE_LEAD) {
      return;
    }
    setAreaModal({ open: true, target: "user", name: "", parentArea: parentArea || "", error: "" });
  }

  function handleAddAreaToBootstrap() {
    setAreaModal({ open: true, target: "bootstrap", name: "", parentArea: "", error: "" });
  }

  async function confirmAddArea() {
    const nextArea = areaModal.parentArea
      ? joinAreaAndSubArea(areaModal.parentArea, areaModal.name)
      : normalizeAreaOption(areaModal.name);
    if (!nextArea) {
      setAreaModal((current) => ({ ...current, error: "Escribe el nombre del área." }));
      return;
    }
    if (departmentOptions.includes(nextArea)) {
      setAreaModal((current) => ({ ...current, error: "Esa área ya existe." }));
      return;
    }

    try {
      const result = await requestJson("/warehouse/areas", {
        method: "POST",
        body: JSON.stringify({ name: areaModal.name, parentArea: areaModal.parentArea || "" }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    } catch (error) {
      setAreaModal((current) => ({ ...current, error: error?.message || "No se pudo agregar el área." }));
      return;
    }

    if (areaModal.target === "bootstrap") {
      setBootstrapLeadForm((current) => ({ ...current, area: nextArea }));
    } else {
      // If parentArea is set, we're adding a subArea → preserve the root area and select subArea in modal
      setUserModal((current) => ({
        ...current,
        area: areaModal.parentArea ? normalizeAreaOption(areaModal.parentArea) : nextArea,
        subArea: areaModal.parentArea ? normalizeAreaOption(areaModal.name) : "",
      }));
    }

    setAreaModal({ open: false, target: "user", name: "", parentArea: "", error: "" });
  }

  function openDeleteAreaModal(areaName, label = "") {
    if (!areaName || currentUser?.role !== ROLE_LEAD) return;
    setAreaDeleteModal({ open: true, areaName, label: label || areaName, error: "", submitting: false });
  }

  // ── Dashboard hard-reset (solo Lead) ─────────────────────────────────────
  async function hardResetDashboard() {
    if (!canManageDashboardControls) return;
    const result = await requestJson("/warehouse/dashboard/reset-data", { method: "POST" });
    applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    setDashboardFilters({ periodType: "week", periodKey: "all", responsibleId: "all", area: "all", source: "all", startDate: "", endDate: "" });
    setDashboardSectionsOpen({ executive: true, people: true, trends: true, causes: true, alerts: true });
    pushAppToast("Dashboard reiniciado en todo el sistema.", "success");
  }

  // ── Demo Mode (solo Lead) ─────────────────────────────────────────────────
  function activateDemoMode() {
    if (!canManageDashboardControls || isDemoMode) return;
    preDemoStateRef.current = JSON.parse(JSON.stringify(state));
    setIsDemoMode(true);
  }

  async function deactivateDemoMode() {
    if (!canManageDashboardControls || !isDemoMode) return;
    const snapshot = preDemoStateRef.current;
    preDemoStateRef.current = null;
    setIsDemoMode(false);
    if (!snapshot) return;
    try {
      skipNextSyncRef.current = true;
      const normalizedSnapshot = normalizeWarehouseState(snapshot);
      setState(normalizedSnapshot);
      setLoginDirectory(buildLoginDirectoryFromState(normalizedSnapshot));
      const result = await requestJson("/warehouse/state/restore-demo", {
        method: "POST",
        body: JSON.stringify({ snapshot: normalizedSnapshot }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setSyncStatus("Sincronizado");
    } catch (error) {
      pushAppToast(error?.message || "No se pudo restaurar el estado demo.", "danger");
      setSyncStatus("Modo local");
    }
  }

  async function confirmDeleteArea() {
    if (!areaDeleteModal.areaName) return;
    setAreaDeleteModal((current) => ({ ...current, submitting: true, error: "" }));
    try {
      const result = await requestJson(`/warehouse/areas/${encodeURIComponent(areaDeleteModal.areaName)}`, {
        method: "DELETE",
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);

      const removedRoot = getAreaRoot(areaDeleteModal.areaName);
      const isSubArea = areaDeleteModal.areaName.includes("/");
      setUserModal((current) => {
        if (isSubArea) {
          if (current.area === removedRoot && current.subArea === splitAreaAndSubArea(areaDeleteModal.areaName).subArea) {
            return { ...current, subArea: "" };
          }
          return current;
        }
        if (current.area === removedRoot) {
          return { ...current, area: "", subArea: "" };
        }
        return current;
      });

      setAreaDeleteModal({ open: false, areaName: "", label: "", error: "", submitting: false });
      pushAppToast("Área eliminada correctamente.", "success");
    } catch (error) {
      setAreaDeleteModal((current) => ({
        ...current,
        submitting: false,
        error: error?.message || "No se pudo eliminar el área.",
      }));
    }
  }

  const normalizedPermissions = useMemo(
    () => normalizePermissions(state.permissions),
    [state.permissions],
  );

  const allowedPages = useMemo(
    () => currentUser ? NAV_ITEMS.filter((item) => canAccessPage(currentUser, item.id, normalizedPermissions)).map((item) => item.id) : [],
    [currentUser, normalizedPermissions],
  );

  const allowedPagesKey = useMemo(() => allowedPages.join("|"), [allowedPages]);

  useEffect(() => {
    if (!currentUser) return;
    if (!allowedPages.includes(page) && page !== PAGE_NOT_FOUND) {
      const fallbackPage = allowedPages[0] || PAGE_DASHBOARD;
      setPage(fallbackPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedPagesKey, currentUser?.role, page]);

  useEffect(() => {
    if (adminTab === "permissions" || adminTab === "reports") {
      setAdminTab("catalog");
    }
  }, [adminTab]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [page]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    if (syncStatus === "Conectando") return;
    if (sessionUserId && !currentUser) {
      if (!isBootstrapMasterSession) {
        setSessionUserId("");
      }
    }
  }, [currentUser, isBootstrapMasterSession, sessionUserId, syncStatus]);

  useEffect(() => {
    if (!currentUser || (ROLE_LEVEL[currentUser.role] || 0) < ROLE_LEVEL[ROLE_SR]) {
      setSecurityEvents([]);
      setSecurityEventsStatus("idle");
      return;
    }

    let active = true;
    setSecurityEventsStatus("loading");

    requestJson("/auth/security-events?limit=150")
      .then((payload) => {
        if (!active) return;
        setSecurityEvents(Array.isArray(payload.data) ? payload.data : []);
        setSecurityEventsStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setSecurityEvents([]);
        setSecurityEventsStatus("error");
      });

    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  const baseActionPermissions = useMemo(
    () => Object.fromEntries(ACTION_DEFINITIONS.map((item) => [item.id, canDoAction(currentUser, item.id, normalizedPermissions)])),
    [currentUser, normalizedPermissions],
  );

  const activeAreaScopePermission = useMemo(() => {
    if (!currentUser || selectedAreaSectionId === "all") return null;
    if (selectedAreaSectionId === "transporte") {
      const scopeActionId = AREA_TAB_PERMISSION_ACTIONS.transporte[navTransportSection] || "";
      const baseActionIds = TRANSPORT_SECTION_ACTIONS[navTransportSection] || [];
      return scopeActionId
        ? {
          scopeActionId,
          baseActionIds,
          scopedActionIdByBase: Object.fromEntries(baseActionIds.map((actionId) => [actionId, getScopedAreaActionPermissionId(scopeActionId, actionId)])),
        }
        : null;
    }
    const pageKeyById = {
      [PAGE_DASHBOARD]: "dashboard",
      [PAGE_BOARD]: "board",
      [PAGE_CUSTOM_BOARDS]: "customBoards",
      [PAGE_HISTORY]: "history",
    };
    const tabKey = pageKeyById[page];
    if (!tabKey) return null;
    const scopeActionId = AREA_TAB_PERMISSION_ACTIONS[selectedAreaSectionId]?.[tabKey] || "";
    if (!scopeActionId) return null;
    const baseActionIds = AREA_TAB_BASE_ACTIONS[tabKey] || [];
    return {
      scopeActionId,
      baseActionIds,
      scopedActionIdByBase: Object.fromEntries(baseActionIds.map((actionId) => [actionId, getScopedAreaActionPermissionId(scopeActionId, actionId)])),
    };
  }, [currentUser, navTransportSection, page, selectedAreaSectionId]);

  const actionPermissions = useMemo(() => {
    if (!activeAreaScopePermission) return baseActionPermissions;
    const next = { ...baseActionPermissions };
    (activeAreaScopePermission.baseActionIds || []).forEach((actionId) => {
      const scopedActionId = activeAreaScopePermission.scopedActionIdByBase?.[actionId];
      if (!scopedActionId) return;
      // Permitir si tiene permiso base O permiso scoped específico para esta área
      const hasScopedPermission = Boolean(baseActionPermissions[scopedActionId]);
      next[actionId] = Boolean(baseActionPermissions[actionId] || hasScopedPermission);
    });
    return next;
  }, [activeAreaScopePermission, baseActionPermissions]);
  const canManageDashboardControls = Boolean(actionPermissions.manageDashboardState);
  const canExportDashboardData = Boolean(actionPermissions.exportDashboardData);

  const currentInventoryManagePermission = actionPermissions[getInventoryManageActionId(inventoryTab)];
  const currentInventoryDeletePermission = actionPermissions[getInventoryDeleteActionId(inventoryTab)];
  const currentInventoryImportPermission = actionPermissions[getInventoryImportActionId(inventoryTab)];

  const allowedInventoryDomains = useMemo(() => {
    const visibleDomains = [];
    if (actionPermissions.viewBaseInventory || actionPermissions.manageInventory || actionPermissions.deleteInventory || actionPermissions.importInventory) {
      visibleDomains.push(INVENTORY_DOMAIN_BASE);
    }
    if (actionPermissions.viewCleaningInventory || actionPermissions.manageCleaningInventory || actionPermissions.deleteCleaningInventory || actionPermissions.importCleaningInventory) {
      visibleDomains.push(INVENTORY_DOMAIN_CLEANING);
    }
    if (actionPermissions.viewOrderInventory || actionPermissions.manageOrderInventory || actionPermissions.deleteOrderInventory || actionPermissions.importOrderInventory) {
      visibleDomains.push(INVENTORY_DOMAIN_ORDERS);
      visibleDomains.push(INVENTORY_DOMAIN_MAINTENANCE);
    }
    return visibleDomains;
  }, [actionPermissions]);

  useEffect(() => {
    if (!allowedInventoryDomains.length) return;
    if (!allowedInventoryDomains.includes(inventoryTab)) {
      setInventoryTab(allowedInventoryDomains[0]);
    }
  }, [allowedInventoryDomains, inventoryTab]);

  const canResetOtherPasswords = actionPermissions.resetPasswords;

  const derivedNotifications = useMemo(() => {
    if (!currentUser) return [];

    const visibleResponsibleIds = new Set([currentUser.id]);
    if ((ROLE_LEVEL[currentUser.role] || 0) >= ROLE_LEVEL[ROLE_SR]) {
      managedUserIds.forEach((userId) => visibleResponsibleIds.add(userId));
    }

    const notifications = [];
    const isOwnRecord = (responsibleId) => responsibleId === currentUser.id;

    if (isForcedPasswordChange) {
      notifications.push({
        id: `security-password-${currentUser.id}`,
        title: "Actualiza tu contraseña",
        message: "Tu cuenta requiere cambio de contraseña antes de seguir operando con normalidad.",
        tone: "danger",
        timestamp: new Date(now).toISOString(),
        targetAction: "profile",
      });
    }

    dashboardRecords
      .filter((record) => !String(record.id).startsWith("board-history-") && visibleResponsibleIds.has(record.responsibleId) && record.status === STATUS_PAUSED)
      .slice(0, 6)
      .forEach((record) => {
        notifications.push({
          id: `paused-${record.id}`,
          title: isOwnRecord(record.responsibleId) ? "Tienes una actividad pausada" : `${record.responsibleName} tiene una actividad pausada`,
          message: `${record.label} sigue en pausa dentro de ${record.sourceLabel.toLowerCase()}.`,
          meta: record.boardName,
          tone: "danger",
          timestamp: record.occurredAt || new Date(now).toISOString(),
          targetPage: PAGE_DASHBOARD,
        });
      });

    dashboardRecords
      .filter((record) => !String(record.id).startsWith("board-history-") && visibleResponsibleIds.has(record.responsibleId) && record.status !== STATUS_FINISHED && record.excessSeconds > 0)
      .sort((left, right) => right.excessSeconds - left.excessSeconds)
      .slice(0, 6)
      .forEach((record) => {
        notifications.push({
          id: `overdue-${record.id}`,
          title: isOwnRecord(record.responsibleId) ? "Tu actividad excedió el tiempo" : `${record.responsibleName} tiene retraso`,
          message: `${record.label} acumula ${formatDurationClock(record.excessSeconds)} extra sobre el tiempo esperado.`,
          meta: record.boardName,
          tone: "danger",
          timestamp: record.occurredAt || new Date(now).toISOString(),
          targetPage: PAGE_DASHBOARD,
        });
      });

    actionableLowStockInventoryItems
      .filter((item) => actionPermissions[getInventoryManageActionId(item.domain)])
      .slice(0, 8)
      .forEach((item) => {
        notifications.push({
          id: `inventory-low-${item.id}`,
          title: "Stock bajo en inventario",
          message: `${item.name} quedó en ${item.stockUnits} ${item.unitLabel || "pzas"} y su mínimo es ${item.minStockUnits}.`,
          meta: item.domain === INVENTORY_DOMAIN_ORDERS ? "Insumos para pedidos" : "Insumos de limpieza",
          tone: "danger",
          timestamp: item.updatedAt || item.createdAt || new Date(now).toISOString(),
          targetPage: PAGE_INVENTORY,
          targetDomain: item.domain,
          isLocked: true,
          keepUntilResolved: true,
        });
      });

    if ((ROLE_LEVEL[currentUser.role] || 0) >= ROLE_LEVEL[ROLE_SR]) {
      // Eventos de seguridad: solo en logs internos, no en notificaciones visibles
    }

    (state.bibliotecaNotifications || [])
      .slice(-20)
      .forEach((notif) => {
        const toneMap = { alta: "danger", media: "warning", baja: "success" };
        notifications.push({
          id: `biblioteca-notif-${notif.id}`,
          title:
            notif.priority === "alta"
              ? "🔴 Documento urgente en Biblioteca"
              : notif.priority === "media"
                ? "🟡 Nuevo documento en Biblioteca"
                : "📄 Documento disponible en Biblioteca",
          message: `${notif.authorName} subió "${notif.originalName}" en la sección ${notif.area}.`,
          meta: `Prioridad: ${notif.priority ? notif.priority.charAt(0).toUpperCase() + notif.priority.slice(1) : "Baja"}`,
          tone: toneMap[notif.priority] || "success",
          timestamp: notif.createdAt,
          targetPage: PAGE_BIBLIOTECA,
          isLocked: notif.priority === "alta",
          keepUntilResolved: notif.priority === "alta",
        });
      });

    // Notificaciones de incidencias asignadas al usuario actual
    (state.incidenciaNotifications || [])
      .slice(-50)
      .filter((notif) => notif.assignedToId === currentUser?.id)
      .forEach((notif) => {
        const prioTone = { critica: "danger", alta: "danger", media: "warning", baja: "success" };
        const prioEmoji = { critica: "🔴", alta: "🟠", media: "🟡", baja: "🟢" };
        notifications.push({
          id: `incidencia-notif-${notif.id}`,
          title: `${prioEmoji[notif.priority] || "⚠️"} Incidencia asignada a ti`,
          message: `"${notif.incidenciaTitle}" fue asignada por ${notif.assignedByName}.`,
          meta: `Prioridad: ${notif.priority ? notif.priority.charAt(0).toUpperCase() + notif.priority.slice(1) : "Media"}`,
          tone: prioTone[notif.priority] || "warning",
          timestamp: notif.createdAt,
          targetPage: PAGE_INCIDENCIAS,
          isLocked: notif.priority === "critica",
        });
      });

    return notifications.toSorted((left, right) => getComparableDateMs(right.timestamp) - getComparableDateMs(left.timestamp));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionableLowStockInventoryItems,
    actionPermissions,
    currentUser,
    dashboardRecords,
    isForcedPasswordChange,
    managedUserIds,
    now,
    securityEvents,
    state.bibliotecaNotifications,
    state.incidenciaNotifications,
  ]);

  useEffect(() => {
    if (!sessionUserId) return;

    setNotificationInboxState((current) => {
      const currentInbox = Array.isArray(current[sessionUserId]) ? current[sessionUserId] : [];
      const mergedById = new Map(currentInbox.map((notification) => [notification.id, notification]));

      derivedNotifications.forEach((notification) => {
        mergedById.set(notification.id, {
          ...mergedById.get(notification.id),
          ...notification,
        });
      });

      const activeIds = new Set(derivedNotifications.map((notification) => notification.id));
      const nextInbox = Array.from(mergedById.values())
        .filter((notification) => !notification.keepUntilResolved || activeIds.has(notification.id))
        .toSorted((left, right) => getComparableDateMs(right.timestamp) - getComparableDateMs(left.timestamp))
        .slice(0, 400);

      const previousSerialized = JSON.stringify(currentInbox);
      const nextSerialized = JSON.stringify(nextInbox);
      if (previousSerialized === nextSerialized) {
        return current;
      }

      return {
        ...current,
        [sessionUserId]: nextInbox,
      };
    });
  }, [derivedNotifications, sessionUserId]);

  const currentUserInboxNotifications = useMemo(
    () => Array.isArray(notificationInboxState[sessionUserId]) ? notificationInboxState[sessionUserId] : [],
    [notificationInboxState, sessionUserId],
  );

  const appNotifications = useMemo(
    () => currentUserInboxNotifications
      .filter((notification) => notification.isLocked || !currentUserDeletedNotificationIds.has(notification.id))
      .map((notification) => ({
        ...notification,
        isLocked: Boolean(notification.isLocked),
        isUnread: notification.isLocked ? true : !currentUserReadNotificationIds.has(notification.id),
      }))
      .toSorted((left, right) => getComparableDateMs(right.timestamp) - getComparableDateMs(left.timestamp)),
    [currentUserDeletedNotificationIds, currentUserInboxNotifications, currentUserReadNotificationIds],
  );

  const unreadNotificationsCount = useMemo(
    () => appNotifications.filter((notification) => notification.isUnread).length,
    [appNotifications],
  );

  const unreadNotifications = useMemo(
    () => appNotifications.filter((notification) => notification.isUnread),
    [appNotifications],
  );

  const readNotifications = useMemo(
    () => appNotifications.filter((notification) => !notification.isUnread),
    [appNotifications],
  );

  useEffect(() => {
    if (!sessionUserId) {
      unreadNotificationSyncReadyRef.current = false;
      prevUnreadNotificationsCountRef.current = 0;
      return;
    }

    if (!unreadNotificationSyncReadyRef.current) {
      unreadNotificationSyncReadyRef.current = true;
      prevUnreadNotificationsCountRef.current = unreadNotificationsCount;
      return;
    }

    if (unreadNotificationsCount > prevUnreadNotificationsCountRef.current) {
      setNotificationAttentionTick((current) => current + 1);
    }

    prevUnreadNotificationsCountRef.current = unreadNotificationsCount;
  }, [unreadNotificationsCount, sessionUserId]);

  const visibleControlBoards = useMemo(() => {
    if (!currentUser) return [];
    const canViewHistoricalBoardScopes = canDoAction(currentUser, "viewHistoricalBoardScopes", normalizedPermissions);
    return (state.controlBoards || []).filter((board) => {
      // Simple area matching based on shared departments or owner area
      if (activeAreaScopes.length > 0) {
        const boardAreas = [
          ...(board?.settings?.ownerArea ? [board.settings.ownerArea] : []),
          ...(board?.sharedDepartments || []),
        ];
        const hasMatchingArea = boardAreas.some((area) => 
          activeAreaScopes.some((selectedArea) => normalizeAreaOption(area) === normalizeAreaOption(selectedArea))
        );
        if (!hasMatchingArea) return false;
      }
      return canViewHistoricalBoardScopes || getBoardVisibleToUser(board, currentUser);
    });
  }, [activeAreaScopes, currentUser, normalizedPermissions, state.controlBoards]);

  const filteredVisibleControlBoards = useMemo(() => {
    const term = customBoardSearch.trim().toLowerCase();
    if (!term) return visibleControlBoards;
    return visibleControlBoards.filter((board) => [board.name, board.description, userMap.get(board.ownerId)?.name, ...(board.sharedDepartments || [])]
      .some((value) => String(value || "").toLowerCase().includes(term)));
  }, [customBoardSearch, userMap, visibleControlBoards]);

  const selectedCustomBoard = useMemo(() => {
    return filteredVisibleControlBoards.find((board) => board.id === selectedCustomBoardId) || filteredVisibleControlBoards[0] || null;
  }, [selectedCustomBoardId, filteredVisibleControlBoards]);

  const visibleBoardHistorySnapshots = useMemo(() => {
    if (!currentUser) return [];
    const canViewHistoricalBoardScopes = canDoAction(currentUser, "viewHistoricalBoardScopes", normalizedPermissions);
    return (state.boardWeekHistory || []).filter((snapshot) => {
      // Simple area matching based on shared departments or owner area
      if (activeAreaScopes.length > 0) {
        const snapshotAreas = [
          ...(snapshot?.settings?.ownerArea ? [snapshot.settings.ownerArea] : []),
          ...(snapshot?.sharedDepartments || []),
        ];
        const hasMatchingArea = snapshotAreas.some((area) => 
          activeAreaScopes.some((selectedArea) => normalizeAreaOption(area) === normalizeAreaOption(selectedArea))
        );
        if (!hasMatchingArea) return false;
      }
      return canViewHistoricalBoardScopes || getBoardVisibleToUser(snapshot, currentUser);
    });
  }, [activeAreaScopes, currentUser, normalizedPermissions, state.boardWeekHistory]);

  const selectedCustomBoardHistoryOptions = useMemo(() => {
    if (!selectedCustomBoard) return [];
    return visibleBoardHistorySnapshots
      .filter((snapshot) => snapshot.boardId === selectedCustomBoard.id)
      .sort((left, right) => new Date(right.startDate) - new Date(left.startDate));
  }, [selectedCustomBoard, visibleBoardHistorySnapshots]);

  const selectedCustomBoardSnapshot = useMemo(
    () => selectedCustomBoardHistoryOptions.find((snapshot) => snapshot.id === selectedCustomBoardViewId) || null,
    [selectedCustomBoardHistoryOptions, selectedCustomBoardViewId],
  );

  const isHistoricalCustomBoardView = Boolean(selectedCustomBoardSnapshot);

  const selectedCustomBoardDisplay = useMemo(
    () => selectedCustomBoardSnapshot || selectedCustomBoard,
    [selectedCustomBoard, selectedCustomBoardSnapshot],
  );

  const selectedPermissionBoard = useMemo(
    () => (state.controlBoards || []).find((board) => board.id === selectedPermissionBoardId) || state.controlBoards?.[0] || null,
    [selectedPermissionBoardId, state.controlBoards],
  );

  const selectedBoardActionPermissions = useMemo(
    () => Object.fromEntries(BOARD_PERMISSION_ACTIONS.map((item) => [item.id, canDoBoardAction(currentUser, selectedCustomBoard) && canDoAction(currentUser, item.id, normalizedPermissions)])),
    [currentUser, normalizedPermissions, selectedCustomBoard],
  );

  const canChangeSelectedBoardOperationalContext = useMemo(() => {
    if (!currentUser || !selectedCustomBoard || !canDoBoardAction(currentUser, selectedCustomBoard)) {
      return false;
    }

    return canDoAction(currentUser, "boardWorkflow", normalizedPermissions)
      || canDoAction(currentUser, "saveBoard", normalizedPermissions);
  }, [currentUser, normalizedPermissions, selectedCustomBoard]);

  const extraSystemBoardTemplates = useMemo(() => ([
    {
      id: "actividades-limpieza",
      name: "Actividades de limpieza",
      category: "Limpieza",
      description: "Plantilla oficial para control de actividades de limpieza.",
      aliases: ["activiades de limpieza", "control de actividades de limpieza"],
      settings: {
        showWorkflow: true,
        showMetrics: true,
        showAssignee: true,
        showDates: true,
      },
      columns: [],
    },
    {
      id: "devoluciones-reacondicionado",
      name: "Devoluciones / Reacondicionado por tarima",
      category: "Revisión",
      description: "Plantilla oficial para flujo de escaneo continuo por tarima.",
      aliases: ["devoluciones / reacondicionado", "devoluciones y reacondicionado", "reacondicionado por tarima"],
      settings: {
        showWorkflow: true,
        showMetrics: true,
        showAssignee: true,
        showDates: true,
      },
      columns: [],
    },
  ]), []);

  const allowedSystemTemplateIds = useMemo(
    () => new Set(["actividades-limpieza", "revision-tarimas", "devoluciones-reacondicionado"]),
    [],
  );

  const allowedSystemTemplateNames = useMemo(
    () => new Set([
      normalizeKey("Actividades de limpieza"),
      normalizeKey("Revisión de tarimas"),
      normalizeKey("Devoluciones / Reacondicionado por tarima"),
      normalizeKey("Control de actividades de limpieza"),
      normalizeKey("Devoluciones y reacondicionado"),
    ]),
    [],
  );

  const officialSystemTemplates = useMemo(
    () => BOARD_TEMPLATES
      .filter((template) => allowedSystemTemplateIds.has(String(template.id || "").trim()))
      .concat(extraSystemBoardTemplates)
      .filter((template) => allowedSystemTemplateIds.has(String(template.id || "").trim())),
    [allowedSystemTemplateIds, extraSystemBoardTemplates],
  );

  const officialBoardTemplatesById = useMemo(
    () => new Map(officialSystemTemplates.map((template) => [String(template.id || "").trim(), template])),
    [officialSystemTemplates],
  );

  function isAllowedFixedTemplateEntry(entry) {
    const protectedTemplate = resolveProtectedSystemTemplate(entry);
    if (protectedTemplate) {
      return allowedSystemTemplateIds.has(String(protectedTemplate.id || "").trim());
    }

    const rawId = String(entry?.id || "").trim();
    if (rawId && allowedSystemTemplateIds.has(rawId)) return true;

    const normalizedName = normalizeKey(entry?.name || "");
    return Boolean(normalizedName) && allowedSystemTemplateNames.has(normalizedName);
  }

  function isCustomTemplateEntry(entry) {
    return Boolean(entry?.isCustom);
  }

  function getAllowedSystemTemplateKey(entry) {
    const protectedTemplate = resolveProtectedSystemTemplate(entry);
    if (protectedTemplate?.id) return String(protectedTemplate.id).trim();
    const rawId = String(entry?.id || "").trim();
    if (rawId) return rawId;
    return normalizeKey(entry?.name || "");
  }

  const availableBoardTemplates = useMemo(() => {
    const boardDerivedSystemTemplates = (state.controlBoards || [])
      .map((board) => {
        const systemTemplate = resolveProtectedSystemTemplate(board);
        if (!systemTemplate || hiddenBaseTemplateIds.includes(systemTemplate.id)) return null;
        return {
          ...systemTemplate,
          settings: board.settings || systemTemplate.settings,
          columns: (board.fields || []).map((field) => ({
            ...field,
            templateKey: field.templateKey || field.id,
          })),
        };
      })
      .filter(Boolean);

    const visibleBaseTemplates = officialSystemTemplates.filter((template) => !hiddenBaseTemplateIds.includes(template.id));
    const mergedBaseTemplateMap = new Map(visibleBaseTemplates.map((template) => [template.id, template]));
    boardDerivedSystemTemplates.forEach((template) => {
      mergedBaseTemplateMap.set(template.id, template);
    });
    const mergedBaseTemplates = Array.from(mergedBaseTemplateMap.values()).filter(isAllowedFixedTemplateEntry);

    const sourceTemplates = currentUser
      ? mergedBaseTemplates.concat((state.boardTemplates || []).filter((template) => canUserAccessTemplate(template, currentUser)))
      : mergedBaseTemplates;

    const fixedTemplates = sourceTemplates.filter((template) => !isCustomTemplateEntry(template)).filter(isAllowedFixedTemplateEntry);
    const customTemplates = sourceTemplates.filter((template) => isCustomTemplateEntry(template));
    const dedupedBySystemKey = new Map();
    fixedTemplates.forEach((template) => {
      const key = getAllowedSystemTemplateKey(template);
      if (!key) return;
      const current = dedupedBySystemKey.get(key);
      if (!current) {
        dedupedBySystemKey.set(key, template);
        return;
      }

      const currentCols = Array.isArray(current?.columns) ? current.columns.length : 0;
      const nextCols = Array.isArray(template?.columns) ? template.columns.length : 0;
      if (nextCols > currentCols) {
        dedupedBySystemKey.set(key, template);
      }
    });
    return Array.from(dedupedBySystemKey.values()).concat(customTemplates);
  }, [currentUser, hiddenBaseTemplateIds, officialSystemTemplates, state.boardTemplates, state.controlBoards]);

  const customTemplateIds = useMemo(
    () => new Set((state.boardTemplates || []).map((template) => template.id)),
    [state.boardTemplates],
  );

  function resolveProtectedSystemTemplate(entry) {
    if (!entry) return null;
    const systemTemplateId = String(entry?.settings?.systemBoardTemplateId || "").trim();
    if (systemTemplateId && officialBoardTemplatesById.has(systemTemplateId)) {
      return officialBoardTemplatesById.get(systemTemplateId);
    }

    const normalizedName = normalizeKey(entry?.name || "");
    return officialSystemTemplates.find((template) => {
      const normalizedTemplateName = normalizeKey(template.name || "");
      if (normalizedTemplateName === normalizedName) return true;
      return (template.aliases || []).some((alias) => normalizeKey(alias) === normalizedName);
    }) || null;
  }

  function isProtectedSystemBoard(entry) {
    return Boolean(resolveProtectedSystemTemplate(entry));
  }

  function canDeleteControlBoardEntry(entry) {
    // Los tableros creados siempre se pueden eliminar; solo las plantillas del sistema están protegidas.
    return true;
  }

  function canDeleteBoardTemplateEntry(entry) {
    if (!entry || isProtectedSystemBoard(entry) || !entry.isCustom) return false;
    if (!currentUser) return false;
    return String(entry.createdById || "").trim() === String(currentUser.id || "").trim();
  }

  const allowedNavItems = useMemo(
    () => currentUser ? NAV_ITEMS.filter((item) => canAccessPage(currentUser, item.id, normalizedPermissions)) : [],
    [currentUser, normalizedPermissions],
  );

  const utilityNavItems = useMemo(
    () => allowedNavItems.filter((item) => {
      if ([PAGE_CUSTOM_BOARDS, PAGE_BOARD, PAGE_TRANSPORT, PAGE_INCIDENCIAS].includes(item.id)) return false;
      if (item.group === "Mejora continua") return false;
      const requiredActionId = NAV_UTILITY_ACTION_BY_GROUP[item.group] || "";
      if (!requiredActionId) return true;
      return canDoAction(currentUser, requiredActionId, normalizedPermissions);
    }),
    [allowedNavItems, currentUser, normalizedPermissions],
  );

  const areaNavSections = useMemo(() => {
    const staticSections = APP_AREA_SECTIONS.map((section) => ({
      ...section,
      items: (
        section.id === "transporte"
          ? [
            { pageId: PAGE_TRANSPORT, label: "Registros de envíos", shortLabel: "Registros de envíos", transportSection: "registros-envios", transportTab: "area-retail", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.transporte["registros-envios"] },
            { pageId: PAGE_TRANSPORT, label: "Control transporte", shortLabel: "Control transporte", transportSection: "control-transporte", transportTab: "asignaciones", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.transporte["control-transporte"] },
            { pageId: PAGE_TRANSPORT, label: "Incidencias transporte", shortLabel: "Incidencias", transportSection: "incidencias-transporte", transportTab: "incidencias-transporte", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.transporte["incidencias-transporte"] },
            { pageId: PAGE_TRANSPORT, label: "Consolidados", shortLabel: "Consolidados", transportSection: "consolidados", transportTab: "consolidado", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.transporte["consolidados"] },
            { pageId: PAGE_TRANSPORT, label: "Dashboard", shortLabel: "Dashboard", transportSection: "dashboard-transporte", transportTab: "dashboard-transporte", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.transporte["dashboard-transporte"] },
            { pageId: PAGE_TRANSPORT, label: "Direcciones y gastos", shortLabel: "Dir./Gts.", transportSection: "direcciones-gastos", transportTab: "logistica", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.transporte["direcciones-gastos"] },
          ]
          : section.id === "mantenimiento"
            ? [
              { pageId: PAGE_INCIDENCIAS, label: "Incidencias", shortLabel: "Incidencias", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.incidencias },
              { pageId: PAGE_DASHBOARD, label: "Dashboard", shortLabel: "Dash", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.dashboard },
              { pageId: PAGE_BOARD, label: "Creador de tableros", shortLabel: "Creador", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.board },
              { pageId: PAGE_CUSTOM_BOARDS, label: "Mis tableros", shortLabel: "Tableros", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.customBoards },
            ]
          : section.id === "mejora-continua"
            ? [
              { pageId: PAGE_PROCESS_AUDITS, label: "Auditoría", shortLabel: "Auditoría", auditPreset: { tab: "capture" }, requiredActionId: "" },
              { pageId: PAGE_PROCESS_AUDITS, label: "Dashboard", shortLabel: "Dashboard", auditPreset: { tab: "dashboard" }, requiredActionId: "" },
              { pageId: PAGE_PROCESS_AUDITS, label: "Historial", shortLabel: "Hist.", auditPreset: { tab: "history" }, requiredActionId: "" },
            ]
            : [
            { pageId: PAGE_DASHBOARD, label: "Dashboard", shortLabel: "Dash", requiredActionId: AREA_TAB_PERMISSION_ACTIONS[section.id]?.dashboard || "" },
            { pageId: PAGE_BOARD, label: "Creador de tableros", shortLabel: "Creador", requiredActionId: AREA_TAB_PERMISSION_ACTIONS[section.id]?.board || "" },
            { pageId: PAGE_CUSTOM_BOARDS, label: "Mis tableros", shortLabel: "Tableros", requiredActionId: AREA_TAB_PERMISSION_ACTIONS[section.id]?.customBoards || "" },
            { pageId: PAGE_HISTORY, label: "Historial", shortLabel: "Hist.", requiredActionId: AREA_TAB_PERMISSION_ACTIONS[section.id]?.history || "" },
          ]
      ),
    }));

    const dynamicSections = dynamicAreaSectionRoots.map((rootArea) => ({
      id: normalizeAreaSectionId(rootArea),
      label: String(rootArea || "").toUpperCase(),
      scopes: [rootArea],
      items: [
        { pageId: PAGE_DASHBOARD, label: "Dashboard", shortLabel: "Dash", requiredActionId: "" },
        { pageId: PAGE_BOARD, label: "Creador de tableros", shortLabel: "Creador", requiredActionId: "" },
        { pageId: PAGE_CUSTOM_BOARDS, label: "Mis tableros", shortLabel: "Tableros", requiredActionId: "" },
        { pageId: PAGE_HISTORY, label: "Historial", shortLabel: "Hist.", requiredActionId: "" },
      ],
    }));

    return [...staticSections, ...dynamicSections]
      .map((section) => ({
        ...section,
        items: (section.items || []).filter((item) => canAccessPage(currentUser, item.pageId, normalizedPermissions) && (!item.requiredActionId || canDoAction(currentUser, item.requiredActionId, normalizedPermissions))),
      }))
      .filter((section) => {
        if (!section.items.length) return false;
        const requiredActionId = NAV_AREA_ACTION_BY_SECTION[section.id] || "";
        if (!requiredActionId) return true;
        return canDoAction(currentUser, requiredActionId, normalizedPermissions);
      });
  }, [currentUser, normalizedPermissions, dynamicAreaSectionRoots]);

  const selectedAreaSection = useMemo(
    () => areaNavSections.find((section) => section.id === selectedAreaSectionId) || null,
    [areaNavSections, selectedAreaSectionId],
  );

  useEffect(() => {
    if (selectedAreaSectionId === "all") return;
    if (selectedAreaSectionId === "admin") return;
    if (!areaNavSections.length) return;
    if (areaNavSections.some((section) => section.id === selectedAreaSectionId)) return;

    const matchedSection = findAreaSectionByLabel(selectedAreaSectionId, areaNavSections);
    if (matchedSection) {
      setSelectedAreaSectionId(matchedSection.id);
      return;
    }

    setSelectedAreaSectionId("all");
  }, [areaNavSections, selectedAreaSectionId]);

  const permissionManagedUsers = useMemo(
    () => visibleUsers.filter((user) => user.isActive),
    [visibleUsers],
  );

  const permissionPages = useMemo(() => NAV_ITEMS, []);

  const menuPermissionSections = useMemo(() => {
    const actionLabelById = new Map(ACTION_DEFINITIONS.map((item) => [item.id, item.label]));
    const buildScopedActionPermissions = (scopeActionId, baseActionIds = []) => baseActionIds
      .map((actionId) => ({
        id: getScopedAreaActionPermissionId(scopeActionId, actionId),
        label: actionLabelById.get(actionId) || actionId,
        kind: "actions",
      }))
      .filter((item) => item.id && item.label);

    const mainDashboardSection = {
      id: "main-dashboard",
      label: "DASHBOARD PRINCIPAL",
      navVisibilityActionId: PAGE_DASHBOARD,
      navVisibilityKind: "pages",
      itemPermissions: [
        {
          id: PAGE_DASHBOARD,
          label: "Dashboard principal (todas las áreas)",
          kind: "pages",
          actionPermissions: [
            { id: "exportDashboardData", label: actionLabelById.get("exportDashboardData") || "Exportar dashboard", kind: "actions" },
            { id: "manageDashboardState", label: actionLabelById.get("manageDashboardState") || "Administrar dashboard", kind: "actions" },
          ],
        },
      ],
    };

    const areaSections = APP_AREA_SECTIONS.map((section) => {
      const navVisibilityActionId = NAV_AREA_ACTION_BY_SECTION[section.id] || "";
      const itemPermissions = section.id === "transporte"
        ? [
          { id: AREA_TAB_PERMISSION_ACTIONS.transporte["registros-envios"], label: "Registros de envíos", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.transporte["registros-envios"], TRANSPORT_SECTION_ACTIONS["registros-envios"]) },
          { id: AREA_TAB_PERMISSION_ACTIONS.transporte["control-transporte"], label: "Control transporte", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.transporte["control-transporte"], TRANSPORT_SECTION_ACTIONS["control-transporte"]) },
          { id: AREA_TAB_PERMISSION_ACTIONS.transporte["incidencias-transporte"], label: "Incidencias transporte", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.transporte["incidencias-transporte"], TRANSPORT_SECTION_ACTIONS["incidencias-transporte"]) },
          { id: AREA_TAB_PERMISSION_ACTIONS.transporte["consolidados"], label: "Consolidados", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.transporte["consolidados"], TRANSPORT_SECTION_ACTIONS["consolidados"]) },
          { id: AREA_TAB_PERMISSION_ACTIONS.transporte["dashboard-transporte"], label: "Dashboard", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.transporte["dashboard-transporte"], TRANSPORT_SECTION_ACTIONS["dashboard-transporte"]) },
          { id: AREA_TAB_PERMISSION_ACTIONS.transporte["direcciones-gastos"], label: "Direcciones y gastos", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.transporte["direcciones-gastos"], TRANSPORT_SECTION_ACTIONS["direcciones-gastos"]) },
        ]
        : section.id === "mantenimiento"
          ? [
            { id: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.incidencias, label: "Incidencias", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.mantenimiento.incidencias, ["createIncidencia", "editIncidencia", "deleteIncidencia"]) },
            { id: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.dashboard, label: "Dashboard", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.mantenimiento.dashboard, AREA_TAB_BASE_ACTIONS.dashboard) },
            { id: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.board, label: "Creador de tableros", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.mantenimiento.board, AREA_TAB_BASE_ACTIONS.board) },
            { id: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.customBoards, label: "Mis tableros", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS.mantenimiento.customBoards, AREA_TAB_BASE_ACTIONS.customBoards) },
          ]
        : [
          { id: AREA_TAB_PERMISSION_ACTIONS[section.id]?.dashboard || "", label: "Dashboard", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS[section.id]?.dashboard || "", AREA_TAB_BASE_ACTIONS.dashboard) },
          { id: AREA_TAB_PERMISSION_ACTIONS[section.id]?.board || "", label: "Creador de tableros", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS[section.id]?.board || "", AREA_TAB_BASE_ACTIONS.board) },
          { id: AREA_TAB_PERMISSION_ACTIONS[section.id]?.customBoards || "", label: "Mis tableros", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS[section.id]?.customBoards || "", AREA_TAB_BASE_ACTIONS.customBoards) },
          { id: AREA_TAB_PERMISSION_ACTIONS[section.id]?.history || "", label: "Historial", kind: "actions", actionPermissions: buildScopedActionPermissions(AREA_TAB_PERMISSION_ACTIONS[section.id]?.history || "", AREA_TAB_BASE_ACTIONS.history) },
        ];
      return {
        id: section.id,
        label: section.label,
        navVisibilityActionId,
        navVisibilityKind: "actions",
        itemPermissions: itemPermissions.filter((item) => item.id),
      };
    });

    const utilitySections = Object.entries(NAV_UTILITY_ACTION_BY_GROUP).map(([groupLabel, actionId]) => {
      const pageItemPermissions = permissionPages
        .filter((item) => item.group === groupLabel)
        .filter((item) => ![PAGE_DASHBOARD, PAGE_CUSTOM_BOARDS, PAGE_BOARD, PAGE_HISTORY, PAGE_TRANSPORT].includes(item.id))
        .map((item) => ({ id: item.id, label: item.label, kind: "pages" }));

      const inventoryTabPermissions = groupLabel === "Producción" ? [
        {
          id: "viewBaseInventory",
          label: actionLabelById.get("viewBaseInventory") || "Ver pestaña Productos",
          kind: "actions",
          actionPermissions: [
            { id: "manageInventory", label: actionLabelById.get("manageInventory") || "Crear y editar inventario base", kind: "actions" },
            { id: "deleteInventory", label: actionLabelById.get("deleteInventory") || "Eliminar artículos de inventario base", kind: "actions" },
            { id: "importInventory", label: actionLabelById.get("importInventory") || "Importar inventario base", kind: "actions" },
          ],
        },
        {
          id: "viewCleaningInventory",
          label: actionLabelById.get("viewCleaningInventory") || "Ver pestaña Insumos de limpieza",
          kind: "actions",
          actionPermissions: [
            { id: "manageCleaningInventory", label: actionLabelById.get("manageCleaningInventory") || "Crear y editar insumos de limpieza", kind: "actions" },
            { id: "deleteCleaningInventory", label: actionLabelById.get("deleteCleaningInventory") || "Eliminar insumos de limpieza", kind: "actions" },
            { id: "importCleaningInventory", label: actionLabelById.get("importCleaningInventory") || "Importar insumos de limpieza", kind: "actions" },
          ],
        },
        {
          id: "viewOrderInventory",
          label: actionLabelById.get("viewOrderInventory") || "Ver pestaña Insumos para pedidos",
          kind: "actions",
          actionPermissions: [
            { id: "manageOrderInventory", label: actionLabelById.get("manageOrderInventory") || "Crear y editar insumos para pedidos", kind: "actions" },
            { id: "deleteOrderInventory", label: actionLabelById.get("deleteOrderInventory") || "Eliminar insumos para pedidos", kind: "actions" },
            { id: "importOrderInventory", label: actionLabelById.get("importOrderInventory") || "Importar insumos para pedidos", kind: "actions" },
          ],
        },
      ] : [];

      const itemPermissions = [...pageItemPermissions, ...inventoryTabPermissions];

      return {
        id: `utility-${groupLabel.toLowerCase()}`,
        label: groupLabel.toUpperCase(),
        navVisibilityActionId: actionId,
        navVisibilityKind: "actions",
        itemPermissions,
      };
    }).filter((section) => section.itemPermissions.length > 0);

    return [mainDashboardSection].concat(areaSections, utilitySections);
  }, [permissionPages]);

  const userModalRoleOptions = useMemo(() => {
    if (!currentUser) return [];
    const options = new Set(creatableRoles);
    if (userModal.mode === "edit" && userModal.role) options.add(userModal.role);
    return Array.from(options);
  }, [creatableRoles, currentUser, userModal.mode, userModal.role]);

  const templateCategories = useMemo(() => {
    const categories = availableBoardTemplates.map((template) => getBoardTemplateCategory(template));
    return ["Todas"].concat(Array.from(new Set(categories)));
  }, [availableBoardTemplates]);

  const filteredBoardTemplates = useMemo(() => {
    const term = templateSearch.trim().toLowerCase();
    return availableBoardTemplates.filter((template) => {
      const category = getBoardTemplateCategory(template);
      const matchesCategory = templateCategoryFilter === "Todas" || category === templateCategoryFilter;
      const searchableParts = [
        String(template.name || ""),
        String(template.category || ""),
        String(template.description || ""),
        ...(Array.isArray(template.aliases) ? template.aliases : []),
      ];
      const matchesSearch = !term || searchableParts.some((entry) => String(entry || "").toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [availableBoardTemplates, templateCategoryFilter, templateSearch]);

  const selectedPreviewTemplate = useMemo(
    () => availableBoardTemplates.find((template) => template.id === templatePreviewId) || null,
    [availableBoardTemplates, templatePreviewId],
  );

  const editableVisibleBoards = useMemo(
    () => visibleControlBoards.filter((board) => canEditBoard(currentUser, board)),
    [currentUser, visibleControlBoards],
  );

  const boardBuilderPreview = useMemo(
    () => selectedPreviewTemplate
      ? buildTemplatePreviewBoard(selectedPreviewTemplate, currentUser?.id || "", state.inventoryItems || [])
      : buildDraftPreviewBoard(controlBoardDraft, currentUser?.id || "", state.inventoryItems || []),
    [controlBoardDraft, currentUser, selectedPreviewTemplate, state.inventoryItems],
  );

  const selectedCustomBoardSections = useMemo(
    () => getBoardSectionGroups(selectedCustomBoardDisplay),
    [selectedCustomBoardDisplay],
  );

  useEffect(() => {
    if (selectedCustomBoardViewId === "current") return;
    if (!selectedCustomBoardHistoryOptions.some((snapshot) => snapshot.id === selectedCustomBoardViewId)) {
      setSelectedCustomBoardViewId("current");
    }
  }, [selectedCustomBoardHistoryOptions, selectedCustomBoardViewId]);

  const filteredAuditLog = useMemo(() => {
    const nowMs = Date.now();
    const periodMs = getAuditPeriodMs(auditFilters.period);
    const searchTerm = auditFilters.search.trim().toLowerCase();

    return (state.auditLog || []).filter((entry) => {
      const matchesScope = auditFilters.scope === "all" || entry.scope === auditFilters.scope;
      const matchesUser = auditFilters.userId === "all" || entry.userId === auditFilters.userId;
      const matchesPeriod = !periodMs || (entry.createdAt && nowMs - new Date(entry.createdAt).getTime() <= periodMs);
      const matchesSearch = !searchTerm || [entry.message, entry.scope, entry.userName].some((value) => String(value || "").toLowerCase().includes(searchTerm));
      return matchesScope && matchesUser && matchesPeriod && matchesSearch;
    });
  }, [auditFilters, state.auditLog]);

  useEffect(() => {
    if (!state.controlBoards?.length) {
      if (selectedPermissionBoardId) setSelectedPermissionBoardId("");
      return;
    }
    const exists = state.controlBoards.some((board) => board.id === selectedPermissionBoardId);
    if (!exists) {
      setSelectedPermissionBoardId(state.controlBoards[0].id);
    }
  }, [selectedPermissionBoardId, state.controlBoards]);

  useEffect(() => {
    if (!permissionManagedUsers.length) {
      if (selectedPermissionUserId) setSelectedPermissionUserId("");
      return;
    }

    if (!permissionManagedUsers.some((user) => user.id === selectedPermissionUserId)) {
      setSelectedPermissionUserId(permissionManagedUsers[0].id);
    }
  }, [permissionManagedUsers, selectedPermissionUserId]);

  const draftColumnGroups = useMemo(() => {
    const groups = new Map();
    (controlBoardDraft.columns || []).forEach((column) => {
      const key = column.groupName || "General";
      if (!groups.has(key)) {
        groups.set(key, {
          name: key,
          color: column.groupColor || "#e2f4ec",
          columns: [],
        });
      }
      groups.get(key).columns.push(column);
    });
    return Array.from(groups.values());
  }, [controlBoardDraft.columns]);

  const customBoardMetrics = useMemo(() => {
    if (!selectedCustomBoardDisplay) return null;
    const rows = selectedCustomBoardDisplay.rows || [];
    const completed = rows.filter((row) => row.status === STATUS_FINISHED).length;
    const running = rows.filter((row) => row.status === STATUS_RUNNING).length;
    const paused = rows.filter((row) => row.status === STATUS_PAUSED).length;
    const totalSeconds = rows.reduce((sum, row) => sum + getElapsedSeconds(row, now, operationalPauseState), 0);
    return {
      totalRows: rows.length,
      completed,
      running,
      paused,
      averageMinutes: rows.length ? totalSeconds / rows.length / 60 : 0,
    };
  }, [now, operationalPauseState, selectedCustomBoardDisplay]);

  const dashboardResponsibleRows = useMemo(() => {
    const max = Math.max(...rankingByUser.map((item) => item.averageMinutes), 1);
    return rankingByUser.map((item) => {
      const label = userMap.get(item.responsibleId)?.name || "N/A";
      const visual = getResponsibleVisual(label);
      return {
        ...item,
        label,
        initial: label.charAt(0).toUpperCase(),
        color: `linear-gradient(90deg, ${visual.accent} 0%, ${visual.soft} 100%)`,
        max,
      };
    });
  }, [rankingByUser, userMap]);

  const dashboardActivityRows = useMemo(() => {
    return activityVsLimit.map((item) => {
      const label = item.label?.toUpperCase() || "ACTIVIDAD";
      const exceeded = item.limitMinutes > 0 && item.averageMinutes > item.limitMinutes;
      const color = exceeded
        ? "linear-gradient(90deg, #fbbf24 0%, #ef4444 100%)"
        : "linear-gradient(90deg, #8fb4d6 0%, #6f98bf 100%)";
      return {
        ...item,
        label,
        exceeded,
        color,
        percent: item.limitMinutes > 0 ? (item.averageMinutes / item.limitMinutes) * 100 : 0,
      };
    });
  }, [activityVsLimit]);

  const dashboardDistributionRows = useMemo(() => {
    return distributionByUser.map((item) => {
      const label = userMap.get(item.responsibleId)?.name || "N/A";
      const visual = getResponsibleVisual(label);
      return {
        ...item,
        label,
        color: `linear-gradient(90deg, ${visual.accent} 0%, ${visual.soft} 100%)`,
        solidColor: visual.accent,
      };
    });
  }, [distributionByUser, userMap]);

  useEffect(() => {
    sessionSnapshotRef.current = {
      userId: currentUser?.id || "",
      sessionVersion: Number(currentUser?.sessionVersion || 0),
    };
  }, [currentUser?.id, currentUser?.sessionVersion]);

  useEffect(() => {
    if (!isForcedPasswordChange) return;
    setProfileModalOpen(false);
  }, [isForcedPasswordChange]);

  useEffect(() => {
    if (!pauseState.open || pauseState.completed || pauseState.reason || !pauseReasonOptions.length) return;
    setPauseState((current) => (
      current.open && !current.completed && !current.reason
        ? { ...current, reason: pauseReasonOptions[0] }
        : current
    ));
  }, [pauseState.open, pauseState.completed, pauseState.reason, pauseReasonOptions]);

  useEffect(() => {
    if (!boardPauseState.open || boardPauseState.completed || boardPauseState.reason || !pauseReasonOptions.length) return;
    setBoardPauseState((current) => (
      current.open && !current.completed && !current.reason
        ? { ...current, reason: pauseReasonOptions[0] }
        : current
    ));
  }, [boardPauseState.open, boardPauseState.completed, boardPauseState.reason, pauseReasonOptions]);

  function resolvePauseReasonValue(pauseEntry) {
    const isCustomReasonSelected = String(pauseEntry?.reason || "").trim() === CUSTOM_PAUSE_REASON_VALUE;
    const customReason = String(pauseEntry?.customReason || "").trim();
    if (isCustomReasonSelected) return customReason;
    if (customReason) return customReason;
    return String(pauseEntry?.reason || "").trim();
  }

  function findEnabledPauseReasonByLabel(label) {
    const normalizedLabel = String(label || "").trim().toLowerCase();
    if (!normalizedLabel) return null;
    return enabledPauseReasons.find((entry) => String(entry.label || "").trim().toLowerCase() === normalizedLabel) || null;
  }

  function invalidateClientSession(message) {
    clearSessionExpiredHandler();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionUserId("");
    setProfileModalOpen(false);
    setPasswordForm({ password: "", confirmPassword: "", message: "" });
    setLoginError(message || "");
  }

  function handleConfirmPause() {
    if (pauseState.completed) {
      if (!pauseState.continueReady) return;
      // Reanudar actividad al presionar Continuar
      const resumeIso = new Date().toISOString();
      setState((current) => ({
        ...current,
        activities: current.activities.map((activity) => {
          if (activity.id !== pauseState.activityId) return activity;
          return { ...activity, status: STATUS_RUNNING, lastResumedAt: resumeIso };
        }),
        pauseLogs: current.pauseLogs.map((log) => {
          if (log.id !== pauseState.pauseLogId) return log;
          const pausedAt = new Date(log.pausedAt).getTime();
          const resumedAt = new Date(resumeIso).getTime();
          return { ...log, resumedAt: resumeIso, pauseDurationSeconds: Math.round((resumedAt - pausedAt) / 1000) };
        }),
      }));
      if (pauseContinueTimerRef.current) clearTimeout(pauseContinueTimerRef.current);
      setPauseState({ open: false, activityId: null, reason: "", customReason: "", error: "", completed: false, continueReady: false, pauseLogId: null });
      return;
    }

    const pauseReasonValue = resolvePauseReasonValue(pauseState);
    if (!pauseReasonValue) {
      setPauseState((current) => ({ ...current, error: "El motivo es obligatorio para poder pausar." }));
      return;
    }
    if (String(pauseReasonValue).trim().toLowerCase() === "ajuste manual de contadores") {
      setPauseState((current) => ({ ...current, error: "Este motivo no está permitido para pausar actividades." }));
      return;
    }

    const nowIso = new Date().toISOString();
    const pauseLogId = makeId("pause");

    setState((current) => ({
      ...current,
      activities: current.activities.map((activity) => {
        if (activity.id !== pauseState.activityId) return activity;
        return {
          ...activity,
          status: STATUS_PAUSED,
            accumulatedSeconds: updateElapsedForFinish(activity, nowIso, operationalPauseState),
          lastResumedAt: null,
        };
      }),
      pauseLogs: current.pauseLogs.concat({
        id: pauseLogId,
        weekActivityId: pauseState.activityId,
        pauseReason: pauseReasonValue,
        pausedAt: nowIso,
        resumedAt: null,
        pauseDurationSeconds: 0,
      }),
    }));

    if (pauseContinueTimerRef.current) clearTimeout(pauseContinueTimerRef.current);
    pauseContinueTimerRef.current = setTimeout(() => {
      setPauseState((current) => (current.completed ? { ...current, continueReady: true } : current));
    }, 3000);

    setPauseState((current) => ({
      ...current,
      error: "",
      completed: true,
      continueReady: false,
      pauseLogId,
    }));
  }

  function openBoardPauseModal(boardId, rowId) {
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    if (!board || !row || !canOperateBoardRowRecord(currentUser, board, row, normalizedPermissions) || row.status !== STATUS_RUNNING) return;
    setBoardPauseState({
      open: true,
      boardId,
      rowId,
      reason: pauseReasonOptions[0] || "",
      customReason: "",
      error: "",
      completed: false,
      continueReady: false,
      authorizedPauseSeconds: 0,
      pauseStartedAtMs: 0,
    });
  }

  function handleConfirmBoardPause() {
    if (boardPauseState.completed) {
      if (!boardPauseState.continueReady) return;
      // Reanudar fila al presionar Continuar
      requestJson(`/warehouse/boards/${boardPauseState.boardId}/rows/${boardPauseState.rowId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: STATUS_RUNNING }),
      }).then((remoteState) => {
        applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      }).catch(() => {});
      if (boardPauseContinueTimerRef.current) clearTimeout(boardPauseContinueTimerRef.current);
      setBoardPauseState({
        open: false,
        boardId: null,
        rowId: null,
        reason: "",
        customReason: "",
        error: "",
        completed: false,
        continueReady: false,
        authorizedPauseSeconds: 0,
        pauseStartedAtMs: 0,
      });
      return;
    }

    const boardPauseReasonValue = resolvePauseReasonValue(boardPauseState);
    if (!boardPauseReasonValue) {
      setBoardPauseState((current) => ({ ...current, error: "El motivo es obligatorio para poder pausar." }));
      return;
    }
    if (String(boardPauseReasonValue).trim().toLowerCase() === "ajuste manual de contadores") {
      setBoardPauseState((current) => ({ ...current, error: "Este motivo no está permitido para pausar filas." }));
      return;
    }

    requestJson(`/warehouse/boards/${boardPauseState.boardId}/rows/${boardPauseState.rowId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: STATUS_PAUSED,
        lastPauseReason: boardPauseReasonValue,
      }),
    }).then((remoteState) => {
      const normalizedState = applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      const pausedBoard = (normalizedState?.controlBoards || []).find((board) => board.id === boardPauseState.boardId);
      const pausedRow = (pausedBoard?.rows || []).find((row) => row.id === boardPauseState.rowId);
      const pauseRule = findEnabledPauseReasonByLabel(boardPauseReasonValue);
      const startedAtMsCandidate = pausedRow?.pauseStartedAt ? new Date(pausedRow.pauseStartedAt).getTime() : Date.now();
      const fallbackAuthorizedSeconds = Math.max(0, Math.round(Number(pauseRule?.authorizedMinutes || 0) * 60));
      const authorizedPauseSeconds = Math.max(0, Number(pausedRow?.pauseAuthorizedSeconds ?? fallbackAuthorizedSeconds));
      if (boardPauseContinueTimerRef.current) clearTimeout(boardPauseContinueTimerRef.current);
      boardPauseContinueTimerRef.current = setTimeout(() => {
        setBoardPauseState((current) => (current.completed ? { ...current, continueReady: true } : current));
      }, 3000);
      setBoardPauseState((current) => ({
        ...current,
        error: "",
        completed: true,
        continueReady: false,
        authorizedPauseSeconds,
        pauseStartedAtMs: Number.isFinite(startedAtMsCandidate) ? startedAtMsCandidate : Date.now(),
      }));
    }).catch((error) => {
      setBoardPauseState((current) => ({ ...current, error: error?.message || "No se pudo pausar la fila." }));
    });
  }

  function openCatalogCreate(preferredCategory = "General") {
    const normalizedCategory = String(preferredCategory || "General").trim() || "General";
    setCatalogModal({ ...createEmptyCatalogModalState(), open: true, mode: "create", category: normalizedCategory, area: normalizeCatalogArea(normalizedCategory) });
  }

  function exportCatalogToCsv() {
    const items = state.catalog.filter((item) => !item.isDeleted);
    if (!items.length) return;
    const header = ["nombre", "lista", "area", "dias", "naves", "dias_por_nave", "tiempo_limite_min", "tipo"].join(",");
    const rows = items.map((item) =>
      [
        `"${String(item.name || "").replace(/"/g, '""')}"`,
        `"${String(item.category || "General").replace(/"/g, '""')}"`,
        `"${String(item.area || item.category || "General").replace(/"/g, '""')}"`,
        `"${normalizeCatalogScheduledDays(item.scheduledDays, item.frequency).join(";")}"`,
        `"${normalizeCatalogCleaningSites(item.cleaningSites).join(";")}"`,
        `"${serializeCatalogScheduledDaysBySite(item.scheduledDaysBySite)}"`,
        String(item.timeLimitMinutes || 0),
        item.isMandatory ? "Obligatoria" : "Ocasional",
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "catalogo-actividades.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCatalogFromCsv(file) {
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return;
    const headerLine = lines[0].toLowerCase().replace(/^\uFEFF/, "");
    const headers = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const nameIdx = headers.findIndex((h) => h.includes("nombre") || h === "name");
    const catIdx = headers.findIndex((h) => h.includes("lista") || h.includes("categoria") || h.includes("category"));
    const areaIdx = headers.findIndex((h) => h === "area" || h.includes("area") || h.includes("área"));
    const daysIdx = headers.findIndex((h) => h.includes("dias") || h.includes("días") || h === "days");
    const sitesIdx = headers.findIndex((h) => h.includes("naves") || h.includes("sedes") || h.includes("sites"));
    const siteDaysIdx = headers.findIndex((h) => h.includes("dias_por_nave") || h.includes("días_por_nave") || h.includes("days_by_site") || h.includes("daybysite"));
    const freqIdx = headers.findIndex((h) => h.includes("frecuencia") || h === "frequency");
    const limitIdx = headers.findIndex((h) => h.includes("tiempo") || h.includes("limit") || h.includes("min"));
    const typeIdx = headers.findIndex((h) => h.includes("tipo") || h === "type" || h.includes("mandatory"));
    if (nameIdx === -1) return;

    function parseCsvRow(line) {
      const result = [];
      let inQuote = false;
      let current = "";
      for (const char of line) {
        if (char === '"') { inQuote = !inQuote; continue; }
        if (char === "," && !inQuote) { result.push(current); current = ""; continue; }
        current += char;
      }
      result.push(current);
      return result;
    }

    const validFrequencies = new Set(ACTIVITY_FREQUENCY_OPTIONS.map((o) => o.value));
    const freqByLabel = Object.fromEntries(ACTIVITY_FREQUENCY_OPTIONS.map((o) => [o.label.toLowerCase(), o.value]));

    const items = lines.slice(1).map((line) => {
      const cols = parseCsvRow(line);
      const name = String(cols[nameIdx] || "").trim();
      if (!name) return null;
      const category = catIdx >= 0 ? String(cols[catIdx] || "General").trim() || "General" : "General";
      const area = areaIdx >= 0 ? normalizeCatalogArea(cols[areaIdx], category) : normalizeCatalogArea(category);
      const rawFreq = freqIdx >= 0 ? String(cols[freqIdx] || "weekly").trim().toLowerCase() : "weekly";
      const frequency = validFrequencies.has(rawFreq) ? rawFreq : (freqByLabel[rawFreq] || "weekly");
      const rawDays = daysIdx >= 0 ? String(cols[daysIdx] || "") : "";
      const scheduledDays = rawDays
        ? normalizeCatalogScheduledDays(
          rawDays
            .split(/[;|,\s]+/)
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => {
              const normalized = entry.toLowerCase();
              if (normalized === "l" || normalized === "lun" || normalized === "lunes") return 0;
              if (normalized === "m" || normalized === "mar" || normalized === "martes") return 1;
              if (normalized === "x" || normalized === "mie" || normalized === "miércoles" || normalized === "miercoles") return 2;
              if (normalized === "j" || normalized === "jue" || normalized === "jueves") return 3;
              if (normalized === "v" || normalized === "vie" || normalized === "viernes") return 4;
              if (normalized === "s" || normalized === "sab" || normalized === "sábado" || normalized === "sabado") return 5;
              if (normalized === "d" || normalized === "dom" || normalized === "domingo") return 6;
              const numeric = Number(normalized);
              return Number.isFinite(numeric) ? numeric : null;
            })
            .filter((entry) => entry !== null),
          frequency,
        )
        : normalizeCatalogScheduledDays([], frequency);
      const rawSites = sitesIdx >= 0 ? String(cols[sitesIdx] || "") : "";
      const cleaningSites = normalizeCatalogCleaningSites(rawSites.split(/[;|,\s]+/).map((entry) => entry.trim()).filter(Boolean));
      const rawSiteDays = siteDaysIdx >= 0 ? String(cols[siteDaysIdx] || "") : "";
      const scheduledDaysBySite = parseCatalogScheduledDaysBySite(rawSiteDays, scheduledDays);
      const timeLimitMinutes = Math.max(0, Number(limitIdx >= 0 ? cols[limitIdx] : 0) || 0);
      const rawType = typeIdx >= 0 ? String(cols[typeIdx] || "").trim().toLowerCase() : "";
      const isMandatory = rawType === "obligatoria" || rawType === "true" || rawType === "1";
      return { name, category, area, frequency, scheduledDays, scheduledDaysBySite, cleaningSites, timeLimitMinutes: timeLimitMinutes || 30, isMandatory, isDeleted: false };
    }).filter(Boolean);

    if (!items.length) return;

    let lastState = null;
    let importedCount = 0;
    for (const item of items) {
      const result = await requestJson("/warehouse/catalog", { method: "POST", body: JSON.stringify(item) });
      if (result?.data?.state) lastState = result.data.state;
      importedCount++;
    }
    if (lastState) {
      applyRemoteWarehouseState(lastState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    } else {
      const stateResult = await requestJson("/warehouse/state").catch(() => null);
      if (stateResult) applyRemoteWarehouseState(stateResult, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    }
    return importedCount;
  }



  function openCatalogEdit(item) {
    const itemCleaningSites = normalizeCatalogCleaningSites(item.cleaningSites);
    setCatalogModal({
      ...createEmptyCatalogModalState(),
      open: true,
      mode: "edit",
      id: item.id,
      name: item.name,
      limit: String(item.timeLimitMinutes),
      mandatory: String(item.isMandatory),
      frequency: normalizeActivityFrequency(item.frequency),
      category: String(item.category || "General").trim() || "General",
      area: normalizeCatalogArea(item.area, item.category),
      scheduledDays: normalizeCatalogScheduledDays(item.scheduledDays, item.frequency),
      scheduledDaysBySite: normalizeCatalogScheduledDaysBySite(item.scheduledDaysBySite, normalizeCatalogScheduledDays(item.scheduledDays, item.frequency)),
      cleaningSites: itemCleaningSites,
      siteMode: itemCleaningSites.length ? "bySite" : "general",
    });
  }

  async function submitCatalogModal() {
    setCatalogModal((current) => ({ ...current, submitting: true }));
    const siteMode = catalogModal.siteMode === "bySite" ? "bySite" : "general";
    const normalizedCleaningSites = siteMode === "bySite"
      ? normalizeCatalogCleaningSites(catalogModal.cleaningSites)
      : [];
    const normalizedScheduledDays = normalizeCatalogScheduledDays(catalogModal.scheduledDays, catalogModal.frequency);
    const payload = {
      name: catalogModal.name.trim(),
      timeLimitMinutes: Number(catalogModal.limit || 0),
      isMandatory: catalogModal.mandatory === "true",
      frequency: normalizeActivityFrequency(catalogModal.frequency),
      scheduledDays: normalizedScheduledDays,
      cleaningSites: normalizedCleaningSites,
      scheduledDaysBySite: siteMode === "bySite"
        ? normalizeCatalogScheduledDaysBySite(catalogModal.scheduledDaysBySite, normalizedScheduledDays)
        : {},
      category: String(catalogModal.category || "General").trim() || "General",
      area: normalizeCatalogArea(catalogModal.area, catalogModal.category),
      isDeleted: false,
    };

    if (!payload.name || payload.timeLimitMinutes <= 0) {
      setCatalogModal((current) => ({ ...current, submitting: false }));
      return;
    }

    try {
      const result = await requestJson(
        catalogModal.mode === "create" ? "/warehouse/catalog" : `/warehouse/catalog/${catalogModal.id}`,
        {
          method: catalogModal.mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
      );
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setCatalogModal(createEmptyCatalogModalState());
    } catch {
      setCatalogModal((current) => ({ ...current, submitting: false }));
      // Keep modal open if the save fails.
    }
  }

  async function softDeleteCatalog(id) {
    try {
      const result = await requestJson(`/warehouse/catalog/${id}`, {
        method: "DELETE",
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    } catch {
      // Ignore delete failures silently for now.
    }
  }

  function addActivityToWeek() {
    if (!editWeekId || !editWeekActivityId) return;
    const targetWeek = state.weeks.find((week) => week.id === editWeekId);
    const catalogItem = state.catalog.find((item) => item.id === editWeekActivityId);
    const defaultResponsible = state.users.find((user) => user.isActive) || state.users[0] || null;
    if (!targetWeek || !catalogItem) return;
    const generatedActivities = buildWeekActivitiesFromCatalogItem(editWeekId, catalogItem, new Date(targetWeek.startDate), defaultResponsible?.id || null);

    setState((current) => ({
      ...current,
      activities: current.activities.concat(generatedActivities),
    }));

    setEditWeekActivityId("");
  }

  function removeWeekActivity(activityId) {
    if (!actionPermissions.deleteWeekActivity) return;
    setState((current) => ({
      ...current,
      activities: current.activities.filter((activity) => activity.id !== activityId),
      pauseLogs: current.pauseLogs.filter((log) => log.weekActivityId !== activityId),
    }));
  }

  function buildUserRecordFromModalDraft(draft, fallbackId = "user-modal-preview") {
    const fallbackAccess = buildUniquePlayerAccess(draft.name || draft.role || "player", state.users || [], draft.id || null);
    return normalizeUserRecord({
      id: draft.id || fallbackId,
      name: draft.name || "Nuevo player",
      email: draft.username || draft.email || fallbackAccess,
      role: draft.role,
      area: draft.area || getUserArea(currentUser),
      department: draft.area || getUserArea(currentUser),
      jobTitle: draft.jobTitle || DEFAULT_JOB_TITLE_BY_ROLE[normalizeRole(draft.role)] || "",
      isActive: draft.isActive !== "false",
      password: draft.password || "",
      managerId: draft.managerId || currentUser?.id || null,
      createdById: currentUser?.id || null,
    });
  }

  function buildPermissionSelectionForUser(user, permissionsModel = normalizedPermissions) {
    return {
      pages: Object.fromEntries(permissionPages.map((item) => [item.id, canAccessPage(user, item.id, permissionsModel)])),
      actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => [item.id, canDoAction(user, item.id, permissionsModel)])),
    };
  }

  const currentUserGrantablePermissions = currentUser
    ? buildPermissionSelectionForUser(currentUser)
    : { pages: {}, actions: {} };

  function canGrantManagedPermission(kind, key) {
    return Boolean(currentUserGrantablePermissions?.[kind]?.[key]);
  }

  function clampPermissionSelectionToGrantable(selection, preserveDisabled = false) {
    return {
      pages: Object.fromEntries(permissionPages.map((item) => {
        const currentValue = Boolean(selection?.pages?.[item.id]);
        return [item.id, canGrantManagedPermission("pages", item.id) ? currentValue : (preserveDisabled ? currentValue : false)];
      })),
      actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => {
        const currentValue = Boolean(selection?.actions?.[item.id]);
        return [item.id, canGrantManagedPermission("actions", item.id) ? currentValue : (preserveDisabled ? currentValue : false)];
      })),
    };
  }

  function buildPermissionSelectionFromModalDraft(draft, permissionsModel = normalizedPermissions, options = {}) {
    if (!supportsManagedPermissionOverrides(draft.role)) {
      return { pages: {}, actions: {} };
    }
    const effectiveSelection = buildPermissionSelectionForUser(buildUserRecordFromModalDraft(draft), permissionsModel);
    if (options.limitToGrantable) {
      return clampPermissionSelectionToGrantable(effectiveSelection, options.preserveDisabled === true);
    }
    return effectiveSelection;
  }

  function closeUserModal() {
    setShowUserModalPassword(false);
    setUserModalMessage({ tone: "", text: "" });
    setExpandedPermissionTabs([]);
    setUserModal(createUserModalState());
  }

  function toggleUserModalPermissionSection(pageId) {
    setUserModal((current) => ({
      ...current,
      permissionPageId: current.permissionPageId === pageId ? "" : pageId,
    }));
  }

  function toggleUserModalPermissionTab(tabId) {
    setExpandedPermissionTabs((current) => (current.includes(tabId)
      ? current.filter((item) => item !== tabId)
      : [...current, tabId]));
  }

  function toggleUserModalPermission(kind, key) {
    if (!canGrantManagedPermission(kind, key)) return;
    setUserModal((current) => ({
      ...current,
      permissionOverrides: {
        ...current.permissionOverrides,
        [kind]: {
          ...current.permissionOverrides[kind],
          [key]: !current.permissionOverrides[kind]?.[key],
        },
      },
    }));
  }

  function updateUserModalRole(nextRole) {
    setUserModal((current) => {
      const shouldRefreshJobTitle = current.mode !== "create" && current.jobTitle === (DEFAULT_JOB_TITLE_BY_ROLE[current.role] || "");
      const nextDraft = {
        ...current,
        role: nextRole,
        jobTitle: shouldRefreshJobTitle ? (DEFAULT_JOB_TITLE_BY_ROLE[nextRole] || "") : current.jobTitle,
        permissionPageId: "",
      };

      if (current.mode === "create") {
        return {
          ...nextDraft,
          permissionOverrides: buildPermissionSelectionFromModalDraft(nextDraft, normalizedPermissions, { limitToGrantable: true }),
        };
      }
      return {
        ...nextDraft,
        permissionOverrides: buildPermissionSelectionFromModalDraft(nextDraft, normalizedPermissions, { preserveDisabled: true }),
      };
    });
  }

  function buildAllPermissionsOn() {
    return {
      pages: Object.fromEntries(permissionPages.map((item) => [item.id, true])),
      actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => [item.id, true])),
    };
  }

  function openCreateUser() {
    if (!actionPermissions.createUsers) return;
    setUserModalMessage({ tone: "", text: "" });
    setExpandedPermissionTabs([]);
    const defaultRole = creatableRoles[0] || ROLE_JR;
    const currentUserAreaFull = getUserArea(currentUser);
    const { area: currentRootArea, subArea: currentSubArea } = splitAreaAndSubArea(currentUserAreaFull);
    const nextModal = createUserModalState({
      open: true,
      mode: "create",
      id: null,
      name: "",
      username: "",
      role: defaultRole,
      area: currentRootArea,
      subArea: currentSubArea,
      jobTitle: "",
      isActive: "true",
      password: "",
      managerId: currentUser?.id || "",
    });
    setUserModal({
      ...nextModal,
      permissionOverrides: buildPermissionSelectionFromModalDraft(nextModal, normalizedPermissions, { limitToGrantable: true }),
    });
  }

  function openEditUser(user) {
    if (!actionPermissions.editUsers) return;
    setUserModalMessage({ tone: "", text: "" });
    setExpandedPermissionTabs([]);
    const fullArea = getUserArea(user);
    const { area: rootArea, subArea } = splitAreaAndSubArea(fullArea);
    const nextModal = createUserModalState({
      open: true,
      mode: "edit",
      id: user.id,
      name: user.name,
      username: user.email,
      role: user.role,
      area: rootArea,
      subArea,
      jobTitle: getUserJobTitle(user),
      isActive: String(user.isActive),
      password: "",
      managerId: user.managerId || "",
    });
    setUserModal({
      ...nextModal,
      permissionOverrides: buildPermissionSelectionFromModalDraft(nextModal, normalizedPermissions, { preserveDisabled: true }),
    });
  }

  async function submitUserModal() {
    const requiredPermission = userModal.mode === "create" ? actionPermissions.createUsers : actionPermissions.editUsers;
    if (!currentUser || !requiredPermission) {
      setUserModalMessage({ tone: "danger", text: "No tienes permiso para guardar este player." });
      pushAppToast("No tienes permiso para guardar este player.", "danger");
      return;
    }
    if (!canCreateRole(currentUser.role, userModal.role)) {
      const message = "Solo puedes crear o editar players de tu mismo nivel o inferiores.";
      setUserModalMessage({ tone: "danger", text: message });
      pushAppToast(message, "danger");
      return;
    }
    const trimmedPassword = userModal.password.trim();
    const resolvedPlayerAccess = userModal.username.trim() || buildUniquePlayerAccess(
      userModal.name || userModal.role || "player",
      state.users || [],
      userModal.mode === "edit" ? userModal.id : null,
    );
    const fullArea = joinAreaAndSubArea(userModal.area, userModal.subArea);
    const payload = {
      name: userModal.name.trim(),
      username: resolvedPlayerAccess,
      role: userModal.role,
      area: fullArea,
      department: fullArea,
      jobTitle: userModal.jobTitle.trim(),
      isActive: userModal.isActive === "true",
      managerId: userModal.managerId || currentUser?.id || null,
      createdById: userModal.mode === "create" ? currentUser?.id || null : userModal.managerId || currentUser?.id || null,
      ...(userModal.mode === "create" ? { selfIdentityEditCount: 0 } : {}),
      permissionOverrides: userModal.permissionOverrides,
    };

    if (!payload.name || !payload.area || !payload.jobTitle) {
      const missing = [];
      if (!payload.name) missing.push("Nombre completo");
      if (!payload.area) missing.push("Área");
      if (!payload.jobTitle) missing.push("Cargo");
      const message = `Faltan campos obligatorios: ${missing.join(", ")}.`;
      setUserModalMessage({
        tone: "danger",
        text: message,
      });
      pushAppToast(message, "danger");
      return;
    }
    if (userModal.mode === "create" && supportsManagedPermissionOverrides(userModal.role)) {
      const pageValues = Object.values(userModal.permissionOverrides.pages || {});
      const actionValues = Object.values(userModal.permissionOverrides.actions || {});
      const hasAtLeastOnePermission = pageValues.concat(actionValues).some(Boolean);
      if (!hasAtLeastOnePermission) {
        const message = "Asigna al menos un permiso antes de crear el player.";
        setUserModalMessage({ tone: "danger", text: message });
        pushAppToast(message, "danger");
        return;
      }
    }
    if (userModal.mode === "create") {
      if (!isTemporaryPassword(trimmedPassword)) {
        const message = `La contraseña temporal debe tener al menos ${TEMPORARY_PASSWORD_MIN_LENGTH} caracteres.`;
        setUserModalMessage({ tone: "danger", text: message });
        pushAppToast(message, "danger");
        return;
      }
      payload.password = trimmedPassword;
    } else if (trimmedPassword) {
      payload.password = trimmedPassword;
    }

    setUserModal((current) => ({ ...current, submitting: true }));

    try {
      const result = await requestJson(
        userModal.mode === "create" ? "/warehouse/users" : `/warehouse/users/${userModal.id}`,
        {
          method: userModal.mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
      );
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      pushAppToast(
        userModal.mode === "create"
          ? `Player ${payload.name} creado correctamente.`
          : `Cambios de ${payload.name} guardados correctamente.`,
        "success",
      );
      setUserModalMessage({ tone: "success", text: userModal.mode === "create" ? `Player ${payload.name} creado correctamente.` : `Cambios de ${payload.name} guardados correctamente.` });
      closeUserModal();
    } catch (error) {
      setUserModal((current) => ({ ...current, submitting: false }));
      setUserModalMessage({ tone: "danger", text: error?.message || "No se pudieron guardar los cambios. Intenta de nuevo." });
      pushAppToast(error?.message || "No se pudieron guardar los cambios. Intenta de nuevo.", "danger");
    }
  }

  async function updateCurrentUserIdentity(identityPatch) {
    if (!currentUser) return;
    const resolvedPlayerAccess = String((identityPatch.username ?? identityPatch.email) || "").trim() || buildUniquePlayerAccess(
      identityPatch.name || currentUser.name || "player",
      state.users || [],
      currentUser.id,
    );
    const trimmedPatch = {
      name: String(identityPatch.name || "").trim(),
      email: resolvedPlayerAccess,
      area: String(identityPatch.area || "").trim(),
      jobTitle: String(identityPatch.jobTitle || "").trim(),
      telefono: String(identityPatch.telefono || "").trim(),
      telefono_visible: Boolean(identityPatch.telefono_visible),
      birthday: String(identityPatch.birthday || "").trim(),
      photo: String(identityPatch.photo ?? currentUser.photo ?? "").trim(),
      photoThumbnailUrl: String(identityPatch.photoThumbnailUrl ?? currentUser.photoThumbnailUrl ?? "").trim(),
    };
    if (!trimmedPatch.name || !trimmedPatch.area || !trimmedPatch.jobTitle) {
      return { ok: false, message: "Captura nombre, área y cargo para guardar el perfil del player." };
    }
    const profileChanges = [
      trimmedPatch.name !== String(currentUser.name || "").trim(),
      trimmedPatch.email !== String(currentUser.email || "").trim(),
      trimmedPatch.area !== getUserArea(currentUser),
      trimmedPatch.jobTitle !== getUserJobTitle(currentUser),
      trimmedPatch.telefono !== String(currentUser.telefono || "").trim(),
      trimmedPatch.telefono_visible !== Boolean(currentUser.telefono_visible),
      trimmedPatch.birthday !== String(currentUser.birthday || "").trim(),
    ].some(Boolean);
    const photoChanges = [
      trimmedPatch.photo !== String(currentUser.photo || "").trim(),
      trimmedPatch.photoThumbnailUrl !== String(currentUser.photoThumbnailUrl || "").trim(),
    ].some(Boolean);
    const hasChanges = profileChanges || photoChanges;
    if (!hasChanges) {
      return { ok: false, message: "No hay cambios nuevos por guardar." };
    }
    const canBypassEditLimit = canBypassSelfProfileEditLimit(currentUser);
    const selfIdentityEditCount = Number(currentUser.selfIdentityEditCount ?? 0);
    if (profileChanges && !canBypassEditLimit && selfIdentityEditCount >= PROFILE_SELF_EDIT_LIMIT) {
      return { ok: false, message: "La autoedición ya fue utilizada. Pide apoyo a un Senior o Lead para corregir estos datos." };
    }
    try {
      const result = await requestJson("/warehouse/users/me/profile", {
        method: "PATCH",
        body: JSON.stringify(trimmedPatch),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      return { ok: true, message: "Datos del player actualizados." };
    } catch (error) {
      return { ok: false, message: error?.message || "No se pudieron actualizar los datos del player." };
    }
  }


  async function deleteUser(userId) {
    if (!userId || userId === currentUser?.id || !actionPermissions.deleteUsers) return;
    try {
      const result = await requestJson(`/warehouse/users/${userId}`, {
        method: "DELETE",
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setDeleteUserId(null);
    } catch {
      // Keep confirmation state unchanged on failure.
    }
  }

  async function transferLead(targetUserId) {
    if (!targetUserId || normalizeRole(currentUser?.role) !== ROLE_LEAD) return;
    try {
      const result = await requestJson(`/warehouse/users/${targetUserId}/transfer-lead`, {
        method: "POST",
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setTransferLeadTargetId(null);
      pushAppToast("Rol de Lead transferido correctamente.", "success");
    } catch (error) {
      pushAppToast(error?.message || "No se pudo transferir el rol de Lead.", "danger");
    }
  }

  async function toggleUserActive(userId) {
    try {
      const result = await requestJson(`/warehouse/users/${userId}/active`, {
        method: "PATCH",
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    } catch {
      // Ignore UI toggle failures silently for now.
    }
  }

  // ── Roles personalizados ──────────────────────────────────────────────────
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalName, setRoleModalName] = useState("");
  const [roleModalEditId, setRoleModalEditId] = useState(null);
  const [roleModalError, setRoleModalError] = useState(null);
  const [roleSaving, setRoleSaving] = useState(false);

  function openCreateRoleModal() {
    setRoleModalEditId(null);
    setRoleModalName("");
    setRoleModalError(null);
    setRoleModalOpen(true);
  }

  function openEditRoleModal(role) {
    setRoleModalEditId(role.id);
    setRoleModalName(role.name);
    setRoleModalError(null);
    setRoleModalOpen(true);
  }

  async function submitRoleModal() {
    if (!roleModalName.trim()) { setRoleModalError("El nombre no puede estar vacío."); return; }
    setRoleSaving(true);
    setRoleModalError(null);
    try {
      const result = roleModalEditId
        ? await requestJson(`/warehouse/roles/${roleModalEditId}`, { method: "PATCH", body: JSON.stringify({ name: roleModalName.trim() }) })
        : await requestJson("/warehouse/roles", { method: "POST", body: JSON.stringify({ name: roleModalName.trim() }) });
      if (!result.ok) throw new Error(result.message || "Error al guardar rol.");
      const savedRole = result.data;
      setState((prev) => {
        const prevRoles = prev.customRoles || [];
        const updated = roleModalEditId
          ? prevRoles.map((r) => r.id === roleModalEditId ? savedRole : r)
          : [...prevRoles, savedRole];
        return { ...prev, customRoles: updated };
      });
      setRoleModalOpen(false);
    } catch (err) {
      setRoleModalError(err.message);
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleDeleteCustomRole(roleId) {
    try {
      await requestJson(`/warehouse/roles/${roleId}`, { method: "DELETE" });
      setState((prev) => ({ ...prev, customRoles: (prev.customRoles || []).filter((r) => r.id !== roleId) }));
    } catch {
      // silencioso
    }
  }

  async function updateSystemOperationalSettings(patch = {}) {
    const result = await requestJson("/warehouse/system/operational", {
      method: "PATCH",
      body: JSON.stringify(patch || {}),
    });
    applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    return result;
  }

  function addDraftColumn() {
    if (!controlBoardDraft.fieldLabel.trim()) {
      setControlBoardFeedback("Escribe una etiqueta para el campo antes de agregarlo.");
      return;
    }
    const resolvedInventorySourceFieldId = controlBoardDraft.fieldType === "inventoryProperty"
      ? resolveInventoryPropertySourceFieldId(controlBoardDraft.columns, controlBoardDraft.sourceFieldId)
      : controlBoardDraft.sourceFieldId || null;
    if (controlBoardDraft.fieldType === "inventoryProperty" && !resolvedInventorySourceFieldId) {
      setControlBoardFeedback("Agrega primero un Buscador de inventario y luego enlaza este dato derivado.");
      return;
    }
    const normalizedFormulaTerms = getNormalizedFormulaTerms(controlBoardDraft.formulaTerms, controlBoardDraft);
    if (controlBoardDraft.fieldType === "formula" && normalizedFormulaTerms.length < 2) {
      setControlBoardFeedback("Agrega al menos 2 términos para completar la fórmula o cálculo.");
      return;
    }
    const isActivityListField = controlBoardDraft.fieldType === BOARD_ACTIVITY_LIST_FIELD;
    const colorRules = controlBoardDraft.colorValue
      ? [{ operator: controlBoardDraft.colorOperator, value: controlBoardDraft.colorValue, color: controlBoardDraft.colorBg, textColor: controlBoardDraft.colorText }]
      : [];
    const normalizedWidthPx = Number(controlBoardDraft.fieldWidthPx || 0);
    const widthPx = Number.isFinite(normalizedWidthPx) && normalizedWidthPx >= 90 ? Math.round(normalizedWidthPx) : null;
    const field = {
      id: makeId("fld"),
      label: controlBoardDraft.fieldLabel.trim(),
      type: isActivityListField ? "select" : controlBoardDraft.fieldType,
      optionSource: isActivityListField ? "catalogByCategory" : controlBoardDraft.optionSource,
      optionCatalogCategory: controlBoardDraft.optionCatalogCategory,
      options: isActivityListField ? [] : controlBoardDraft.optionsText.split(",").map((item) => item.trim()).filter(Boolean),
      inventoryProperty: controlBoardDraft.inventoryProperty,
      sourceFieldId: resolvedInventorySourceFieldId,
      formulaOperation: controlBoardDraft.formulaOperation,
      formulaLeftFieldId: controlBoardDraft.formulaLeftFieldId || null,
      formulaRightFieldId: controlBoardDraft.formulaRightFieldId || null,
      formulaTerms: normalizedFormulaTerms,
      helpText: controlBoardDraft.fieldHelp.trim(),
      placeholder: controlBoardDraft.placeholder.trim(),
      defaultValue: controlBoardDraft.defaultValue,
      width: controlBoardDraft.fieldWidth,
      widthPx,
      required: controlBoardDraft.isRequired === "true",
      groupName: controlBoardDraft.groupName.trim() || "General",
      groupColor: controlBoardDraft.groupColor,
      colorRules,
    };
    const isBundleField = controlBoardDraft.fieldType === INVENTORY_LOOKUP_LOGISTICS_FIELD;
    const fieldsToInsert = controlBoardDraft.fieldType === INVENTORY_LOOKUP_LOGISTICS_FIELD
      ? buildInventoryBundleFields(controlBoardDraft, editingDraftColumnId || null)
      : [field];
    setControlBoardDraft((current) => {
      const nextColumns = buildUpdatedDraftColumns(current.columns, editingDraftColumnId, isBundleField, fieldsToInsert);
      const currentSettings = current.settings ?? EMPTY_OBJECT;
      const nextColumnOrder = syncBoardFieldOrderIntoColumnOrder(nextColumns, currentSettings);
      return {
        ...current,
        columns: nextColumns,
        settings: {
          ...currentSettings,
          columnOrder: nextColumnOrder,
        },
        ...createEmptyFieldDraft(),
      };
    });
    setEditingDraftColumnId(null);
    setComponentStudioOpen(false);
    let feedbackMessage = "Componente agregado al tablero borrador.";
    if (editingDraftColumnId) {
      feedbackMessage = "Componente actualizado correctamente.";
    } else if (fieldsToInsert.length > 1) {
      feedbackMessage = "Buscador agregado con sus columnas automáticas.";
    }
    setControlBoardFeedback(feedbackMessage);
  }

  function removeDraftColumn(columnId) {
    setControlBoardDraft((current) => {
      const nextColumns = current.columns.filter((column) => column.id !== columnId);
      const currentSettings = current.settings ?? EMPTY_OBJECT;
      return {
        ...current,
        columns: nextColumns,
        settings: {
          ...currentSettings,
          columnOrder: getNormalizedBoardColumnOrder({ fields: nextColumns, settings: currentSettings }),
        },
      };
    });
    setControlBoardFeedback("Columna eliminada del borrador.");
  }

  function editDraftColumn(columnId) {
    const column = controlBoardDraft.columns.find((item) => item.id === columnId);
    if (!column) return;
    setControlBoardDraft((current) => ({
      ...current,
      ...mapColumnToFieldDraft(column, current.columns),
    }));
    setEditingDraftColumnId(columnId);
    setComponentStudioOpen(true);
    setControlBoardFeedback("");
  }

  function duplicateDraftColumn(columnId) {
    setControlBoardDraft((current) => {
      const index = current.columns.findIndex((item) => item.id === columnId);
      if (index === -1) return current;
      const currentSettings = current.settings ?? EMPTY_OBJECT;
      const source = current.columns[index];
      const duplicate = {
        ...source,
        id: makeId("fld"),
        label: `${source.label} copia`,
      };
      const nextColumns = [...current.columns];
      nextColumns.splice(index + 1, 0, duplicate);
      return {
        ...current,
        columns: nextColumns,
        settings: {
          ...currentSettings,
          columnOrder: syncBoardFieldOrderIntoColumnOrder(nextColumns, currentSettings),
        },
      };
    });
    setControlBoardFeedback("Componente duplicado.");
  }

  function moveDraftColumn(columnId, direction) {
    setControlBoardDraft((current) => {
      const index = current.columns.findIndex((item) => item.id === columnId);
      if (index === -1) return current;
      const currentSettings = current.settings ?? EMPTY_OBJECT;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.columns.length) return current;
      const nextColumns = [...current.columns];
      const [moved] = nextColumns.splice(index, 1);
      nextColumns.splice(targetIndex, 0, moved);
      return {
        ...current,
        columns: nextColumns,
        settings: {
          ...currentSettings,
          columnOrder: syncBoardFieldOrderIntoColumnOrder(nextColumns, currentSettings),
        },
      };
    });
  }

  function reorderDraftColumn(sourceColumnId, targetColumnId) {
    if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) return;
    setControlBoardDraft((current) => {
      const sourceIndex = current.columns.findIndex((item) => item.id === sourceColumnId);
      const targetIndex = current.columns.findIndex((item) => item.id === targetColumnId);
      if (sourceIndex === -1 || targetIndex === -1) return current;
      const currentSettings = current.settings ?? EMPTY_OBJECT;
      const nextColumns = [...current.columns];
      const [moved] = nextColumns.splice(sourceIndex, 1);
      nextColumns.splice(targetIndex, 0, moved);
      return {
        ...current,
        columns: nextColumns,
        settings: {
          ...currentSettings,
          columnOrder: syncBoardFieldOrderIntoColumnOrder(nextColumns, currentSettings),
        },
      };
    });
  }

  function applyBoardTemplate(templateId) {
    const template = availableBoardTemplates.find((item) => item.id === templateId);
    if (!template) return;

    setControlBoardDraft((current) => {
      const templateSettings = template.settings && typeof template.settings === "object" ? template.settings : undefined;
      return {
        ...current,
        name: template.name,
        description: template.description,
        settings: withDefaultBoardSettings({ ...current.settings, ...templateSettings, columnOrder: [] }),
        columns: buildTemplateColumns(template),
        ...createEmptyFieldDraft(),
      };
    });
    setEditingDraftColumnId(null);
    setTemplatePreviewId(null);
    setControlBoardFeedback(`Plantilla ${template.name} cargada al borrador. Puedes agregar, cambiar o quitar componentes antes de guardar.`);
  }

  function previewBoardTemplate(templateId) {
    setTemplatePreviewId(templateId);
  }

  function getPagePermissionActions(pageId) {
    return ACTION_DEFINITIONS.filter((item) => (PAGE_ACTION_GROUPS[pageId] || []).includes(item.id));
  }

  function getPermissionActionGroups(pageId, actions = []) {
    if (pageId === PAGE_DASHBOARD) {
      const groups = [
        {
          id: "dashboard-core",
          label: "Dashboard AXO",
          accent: "#355f88",
          actions: actions.filter((action) => (
            action.id === "exportDashboardData"
            || action.id === "manageDashboardState"
          )),
        },
        {
          id: "dashboard-nav",
          label: "Navegación lateral",
          accent: "#334155",
          actions: actions.filter((action) => action.category === "Navegación lateral"),
        },
      ].filter((group) => group.actions.length > 0);

      return groups.length ? groups : [{ id: "dashboard-default", label: "Acciones disponibles", accent: getPermissionSectionTone(pageId, "").accent, actions }];
    }

    if (pageId !== PAGE_TRANSPORT) {
      return [{ id: `${pageId}-default`, label: "Acciones disponibles", accent: getPermissionSectionTone(pageId, "").accent, actions }];
    }

    const groups = [
      {
        id: "transport-areas",
        label: "Áreas operativas",
        accent: "#7c3aed",
        actions: actions.filter((action) => (
          action.id.includes("Retail")
          || action.id.includes("Pedidos")
          || action.id.includes("Inventario")
        )),
      },
      {
        id: "transport-ops",
        label: "Solo transporte",
        accent: "#355f88",
        actions: actions.filter((action) => (
          action.id.includes("Documentacion")
          || action.id.includes("Assignments")
          || action.id.includes("Postponed")
          || action.id.includes("MyRoutes")
          || action.id.includes("Consolidated")
          || action.id === "deleteTransportRecord"
        )),
      },
    ].filter((group) => group.actions.length > 0);

    return groups.length ? groups : [{ id: "transport-default", label: "Acciones disponibles", accent: "#7c3aed", actions }];
  }

  function getPermissionSectionTone(pageId, actionId = "") {
    const normalizedActionId = String(actionId || "").trim();
    if (pageId === PAGE_INVENTORY) {
      if (normalizedActionId.includes("BaseInventory") || normalizedActionId.includes("manageInventory") || normalizedActionId.includes("deleteInventory") || normalizedActionId.includes("importInventory")) {
        return { accent: "#355f88", soft: "rgba(15, 118, 110, 0.1)" };
      }
      if (normalizedActionId.includes("CleaningInventory")) {
        return { accent: "#2563eb", soft: "rgba(37, 99, 235, 0.1)" };
      }
      if (normalizedActionId.includes("OrderInventory")) {
        return { accent: "#b45309", soft: "rgba(180, 83, 9, 0.1)" };
      }
      return { accent: "#355f88", soft: "rgba(15, 118, 110, 0.1)" };
    }

    if (pageId === PAGE_TRANSPORT) {
      if (normalizedActionId.includes("Retail")) {
        return { accent: "#7c3aed", soft: "rgba(124, 58, 237, 0.1)" };
      }
      if (normalizedActionId.includes("Pedidos")) {
        return { accent: "#be123c", soft: "rgba(190, 18, 60, 0.1)" };
      }
      if (normalizedActionId.includes("Inventario")) {
        return { accent: "#0e7490", soft: "rgba(14, 116, 144, 0.1)" };
      }
      if (normalizedActionId.includes("Documentacion")) {
        return { accent: "#6d28d9", soft: "rgba(109, 40, 217, 0.1)" };
      }
      if (normalizedActionId.includes("Assignments")) {
        return { accent: "#2563eb", soft: "rgba(37, 99, 235, 0.1)" };
      }
      if (normalizedActionId.includes("Postponed")) {
        return { accent: "#b45309", soft: "rgba(180, 83, 9, 0.1)" };
      }
      if (normalizedActionId.includes("MyRoutes")) {
        return { accent: "#3f678f", soft: "rgba(34, 77, 115, 0.1)" };
      }
      if (normalizedActionId.includes("Consolidated")) {
        return { accent: "#355f88", soft: "rgba(15, 118, 110, 0.1)" };
      }
      if (normalizedActionId === "deleteTransportRecord") {
        return { accent: "#b91c1c", soft: "rgba(185, 28, 28, 0.1)" };
      }
      return { accent: "#475569", soft: "rgba(71, 85, 105, 0.1)" };
    }

    const pageToneMap = {
      [PAGE_BOARD]: { accent: "#2d4f72", soft: "rgba(32, 63, 91, 0.1)" },
      [PAGE_CUSTOM_BOARDS]: { accent: "#3b6288", soft: "rgba(28, 64, 96, 0.1)" },
      [PAGE_HISTORY]: { accent: "#1d4ed8", soft: "rgba(29, 78, 216, 0.1)" },
      [PAGE_PROCESS_AUDITS]: { accent: "#6d28d9", soft: "rgba(109, 40, 217, 0.1)" },
      [PAGE_BIBLIOTECA]: { accent: "#355f88", soft: "rgba(15, 118, 110, 0.1)" },
      [PAGE_INCIDENCIAS]: { accent: "#b91c1c", soft: "rgba(185, 28, 28, 0.1)" },
      [PAGE_USERS]: { accent: "#374151", soft: "rgba(55, 65, 81, 0.1)" },
      [PAGE_SYSTEM_SETTINGS]: { accent: "#9a3412", soft: "rgba(154, 52, 18, 0.1)" },
    };

    return pageToneMap[pageId] || { accent: "#4b5563", soft: "rgba(75, 85, 99, 0.08)" };
  }

  async function updatePermissionEntry(scope, key, field, value) {
    if (!actionPermissions.managePermissions) return;
    const nextPermissions = {
      ...state.permissions,
      [scope]: {
        ...state.permissions[scope],
        [key]: {
          ...(state.permissions[scope]?.[key] || { roles: [], userIds: [], departments: [] }),
          [field]: value,
        },
      },
    };
    try {
      const result = await requestJson("/warehouse/permissions", {
        method: "PATCH",
        body: JSON.stringify({ permissions: nextPermissions }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setPermissionsFeedback({ tone: "success", message: "Permiso actualizado correctamente." });
    } catch (error) {
      setPermissionsFeedback({ tone: "danger", message: error?.message || "No se pudo actualizar la regla de permisos." });
    }
  }

  async function updateBoardAssignment(boardId, field, value) {
    if (!actionPermissions.managePermissions) return;
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    if (!board) return;
    const ownerId = field === "ownerId" ? value : board.ownerId;
    const visibilityType = field === "visibilityType" ? normalizeBoardVisibilityType(value) : normalizeBoardVisibilityType(board.visibilityType);
    const accessUserIds = visibilityType === "users"
      ? (field === "accessUserIds"
          ? normalizeBoardAccessUserIds(value || [], ownerId)
          : normalizeBoardAccessUserIds(board.accessUserIds || [], ownerId))
      : [];
    const sharedDepartments = field === "sharedDepartments"
      ? normalizeBoardSharedDepartments(value || [])
      : normalizeBoardSharedDepartments(board.sharedDepartments || []);
    try {
      const result = await requestJson(`/warehouse/boards/${boardId}/assignment`, {
        method: "PATCH",
        body: JSON.stringify({ ownerId, visibilityType, sharedDepartments, accessUserIds }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    } catch (error) {
      setPermissionsFeedback({ tone: "danger", message: error?.message || "No se pudo actualizar la asignación del tablero." });
    }
  }

  async function updateBoardOperationalContext(boardId, operationalContextValue, overrideContextType = null) {
    if (!currentUser || !boardId) return;

    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    if (!board || !canDoBoardAction(currentUser, board)) return;

    const canUpdateContext = canDoAction(currentUser, "boardWorkflow", normalizedPermissions)
      || canDoAction(currentUser, "saveBoard", normalizedPermissions);
    if (!canUpdateContext) return;

    const normalizedSettings = withDefaultBoardSettings(board.settings);
    const effectiveContextType = overrideContextType || normalizedSettings.operationalContextType;
    const effectiveContextOptions = overrideContextType === "cleaningSite"
      ? ["C1", "C2", "C3", "P"]
      : normalizedSettings.operationalContextOptions;
    const typeChanged = overrideContextType && overrideContextType !== normalizedSettings.operationalContextType;
    try {
      const result = await requestJson(`/warehouse/boards/${boardId}/context`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(typeChanged ? { operationalContextType: overrideContextType } : {}),
          operationalContextValue: normalizeBoardOperationalContextValue(
            operationalContextValue,
            effectiveContextType,
            effectiveContextOptions,
          ),
        }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setBoardRuntimeFeedback({
        tone: "success",
        message: `${normalizedSettings.operationalContextLabel || "Contexto operativo"} actualizado a ${result.data.operationalContextValue || operationalContextValue}.`,
      });
    } catch (error) {
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo actualizar el contexto del tablero." });
    }
  }

  async function applyPermissionPreset(presetId) {
    if (!actionPermissions.managePermissions) return;
    const preset = PERMISSION_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const nextPermissions = buildPermissionsFromPreset(presetId);
    try {
      const result = await requestJson("/warehouse/permissions", {
        method: "PATCH",
        body: JSON.stringify({ permissions: nextPermissions }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setPermissionsFeedback({ tone: "success", message: `Se aplicó el preset ${preset.label}.` });
    } catch (error) {
      setPermissionsFeedback({ tone: "danger", message: error?.message || "No se pudo aplicar el preset de permisos." });
    }
  }

  function exportPermissionRules() {
    if (!actionPermissions.managePermissions) return;

    const payload = {
      type: "copmec-permissions",
      version: 1,
      exportedAt: new Date().toISOString(),
      permissions: state.permissions,
      boardPermissions: (state.controlBoards || []).map((board) => ({
        boardId: board.id,
        boardName: board.name,
        permissions: normalizeBoardPermissions(board.permissions, state.permissions, board),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `permisos-copmec-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setPermissionsFeedback({ tone: "success", message: "Se exportó el respaldo de permisos en formato JSON." });
    setState((current) => appendAuditLog(current, buildAuditEntry(currentUser, "permissions", "Exportó un respaldo de reglas de permisos.")));
  }

  async function handlePermissionImport(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !actionPermissions.managePermissions) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const nextPermissions = normalizePermissions(parsed.permissions || parsed.rules || parsed);
      const boardPermissionsMap = new Map(
        Array.isArray(parsed.boardPermissions)
          ? parsed.boardPermissions.map((entry) => [entry.boardId, entry.permissions || entry])
          : [],
      );

      const result = await requestJson("/warehouse/permissions", {
        method: "PATCH",
        body: JSON.stringify({
          permissions: nextPermissions,
          boardPermissions: Array.from(boardPermissionsMap.entries()).map(([boardId, permissions]) => ({ boardId, permissions })),
        }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setPermissionsFeedback({ tone: "success", message: `Se importaron permisos desde ${file.name}.` });
    } catch {
      setPermissionsFeedback({ tone: "danger", message: "El archivo no es válido. Usa un JSON exportado desde el módulo de permisos." });
    }
  }

  function togglePermissionRole(scope, key, role) {
    const currentRoles = state.permissions?.[scope]?.[key]?.roles || [];
    const nextRoles = currentRoles.includes(role)
      ? currentRoles.filter((item) => item !== role)
      : currentRoles.concat(role);
    updatePermissionEntry(scope, key, "roles", nextRoles);
  }

  async function saveDraftAsBoardTemplate() {
    if (!controlBoardDraft.name.trim() || !controlBoardDraft.columns.length || !actionPermissions.saveTemplate) {
      setControlBoardFeedback("Define nombre y al menos un componente antes de guardar una plantilla reutilizable.");
      return;
    }

    const templateName = controlBoardDraft.name.trim();
    const templatePayload = {
      name: templateName,
      description: controlBoardDraft.description.trim() || `Plantilla reutilizable para ${templateName}.`,
      category: "Personalizada",
      visibilityType: currentUser?.department ? "department" : "users",
      sharedDepartments: currentUser?.department ? [currentUser.department] : [],
      sharedUserIds: currentUser ? [currentUser.id] : [],
      settings: { ...controlBoardDraft.settings },
      columns: (controlBoardDraft.columns || []).map((column) => ({
        ...column,
        templateKey: column.templateKey || column.id,
      })),
    };

    try {
      const result = await requestJson("/warehouse/templates", {
        method: "POST",
        body: JSON.stringify(templatePayload),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setControlBoardFeedback(`Plantilla ${templateName} guardada para reutilizarla cuando quieras.`);
    } catch (error) {
      setControlBoardFeedback(error?.message || "No se pudo guardar la plantilla.");
    }
  }

  async function submitBoardTemplateEdit() {
    setTemplateEditorModal((current) => ({ ...current, submitting: true }));
    if (!templateEditorModal.id || !templateEditorModal.name.trim() || !actionPermissions.editTemplate) {
      setTemplateEditorModal((current) => ({ ...current, submitting: false }));
      setControlBoardFeedback("La plantilla debe tener nombre para guardar los cambios.");
      return;
    }

    try {
      const result = await requestJson(`/warehouse/templates/${templateEditorModal.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: templateEditorModal.name.trim(),
          description: templateEditorModal.description.trim(),
          category: templateEditorModal.category.trim() || "Personalizada",
          visibilityType: templateEditorModal.visibilityType,
          sharedDepartments: templateEditorModal.sharedDepartments,
          sharedUserIds: templateEditorModal.sharedUserIds,
        }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setTemplateEditorModal({ open: false, id: null, name: "", description: "", category: "", visibilityType: "department", sharedDepartments: [], sharedUserIds: [], submitting: false });
      setControlBoardFeedback("Plantilla actualizada correctamente.");
    } catch (error) {
      setTemplateEditorModal((current) => ({ ...current, submitting: false }));
      setControlBoardFeedback(error?.message || "No se pudo actualizar la plantilla.");
    }
  }

  function openDeleteBoardTemplateModal(template) {
    if (!template) return;
    if (!canDeleteBoardTemplateEntry(template)) return;
    setTemplateDeleteModal({ open: true, id: template.id, name: template.name || "Plantilla" });
  }

  async function confirmDeleteBoardTemplate() {
    if (!templateDeleteModal.id) return;

    const templateToDelete = availableBoardTemplates.find((template) => template.id === templateDeleteModal.id) || null;
    if (templateToDelete && !canDeleteBoardTemplateEntry(templateToDelete)) {
      setTemplateDeleteModal({ open: false, id: null, name: "" });
      return;
    }

    if (!customTemplateIds.has(templateDeleteModal.id)) {
      setHiddenBaseTemplateIds((current) => current.includes(templateDeleteModal.id)
        ? current
        : current.concat(templateDeleteModal.id));
      if (templatePreviewId === templateDeleteModal.id) {
        setTemplatePreviewId(null);
      }
      setControlBoardFeedback(`Plantilla ${templateDeleteModal.name} eliminada correctamente.`);
      setTemplateDeleteModal({ open: false, id: null, name: "" });
      return;
    }

    try {
      const result = await requestJson(`/warehouse/templates/${templateDeleteModal.id}`, {
        method: "DELETE",
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      if (templatePreviewId === templateDeleteModal.id) {
        setTemplatePreviewId(null);
      }
      setControlBoardFeedback(`Plantilla ${templateDeleteModal.name} eliminada correctamente.`);
      setTemplateDeleteModal({ open: false, id: null, name: "" });
    } catch (error) {
      setControlBoardFeedback(error?.message || "No se pudo eliminar la plantilla.");
    }
  }

  async function importDraftRowsIntoBoard(createdBoardId, payload, initialState) {
    const rowsToImport = boardImportedRowsDraft.slice(0, 500);
    const yesValues = new Set(["si", "sí", "true", "1", "yes", "y"]);

    const bulkRows = rowsToImport.map((importedRow) => {
      const values = buildImportedBoardRowValuesPatch(importedRow, payload.columns, visibleUsers, state.inventoryItems || [], yesValues);
      return { values };
    }).filter((item) => Object.keys(item.values).length > 0);

    if (!bulkRows.length) return initialState;

    const latestRemoteState = await requestJson(`/warehouse/boards/${createdBoardId}/rows/bulk`, {
      method: "POST",
      body: JSON.stringify({ rows: bulkRows }),
    });

    return latestRemoteState;
  }

  function resolveBoardOwnerAreaByUserId(userId) {
    const sectionScopes = Array.isArray(selectedAreaSection?.scopes)
      ? selectedAreaSection.scopes.map((scope) => normalizeAreaOption(scope)).filter((scope) => scope && scope !== "SIN AREA")
      : [];
    if (selectedAreaSectionId !== "all" && sectionScopes.length) {
      return sectionScopes[0];
    }
    const responsibleUser = userMap.get(userId) || null;
    const normalizedArea = normalizeAreaOption(getAreaRoot(getUserArea(responsibleUser)) || getUserArea(responsibleUser));
    return normalizedArea && normalizedArea !== "SIN AREA" ? normalizedArea : "";
  }

  async function saveControlBoard() {
    if (isBoardSaveSubmitting) return;
    const isEditing = boardBuilderModal.mode === "edit" && boardBuilderModal.boardId;
    const hasPermission = isEditing ? actionPermissions.editBoard : actionPermissions.createBoard;
    if (!currentUser || !hasPermission || !controlBoardDraft.name.trim() || !controlBoardDraft.columns.length) {
      setControlBoardFeedback("Agrega nombre, dueño y al menos un campo para guardar el tablero.");
      return;
    }

    const sectionScopedBoardAreas = selectedAreaSectionId !== "all" && Array.isArray(selectedAreaSection?.scopes)
      ? selectedAreaSection.scopes.map((scope) => normalizeAreaOption(scope)).filter((scope) => scope && scope !== "SIN AREA")
      : [];
    const forcedBoardArea = sectionScopedBoardAreas[0] || "";
    const selectedBoardArea = forcedBoardArea || normalizeAreaOption(controlBoardDraft.settings?.ownerArea || "");
    if (!selectedBoardArea || selectedBoardArea === "SIN AREA") {
      setControlBoardFeedback("Selecciona el area duena del tablero para evitar cruces de datos en indicadores.");
      return;
    }

    const ownerId = controlBoardDraft.ownerId || currentUser.id;
    const { payload } = buildBoardSavePayload(controlBoardDraft, ownerId);
    const protectedTemplate = resolveProtectedSystemTemplate(controlBoardDraft);
    if (protectedTemplate) {
      payload.settings = {
        ...payload.settings,
        systemBoardTemplateId: protectedTemplate.id,
        systemBoardLocked: true,
      };
    }
    if (forcedBoardArea) {
      payload.settings = {
        ...payload.settings,
        ownerArea: forcedBoardArea,
      };
      payload.visibilityType = "department";
      payload.sharedDepartments = normalizeBoardSharedDepartments(sectionScopedBoardAreas);
      payload.accessUserIds = [];
    }
    setIsBoardSaveSubmitting(true);
    setControlBoardFeedback("");

    try {
      const result = await requestJson(
        isEditing ? `/warehouse/boards/${boardBuilderModal.boardId}` : "/warehouse/boards",
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      const createdBoardId = result.data.boardId || boardBuilderModal.boardId || "";

      if (!isEditing && createdBoardId && boardImportedRowsDraft.length) {
        const latestRemoteState = await importDraftRowsIntoBoard(createdBoardId, payload, result.data.state);
        applyRemoteWarehouseState(latestRemoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        setBoardRuntimeFeedback({
          tone: "success",
          message: `Se creó ${payload.name} y se importaron ${Math.min(boardImportedRowsDraft.length, 500)} fila(s) desde Excel.${boardImportedRowsDraft.length > 500 ? " Solo se importaron las primeras 500 por rendimiento." : ""}`,
        });
      }

      setSelectedCustomBoardId(createdBoardId);
      setSelectedCustomBoardViewId("current");
      if (!isEditing) {
        setPage(PAGE_CUSTOM_BOARDS);
      }
      setBoardBuilderModal({ open: false, mode: "create", boardId: null });
      setTemplatePreviewId(null);
      setControlBoardDraft({
        ...createEmptyBoardDraft(),
        ownerId: currentUser.id,
        settings: {
          ...withDefaultBoardSettings(createEmptyBoardDraft().settings),
          ownerArea: resolveBoardOwnerAreaByUserId(currentUser.id),
        },
      });
      setBoardImportedRowsDraft([]);
      setExcelFormulaWizard({ open: false, items: [] });
      setControlBoardFeedback("");
      if (isEditing || !boardImportedRowsDraft.length) {
        setBoardRuntimeFeedback({
          tone: "success",
          message: isEditing
            ? `Se actualizó ${payload.name} sin cambiarte de pantalla.`
            : `Se creó ${payload.name} y ya aparece en Mis tableros.`,
        });
      }
    } catch (error) {
      setControlBoardFeedback(error?.message || "No se pudo guardar el tablero.");
    } finally {
      setIsBoardSaveSubmitting(false);
    }
  }

  function clearControlBoardDraft() {
    const ownerId = currentUser?.id || "";
    setControlBoardDraft({
      ...createEmptyBoardDraft(),
      ownerId,
      settings: {
        ...withDefaultBoardSettings(createEmptyBoardDraft().settings),
        ownerArea: resolveBoardOwnerAreaByUserId(ownerId),
      },
    });
    setBoardImportedRowsDraft([]);
    setExcelFormulaWizard({ open: false, items: [] });
    setEditingDraftColumnId(null);
    setTemplatePreviewId(null);
    setControlBoardFeedback("Borrador limpiado.");
  }

  function openCreateBoardBuilder() {
    const ownerId = currentUser?.id || "";
    setControlBoardDraft({
      ...createEmptyBoardDraft(),
      ownerId,
      settings: {
        ...withDefaultBoardSettings(createEmptyBoardDraft().settings),
        ownerArea: resolveBoardOwnerAreaByUserId(ownerId),
      },
    });
    setBoardImportedRowsDraft([]);
    setExcelFormulaWizard({ open: false, items: [] });
    setBoardBuilderModal({ open: true, mode: "create", boardId: null });
    setTemplatePreviewId(null);
    setEditingDraftColumnId(null);
    setControlBoardFeedback("");
  }

  function openCreateBoardBuilderFromChecklistTemplate(template) {
    const ownerId = currentUser?.id || "";
    const normalizedTemplate = normalizeOperationalInspectionTemplate(template);
    // deep-clone and clear id so creating from a template doesn't overwrite originals
    const clonedTemplate = JSON.parse(JSON.stringify(normalizedTemplate || {}));
    if (clonedTemplate && typeof clonedTemplate === "object") clonedTemplate.id = "";
    setControlBoardDraft({
      ...createEmptyBoardDraft(),
      ownerId,
      settings: {
        ...withDefaultBoardSettings(createEmptyBoardDraft().settings),
        ownerArea: resolveBoardOwnerAreaByUserId(ownerId),
        operationalChecklistConfig: {
          enabled: true,
          linkedActivityNames: [],
          template: clonedTemplate,
        },
      },
    });
    setBoardImportedRowsDraft([]);
    setExcelFormulaWizard({ open: false, items: [] });
    setBoardBuilderModal({ open: true, mode: "create", boardId: null });
    setTemplatePreviewId(null);
    setEditingDraftColumnId(null);
    setControlBoardFeedback("");
  }

  function openEditBoardBuilder(board) {
    if (!actionPermissions.editBoard || !canEditBoard(currentUser, board)) return;
    const boardDraft = createBoardDraftFromBoard(board);
    const explicitBoardArea = normalizeAreaOption(boardDraft.settings?.ownerArea || "");
    const ownerArea = explicitBoardArea && explicitBoardArea !== "SIN AREA"
      ? explicitBoardArea
      : resolveBoardOwnerAreaByUserId(boardDraft.ownerId || board?.ownerId || "");
    setControlBoardDraft({
      ...boardDraft,
      settings: {
        ...boardDraft.settings,
        ownerArea,
      },
    });
    setBoardImportedRowsDraft([]);
    setExcelFormulaWizard({ open: false, items: [] });
    setBoardBuilderModal({ open: true, mode: "edit", boardId: board.id });
    setTemplatePreviewId(null);
    setEditingDraftColumnId(null);
    setControlBoardFeedback("");
  }

  async function deleteControlBoard(boardId) {
    if (!currentUser || !boardId) return;
    const boardToDelete = (state.controlBoards || []).find((board) => board.id === boardId);
    if (!actionPermissions.deleteBoard || !boardToDelete || !canEditBoard(currentUser, boardToDelete)) return;
    if (!canDeleteControlBoardEntry(boardToDelete)) {
      setDeleteBoardId(null);
      setBoardRuntimeFeedback({ tone: "danger", message: `El tablero ${boardToDelete.name} es una plantilla original del sistema y no se puede eliminar.` });
      return;
    }

    try {
      const result = await requestJson(`/warehouse/boards/${boardId}`, {
        method: "DELETE",
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      const nextVisibleBoard = (result.data.state?.controlBoards || []).find((board) => getBoardVisibleToUser(board, currentUser));
      setDeleteBoardId(null);
      setCustomBoardActionsMenuOpen(false);
      setSelectedCustomBoardId(nextVisibleBoard?.id || "");
      setBoardRuntimeFeedback({ tone: "success", message: `Se eliminó el tablero ${boardToDelete.name}.` });
    } catch (error) {
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo eliminar el tablero." });
    }
  }

  function closeBoardBuilderModal() {
    setBoardBuilderModal({ open: false, mode: "create", boardId: null });
    setTemplatePreviewId(null);
    setEditingDraftColumnId(null);
    setControlBoardFeedback("");
  }

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
      selectedTransferDestinationTab: inventoryTransferDefaultWarehouse || defaultTransferDestination?.warehouse || "",
      open: true,
    });
  }

  function openOrderInventoryTransfer(item = null) {
    const transferDomain = inventoryTab === INVENTORY_DOMAIN_MAINTENANCE ? INVENTORY_DOMAIN_MAINTENANCE : INVENTORY_DOMAIN_ORDERS;
    if (!actionPermissions[getInventoryManageActionId(transferDomain)]) return;
    setInventoryImportFeedback({ tone: "", message: "" });
    setInventoryMovementModal({
      ...createInventoryMovementModalState(item, INVENTORY_MOVEMENT_TRANSFER, transferDomain),
      selectedTransferDestinationTab: inventoryTransferDefaultWarehouse || "",
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

  async function createTransportRecord(payload = {}) {
    const areaId = String(payload?.areaId || "").trim();
    const manageActionId = areaId === "foraneas" || areaId === "locales"
      ? "manageTransportRetail"
      : areaId === "pedidos"
        ? "manageTransportPedidos"
        : areaId === "inventarioTraslados"
          ? "manageTransportInventario"
          : "";
    if (!manageActionId || !actionPermissions[manageActionId]) return;
    const result = await requestJson("/warehouse/transport/records", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
    applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    return result;
  }

  async function updateTransportRecord(recordId, payload = {}) {
    const areaId = String(payload?.areaId || "").trim();
    const manageActionId = areaId === "foraneas" || areaId === "locales"
      ? "manageTransportRetail"
      : areaId === "pedidos"
        ? "manageTransportPedidos"
        : areaId === "inventarioTraslados"
          ? "manageTransportInventario"
          : "";
    if (!manageActionId || !actionPermissions[manageActionId]) return;
    const normalizedRecordId = String(recordId || "").trim();
    if (!normalizedRecordId) return;
    const result = await requestJson(`/warehouse/transport/records/${normalizedRecordId}`, {
      method: "PATCH",
      body: JSON.stringify(payload || {}),
    });
    applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    return result;
  }

  async function createDocumentacionRecord(payload = {}) {
    const result = await requestJson("/warehouse/documentacion/records", {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
    applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    return result;
  }

  async function updateDocumentacionRecord(recordId, payload = {}) {
    const normalizedRecordId = String(recordId || "").trim();
    if (!normalizedRecordId) return;
    const result = await requestJson(`/warehouse/documentacion/records/${normalizedRecordId}`, {
      method: "PATCH",
      body: JSON.stringify(payload || {}),
    });
    applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    return result;
  }

  async function addDocumentacionArea(name) {
    const result = await requestJson("/warehouse/documentacion/areas", {
      method: "POST",
      body: JSON.stringify({ name: String(name || "").trim() }),
    });
    applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    return result;
  }

  async function deleteDocumentacionArea(name) {
    const result = await requestJson(`/warehouse/documentacion/areas/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
    applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    return result;
  }

  async function handleInventoryImport(event) {
    if (!currentInventoryImportPermission) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedItems = await parseInventoryImportFile(file, inventoryTab);

      if (!importedItems.length) {
        setInventoryImportFeedback({ tone: "danger", message: "No se encontraron filas válidas. Usa columnas como codigo, dominio, nombre, stock_actual y stock_minimo." });
        return;
      }

      const result = await requestJson("/warehouse/inventory/import", {
        method: "POST",
        body: JSON.stringify({ items: importedItems }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setInventoryImportFeedback({
        tone: "success",
        message: `Importacion completada. ${result.data.createdCount} nuevos y ${result.data.updatedCount} actualizados.`,
      });
    } catch (error) {
      setInventoryImportFeedback({ tone: "danger", message: `No se pudo importar el archivo. ${error instanceof Error ? error.message : "Revisa el formato del CSV o Excel."}` });
    } finally {
      event.target.value = "";
    }
  }

  async function downloadInventoryTemplate() {
    if (!currentInventoryImportPermission) return;
    try {
      await downloadInventoryTemplateFile(inventoryTab);
    } catch {
      setInventoryImportFeedback({ tone: "danger", message: "No se pudo generar la plantilla de inventario." });
    }
  }

  function exportMaintenanceInventoryItemsToCsv() {
    const rows = maintenanceInventoryItems.map((item) => ({
      codigo: item.code || "",
      nombre: item.name || "",
      familia: item.family || "",
      precio: item.price || "",
      costo: item.cost || "",
      ubicacion: item.storageLocation || "",
      unidad: item.unitLabel || "pzas",
      stock_actual: item.stockUnits || 0,
      stock_minimo: item.minStockUnits || 0,
    }));

    const headers = ["codigo", "nombre", "familia", "precio", "costo", "ubicacion", "unidad", "stock_actual", "stock_minimo"];
    const csvText = [
      headers.join(";"),
      ...rows.map((row) => headers.map((key) => String(row[key] || "").replace(/"/g, '""')).map((value) => `"${value}"`).join(";")),
    ].join("\r\n");

    const buffer = new TextEncoder().encode(csvText);
    triggerBrowserDownload(buffer, `inventario-mantenimiento-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
  }

  async function submitMaintenanceUsage(usageItems = []) {
    if (!actionPermissions[getInventoryManageActionId(INVENTORY_DOMAIN_MAINTENANCE)]) return;
    if (!Array.isArray(usageItems) || !usageItems.length) return;

    try {
      for (const usage of usageItems) {
        const selectedItem = inventoryItemsById.get(usage.itemId);
        if (!selectedItem || !usage.quantity || Number.isNaN(Number(usage.quantity)) || Number(usage.quantity) <= 0) continue;

        await requestInventoryMovement({
          itemId: selectedItem.id,
          movementType: INVENTORY_MOVEMENT_CONSUME,
          quantity: Number(usage.quantity),
          notes: usage.note?.trim() || "Uso en mantenimiento",
          warehouse: "",
          recipientName: "",
          storageLocation: selectedItem.storageLocation || "",
          unitLabel: selectedItem.unitLabel || "pzas",
          remainingUnits: null,
        });
      }

      setInventoryImportFeedback({ tone: "success", message: "Uso de insumos de mantenimiento registrado." });
    } catch (error) {
      setInventoryImportFeedback({ tone: "danger", message: error?.message || "No se pudo registrar el uso de mantenimiento." });
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

  function updateLoginField(key, value) {
    setLoginForm((current) => ({ ...current, [key]: value }));
    setLoginError("");
  }

  function updateBootstrapLeadField(key, value) {
    setBootstrapLeadForm((current) => ({ ...current, [key]: value }));
    setBootstrapLeadError("");
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");

    let authResult = null;
    try {
      authResult = await requestJson("/auth/login", {
        method: "POST",
        body: JSON.stringify({ login: loginForm.login, password: loginForm.password }),
      });
    } catch (error) {
      setLoginError(error?.message || "Credenciales inválidas.");
      return;
    }

    setSessionUserId(authResult.userId || "");
    localStorage.setItem(SESSION_STORAGE_KEY, "1");
    setSessionExpiredHandler(() => invalidateClientSession("Tu sesión expiró. Por favor inicia sesión nuevamente."));
    if (authResult.isBootstrapMaster) {
      setPage(PAGE_DASHBOARD);
      return;
    }

    try {
      const remoteState = await requestJson("/warehouse/state");
      const normalizedState = normalizeWarehouseState(remoteState);
      skipNextSyncRef.current = true;
      setState(normalizedState);
      setLoginDirectory(buildLoginDirectoryFromState(normalizedState));
      setPasswordForm({ password: "", confirmPassword: "", message: "" });
      const nextUser = normalizedState.users.find((user) => user.id === authResult.userId) || authResult.user;
      setPage(nextUser?.role === ROLE_JR ? PAGE_CUSTOM_BOARDS : PAGE_DASHBOARD);
      setSyncStatus("Sincronizado");
    } catch (error) {
      if (isSessionRequiredError(error)) {
        setLoginError("Se validaron tus credenciales, pero no se pudo guardar la sesión. Revisa CORS_ALLOWED_ORIGINS y SESSION_COOKIE_SAMESITE en Render.");
        return;
      }
      setLoginError(error?.message || "No se pudo iniciar sesión.");
    }
  }

  async function handleLogout() {
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch (_) { /* noop */ }
        socketRef.current = null;
      }
    try {
      await requestJson("/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout transport errors and clear client session anyway.
    }
    clearSessionExpiredHandler();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionUserId("");
    setLoginForm({ login: "", password: "" });
    setLoginError("");
    setLoginDirectory(EMPTY_LOGIN_DIRECTORY);
    setPasswordForm({ password: "", confirmPassword: "", message: "" });
  }

  async function handleCreateFirstLead(event) {
    event.preventDefault();
    if (!bootstrapLeadForm.name.trim() || !bootstrapLeadForm.area.trim() || !bootstrapLeadForm.jobTitle.trim() || !bootstrapLeadForm.password.trim()) {
      setBootstrapLeadError("Completa nombre, área, cargo y contraseña para crear el primer Lead.");
      return;
    }
    if (!isStrongPassword(bootstrapLeadForm.password)) {
      setBootstrapLeadError("Usa una contraseña de al menos 10 caracteres con mayúscula, minúscula, número y símbolo.");
      return;
    }

    const resolvedEmail = bootstrapLeadForm.username.trim() || buildUniquePlayerAccess(
      bootstrapLeadForm.name,
      state.users || [],
      null,
      "lead",
    );

    try {
      const result = await requestJson("/auth/bootstrap-lead", {
        method: "POST",
        body: JSON.stringify({
          name: bootstrapLeadForm.name.trim(),
          email: resolvedEmail,
          area: bootstrapLeadForm.area.trim(),
          jobTitle: bootstrapLeadForm.jobTitle.trim(),
          password: bootstrapLeadForm.password,
        }),
      });
      setBootstrapLeadForm({ name: "", username: "", area: "", jobTitle: "", password: "" });
      setSessionUserId(result.userId);
      localStorage.setItem(SESSION_STORAGE_KEY, "1");
      setSessionExpiredHandler(() => invalidateClientSession("Tu sesión expiró. Por favor inicia sesión nuevamente."));
      applyRemoteWarehouseState(result.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setPage(PAGE_DASHBOARD);
    } catch (error) {
      setBootstrapLeadError(error?.message || "No fue posible crear el primer Lead. Intenta de nuevo.");
    }
  }

  function createBoardRow(boardId) {
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    if (!canDoBoardAction(currentUser, board)) return;
    if (!board || !currentUser) return;
    requestJson(`/warehouse/boards/${boardId}/rows`, {
      method: "POST",
    }).then((remoteState) => {
      applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setBoardRuntimeFeedback({ tone: "", message: "" });
    }).catch((error) => {
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo crear la fila." });
    });
  }

  function deleteBoardRow(boardId, rowId) {
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    const isLeadOverride = canManageDashboardState && board && row;
    if (!board || !row || (!isLeadOverride && row.status === STATUS_FINISHED) || !canEditBoardRowRecord(currentUser, board, row, normalizedPermissions)) {
      setDeleteBoardRowState({ open: false, boardId: null, rowId: null });
      return;
    }

    requestJson(`/warehouse/boards/${boardId}/rows/${rowId}`, {
      method: "DELETE",
    }).then((remoteState) => {
      applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setDeleteBoardRowState({ open: false, boardId: null, rowId: null });
      setBoardRuntimeFeedback({ tone: "success", message: "La fila fue eliminada del tablero." });
    }).catch((error) => {
      if (error?.status === 404) {
        // Another device/process may have already removed this row.
        setState((current) => ({
          ...current,
          controlBoards: (current.controlBoards || []).map((controlBoard) => {
            if (controlBoard.id !== boardId) return controlBoard;
            return {
              ...controlBoard,
              rows: (controlBoard.rows || []).filter((boardRow) => boardRow.id !== rowId),
            };
          }),
        }));
        setDeleteBoardRowState({ open: false, boardId: null, rowId: null });
        setBoardRuntimeFeedback({ tone: "warning", message: "La fila ya no existía. Se actualizó la vista." });
        return;
      }
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo eliminar la fila." });
    });
  }

  function updateBoardRowValue(boardId, rowId, field, rawValue) {
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    if (!canEditBoardRowRecord(currentUser, board, row, normalizedPermissions)) return;

    // Keep typing responsive by updating local state immediately.
    setState((current) => ({
      ...current,
      controlBoards: (current.controlBoards || []).map((controlBoard) => {
        if (controlBoard.id !== boardId) return controlBoard;
        return {
          ...controlBoard,
          rows: (controlBoard.rows || []).map((boardRow) => {
            if (boardRow.id !== rowId) return boardRow;
            return {
              ...boardRow,
              values: {
                ...(boardRow.values || {}),
                [field.id]: rawValue,
              },
            };
          }),
        };
      }),
    }));

    const saveKey = `${boardId}:${rowId}:${field.id}`;
    boardCellDraftValueRef.current.set(saveKey, {
      value: rawValue,
      expiresAtMs: Date.now() + BOARD_CELL_DRAFT_TTL_MS,
    });
    const lastVersion = Number(boardCellSaveVersionRef.current.get(saveKey) || 0);
    const nextVersion = lastVersion + 1;
    boardCellSaveVersionRef.current.set(saveKey, nextVersion);

    const previousTimer = boardCellSaveTimersRef.current.get(saveKey);
    if (previousTimer) {
      globalThis.clearTimeout(previousTimer);
    }

    const timerId = globalThis.setTimeout(() => {
      boardCellSaveTimersRef.current.delete(saveKey);
      requestJson(`/warehouse/boards/${boardId}/rows/${rowId}`, {
        method: "PATCH",
        body: JSON.stringify({
          values: {
            [field.id]: rawValue,
          },
        }),
      }).then((remoteState) => {
        // If a newer keystroke for this same cell exists, ignore this stale response.
        if (boardCellSaveVersionRef.current.get(saveKey) !== nextVersion) return;
        boardCellDraftValueRef.current.set(saveKey, {
          value: rawValue,
          expiresAtMs: Date.now() + 800,
        });
        applyRemoteStatePreservingBoardDrafts(remoteState);
      }).catch((error) => {
        if (boardCellSaveVersionRef.current.get(saveKey) !== nextVersion) return;
        setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo actualizar la fila." });
      });
    }, 220);

    boardCellSaveTimersRef.current.set(saveKey, timerId);
  }

  function updateBoardRowTimeOverride(boardId, rowId, overrides) {
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    if (!canEditBoardRowRecord(currentUser, board, row, normalizedPermissions)) return;

    setState((current) => ({
      ...current,
      controlBoards: (current.controlBoards || []).map((controlBoard) => {
        if (controlBoard.id !== boardId) return controlBoard;
        return {
          ...controlBoard,
          rows: (controlBoard.rows || []).map((boardRow) => {
            if (boardRow.id !== rowId) return boardRow;
            return { ...boardRow, ...overrides };
          }),
        };
      }),
    }));

    requestJson(`/warehouse/boards/${boardId}/rows/${rowId}`, {
      method: "PATCH",
      body: JSON.stringify(overrides),
    }).then((remoteState) => {
      applyRemoteStatePreservingBoardDrafts(remoteState);
    }).catch((error) => {
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo actualizar el tiempo." });
    });
  }

  function getBoardExportRows(board) {
    return (board?.rows || []).map((row) => {
      const exportRow = {};

      (board.fields || []).forEach((field) => {
        const rawValue = getBoardFieldValue(board, row, field);
        const value = formatBoardExportFieldValue(field, rawValue, state.inventoryItems || [], userMap);
        exportRow[field.label] = value;
      });

      if (board.settings?.showAssignee !== false) {
        exportRow.Player = formatBoardRowAssigneeLabel(row, userMap, { emptyLabel: "" });
      }

      exportRow.Estado = row.status || STATUS_PENDING;

      if (board.settings?.showDates !== false) {
        const snapshotNow = row.status === STATUS_FINISHED && row.endTime ? new Date(row.endTime).getTime() : Date.now();
        const prodSecs = getElapsedSeconds(row, snapshotNow, operationalPauseState);
        const persistedPauseLogs = Array.isArray(row.pauseLogs) ? row.pauseLogs : [];
        const persistedPauseSecs = persistedPauseLogs.reduce((sum, entry) => sum + Math.max(0, Number(entry?.pauseDurationSeconds || 0)), 0);
        const livePauseSecs = row.status === STATUS_PAUSED && row.pauseStartedAt
          ? Math.max(0, getOperationalElapsedSeconds(row.pauseStartedAt, snapshotNow, operationalPauseState))
          : 0;
        const computedTotalSecs = Math.max(0, prodSecs + persistedPauseSecs + livePauseSecs);
        const overriddenTotalSecs = Number(row.totalElapsedSecondsOverride);
        const totalSecs = Number.isFinite(overriddenTotalSecs) && overriddenTotalSecs >= 0
          ? Math.max(computedTotalSecs, Math.max(0, overriddenTotalSecs))
          : computedTotalSecs;
        const pauseSecs = Math.max(0, totalSecs - prodSecs);
        const efficiencyPct = totalSecs > 0 ? Math.round((prodSecs / totalSecs) * 100) : (row.startTime ? 100 : 0);
        exportRow["Tiempo de producción"] = formatDurationClock(prodSecs);
        exportRow["Tiempo acumulado"] = formatDurationClock(totalSecs);
        exportRow["Tiempo en pausa"] = formatDurationClock(pauseSecs);
        exportRow["Eficiencia"] = row.startTime ? `${efficiencyPct}%` : "";
        exportRow["Creado el"] = formatDateTime(row.createdAt);
      }

      return exportRow;
    });
  }

  async function duplicateBoardRecord(board, includeRows = false) {
    if (!board || !currentUser) return;
    if (!canDoBoardAction(currentUser, board)) return;
    if (!actionPermissions.duplicateBoardWithRows && !actionPermissions.duplicateBoard) return;

    try {
      const result = await requestJson(`/warehouse/boards/${board.id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ includeRows }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setSelectedCustomBoardId(result.data.boardId || "");
      setBoardRuntimeFeedback({ tone: "success", message: `Se duplicó ${board.name} y ya quedó listo como ${result.data.boardName || "la copia"}.` });
    } catch (error) {
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo duplicar el tablero." });
    }
  }

  function changeBoardRowStatus(boardId, rowId, status, options = {}) {
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    if (!board || !row || !canOperateBoardRowRecord(currentUser, board, row, normalizedPermissions)) return;

    if (status === STATUS_RUNNING && row.status !== STATUS_RUNNING && !options.skipStartConfirm) {
      setBoardStartConfirm({
        open: true,
        boardId,
        rowId,
        title: row.status === STATUS_PAUSED ? "Confirmar reanudación" : "Confirmar inicio",
        message: row.status === STATUS_PAUSED
          ? "Vas a reanudar esta actividad."
          : "Vas a iniciar esta actividad.",
      });
      return;
    }

    // When starting a row, check if there are linked cleaning inventory items measured in piezas
    if (status === STATUS_RUNNING && row.status !== STATUS_RUNNING) {
      const activityCatalogId = row.catalogActivityId || null;
      if (activityCatalogId) {
        const pieceItems = (state.inventory || []).filter((invItem) => {
          if (invItem.isDeleted) return false;
          const unit = String(invItem.unitLabel || "").trim().toLowerCase();
          const isPieces = unit === "pzas" || unit === "piezas" || unit === "pz";
          if (!isPieces) return false;
          return (invItem.activityConsumptions || []).some((entry) => entry.catalogActivityId === activityCatalogId && Number(entry.quantity) > 0);
        });
        if (pieceItems.length) {
          setPieceDeductionModal({
            open: true,
            boardId,
            rowId,
            items: pieceItems.map((invItem) => {
              const consumption = invItem.activityConsumptions.find((entry) => entry.catalogActivityId === activityCatalogId);
              return { id: invItem.id, name: invItem.name, quantity: consumption?.quantity || 1, unit: invItem.unitLabel || "pzas", stock: invItem.stockUnits };
            }),
          });
          return;
        }
      }
    }

    executeBoardRowStatusChange(boardId, rowId, status);
  }

  function confirmStartBoardRow() {
    if (!boardStartConfirm.boardId || !boardStartConfirm.rowId) return;
    const boardId = boardStartConfirm.boardId;
    const rowId = boardStartConfirm.rowId;
    setBoardStartConfirm({ open: false, boardId: null, rowId: null, title: "", message: "" });
    changeBoardRowStatus(boardId, rowId, STATUS_RUNNING, { skipStartConfirm: true });
  }

  function applyOptimisticBoardRowStatus(boardId, rowId, updater) {
    setState((current) => ({
      ...current,
      controlBoards: (current.controlBoards || []).map((controlBoard) => {
        if (controlBoard.id !== boardId) return controlBoard;
        return {
          ...controlBoard,
          rows: (controlBoard.rows || []).map((boardRow) => {
            if (boardRow.id !== rowId) return boardRow;
            return updater(boardRow, controlBoard);
          }),
        };
      }),
    }));
  }

  function executeBoardRowStatusChange(boardId, rowId, status) {
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    if (!board || !row || !canOperateBoardRowRecord(currentUser, board, row, normalizedPermissions)) return;

    const nowTime = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
    const autoTimeValues = (board.fields || []).reduce((accumulator, field) => {
      if (field.type !== "time") return accumulator;
      const normalizedLabel = normalizeKey(field.label || "");
      const currentValue = String(row.values?.[field.id] || "").trim();
      if (status === STATUS_RUNNING && (normalizedLabel.includes("inicio") || normalizedLabel.includes("start")) && !currentValue) {
        accumulator[field.id] = nowTime;
      }
      if (status === STATUS_FINISHED && (normalizedLabel.includes("fin") || normalizedLabel.includes("final") || normalizedLabel.includes("end"))) {
        accumulator[field.id] = nowTime;
      }
      return accumulator;
    }, {});

    if (status === STATUS_FINISHED) {
      const missingFields = (board.fields || []).filter((field) => {
        if (!field.required) return false;
        const effectiveValue = Object.hasOwn(autoTimeValues, field.id)
          ? autoTimeValues[field.id]
          : getBoardFieldValue(board, row, field);
        return !isBoardFieldValueFilled(effectiveValue, field.type);
      });

      if (missingFields.length) {
        setBoardRuntimeFeedback({
          tone: "danger",
          message: `Completa los campos obligatorios antes de terminar: ${missingFields.map((field) => field.label).join(", ")}.`,
        });
        return;
      }
    }

    setBoardRuntimeFeedback({ tone: "", message: "" });
    const nowIso = new Date().toISOString();
    const previousRowSnapshot = JSON.parse(JSON.stringify(row));

    applyOptimisticBoardRowStatus(boardId, rowId, (currentRow) => {
      const optimisticValues = {
        ...(currentRow.values || {}),
        ...autoTimeValues,
      };
      const currentElapsedSeconds = getElapsedSeconds(currentRow, Date.now(), operationalPauseState);

      if (status === STATUS_RUNNING) {
        return {
          ...currentRow,
          status,
          values: optimisticValues,
          startTime: currentRow.startTime || nowIso,
          endTime: currentRow.status === STATUS_FINISHED ? null : currentRow.endTime,
          lastResumedAt: nowIso,
          pauseStartedAt: null,
          pauseAffectsTimer: false,
          pauseAuthorizedSeconds: 0,
          accumulatedSeconds: currentRow.status === STATUS_PAUSED ? currentElapsedSeconds : Math.max(0, Number(currentRow.accumulatedSeconds || 0)),
        };
      }

      if (status === STATUS_PAUSED) {
        return {
          ...currentRow,
          status,
          values: optimisticValues,
          accumulatedSeconds: currentElapsedSeconds,
          lastResumedAt: null,
          pauseStartedAt: nowIso,
        };
      }

      if (status === STATUS_FINISHED) {
        return {
          ...currentRow,
          status,
          values: optimisticValues,
          accumulatedSeconds: currentElapsedSeconds,
          endTime: nowIso,
          lastResumedAt: null,
          pauseStartedAt: null,
          pauseAffectsTimer: false,
          pauseAuthorizedSeconds: 0,
        };
      }

      return {
        ...currentRow,
        status,
        values: optimisticValues,
      };
    });

    requestJson(`/warehouse/boards/${boardId}/rows/${rowId}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        ...(Object.keys(autoTimeValues).length ? { values: autoTimeValues } : {}),
      }),
    }).then((remoteState) => {
      applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    }).catch((error) => {
      applyOptimisticBoardRowStatus(boardId, rowId, () => previousRowSnapshot);
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo cambiar el estado de la fila." });
    });
  }

  async function confirmPieceDeductionAndStart(deduct) {
    const { boardId, rowId, items } = pieceDeductionModal;
    setPieceDeductionModal({ open: false, boardId: null, rowId: null, items: [] });
    if (deduct && items.length) {
      try {
        for (const item of items) {
          await requestJson(`/warehouse/inventory/movements`, {
            method: "POST",
            body: JSON.stringify({
              itemId: item.id,
              movementType: "Salida",
              quantity: item.quantity,
              notes: "Descuento automático al iniciar actividad en tablero",
              storageLocation: "",
            }),
          });
        }
      } catch {
        // Non-blocking: proceed to start row even if deduction fails
      }
    }
    executeBoardRowStatusChange(boardId, rowId, STATUS_RUNNING);
  }

  function openFinishBoardRowConfirm(boardId, rowId) {
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    if (!board || !row || !canOperateBoardRowRecord(currentUser, board, row, normalizedPermissions)) return;
    setBoardFinishConfirm({
      open: true,
      boardId,
      rowId,
      message: "Al finalizar esta fila, su información quedará bloqueada para mantener la trazabilidad del registro.",
    });
  }

  function confirmFinishBoardRow() {
    if (!boardFinishConfirm.boardId || !boardFinishConfirm.rowId) return;
    changeBoardRowStatus(boardFinishConfirm.boardId, boardFinishConfirm.rowId, STATUS_FINISHED);
    setBoardFinishConfirm({ open: false, boardId: null, rowId: null, message: "" });
  }

  async function exportSelectedBoardToExcel() {
    if (!selectedCustomBoard || !canDoBoardAction(currentUser, selectedCustomBoard)) return;

    try {
      const ExcelJS = await getExcelJsModule();
      const rows = getBoardExportRows(selectedCustomBoard);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Tablero");
      const exportRows = rows.length ? rows : [{ Estado: "Sin filas registradas" }];
      const headers = Object.keys(exportRows[0] ?? EMPTY_OBJECT);

      worksheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(header.length + 4, 18) }));
      exportRows.forEach((row) => {
        worksheet.addRow(row);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      triggerBrowserDownload(
        buffer,
        `${normalizeKey(selectedCustomBoard.name).replaceAll(/\s+/g, "-") || "tablero-operativo"}.xlsx`,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      setBoardRuntimeFeedback({ tone: "success", message: `Se exportó ${selectedCustomBoard.name} a Excel.` });
    } catch {
      setBoardRuntimeFeedback({ tone: "danger", message: "No se pudo exportar el tablero a Excel." });
    }
  }

  function getSelectedBoardPdfColumns(board) {
    const visibleColumns = getOrderedBoardColumns(board).filter((column) => !(column.kind !== "field" && column.id === "workflow"));
    const pdfColumns = visibleColumns.map((column) => ({
      key: column.token,
      label: column.kind === "field"
        ? column.label
        : column.id === "time"
          ? "Tiempo acumulado"
          : column.label,
      sectionName: column.sectionName || "General",
      sectionColor: column.sectionColor || "#e2f4ec",
      kind: column.kind,
      id: column.id,
      field: column.field,
    }));

    if (board?.settings?.showDates !== false) {
      pdfColumns.push({
        key: "createdAt",
        label: "Creado el",
        sectionName: "Registro",
        sectionColor: "#f3f5f8",
        kind: "meta",
        id: "createdAt",
      });
    }

    return pdfColumns;
  }

  function getSelectedBoardPdfRows(board, pdfColumns) {
    return (board?.rows || []).map((row) => pdfColumns.map((column) => {
      if (column.kind === "field") {
        const rawValue = getBoardFieldValue(board, row, column.field);
        return String(formatBoardExportFieldValue(column.field, rawValue, state.inventoryItems || [], userMap) ?? "");
      }

      if (column.id === "assignee") {
        return formatBoardRowAssigneeLabel(row, userMap, { emptyLabel: "" });
      }

      if (column.id === "status") {
        return row.status || STATUS_PENDING;
      }

      if (column.id === "time") {
        return formatDurationClock(getElapsedSeconds(row, Date.now(), operationalPauseState));
      }

      if (column.id === "createdAt") {
        return formatDateTime(row.createdAt);
      }

      return "";
    }));
  }

  async function buildSelectedBoardPdfDocument() {
    if (!selectedCustomBoard) return null;

    const boardView = selectedCustomBoardDisplay || selectedCustomBoard;
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const pdfColumns = getSelectedBoardPdfColumns(boardView);
    const body = getSelectedBoardPdfRows(boardView, pdfColumns);
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const subtitleParts = [
      isHistoricalCustomBoardView ? (selectedCustomBoardSnapshot?.weekName || "Histórico") : "Semana actual",
      `Filas: ${boardView?.rows?.length || 0}`,
      `Exportado ${new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date())}`,
    ];
    const operationalContextLabel = String(boardView?.settings?.operationalContextLabel || "").trim();
    const operationalContextValue = String(boardView?.settings?.operationalContextValue || "").trim();
    if (operationalContextLabel && operationalContextValue) {
      subtitleParts.splice(1, 0, `${operationalContextLabel}: ${operationalContextValue}`);
    }
    const descriptionLines = boardView?.description ? doc.splitTextToSize(boardView.description, 760) : [];

    doc.setFillColor(19, 61, 51);
    doc.roundedRect(26, 18, 790, 54, 10, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(boardView?.name || selectedCustomBoard.name, 42, 42);
    doc.setFontSize(9);
    doc.text(subtitleParts.join(" · "), 42, 58);

    let nextStartY = 92;
    if (descriptionLines.length) {
      doc.setTextColor(54, 81, 81);
      doc.setFontSize(10);
      doc.text(descriptionLines, 40, nextStartY);
      nextStartY += descriptionLines.length * 12 + 8;
    }

    autoTable(doc, {
      head: [pdfColumns.map((column) => column.label)],
      body: body.length ? body : [["Sin filas registradas"].concat(Array(Math.max(0, pdfColumns.length - 1)).fill(""))],
      startY: nextStartY,
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", lineColor: [221, 231, 226], textColor: [38, 61, 61] },
      headStyles: { fillColor: [19, 61, 51], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 250, 248] },
      bodyStyles: { valign: "middle" },
      margin: { left: 26, right: 26 },
      didParseCell: (hookData) => {
        if (hookData.section !== "head") return;
        const column = pdfColumns[hookData.column.index];
        if (!column) return;
        hookData.cell.styles.fillColor = [19, 61, 51];
      },
    });

    return doc;
  }

  async function previewSelectedBoardPdf() {
    if (!selectedCustomBoard || !canDoBoardAction(currentUser, selectedCustomBoard)) return;

    const previewWindow = globalThis.open("", "_blank");

    try {
      const doc = await buildSelectedBoardPdfDocument();
      if (!doc) throw new Error("pdf_preview_unavailable");
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      if (previewWindow) {
        previewWindow.location.href = pdfUrl;
      } else {
        globalThis.open(pdfUrl, "_blank", "noopener,noreferrer");
      }
      globalThis.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch {
      previewWindow?.close();
      setBoardRuntimeFeedback({ tone: "danger", message: "No se pudo generar la vista previa del tablero en PDF." });
    }
  }

  async function exportSelectedBoardToPdf() {
    if (!selectedCustomBoard || !canDoBoardAction(currentUser, selectedCustomBoard)) return;

    try {
      const fileBaseName = normalizeKey(selectedCustomBoard.name).replaceAll(/\s+/g, "-") || "tablero-operativo";
      const doc = await buildSelectedBoardPdfDocument();
      if (!doc) throw new Error("pdf_export_unavailable");
      doc.save(`${fileBaseName}.pdf`);
      setBoardRuntimeFeedback({ tone: "success", message: `Se exportó ${selectedCustomBoard.name} a PDF.` });
    } catch {
      setBoardRuntimeFeedback({ tone: "danger", message: "No se pudo exportar el tablero a PDF." });
    }
  }

  function openBoardExcelImportPicker() {
    boardExcelFileInputRef.current?.click();
  }

  /** Apply a parsed sheet object into the board draft + open wizard if needed */
  function applyImportedSheet(imported) {
    setControlBoardDraft((current) => ({
      ...current,
      name: current.name || imported.name || imported.boardName || "Tablero importado",
      description: current.description || "Tablero importado desde Excel.",
      columns: imported.fields,
      ...createEmptyFieldDraft(),
    }));
    setBoardImportedRowsDraft(Array.isArray(imported.rows) ? imported.rows : []);

    if (Array.isArray(imported.unsupportedFormulaDetails) && imported.unsupportedFormulaDetails.length) {
      const memorySnapshot = loadFormulasMemory();
      setExcelFormulaWizard({
        open: true,
        items: imported.unsupportedFormulaDetails.map((item) => {
          const memKey = String(item.header || "").toLowerCase().trim();
          const saved = memorySnapshot[memKey] || null;
          let prefilledLeft = "";
          let prefilledRight = "";
          let prefilledOp = item.autoOperation || "add";
          let fromMemory = false;
          let fromClassification = false;

          if (saved) {
            const fieldByLabel = (label) =>
              (imported.fields || []).find((f) => f.label?.toLowerCase().trim() === String(label || "").toLowerCase().trim());
            const leftField = fieldByLabel(saved.leftLabel);
            const rightField = fieldByLabel(saved.rightLabel);
            if (leftField && rightField) {
              prefilledLeft = leftField.id;
              prefilledRight = rightField.id;
              prefilledOp = saved.operation || "add";
              fromMemory = true;
            }
          }

          if (!fromMemory && item.autoLeftColumnIndex != null && item.autoRightColumnIndex != null) {
            const leftField = imported.fields[item.autoLeftColumnIndex];
            const rightField = imported.fields[item.autoRightColumnIndex];
            if (leftField) prefilledLeft = leftField.id;
            if (rightField) prefilledRight = rightField.id;
            if (prefilledLeft || prefilledRight) fromClassification = true;
          }

          return {
            targetLabel: item.header,
            targetFieldId: imported.fields[item.columnIndex]?.id || "",
            formula: item.formula,
            operation: prefilledOp,
            formulaLeftFieldId: prefilledLeft,
            formulaRightFieldId: prefilledRight,
            targetType: fromMemory ? "formula" : (item.suggestedFieldType || "formula"),
            fromMemory,
            fromClassification,
            classification: item.classification || null,
          };
        }),
      });
    } else {
      setExcelFormulaWizard({ open: false, items: [] });
    }

    const unsupportedMsg = (imported.unsupportedFormulaColumns || imported.unsupportedFormulaDetails || []).length
      ? ` ${(imported.unsupportedFormulaColumns || imported.unsupportedFormulaDetails).length} fórmula(s) complejas requieren mapeo manual.`
      : "";
    const supportedMsg = (imported.supportedFormulaCount || 0) > 0
      ? ` ${imported.supportedFormulaCount} fórmula(s) convertidas automáticamente.`
      : "";
    setControlBoardFeedback(`Se importaron ${(imported.fields || []).length} componentes desde Excel (${imported.name || imported.boardName}).${supportedMsg}${unsupportedMsg}`);
  }

  async function importBoardStructureFromExcel(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const imported = await parseBoardStructureImportFile(file);

      // Multiple sheets → show sheet picker first
      if (imported.sheets && imported.sheets.length > 1) {
        setExcelSheetSelector({ open: true, sheets: imported.sheets, fileName: imported.fileName });
        return;
      }

      // Single sheet → apply directly
      applyImportedSheet(imported);
    } catch (error) {
      setBoardImportedRowsDraft([]);
      setExcelFormulaWizard({ open: false, items: [] });
      setControlBoardFeedback(error?.message || "No se pudo importar la estructura del Excel.");
    }
  }


  function updateExcelFormulaWizardItem(index, key, value) {
    setExcelFormulaWizard((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    }));
  }

  function removeExcelFormulaWizardItem(index) {
    setExcelFormulaWizard((current) => ({
      ...current,
      items: current.items.filter((_, i) => i !== index),
    }));
  }

  function applyExcelFormulaWizard() {
    const validMappings = (excelFormulaWizard.items || []).filter((item) => {
      if (!item.targetFieldId) return false;
      if (item.targetType === "formula") return item.formulaLeftFieldId && item.formulaRightFieldId;
      return true; // inventoryLookup, text, number — just apply the type
    });
    if (!validMappings.length) {
      setExcelFormulaWizard({ open: false, items: [] });
      setControlBoardFeedback("No se aplicaron conversiones manuales de fórmula.");
      return;
    }

    const allFields = controlBoardDraft.columns || [];
    const fieldLabelById = (id) => allFields.find((f) => f.id === id)?.label || "";

    const mappingByTarget = new Map(validMappings.map((item) => [item.targetFieldId, item]));
    setControlBoardDraft((current) => ({
      ...current,
      columns: (current.columns || []).map((field) => {
        const mapping = mappingByTarget.get(field.id);
        if (!mapping) return field;

        if (mapping.targetType === "inventoryLookup") {
          return {
            ...field,
            type: "inventoryLookup",
            formulaOperation: "add",
            formulaLeftFieldId: null,
            formulaRightFieldId: null,
            formulaTerms: [],
            helpText: field.helpText || "Buscador de inventario configurado desde el asistente de importación.",
          };
        }

        if (mapping.targetType === "number") {
          return { ...field, type: "number" };
        }

        if (mapping.targetType === "text") {
          return { ...field, type: "text" };
        }

        if (mapping.targetType === "select") {
          return { ...field, type: "select" };
        }

        // formula
        if (mapping.formulaLeftFieldId && mapping.formulaRightFieldId) {
          saveFormulaToMemory(
            mapping.targetLabel,
            mapping.operation || "add",
            fieldLabelById(mapping.formulaLeftFieldId),
            fieldLabelById(mapping.formulaRightFieldId),
            mapping.formula || "",
          );
          return {
            ...field,
            type: "formula",
            formulaOperation: mapping.operation || "add",
            formulaLeftFieldId: mapping.formulaLeftFieldId,
            formulaRightFieldId: mapping.formulaRightFieldId,
            formulaTerms: getNormalizedFormulaTerms([], {
              formulaOperation: mapping.operation || "add",
              formulaLeftFieldId: mapping.formulaLeftFieldId,
              formulaRightFieldId: mapping.formulaRightFieldId,
            }),
            helpText: field.helpText || "Fórmula configurada manualmente desde el asistente de importación.",
          };
        }

        return field;
      }),
    }));
    setExcelFormulaWizard({ open: false, items: [] });
    setControlBoardFeedback(`Se configuraron ${validMappings.length} campo(s) desde el asistente.`);
  }

  function getBoardFieldValue(board, row, field) {
    if (!field || !field.id) return "";

    const values = row?.values || {};
    const boardFields = board?.fields || [];
    const rawValue = values[field.id];

    function resolveInventoryItemFromLookupValue(lookupValue) {
      const inventoryItems = state.inventoryItems || [];
      if (!inventoryItems.length) return null;

      const candidateTokens = [];
      const appendToken = (value) => {
        const next = String(value || "").trim();
        if (next) candidateTokens.push(next);
      };

      if (lookupValue && typeof lookupValue === "object") {
        appendToken(lookupValue.id);
        appendToken(lookupValue.code);
        appendToken(lookupValue.sku);
        appendToken(lookupValue.name);
      } else {
        const rawText = String(lookupValue || "").trim();
        if (rawText) {
          appendToken(rawText);
          if (rawText.startsWith("{") && rawText.endsWith("}")) {
            try {
              const parsed = JSON.parse(rawText);
              if (parsed && typeof parsed === "object") {
                appendToken(parsed.id);
                appendToken(parsed.code);
                appendToken(parsed.sku);
                appendToken(parsed.name);
              }
            } catch {
              // Ignore invalid JSON lookup payloads.
            }
          }

          if (rawText.includes("·")) {
            const [firstPart] = rawText.split("·");
            appendToken(firstPart);
          }

          if (rawText.includes("-")) {
            const [firstPart] = rawText.split("-");
            appendToken(firstPart);
          }
        }
      }

      const seenTokens = new Set();
      const normalizedTokens = candidateTokens
        .map((token) => token.trim())
        .filter((token) => {
          if (!token) return false;
          const key = normalizeKey(token);
          if (seenTokens.has(key)) return false;
          seenTokens.add(key);
          return true;
        });

      for (const token of normalizedTokens) {
        const tokenKey = normalizeKey(token);
        const matchedItem = inventoryItems.find((item) => {
          const idMatch = String(item?.id || "").trim() === token;
          const codeMatch = normalizeKey(item?.code) === tokenKey;
          const skuMatch = normalizeKey(item?.sku) === tokenKey;
          const nameMatch = normalizeKey(item?.name) === tokenKey;
          return idMatch || codeMatch || skuMatch || nameMatch;
        });
        if (matchedItem) return matchedItem;
      }

      return null;
    }

    if (field.type === "inventoryProperty") {
      const rawInventoryOverride = values[field.id];
      const allowManualInventoryValue = ["lot", "expiry", "label"].includes(field.inventoryProperty);
      if (allowManualInventoryValue && rawInventoryOverride !== undefined && rawInventoryOverride !== null && String(rawInventoryOverride).trim()) {
        return rawInventoryOverride;
      }
      const resolvedSourceFieldId = resolveInventoryPropertySourceFieldId(boardFields, field.sourceFieldId, field.id);
      const lookupValue = values[resolvedSourceFieldId];
      const inventoryItem = resolveInventoryItemFromLookupValue(lookupValue);
      return resolveInventoryPropertyValue(inventoryItem, field.inventoryProperty);
    }

    if (field.type === "formula") {
      return evaluateFormulaFieldValue(field, (fieldId) => {
        const sourceField = boardFields.find((item) => item.id === fieldId);
        if (!sourceField) return 0;
        // inventoryProperty and formula fields always need to be resolved through
        // getBoardFieldValue — never use the stale stored value, which may be 0/empty
        // and would cause incorrect formula results (e.g. 13 × 0 = 0 instead of 13 × 50).
        if (sourceField.type === "inventoryProperty" || sourceField.type === "formula") {
          return getBoardFieldValue(board, row, sourceField);
        }
        const rawFormulaValue = values[fieldId];
        const hasRawFormulaValue = rawFormulaValue !== undefined && rawFormulaValue !== null && String(rawFormulaValue).trim() !== "";
        return hasRawFormulaValue ? rawFormulaValue : getBoardFieldValue(board, row, sourceField);
      });
    }

    return rawValue ?? "";
  }

  function getBoardFieldCellStyle(field) {
    const typeMinimum = BOARD_FIELD_MIN_WIDTH_BY_TYPE[field?.type] || 120;
    const widthPx = Number(field?.widthPx || 0);
    if (Number.isFinite(widthPx) && widthPx >= 90) {
      const normalizedWidth = Math.max(typeMinimum, Math.round(widthPx));
      return { minWidth: `${normalizedWidth}px`, width: `${normalizedWidth}px` };
    }
    const fallbackStyle = BOARD_FIELD_WIDTH_STYLES[field.width] || BOARD_FIELD_WIDTH_STYLES.md;
    const fallbackValue = Number.parseInt(String(fallbackStyle.minWidth || "180").replace("px", ""), 10);
    const normalizedFallback = Math.max(typeMinimum, Number.isFinite(fallbackValue) ? fallbackValue : 180);
    return { minWidth: `${normalizedFallback}px`, width: `${normalizedFallback}px` };
  }

  function openComponentStudio() {
    setControlBoardDraft((current) => ({
      ...current,
      ...createEmptyFieldDraft(),
    }));
    setEditingDraftColumnId(null);
    setComponentStudioOpen(true);
    setControlBoardFeedback("");
  }

  async function submitPasswordReset() {
    if (!passwordForm.password || passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordForm((current) => ({ ...current, message: "Las contraseñas no coinciden o están vacías." }));
      return;
    }
    if (!isStrongPassword(passwordForm.password)) {
      setPasswordForm((current) => ({ ...current, message: "La contraseña debe incluir mayúscula, minúscula, número, símbolo y al menos 10 caracteres." }));
      return;
    }
    try {
      const requiresForcedChange = Boolean(currentUser?.mustChangePassword);
      const result = await requestJson("/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ password: passwordForm.password }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setPasswordForm({ password: "", confirmPassword: "", message: requiresForcedChange ? "" : "Contraseña actualizada." });
    } catch (error) {
      setPasswordForm((current) => ({ ...current, message: error?.message || "No se pudo actualizar la contraseña." }));
    }
  }

  function openResetUserPassword(user) {
    if (!actionPermissions.resetPasswords) return;
    setShowResetUserPassword(false);
    setResetUserPasswordModal({
      open: true,
      userId: user.id,
      userName: user.name,
      password: "",
      message: "",
    });
  }

  async function submitUserPasswordReset() {
    if (!canResetOtherPasswords || !actionPermissions.resetPasswords || !resetUserPasswordModal.userId || !resetUserPasswordModal.password.trim()) {
      setResetUserPasswordModal((current) => ({ ...current, message: "Escribe una contraseña válida." }));
      return;
    }
    if (!isTemporaryPassword(resetUserPasswordModal.password.trim())) {
      setResetUserPasswordModal((current) => ({ ...current, message: `Usa al menos ${TEMPORARY_PASSWORD_MIN_LENGTH} caracteres para la contraseña temporal.` }));
      return;
    }

    setResetUserPasswordModal((current) => ({ ...current, submitting: true }));

    try {
      const result = await requestJson(`/auth/users/${resetUserPasswordModal.userId}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: resetUserPasswordModal.password.trim() }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setShowResetUserPassword(false);
      setResetUserPasswordModal({ open: false, userId: null, userName: "", password: "", message: "", submitting: false });
    } catch (error) {
      setResetUserPasswordModal((current) => ({ ...current, submitting: false, message: error?.message || "No se pudo restablecer la contraseña." }));
    }
  }

  const pageTitle = NAV_ITEMS.find((item) => item.id === page)?.label || {
    [PAGE_ADMIN]: "Creador de tableros",
    [PAGE_NOT_FOUND]: "Página no encontrada",
  }[page];
  const headerEyebrow = getHeaderEyebrowText(page);
  const shouldShowUserPermissionNote = !supportsManagedPermissionOverrides(userModal.role);
  const inventoryEntityLabel = getInventoryEntityLabel(inventoryModal.domain);
  const shouldShowInventoryPresentationField = inventoryDomainUsesPresentation(inventoryModal.domain);
  const shouldShowInventoryPackagingFields = inventoryDomainUsesPackagingMetrics(inventoryModal.domain);
  const shouldShowInventoryStockFields = inventoryModal.domain !== INVENTORY_DOMAIN_BASE;
  const shouldShowCleaningLinkFields = inventoryModal.domain === INVENTORY_DOMAIN_CLEANING;
  const inventoryPresentationLabel = getInventoryPresentationLabel(inventoryModal.domain);
  const inventoryPresentationPlaceholder = getInventoryPresentationPlaceholder(inventoryModal.domain);
  const inventoryUnitPlaceholder = getInventoryUnitPlaceholder(inventoryModal.domain);
  const inventoryStoragePlaceholder = getInventoryStoragePlaceholder(inventoryModal.domain);

  const inventoryUnitOptions = useMemo(() => {
    const PRESET_UNITS = ["pzas", "piezas", "rollos", "bidones", "bolsas", "litros", "kg", "cajas", "paquetes", "galones", "latas", "metros", "sacos", "cubetas"];
    const existing = new Set(PRESET_UNITS);
    (state.inventory || []).forEach((item) => {
      const u = String(item.unitLabel || "").trim().toLowerCase();
      if (u) existing.add(u);
    });
    return Array.from(existing).sort((a, b) => a.localeCompare(b, "es-MX"));
  }, [state.inventory]);
  const inventoryCustomColumnsForModal = useMemo(
    () => mergeInventoryColumnsWithSystem(state.inventoryColumns || []).filter((column) => column.domain === inventoryModal.domain),
    [inventoryModal.domain, state.inventoryColumns],
  );
  const inventorySystemColumnSuggestions = useMemo(() => {
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
  }, [allInventoryItems, inventoryModal.domain]);
  const _shouldShowTransferTargetEmptyState = !hasOrderTransferTargets;
  const shouldShowTransferRemainingUnits = (movement) => movement.remainingUnits !== null;
  const _shouldShowTransferMovementEmptyState = orderInventoryTransferMovements.length === 0;

  const boardSectionOptions = useMemo(() => {
    const options = new Set(DEFAULT_BOARD_SECTION_OPTIONS);
    (controlBoardDraft.columns || []).forEach((column) => {
      const sectionName = String(column.groupName || "").trim();
      if (sectionName) options.add(sectionName);
    });
    return Array.from(options.values());
  }, [controlBoardDraft.columns]);

  const activityCatalogCategoryOptions = useMemo(() => {
    const options = new Set(["General"]);
    (state.catalog || []).forEach((item) => {
      if (item?.isDeleted) return;
      const categoryName = String(item?.category || "General").trim() || "General";
      options.add(categoryName);
    });
    return Array.from(options.values());
  }, [state.catalog]);

  const contextoConstructor = {
    BOARD_ACTIVITY_LIST_FIELD,
    BOARD_AUX_COLUMN_DEFINITIONS,
    BOARD_FIELD_TYPES,
    BOARD_FIELD_WIDTHS,
    BOARD_FIELD_WIDTH_STYLES,
    COLOR_RULE_OPERATORS,
    FORMULA_OPERATIONS,
    INVENTORY_LOOKUP_LOGISTICS_FIELD,
    INVENTORY_PROPERTIES,
    OPTION_SOURCE_TYPES,
    STATUS_PENDING,
    STATUS_RUNNING,
    formatBoardPreviewValue,
    getBoardFieldDisplayType,
    getBoardFieldTypeDescription,
    getNormalizedBoardColumnOrder,
    getOrderedBoardColumns,
    getBoardSectionGroups,
    reorderBoardColumnOrderTokens,
    renderBoardFieldLabel,
    sortBoardFieldsByColumnOrder,
    getAreaRoot,
    normalizeAreaOption,
  };

  const paginasContexto = {
    ACTION_DEFINITIONS,
    BOOTSTRAP_MASTER_ID,
    AlertTriangle,
    activeAssignableUsers,
    activeWeek,
    actionPermissions,
    adminReportRows,
    adminTab,
    applyPermissionPreset,
    applyRemoteWarehouseState,
    ArrowUp,
    auditFilters,
    BarChart3,
    boardAssignmentsByUser,
    boardRuntimeFeedback,
    buildSelectOptions,
    CalendarDays,
    canDoBoardAction,
    canEditBoard,
    canEditBoardRowRecord,
    canOperateBoardRowRecord,
    catalogMap,
    catalogWeekGroups,
    changeBoardRowStatus,
    CircleCheckBig,
    ClipboardList,
    Clock3,
    Copy,
    creatableRoles,
    createBoardRow,
    currentInventoryDeletePermission,
    currentInventoryImportPermission,
    currentInventoryItems,
    currentInventoryManagePermission,
    currentInventoryMovements,
    currentUser,
    activeAreaScopes,
    customBoardActionsMenuOpen,
    customBoardActionsMenuRef,
    customBoardMetrics,
    customBoardSearch,
    dashboardActivityRows,
    dashboardAreaRows,
    dashboardCatalogFrequencyRows,
    dashboardCatalogTypeRows,
    dashboardDynamicMetricRows,
    dashboardAreaBoardDetailedRows,
    dashboardInventoryProductTimeRows,
    dashboardProductAggregateRows,
    dashboardDistributionRows,
    dashboardFilters,
    filteredDashboardRecords,
    dashboardVisibleControlBoards,
    dashboardIshikawaRows,
    dashboardMetrics,
    dashboardParetoRows,
    dashboardPeriodOptions,
    dashboardResponsibleRows,
    dashboardSectionsOpen,
    dashboardTrendRows,
    DashboardBarRow,
    DashboardCauseCard,
    DashboardColumnChart,
    DashboardLineChart,
    DashboardIshikawaDiagram,
    DashboardKpiCard,
    DashboardParetoChart,
    DashboardParetoRow,
    DashboardPieChart,
    DashboardProgressMetric,
    DashboardRankItem,
    DashboardSection,
    departmentOptions,
    downloadInventoryTemplate,
    exportMaintenanceInventoryItemsToCsv,
    maintenanceInventoryItems,
    submitMaintenanceUsage,
    Download,
    duplicateBoardRecord,
    Eye,
    editableVisibleBoards,
    exportPermissionRules,
    exportSelectedBoardToExcel,
    previewSelectedBoardPdf,
    exportSelectedBoardToPdf,
    filteredAuditLog,
    filteredBoardTemplates,
    filteredUsers,
    filteredVisibleControlBoards,
    formatDate,
    formatDateTime,
    formatDurationClock,
    formatMetricNumber,
    formatMinutes,
    formatPercent,
    formatTime,
    Gauge,
    getActivityLabel,
    getActivityFrequencyLabel,
    getBoardAssignmentSummary,
    getBoardFieldCellStyle,
    getOrderedBoardColumns,
    getBoardFieldValue,
    renderBoardFieldLabel,
    getDashboardPeriodTypeLabel,
    getElapsedSeconds,
    getFieldColorRule,
    getResponsibleVisual,
    getRoleBadgeClass,
    getTimeLimitMinutes,
    getUserArea,
    getUserJobTitle,
    handleInventoryImport,
    handlePermissionImport,
    historyWeek,
    inventoryActionsMenuOpen,
    inventoryActionsMenuRef,
    inventoryFileInputRef,
    inventoryImportFeedback,
    inventoryLinkedCleaningRows,
    inventoryMovementSavedDestinations,
    inventoryMovementSavedLocations,
    state,
    setState,
    setLoginDirectory,
    skipNextSyncRef,
    setSyncStatus,
    transportState: state.transport || { config: [], activeDateKey: "", activeRecords: [], historyRecords: [] },
    users: Array.isArray(state.users) ? state.users : [],
    createTransportRecord,
    updateTransportRecord,
    canManageTransport: Boolean(actionPermissions.manageTransport),
    navTransportSection,
    setNavTransportSection,
    navTransportTab,
    setNavTransportTab,
    auditShortcutPreset,
    setAuditShortcutPreset,
    documentacionState: state.documentacion || { records: [], customAreas: [] },
    createDocumentacionRecord,
    updateDocumentacionRecord,
    addDocumentacionArea,
    deleteDocumentacionArea,
    currentInventorySupplyableCount: currentInventorySupplyableItems.length,
    inventoryCleaningSite,
    inventoryDestinationWarehouse,
    setInventoryDestinationWarehouse,
    inventorySearch,
    inventoryStats,
    inventoryTab,
    inventoryItemsById,
    CLEANING_SITE_OPTIONS,
    openInventoryBulkRestockModal,
    openInventoryRestockModal,
    openInventoryTransferHistory,
    openInventoryTransferViewer,
    openOrderInventoryTransfer,
    openInventoryDestinationModal,
    closeInventoryDestinationModal,
    submitInventoryDestinationModal,
    deleteInventoryDestination,
    inventoryDestinationModal,
    inventoryTransferAvailableWarehouses,
    inventoryTransferDestinationsByWarehouse,
    orderInventoryTransferMovements,
    maintenanceInventoryTransferMovements,
    orderInventoryTransferSummary,
    maintenanceInventoryTransferSummary,
    InventoryLookupInput,
    InventoryStockBar,
    INVENTORY_DOMAIN_BASE,
    INVENTORY_DOMAIN_CLEANING,
    INVENTORY_DOMAIN_ORDERS,
    INVENTORY_DOMAIN_MAINTENANCE,
    INVENTORY_MOVEMENT_CONSUME,
    INVENTORY_MOVEMENT_RESTOCK,
    INVENTORY_MOVEMENT_TRANSFER,
    LayoutDashboard,
    lowStockInventoryItems,
    Menu,
    Modal,
    MetricCard,
    NAV_ITEMS,
    ACTIVITY_FREQUENCY_OPTIONS,
    normalizedPermissions,
    now,
    OctagonAlert,
    openBoardPauseModal,
    openCatalogCreate,
    openCatalogEdit,
    exportCatalogToCsv,
    importCatalogFromCsv,
    openCreateBoardBuilder,
    openCreateBoardBuilderFromChecklistTemplate,
    openCreateInventoryItem,
    openCreateUser,
    openEditBoardBuilder,
    openEditInventoryItem,
    openEditUser,
    openFinishBoardRowConfirm,
    openInventoryMovement,
    deleteArea: async (areaName) => {
      try {
        const result = await requestJson(`/warehouse/areas/${encodeURIComponent(areaName)}`, { method: "DELETE" });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      } catch (error) {
        pushAppToast(error?.message || "No se pudo eliminar el área.", "danger");
      }
    },
    deleteWeek: async (weekId) => {
      const result = await requestJson(`/warehouse/weeks/${weekId}`, { method: "DELETE" });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      return result.data.weekId;
    },
    handleAddAreaOption,
    rootAreaOptions,
    splitAreaAndSubArea,
    inventoryColumns: Array.isArray(state.inventoryColumns) ? state.inventoryColumns : [],
    createInventoryColumn: async (payload) => {
      try {
        const result = await requestJson("/warehouse/inventory/columns", {
          method: "POST",
          body: JSON.stringify(payload || {}),
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        pushAppToast("Columna de inventario creada.", "success");
      } catch (error) {
        pushAppToast(error?.message || "No se pudo crear la columna.", "danger");
        throw error;
      }
    },
    deleteInventoryColumn: async (columnId) => {
      try {
        const result = await requestJson(`/warehouse/inventory/columns/${columnId}`, { method: "DELETE" });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        pushAppToast("Columna de inventario eliminada.", "success");
      } catch (error) {
        pushAppToast(error?.message || "No se pudo eliminar la columna.", "danger");
        throw error;
      }
    },
    inventorySystemColumnSuggestions,
    duplicateInventoryItem: async (itemId) => {
      try {
        const result = await requestJson(`/warehouse/inventory/${itemId}/duplicate`, { method: "POST" });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
        pushAppToast("Artículo duplicado correctamente.", "success");
      } catch (error) {
        pushAppToast(error?.message || "No se pudo duplicar el artículo.", "danger");
      }
    },
    processAuditTemplates: Array.isArray(state.processAuditTemplates) ? state.processAuditTemplates : [],
    processAudits: Array.isArray(state.processAudits) ? state.processAudits : [],
    upsertProcessAuditTemplate: async (payload) => {
      const result = await requestJson("/warehouse/process-audits/templates", {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      return result.data.templateId;
    },
    deleteProcessAuditTemplate: async (templateId) => {
      const result = await requestJson(`/warehouse/process-audits/templates/${templateId}`, { method: "DELETE" });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    },
    createProcessAudit: async (payload) => {
      const result = await requestJson("/warehouse/process-audits", {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      return result.data.auditId;
    },
    updateProcessAudit: async (auditId, payload) => {
      const result = await requestJson(`/warehouse/process-audits/${auditId}`, {
        method: "PATCH",
        body: JSON.stringify(payload || {}),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      return result.data.auditId;
    },
    deleteProcessAudit: async (auditId, leadPassword) => {
      const result = await requestJson(`/warehouse/process-audits/${auditId}`, {
        method: "DELETE",
        body: JSON.stringify({ leadPassword }),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      return result.data.auditId;
    },
    resetProcessAuditStats: async () => {
      const result = await requestJson("/warehouse/process-audits/reset-stats", { method: "POST" });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
    },
    addProcessAuditEvidence: async (auditId, payload) => {
      const result = await requestJson(`/warehouse/process-audits/${auditId}/evidences`, {
        method: "POST",
        body: JSON.stringify(payload || {}),
      });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      return result.data.evidenceId;
    },
    removeProcessAuditEvidence: async (auditId, evidenceId) => {
      const result = await requestJson(`/warehouse/process-audits/${auditId}/evidences/${evidenceId}`, { method: "DELETE" });
      applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      return result.data.evidenceId;
    },
    Package,
    PAGE_CUSTOM_BOARDS,
    PAGE_DASHBOARD,
    page,
    pauseAnalysis,
    Pause,
    PauseCircle,
    Pencil,
    permissionFileInputRef,
    permissionsFeedback,
    PERMISSION_PRESETS,
    PieChart,
    Play,
    Plus,
    hardResetDashboard,
    isRootLead,
    canManageDashboardState,
    canManageDashboardControls,
    canExportDashboardData,
    isDemoMode,
    activateDemoMode,
    deactivateDemoMode,
    pushAppToast,
    requestJson,
    ROLE_LEAD,
    ROLE_JR,
    RotateCcw,
    Search,
    securityEvents,
    securityEventsStatus,
    selectedBoardActionPermissions,
    selectedCustomBoard,
    selectedCustomBoardDisplay,
    selectedCustomBoardHistoryOptions,
    selectedCustomBoardSnapshot,
    selectedCustomBoardViewId,
    selectedCustomBoardSections,
    selectedAreaSectionId,
    selectedAreaSection,
    canChangeSelectedBoardOperationalContext,
    selectedPermissionBoard,
    setAdminTab,
    setAuditFilters,
    setBoardRuntimeFeedback,
    setCustomBoardActionsMenuOpen,
    setCustomBoardSearch,
    setDashboardFilters,
    setDashboardSectionsOpen,
    setDeleteBoardId,
    setDeleteBoardRowState,
    setDeleteInventoryId,
    setDeleteUserId,
    transferLead,
    transferLeadTargetId,
    setTransferLeadTargetId,
    setEditWeekId,
    setHistoryPauseActivityId,
    setInventoryActionsMenuOpen,
    setInventoryCleaningSite,
    setInventorySearch,
    setInventoryTab,
    setLoginDirectory,
    setPage,
    setSelectedCustomBoardId,
    setSelectedAreaSectionId,
    updateBoardOperationalContext,
    setSelectedHistoryWeekId,
    setSelectedPermissionBoardId,
    setState,
    setSyncStatus,
    setUserRoleFilter,
    setUserSearch,
    setUsersViewTab,
    Settings,
    skipNextSyncRef,
    softDeleteCatalog,
    Square,
    state,
    StatTile,
    STATUS_FINISHED,
    STATUS_PAUSED,
    STATUS_PENDING,
    STATUS_RUNNING,
    StatusBadge,
    togglePermissionRole,
    toggleUserActive,
    Trash2,
    updateBoardAssignment,
    updateBoardRowValue,
    updateBoardRowTimeOverride,
    updatePermissionEntry,
    Upload,
    userMap,
    usersByAreaGroups,
    isHistoricalCustomBoardView,
    setSelectedCustomBoardViewId,
    usersByCreatorGroups,
    usersCreatedByMap,
    usersViewTab,
    userRoleFilter,
    userSearch,
    userStats,
    USER_ROLES,
    allRoles,
    customRoles: state.customRoles || [],
    roleModalOpen,
    roleModalName,
    setRoleModalName,
    roleModalEditId,
    roleModalError,
    roleSaving,
    openCreateRoleModal,
    openEditRoleModal,
    submitRoleModal,
    handleDeleteCustomRole,
    updateSystemOperationalSettings,
    operationalWorkWeek: {},
    setRoleModalOpen,
    Users,
    canDeleteControlBoardEntry,
    visibleControlBoards,
    visibleUsers,
    weeklyAreaCoverageRows,
    Zap,
  };

  // Socket.IO — reconexión automática gestionada por Socket.IO internamente.
  //
  // Por qué reconnection:true resuelve el bucle de 400 "Session ID unknown":
  //   - Con reconnection:false el cliente tenía que recrear el socket manualmente
  //     (via scheduleReset). Cualquier race condition dejaba el sid expirado en vuelo.
  //   - Con reconnection:true, cuando Socket.IO reconecta llama a Manager.open()
  //     que crea un NUEVO engine.io.Socket (sin sid). El handshake siempre es fresco.
  //
  // Por qué dep es currentUser?.id (primitivo, no el objeto):
  //   - currentUser es recalculado en cada sync SSE del estado, aunque el usuario
  //     sea el mismo. Usar el objeto como dep destruía/recreaba el socket ~cada 3s.
  useEffect(() => {
    const userId = currentUser?.id;
    const userName = currentUser?.name;
    if (!userId) return;

    // Destruir socket anterior si existe (p.ej. cambio de usuario)
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // API_BASE_URL puede ser "/api"; para Socket.IO solo necesitamos el origin.
    let socketBaseUrl = window.location.origin;
    try {
      const parsedApiUrl = new URL(API_BASE_URL || window.location.origin, window.location.origin);
      socketBaseUrl = parsedApiUrl.origin;
    } catch (_) { /* noop */ }

    const socket = io(socketBaseUrl, {
      withCredentials: true,
      path: "/socket.io",
      transports: ["websocket", "polling"],
      upgrade: true,
      reconnection: true,            // Socket.IO gestiona reconexión (sin race conditions)
      reconnectionDelay: 3000,       // 3s entre intentos
      reconnectionDelayMax: 10000,   // máximo 10s de espera
      reconnectionAttempts: Infinity,
      timeout: 30000,
      forceNew: true,                // nuevo Manager en cada montaje (sin cache)
    });

    socket.on("connect", () => {
      socket.emit("login_chat", { nickname: userName, photo: currentUser?.photo || null });
      setSocketConnectCount((c) => c + 1);
    });

    socketRef.current = socket;
    return () => {
      // disconnect() también llama io.reconnection(false) internamente,
      // así que el socket no intentará reconectarse después del desmontaje.
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  if (isBootstrapMasterSession) {
    return <BootstrapLeadSetup setupForm={bootstrapLeadForm} onChange={updateBootstrapLeadField} onSubmit={handleCreateFirstLead} error={bootstrapLeadError} areaOptions={departmentOptions} onAddArea={handleAddAreaToBootstrap} />;
  }

  if (!currentUser) {
    if (isAuthChecking) return <div className="app-auth-splash" />;
    return <LoginScreen loginForm={loginForm} onChange={updateLoginField} onSubmit={handleLogin} error={loginError} demoUsers={loginDirectory.system?.showBootstrapMasterHint ? [{ id: BOOTSTRAP_MASTER_ID, role: "Acceso maestro", login: loginDirectory.system?.masterUsername || MASTER_USERNAME }] : loginDirectory.demoUsers} />;
  }

  return (
    <main className={`warehouse-app ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <AppToastStack toasts={appToasts} onDismiss={dismissAppToastForced} onPin={pinAppToast} />
      {antiCaptureEnabled && globalCaptureShieldActive ? (
        <div className="global-capture-shield" role="status" aria-live="polite">
          <strong>Contenido protegido</strong>
          <p>Regresa a esta ventana para continuar.</p>
        </div>
      ) : null}
      <button type="button" className={`sidebar-overlay ${isSidebarOpen ? "visible" : ""}`} onClick={() => setIsSidebarOpen(false)} aria-label="Cerrar menú lateral" />
      <Sidebar
        currentUser={currentUser}
        page={page}
        onPageChange={(nextPage, nextAreaSectionId = "all", transportSection, transportTab, auditPreset) => {
          setSelectedAreaSectionId(nextAreaSectionId || "all");
          setPage(nextPage);
          if (transportSection) setNavTransportSection(transportSection);
          setNavTransportTab(transportTab || "");
          setAuditShortcutPreset(auditPreset || null);
        }}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onOpenProfile={() => setProfileModalOpen(true)}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
        areaSections={areaNavSections}
        utilityNavItems={utilityNavItems}
        selectedAreaSectionId={selectedAreaSectionId}
        navTransportSection={navTransportSection}
        navTransportTab={navTransportTab}
        canUseAI={!!actionPermissions.useCopmecAI}
        onOpenAI={() => setAiOpen((v) => !v)}
      />

      <section ref={contentShellRef} className="content-shell">
        {isDemoMode ? (
          <div className="demo-mode-banner" role="alert">
            <span>⚙ <strong>Modo Demo activo</strong> — Los cambios realizados serán descartados al desactivarlo.</span>
            <button type="button" className="demo-mode-banner-exit" onClick={deactivateDemoMode}>Desactivar y revertir</button>
          </div>
        ) : null}
        <header className={`content-header ${page === PAGE_DASHBOARD ? "dashboard-header-shell" : ""}`}>
          <button type="button" className="mobile-nav-toggle" onClick={() => setIsSidebarOpen(true)} aria-label="Abrir menú">
            <Menu size={18} />
            <span>Menú</span>
          </button>
          <div>
            <p className="eyebrow">{headerEyebrow}</p>
            <h2>{page === PAGE_DASHBOARD ? "Dashboard" : pageTitle}</h2>
          </div>
          <div className="header-tools">
            <div className="header-meta">
              <span>{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(now))}</span>
              <span className="header-clock">{new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(now))}</span>
            </div>
            <span
              className={`header-sync-dot ${
                syncStatus === "Sincronizado" ? "sync-ok" :
                syncStatus === "Reconectando" ? "sync-warn" :
                syncStatus === "Modo local" ? "sync-offline" : "sync-connecting"
              }`}
              title={syncStatus}
              aria-label={`Estado: ${syncStatus}`}
            />
          </div>
          <div ref={notificationCenterRef} className="header-notification-wrap header-bell-right">
            <AppNotificationCenter
              unreadNotifications={unreadNotifications}
              readNotifications={readNotifications}
              unreadCount={unreadNotificationsCount}
              attentionTick={notificationAttentionTick}
              activeTab={notificationPanelTab}
              isOpen={notificationPanelOpen}
              onToggle={handleToggleNotificationPanel}
              onTabChange={setNotificationPanelTab}
              onDeleteAllRead={handleDeleteAllReadNotifications}
              onMarkAllRead={() => markNotificationIdsAsRead(unreadNotifications.map((n) => n.id))}
              onDeleteNotification={handleDeleteNotification}
              onOpenNotification={handleOpenNotification}
            />
          </div>
        </header>

        {page === PAGE_BOARD || page === PAGE_ADMIN ? <TablerosCreados contexto={paginasContexto} /> : null}
        {page === PAGE_CUSTOM_BOARDS ? <MisTableros contexto={paginasContexto} /> : null}
        {page === PAGE_DASHBOARD ? <PanelIndicadores contexto={paginasContexto} /> : null}
        {page === PAGE_DASHBOARD_BUILDER ? <DashboardBuilder contexto={paginasContexto} /> : null}
        {page === PAGE_HISTORY ? <HistorialSemanas contexto={paginasContexto} /> : null}
        {page === PAGE_PROCESS_AUDITS ? <AuditoriasProcesos contexto={paginasContexto} /> : null}
        {page === PAGE_INVENTORY ? <GestionInventario contexto={paginasContexto} /> : null}
        {page === PAGE_TRANSPORT ? <GestionTransporte contexto={paginasContexto} /> : null}
        {page === PAGE_USERS ? <GestionUsuarios contexto={paginasContexto} /> : null}
        {page === PAGE_BIBLIOTECA ? <BibliotecaPage currentUser={currentUser} canUpload={actionPermissions.uploadBiblioteca} canRenameName={actionPermissions.editBibliotecaName} canDelete={actionPermissions.deleteBiblioteca} /> : null}
        {page === PAGE_INCIDENCIAS ? <GestionIncidencias contexto={paginasContexto} /> : null}
        {page === PAGE_SYSTEM_SETTINGS ? <ConfiguracionSistema contexto={paginasContexto} /> : null}
        {page === PAGE_NOT_FOUND ? <PaginaNoEncontrada contexto={paginasContexto} /> : null}
      </section>

      <Modal open={pauseState.open} title="Actividad en pausa" confirmLabel={pauseState.completed ? (pauseState.continueReady ? "Continuar" : "Espera un momento...") : "Confirmar pausa"} cancelLabel="Cancelar" hideCancel={pauseState.completed} confirmDisabled={pauseState.completed && !pauseState.continueReady} onClose={() => { if (pauseContinueTimerRef.current) clearTimeout(pauseContinueTimerRef.current); setPauseState({ open: false, activityId: null, reason: "", customReason: "", error: "", completed: false, continueReady: false, pauseLogId: null }); }} onConfirm={handleConfirmPause}>
        <div className="modal-form-grid">
          {pauseState.completed ? (
            <>
              <p className="validation-text success">Continuemos. La pausa de la actividad quedó registrada correctamente.</p>
              <p className="modal-footnote">{pauseState.continueReady ? "Cuando pulses continuar la actividad se reanudará." : "El botón Continuar se habilitará en unos segundos..."}</p>
            </>
          ) : (
            <>
              <label className="app-modal-field">
                <span>Motivo de pausa</span>
                <select value={pauseState.reason} onChange={(event) => setPauseState((current) => ({ ...current, reason: event.target.value, error: "" }))}>
                  {pauseReasonOptions.map((optionLabel) => <option key={optionLabel} value={optionLabel}>{optionLabel}</option>)}
                  <option value={CUSTOM_PAUSE_REASON_VALUE}>Otro (especificar)</option>
                </select>
              </label>
              {pauseState.reason === CUSTOM_PAUSE_REASON_VALUE ? (
                <label className="app-modal-field">
                  <span>Otro motivo</span>
                  <input value={pauseState.customReason} onChange={(event) => setPauseState((current) => ({ ...current, customReason: event.target.value, error: "" }))} placeholder="Especifica el motivo" />
                </label>
              ) : null}
              {pauseState.error ? <p className="validation-text">{pauseState.error}</p> : null}
            </>
          )}
        </div>
      </Modal>

      <Modal open={boardPauseState.open} title="Pausar fila" confirmLabel={boardPauseState.completed ? (boardPauseState.continueReady ? "Continuar" : "Espera un momento...") : "Confirmar pausa"} cancelLabel="Cancelar" hideCancel={boardPauseState.completed} confirmDisabled={boardPauseState.completed && !boardPauseState.continueReady} onClose={() => { if (boardPauseContinueTimerRef.current) clearTimeout(boardPauseContinueTimerRef.current); setBoardPauseState({ open: false, boardId: null, rowId: null, reason: "", customReason: "", error: "", completed: false, continueReady: false, authorizedPauseSeconds: 0, pauseStartedAtMs: 0 }); }} onConfirm={handleConfirmBoardPause} className="board-pause-reason-modal">
        <div className="modal-form-grid">
          {boardPauseState.completed ? (
            <>
              <p className="validation-text success">Continuemos. La fila quedó pausada y el motivo se guardó correctamente.</p>
              <p className="modal-footnote">{boardPauseState.continueReady ? "Pulsa continuar para reanudar la fila." : "El botón Continuar se habilitará en unos segundos..."}</p>
              {Number(boardPauseState.authorizedPauseSeconds || 0) > 0 ? (
                boardPauseIsOutOfTime ? (
                  <div className="board-pause-overtime-alert">
                    <span className="board-pause-overtime-icon" aria-hidden="true">⚠</span>
                    <div>
                      <strong>Tiempo de pausa excedido</strong>
                      <span>El tiempo autorizado se agotó. Reanuda la fila cuanto antes.</span>
                    </div>
                  </div>
                ) : (
                  <p className="modal-footnote">
                    {`Tiempo autorizado restante: ${formatDurationClock(boardPauseRemainingSeconds)}`}
                  </p>
                )
              ) : null}
            </>
          ) : (
            <>
              <label className="app-modal-field">
                <span>Motivo de pausa</span>
                <select value={boardPauseState.reason} onChange={(event) => setBoardPauseState((current) => ({ ...current, reason: event.target.value, error: "" }))}>
                  {pauseReasonOptions.map((optionLabel) => <option key={optionLabel} value={optionLabel}>{optionLabel}</option>)}
                  <option value={CUSTOM_PAUSE_REASON_VALUE}>Otro (especificar)</option>
                </select>
              </label>
              {boardPauseState.reason === CUSTOM_PAUSE_REASON_VALUE ? (
                <label className="app-modal-field">
                  <span>Otro motivo</span>
                  <input value={boardPauseState.customReason} onChange={(event) => setBoardPauseState((current) => ({ ...current, customReason: event.target.value, error: "" }))} placeholder="Especifica el motivo" />
                </label>
              ) : null}
              {boardPauseState.error ? <p className="validation-text">{boardPauseState.error}</p> : null}
            </>
          )}
        </div>
      </Modal>

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

      <Modal className="modal-wide catalog-activity-modal" open={catalogModal.open} title={catalogModal.mode === "create" ? "Nueva actividad" : "Editar actividad"} confirmLabel={catalogModal.mode === "create" ? "Guardar" : "Guardar cambios"} cancelLabel="Cancelar" onClose={() => setCatalogModal(createEmptyCatalogModalState())} onConfirm={submitCatalogModal} confirmDisabled={catalogModal.submitting}>
        <div className="modal-form-grid catalog-activity-modal-grid">
          <label className="app-modal-field">
            <span>Area propietaria</span>
            <select value={catalogModal.area} onChange={(event) => setCatalogModal((current) => ({ ...current, area: event.target.value }))}>
              {catalogAreaOptions.map((areaOption) => <option key={areaOption} value={areaOption}>{areaOption}</option>)}
            </select>
          </label>
          <label className="app-modal-field">
            <span>Lista de actividades</span>
            <input value={catalogModal.category} onChange={(event) => setCatalogModal((current) => ({ ...current, category: event.target.value }))} placeholder="Ej: Limpieza, Seguridad, Producción" />
          </label>
          <label className="app-modal-field">
            <span>Nombre de la actividad</span>
            <input value={catalogModal.name} onChange={(event) => setCatalogModal((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="app-modal-field catalog-activity-limit-field">
            <span>Tiempo límite (minutos)</span>
            <input type="number" value={catalogModal.limit} onChange={(event) => setCatalogModal((current) => ({ ...current, limit: event.target.value }))} />
          </label>
          <label className="app-modal-field">
            <span>Tipo</span>
            <select value={catalogModal.mandatory} onChange={(event) => setCatalogModal((current) => ({ ...current, mandatory: event.target.value }))}>
              <option value="true">Obligatoria</option>
              <option value="false">Ocasional</option>
            </select>
          </label>
          <label className="app-modal-field catalog-activity-chip-field">
            <span>Alcance de naves</span>
            <div className="catalog-activity-chip-row">
              <button
                type="button"
                className={`catalog-site-chip ${catalogModal.siteMode !== "bySite" ? "active" : ""}`.trim()}
                onClick={() => setCatalogModal((current) => ({
                  ...current,
                  siteMode: "general",
                  cleaningSites: [],
                  scheduledDaysBySite: {},
                }))}
              >
                General (todas)
              </button>
              <button
                type="button"
                className={`catalog-site-chip ${catalogModal.siteMode === "bySite" ? "active" : ""}`.trim()}
                onClick={() => setCatalogModal((current) => ({
                  ...current,
                  siteMode: "bySite",
                }))}
              >
                Por nave
              </button>
            </div>
          </label>
          <label className="app-modal-field catalog-activity-chip-field">
            <span>Naves {catalogModal.siteMode === "bySite" ? "(seleccion obligatoria)" : "(no aplica en general)"}</span>
            <div className="catalog-activity-chip-row">
              {CLEANING_SITE_OPTIONS.map((site) => {
                const siteValue = String(site.value || "").trim().toUpperCase();
                const isActive = (catalogModal.cleaningSites || []).includes(siteValue);
                const isDisabled = catalogModal.siteMode !== "bySite";
                return (
                  <button
                    key={siteValue}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setCatalogModal((current) => {
                      if (current.siteMode !== "bySite") return current;
                      const currentSites = normalizeCatalogCleaningSites(current.cleaningSites);
                      const hasSite = currentSites.includes(siteValue);
                      const nextSites = hasSite
                        ? currentSites.filter((entry) => entry !== siteValue)
                        : currentSites.concat([siteValue]).sort();
                      const nextBySite = { ...(current.scheduledDaysBySite || {}) };
                      if (hasSite) {
                        delete nextBySite[siteValue];
                      } else {
                        nextBySite[siteValue] = normalizeCatalogScheduledDays(current.scheduledDays, current.frequency);
                      }
                      return { ...current, cleaningSites: nextSites, scheduledDaysBySite: nextBySite };
                    })}
                    className={`catalog-site-chip ${isActive ? "active" : ""}`.trim()}
                  >
                    {site.label}
                  </button>
                );
              })}
            </div>
          </label>
          <label className="app-modal-field catalog-activity-chip-field">
            <span>Dias por nave</span>
            <div className="modal-form-grid catalog-days-by-site-grid">
              {catalogModal.siteMode !== "bySite" ? (
                <p className="modal-footnote">Esta actividad queda en modo general. Si hay incidencia, la nave se podra elegir al reportarla.</p>
              ) : (catalogModal.cleaningSites || []).length ? (catalogModal.cleaningSites || []).map((siteValue) => {
                const siteLabel = CLEANING_SITE_OPTIONS.find((site) => String(site.value || "").trim().toUpperCase() === siteValue)?.label || siteValue;
                const siteDays = normalizeCatalogScheduledDaysBySite(catalogModal.scheduledDaysBySite, normalizeCatalogScheduledDays(catalogModal.scheduledDays, catalogModal.frequency))[siteValue]
                  || normalizeCatalogScheduledDays(catalogModal.scheduledDays, catalogModal.frequency);
                return (
                  <div key={siteValue} className="app-modal-field">
                    <span>{siteLabel}</span>
                    <div className="catalog-activity-chip-row">
                      {CATALOG_WEEKDAY_OPTIONS.map((option) => {
                        const isActive = siteDays.includes(option.value);
                        return (
                          <button
                            key={`${siteValue}-${option.value}`}
                            type="button"
                            onClick={() => setCatalogModal((current) => {
                              const fallbackDays = normalizeCatalogScheduledDays(current.scheduledDays, current.frequency);
                              const bySite = normalizeCatalogScheduledDaysBySite(current.scheduledDaysBySite, fallbackDays);
                              const currentDays = bySite[siteValue] || fallbackDays;
                              const hasDay = currentDays.includes(option.value);
                              const nextDays = hasDay
                                ? currentDays.filter((day) => day !== option.value)
                                : currentDays.concat([option.value]).sort((a, b) => a - b);
                              return {
                                ...current,
                                scheduledDaysBySite: {
                                  ...bySite,
                                  [siteValue]: nextDays,
                                },
                              };
                            })}
                            className={`catalog-day-chip ${isActive ? "active" : ""}`.trim()}
                            title={option.label}
                          >
                            {option.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }) : <p className="modal-footnote">Selecciona una o mas naves para configurar dias especificos por nave.</p>}
            </div>
          </label>
        </div>
      </Modal>

      <Modal open={areaModal.open} backdropClassName="area-modal-backdrop" title={areaModal.parentArea ? "Agregar subárea" : "Agregar área"} confirmLabel={areaModal.parentArea ? "Guardar subárea" : "Guardar área"} cancelLabel="Cancelar" onClose={() => setAreaModal({ open: false, target: "user", name: "", parentArea: "", error: "" })} onConfirm={confirmAddArea}>
        <div className="modal-form-grid">
          {areaModal.parentArea ? (
            <label className="app-modal-field">
              <span>Área padre</span>
              <input value={areaModal.parentArea} readOnly />
            </label>
          ) : null}
          <label className="app-modal-field">
            <span>{areaModal.parentArea ? "Nombre de la subárea" : "Nombre del área"}</span>
            <input value={areaModal.name} onChange={(event) => setAreaModal((current) => ({ ...current, name: event.target.value, error: "" }))} placeholder={areaModal.parentArea ? "Ej: TURNO MAÑANA" : "Ej: LOGISTICA"} />
          </label>
          {areaModal.error ? <p className="validation-text">{areaModal.error}</p> : null}
          <p className="modal-footnote">{areaModal.parentArea ? `La nueva subárea se creará bajo ${areaModal.parentArea}.` : "La nueva área se agregará al catálogo y se seleccionará automáticamente."}</p>
        </div>
      </Modal>

      <Modal
        open={areaDeleteModal.open}
        title="Eliminar área"
        confirmLabel={areaDeleteModal.submitting ? "Eliminando..." : "Eliminar"}
        cancelLabel="Cancelar"
        onClose={() => setAreaDeleteModal({ open: false, areaName: "", label: "", error: "", submitting: false })}
        onConfirm={confirmDeleteArea}
        confirmDisabled={areaDeleteModal.submitting || !areaDeleteModal.areaName}
      >
        <div className="modal-form-grid">
          <p>Vas a eliminar {areaDeleteModal.label || "esta área"}.</p>
          <p className="modal-footnote">Si es subárea, los players migran al área raíz. Si es área raíz, se limpia el área de los players asignados.</p>
          {areaDeleteModal.error ? <p className="validation-text">{areaDeleteModal.error}</p> : null}
        </div>
      </Modal>

      <Modal open={Boolean(editWeekId)} title="Editar semana" confirmLabel="Cerrar" hideCancel onClose={() => { setEditWeekId(null); setEditWeekActivityId(""); }}>
        <div className="modal-form-grid">
          <label className="app-modal-field">
            <span>Seleccionar actividad del catálogo</span>
            <select value={editWeekActivityId} onChange={(event) => setEditWeekActivityId(event.target.value)}>
              <option value="">Seleccionar...</option>
              {state.catalog.filter((item) => !item.isDeleted).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <button type="button" className="primary-button" onClick={addActivityToWeek}><Plus size={16} /> Agregar a semana</button>
          <div className="week-activity-list">
            {state.activities.filter((activity) => activity.weekId === editWeekId).map((activity) => (
              <div key={activity.id} className="week-activity-item">
                <div>
                  <strong>{getActivityLabel(activity, catalogMap)}</strong>
                  <span>{activity.status}</span>
                </div>
                {actionPermissions.deleteWeekActivity ? <button type="button" className="icon-button danger" onClick={() => removeWeekActivity(activity.id)}><Trash2 size={15} /> Quitar</button> : null}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={userModal.open} className="user-management-modal" title={userModal.mode === "create" ? "Crear nuevo player" : "Editar player"} confirmLabel={userModal.mode === "create" ? "Guardar player" : "Guardar cambios"} cancelLabel="Cancelar" onClose={closeUserModal} onConfirm={submitUserModal} confirmDisabled={userModal.submitting}>
        <div className="modal-form-grid">
          {userModalMessage.text ? (
            <p className={`validation-text ${userModalMessage.tone === "success" ? "success" : ""}`.trim()} style={{ margin: 0 }}>
              {userModalMessage.text}
            </p>
          ) : null}
          <div className="user-modal-grid">
            <label className="app-modal-field">
              <span>Nombre completo</span>
              <input value={userModal.name} onChange={(event) => setUserModal((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="app-modal-field">
              <span>Player de acceso</span>
              <input value={userModal.username} onChange={(event) => setUserModal((current) => ({ ...current, username: event.target.value }))} placeholder="Ej: alejandro.cruz" />
            </label>
            <label className="app-modal-field">
              <span>Área</span>
              <div className="area-selector-row">
                <select value={userModal.area} onChange={(event) => setUserModal((current) => ({ ...current, area: event.target.value, subArea: "" }))}>
                  <option value="">Seleccionar área...</option>
                  {(currentUser?.role === ROLE_LEAD ? rootAreaOptions : Array.from(new Set(userAreaOptions.map((a) => getAreaRoot(a) || a))).filter(Boolean)).map((area) => <option key={area} value={area}>{area}</option>)}
                </select>
                {currentUser?.role === ROLE_LEAD ? <button type="button" className="icon-button area-add-button" onClick={() => handleAddAreaOption()} aria-label="Agregar nueva área"><Plus size={16} /></button> : null}
                {currentUser?.role === ROLE_LEAD && userModal.area ? (
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => openDeleteAreaModal(userModal.area, `área ${userModal.area}`)}
                    aria-label="Eliminar área seleccionada"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </div>
            </label>
            {userModal.area ? (
              <label className="app-modal-field">
                <span>Subárea <small style={{ fontWeight: 400, opacity: 0.65 }}>(opcional)</small></span>
                <div className="area-selector-row">
                  <select value={userModal.subArea} onChange={(event) => setUserModal((current) => ({ ...current, subArea: event.target.value }))}>
                    <option value="">Sin subárea</option>
                    {getSubAreaOptions(userModal.area).map((sub) => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                  {currentUser?.role === ROLE_LEAD ? <button type="button" className="icon-button area-add-button" onClick={() => handleAddAreaOption(userModal.area)} aria-label="Agregar nueva subárea"><Plus size={16} /></button> : null}
                  {currentUser?.role === ROLE_LEAD && userModal.subArea ? (
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => openDeleteAreaModal(joinAreaAndSubArea(userModal.area, userModal.subArea), `subárea ${userModal.subArea}`)}
                      aria-label="Eliminar subárea seleccionada"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </div>
              </label>
            ) : null}
            <label className="app-modal-field">
              <span>Cargo</span>
              <input value={userModal.jobTitle} onChange={(event) => setUserModal((current) => ({ ...current, jobTitle: event.target.value }))} placeholder="Ej: Encargado de Mejora Continua" />
            </label>
            <label className="app-modal-field">
              <span>Rol interno</span>
              <select value={userModal.role} onChange={(event) => updateUserModalRole(event.target.value)}>
                {userModalRoleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label className="app-modal-field">
              <span>Referencia</span>
              <select value={userModal.managerId} onChange={(event) => setUserModal((current) => ({ ...current, managerId: event.target.value }))}>
                <option value="">Seleccionar...</option>
                {activeAssignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
            {userModal.mode === "create" ? (
              <label className="app-modal-field">
                <span>Contraseña temporal</span>
                <div className="password-visibility-field">
                  <input
                    type={showUserModalPassword ? "text" : "password"}
                    value={userModal.password}
                    onChange={(event) => setUserModal((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Mínimo 4 caracteres"
                  />
                  <button
                    type="button"
                    className="password-visibility-toggle"
                    aria-label={showUserModalPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setShowUserModalPassword((current) => !current)}
                  >
                    {showUserModalPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            ) : null}
            <fieldset className="app-modal-field user-status-switch-field">
              <legend>Estado inicial</legend>
              <div className="user-status-switch-row">
                <button
                  type="button"
                  className={`switch-button ${userModal.isActive === "true" ? "on" : ""}`}
                  onClick={() => setUserModal((current) => ({ ...current, isActive: current.isActive === "true" ? "false" : "true" }))}
                  aria-pressed={userModal.isActive === "true"}
                  aria-label="Cambiar estado inicial del player"
                >
                  <span className="switch-thumb" />
                </button>
                <strong>{userModal.isActive === "true" ? "Activo" : "Inactivo"}</strong>
              </div>
            </fieldset>
          </div>

          {(userModal.mode === "create" ? actionPermissions.createUsers : actionPermissions.editUsers) && supportsManagedPermissionOverrides(userModal.role) ? (
            <section className="user-modal-permissions">
              <div className="builder-section-head">
                <div>
                  <h4>Permisos del menú lateral</h4>
                  <p>Un único mapeo 1:1 con el menú lateral: sección y pestañas por cada área o grupo.</p>
                </div>
                <span className="chip primary">{menuPermissionSections.length} secciones</span>
              </div>

              <div className="permissions-accordion-list user-modal-permission-list">
                {menuPermissionSections.map((section) => {
                  const sectionPanelId = `area-${section.id}`;
                  const isOpen = userModal.permissionPageId === sectionPanelId;
                  const navEnabled = section.navVisibilityKind === "pages"
                    ? Boolean(userModal.permissionOverrides.pages?.[section.navVisibilityActionId])
                    : Boolean(userModal.permissionOverrides.actions?.[section.navVisibilityActionId]);
                  const enabledTabCount = section.itemPermissions.filter((tab) => {
                    return tab.kind === "pages"
                      ? Boolean(userModal.permissionOverrides.pages?.[tab.id])
                      : Boolean(userModal.permissionOverrides.actions?.[tab.id]);
                  }).length;
                  return (
                    <article key={section.id} className={`permission-accordion-card ${isOpen ? "open" : ""}`}>
                      <button type="button" className="permission-accordion-toggle" onClick={() => toggleUserModalPermissionSection(sectionPanelId)}>
                        <div>
                          <strong>{section.label}</strong>
                          <span>{`${navEnabled ? "Acceso lateral activo" : "Acceso lateral bloqueado"} · ${enabledTabCount}/${section.itemPermissions.length} pestañas/items activos`}</span>
                        </div>
                        <span className="chip">{isOpen ? "Abierto" : "Abrir"}</span>
                      </button>

                      {isOpen ? (
                        <div className="permission-accordion-body user-modal-permission-body">
                          <div className="permission-switch-row permission-switch-row-primary permission-switch-row-toned" style={{ "--permission-accent": "#355f88", "--permission-soft": "rgba(15, 118, 110, 0.1)" }}>
                            <div>
                              <strong>Ver sección lateral</strong>
                              <span>{canGrantManagedPermission(section.navVisibilityKind, section.navVisibilityActionId) ? `Permite mostrar ${section.label} en la barra lateral.` : "No puedes delegar esta sección lateral porque tú no la tienes activa."}</span>
                            </div>
                            <button
                              type="button"
                              disabled={!canGrantManagedPermission(section.navVisibilityKind, section.navVisibilityActionId)}
                              className={`switch-button ${navEnabled ? "on" : ""}`}
                              onClick={() => toggleUserModalPermission(section.navVisibilityKind, section.navVisibilityActionId)}
                              aria-pressed={navEnabled}
                            >
                              <span className="switch-thumb" />
                            </button>
                          </div>

                          <div className="permission-group-stack">
                            <section className="permission-group-block">
                              <div className="permission-group-head" style={{ "--permission-group-accent": "#334155" }}>
                                <strong>Pestañas del área</strong>
                                <span>{section.itemPermissions.length} permiso(s)</span>
                              </div>
                              <div className="permission-switch-list permission-tab-grid">
                                {section.itemPermissions.map((tab) => {
                                  const tabPanelId = `${section.id}::${tab.id}`;
                                  const isTabExpanded = expandedPermissionTabs.includes(tabPanelId);
                                  const enabled = tab.kind === "pages"
                                    ? Boolean(userModal.permissionOverrides.pages?.[tab.id])
                                    : Boolean(userModal.permissionOverrides.actions?.[tab.id]);
                                  const delegable = canGrantManagedPermission(tab.kind, tab.id);
                                  const nestedActions = tab.actionPermissions || [];
                                  return (
                                    <div key={tab.id} className="permission-switch-row permission-switch-row-toned permission-tab-card" style={{ "--permission-accent": "#475569", "--permission-soft": "rgba(71, 85, 105, 0.1)" }}>
                                      <div className="permission-tab-header">
                                        <div className="permission-tab-copy">
                                          <strong>{tab.label}</strong>
                                          <span>{delegable ? "Habilita la pestaña y sus acciones operativas dentro de esta área." : "No delegable"}</span>
                                        </div>
                                        <div className="permission-tab-actions">
                                          {nestedActions.length ? (
                                            <button
                                              type="button"
                                              className={`permission-tab-collapse-toggle ${isTabExpanded ? "open" : ""}`}
                                              onClick={() => toggleUserModalPermissionTab(tabPanelId)}
                                              aria-expanded={isTabExpanded}
                                            >
                                              {isTabExpanded ? "Ocultar acciones" : `Ver acciones (${nestedActions.length})`}
                                            </button>
                                          ) : null}
                                          <button
                                            type="button"
                                            disabled={!delegable}
                                            className={`switch-button ${enabled ? "on" : ""}`}
                                            onClick={() => toggleUserModalPermission(tab.kind, tab.id)}
                                            aria-pressed={enabled}
                                          >
                                            <span className="switch-thumb" />
                                          </button>
                                        </div>
                                      </div>
                                      {nestedActions.length && isTabExpanded ? (
                                        <div className="permission-subaction-list">
                                          {nestedActions.map((actionItem) => {
                                            const actionEnabled = Boolean(userModal.permissionOverrides.actions?.[actionItem.id]);
                                            const actionDelegable = canGrantManagedPermission("actions", actionItem.id);
                                            return (
                                              <div key={actionItem.id} className="permission-switch-row permission-subaction-row" style={{ "--permission-accent": "#64748b", "--permission-soft": "rgba(100, 116, 139, 0.08)" }}>
                                                <div className="permission-subaction-copy">
                                                  <strong>{actionItem.label}</strong>
                                                  <span>{actionDelegable ? "Permiso puntual dentro de esta pestaña." : "No delegable"}</span>
                                                </div>
                                                <button
                                                  type="button"
                                                  disabled={!actionDelegable}
                                                  className={`switch-button ${actionEnabled ? "on" : ""}`}
                                                  onClick={() => toggleUserModalPermission("actions", actionItem.id)}
                                                  aria-pressed={actionEnabled}
                                                >
                                                  <span className="switch-thumb" />
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </section>
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {userModal.mode === "edit" && canResetOtherPasswords && userModal.id && userModal.id !== currentUser?.id ? (
            <div className="user-modal-inline-actions">
              <button
                type="button"
                className="user-row-button"
                onClick={() => {
                  const targetUser = state.users.find((user) => user.id === userModal.id);
                  if (targetUser) openResetUserPassword(targetUser);
                }}
                disabled={!actionPermissions.resetPasswords}
              >
                <RotateCcw size={15} /> Restablecer clave
              </button>
            </div>
          ) : null}

          {isRootLead && userModal.mode === "edit" && userModal.id === currentUser?.id ? (
            <section className="user-modal-demo-section">
              <div className="builder-section-head">
                <div>
                  <h4>Modo Demo del sistema</h4>
                  <p>Activa el modo demo para hacer demostraciones o pruebas. Cuando lo desactives, todos los cambios realizados durante la demo se revertirán automáticamente.</p>
                </div>
                {isDemoMode ? <span className="chip" style={{ background: "#fef3c7", color: "#92400e" }}>Activo</span> : <span className="chip">Inactivo</span>}
              </div>
              <div className="user-modal-demo-actions">
                {isDemoMode ? (
                  <button type="button" className="user-row-button danger" onClick={deactivateDemoMode}>
                    <RotateCcw size={15} /> Desactivar y revertir cambios
                  </button>
                ) : (
                  <button type="button" className="user-row-button" onClick={activateDemoMode}>
                    ⚙ Activar Modo Demo
                  </button>
                )}
              </div>
            </section>
          ) : null}

          {shouldShowUserPermissionNote && (
            <article className="user-permission-note">
              <strong>{userModal.role === ROLE_SSR ? "Semi-Senior con alcance operativo" : "Acceso operativo por tablero"}</strong>
              <p>{userModal.role === ROLE_SSR ? "Semi-Senior solo puede crear perfiles Junior y trabajar con los tableros que tenga asignados." : "Junior solo accede a Mis tableros y verá únicamente los tableros que tenga asignados."}</p>
            </article>
          )}
        </div>
      </Modal>

      <Modal open={templateEditorModal.open} title="Editar plantilla guardada" confirmLabel="Guardar cambios" cancelLabel="Cancelar" onClose={() => setTemplateEditorModal({ open: false, id: null, name: "", description: "", category: "", visibilityType: "department", sharedDepartments: [], sharedUserIds: [], submitting: false })} onConfirm={submitBoardTemplateEdit} confirmDisabled={templateEditorModal.submitting}>
        <div className="modal-form-grid">
          <label className="app-modal-field">
            <span>Nombre de plantilla</span>
            <input value={templateEditorModal.name} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="app-modal-field">
            <span>Categoría</span>
            <input value={templateEditorModal.category} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, category: event.target.value }))} placeholder="Ej: Embarques, Calidad, Producción" />
          </label>
          <label className="app-modal-field">
            <span>Compartir con</span>
            <select value={templateEditorModal.visibilityType} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, visibilityType: event.target.value }))}>
              <option value="department">Departamento</option>
                        <option value="users">Players específicos</option>
              <option value="all">Todos</option>
            </select>
          </label>
          {templateEditorModal.visibilityType === "department" ? (
            <label className="app-modal-field">
              <span>Departamentos con acceso</span>
              <select multiple value={templateEditorModal.sharedDepartments} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, sharedDepartments: Array.from(event.target.selectedOptions).map((option) => option.value) }))}>
                {departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
          ) : null}
          {templateEditorModal.visibilityType === "users" ? (
            <label className="app-modal-field">
                        <span>Players con acceso</span>
              <select multiple value={templateEditorModal.sharedUserIds} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, sharedUserIds: Array.from(event.target.selectedOptions).map((option) => option.value) }))}>
                {activeAssignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
              </select>
            </label>
          ) : null}
          <label className="app-modal-field">
            <span>Descripción</span>
            <input value={templateEditorModal.description} onChange={(event) => setTemplateEditorModal((current) => ({ ...current, description: event.target.value }))} placeholder="Explica para qué sirve esta plantilla" />
          </label>
        </div>
      </Modal>

      <Modal
        open={templateDeleteModal.open}
        backdropClassName="template-delete-backdrop"
        title="Eliminar plantilla"
        confirmLabel="Eliminar plantilla"
        cancelLabel="Cancelar"
        onClose={() => setTemplateDeleteModal({ open: false, id: null, name: "" })}
        onConfirm={confirmDeleteBoardTemplate}
      >
        <div className="modal-form-grid">
          <p className="subtle-line">Esta acción eliminará la plantilla guardada para todos los usuarios con acceso.</p>
          <p><strong>{templateDeleteModal.name || "Plantilla"}</strong></p>
          <p className="validation-text">No se puede deshacer.</p>
        </div>
      </Modal>

      <BoardBuilderModal
        open={boardBuilderModal.open}
        mode={boardBuilderModal.mode}
        selectedAreaSectionId={selectedAreaSectionId}
        selectedAreaSection={selectedAreaSection}
        draft={controlBoardDraft}
        onChange={setControlBoardDraft}
        onClose={closeBoardBuilderModal}
        onConfirm={saveControlBoard}
        confirmDisabled={isBoardSaveSubmitting}
        confirmLabel={isBoardSaveSubmitting ? (boardBuilderModal.mode === "edit" ? "Guardando cambios..." : "Creando tablero...") : undefined}
        onOpenComponentStudio={openComponentStudio}
        onImportFromExcel={openBoardExcelImportPicker}
        onSaveTemplate={actionPermissions.saveTemplate ? saveDraftAsBoardTemplate : null}
        onClear={clearControlBoardDraft}
        feedback={controlBoardFeedback}
        templateSearch={templateSearch}
        onTemplateSearchChange={setTemplateSearch}
        templateCategoryFilter={templateCategoryFilter}
        onTemplateCategoryChange={setTemplateCategoryFilter}
        templateCategories={templateCategories}
        filteredBoardTemplates={filteredBoardTemplates}
        onPreviewTemplate={previewBoardTemplate}
        onApplyTemplate={applyBoardTemplate}
        onDeleteTemplate={openDeleteBoardTemplateModal}
        canDeleteTemplate={canDeleteBoardTemplateEntry}
        selectedPreviewTemplate={selectedPreviewTemplate}
        onClearTemplatePreview={() => setTemplatePreviewId(null)}
        previewBoard={boardBuilderPreview}
        draftColumnGroups={draftColumnGroups}
        onMoveDraftColumn={moveDraftColumn}
        onReorderDraftColumn={reorderDraftColumn}
        onDuplicateDraftColumn={duplicateDraftColumn}
        onEditDraftColumn={editDraftColumn}
        onRemoveDraftColumn={removeDraftColumn}
        visibleUsers={visibleUsers}
        catalog={state.catalog}
        departmentOptions={departmentOptions}
        currentUser={currentUser}
        userMap={userMap}
        inventoryItems={state.inventoryItems}
        contextoConstructor={contextoConstructor}
        boardOperationalContextOptions={BOARD_OPERATIONAL_CONTEXT_OPTIONS}
        canSaveTemplate={actionPermissions.saveTemplate}
        canSaveBoard={actionPermissions.createBoard || actionPermissions.editBoard}
      />

      <input
        ref={boardExcelFileInputRef}
        type="file"
        accept=".xlsx"
        hidden
        onChange={importBoardStructureFromExcel}
      />

      <BoardComponentStudioModal open={componentStudioOpen} mode={editingDraftColumnId ? "edit" : "create"} draft={controlBoardDraft} onChange={setControlBoardDraft} onClose={() => { setComponentStudioOpen(false); setEditingDraftColumnId(null); setControlBoardDraft((current) => ({ ...current, ...createEmptyFieldDraft() })); }} onConfirm={addDraftColumn} catalog={state.catalog} inventoryItems={state.inventoryItems} visibleUsers={visibleUsers} sectionOptions={boardSectionOptions} activityCategoryOptions={activityCatalogCategoryOptions} contextoConstructor={contextoConstructor} />

      <Modal open={excelFormulaWizard.open} title="Asistente de fórmulas de Excel" confirmLabel="Aplicar mapeo" cancelLabel="Cerrar" onClose={() => setExcelFormulaWizard({ open: false, items: [] })} onConfirm={applyExcelFormulaWizard}>
        <div className="modal-form-grid">
          <p className="modal-footnote">Estas columnas tenían fórmulas que no se pudieron convertir automáticamente. Elige cómo debe comportarse cada campo en el tablero.</p>
          {(excelFormulaWizard.items || []).map((item, index) => (
            <section key={`${item.targetFieldId || item.targetLabel}-${index}`} className="surface-card" style={{ padding: "0.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                <strong>{item.targetLabel}</strong>
                {item.fromMemory ? (
                  <span style={{ fontSize: "0.7rem", background: "#314d69", color: "#ffffff", borderRadius: "999px", padding: "0.1rem 0.55rem", fontWeight: 600 }}>Desde memoria</span>
                ) : item.fromClassification ? (
                  <span style={{ fontSize: "0.7rem", background: "#1d4ed8", color: "#ffffff", borderRadius: "999px", padding: "0.1rem 0.55rem", fontWeight: 600 }}>Auto-detectado</span>
                ) : null}
                {item.classification?.label ? (
                  <span style={{ fontSize: "0.7rem", background: "#f3f4f6", color: "#374151", borderRadius: "999px", padding: "0.1rem 0.55rem" }}>{item.classification.label}</span>
                ) : null}
                <button
                  type="button"
                  className="icon-button danger"
                  style={{ marginLeft: "auto", fontSize: "0.75rem" }}
                  onClick={() => removeExcelFormulaWizardItem(index)}
                  title="Omitir este campo del asistente"
                >
                  <Trash2 size={13} /> Omitir
                </button>
              </div>
              {item.classification?.description ? (
                <p className="modal-footnote" style={{ marginBottom: "0.35rem", color: "#374151" }}>{item.classification.description}</p>
              ) : null}
              <p className="modal-footnote" style={{ marginBottom: "0.5rem" }}>
                Fórmula original: <code style={{ fontSize: "0.78rem", background: "#f1f5f9", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>{item.formula}</code>
              </p>

              <label className="app-modal-field" style={{ marginBottom: "0.6rem" }}>
                <span>Convertir como</span>
                <select
                  value={item.targetType || "formula"}
                  onChange={(event) => updateExcelFormulaWizardItem(index, "targetType", event.target.value)}
                  style={{ fontWeight: 600 }}
                >
                  <option value="formula">Fórmula (operación entre campos)</option>
                  <option value="inventoryLookup">Buscador de inventario</option>
                  <option value="number">Número (valor estático)</option>
                  <option value="text">Texto (valor estático)</option>
                  <option value="select">Menú desplegable</option>
                </select>
              </label>

              {(item.targetType === "inventoryLookup") ? (
                <p className="modal-footnote" style={{ color: "#2c4b6b", background: "#dfe9f4", borderRadius: "8px", padding: "0.4rem 0.6rem" }}>
                  Este campo se configurará como Buscador de inventario. Los operadores podrán buscar y vincular artículos del inventario del sistema.
                </p>
              ) : (item.targetType === "text" || item.targetType === "number" || item.targetType === "select") ? (
                <p className="modal-footnote" style={{ color: "#92400e", background: "#fef3c7", borderRadius: "8px", padding: "0.4rem 0.6rem" }}>
                  El campo se importará como <strong>{item.targetType === "text" ? "Texto" : item.targetType === "number" ? "Número" : "Menú desplegable"}</strong> con los valores calculados por Excel.
                </p>
              ) : (
                <div className="modal-form-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                  <label className="app-modal-field">
                    <span>Operando izquierdo<span className="required-mark" aria-hidden="true"> *</span></span>
                    <select value={item.formulaLeftFieldId || ""} onChange={(event) => updateExcelFormulaWizardItem(index, "formulaLeftFieldId", event.target.value)}>
                      <option value="">Seleccionar...</option>
                      {(controlBoardDraft.columns || []).filter((field) => field.id !== item.targetFieldId).map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
                    </select>
                  </label>
                  <label className="app-modal-field">
                    <span>Operación<span className="required-mark" aria-hidden="true"> *</span></span>
                    <select value={item.operation || "add"} onChange={(event) => updateExcelFormulaWizardItem(index, "operation", event.target.value)}>
                      {FORMULA_OPERATIONS.map((operation) => <option key={operation.value} value={operation.value}>{operation.label}</option>)}
                    </select>
                  </label>
                  <label className="app-modal-field">
                    <span>Operando derecho<span className="required-mark" aria-hidden="true"> *</span></span>
                    <select value={item.formulaRightFieldId || ""} onChange={(event) => updateExcelFormulaWizardItem(index, "formulaRightFieldId", event.target.value)}>
                      <option value="">Seleccionar...</option>
                      {(controlBoardDraft.columns || []).filter((field) => field.id !== item.targetFieldId).map((field) => <option key={field.id} value={field.id}>{field.label}</option>)}
                    </select>
                  </label>
                </div>
              )}
            </section>
          ))}
        </div>
      </Modal>

      {currentUser ? (
        <AlertModalProvider>
          <ChatPro socket={socketRef.current} user={currentUser} connectCount={socketConnectCount} />
        </AlertModalProvider>
      ) : null}

      {profileModalOpen ? <EmployeeProfileModal currentUser={currentUser} passwordForm={passwordForm} onPasswordChange={setPasswordForm} onSubmit={submitPasswordReset} onUpdateIdentity={updateCurrentUserIdentity} currentTheme={uiTheme} themeOptions={UI_THEME_OPTIONS} onThemeChange={setUiTheme} currentFont={uiFont} fontOptions={UI_FONT_OPTIONS} onFontChange={setUiFont} currentFontSize={uiFontSize} fontSizeOptions={UI_FONT_SIZE_OPTIONS} onFontSizeChange={setUiFontSize} onClose={() => { setProfileModalOpen(false); setPasswordForm({ password: "", confirmPassword: "", message: "" }); }} onLogout={() => { setProfileModalOpen(false); setPasswordForm({ password: "", confirmPassword: "", message: "" }); handleLogout(); }} /> : null}

      <Modal
        open={excelSheetSelector.open}
        title={`Hojas en "${excelSheetSelector.fileName}"`}
        confirmLabel="Importar hoja seleccionada"
        cancelLabel="Cancelar"
        onClose={() => setExcelSheetSelector({ open: false, sheets: [], fileName: "" })}
        onConfirm={() => {
          const checked = excelSheetSelector.sheets.filter((s) => s._selected);
          if (!checked.length) return;
          setExcelSheetSelector({ open: false, sheets: [], fileName: "" });
          checked.forEach((sheet) => applyImportedSheet(sheet));
        }}
      >
        <div className="modal-form-grid">
          <p className="modal-footnote">
            Este archivo tiene <strong>{excelSheetSelector.sheets.length} hojas</strong>. Selecciona las que quieres importar. Cada hoja seleccionada reemplazará los componentes actuales del tablero (la última seleccionada quedará activa). Para crear tableros separados, importa una hoja a la vez.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {excelSheetSelector.sheets.map((sheet, idx) => (
              <button
                key={sheet.name}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "12px",
                  border: `2px solid ${sheet._selected ? "#314d69" : "#e5e7eb"}`,
                  background: sheet._selected ? "#f2f6fb" : "#ffffff",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "border-color 0.15s",
                }}
                onClick={() => setExcelSheetSelector((current) => ({
                  ...current,
                  sheets: current.sheets.map((s, i) => i === idx ? { ...s, _selected: !s._selected } : s),
                }))}
              >
                <span style={{
                  width: "20px", height: "20px", borderRadius: "4px", flexShrink: 0,
                  border: `2px solid ${sheet._selected ? "#314d69" : "#d1d5db"}`,
                  background: sheet._selected ? "#314d69" : "#ffffff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {sheet._selected ? <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: 700 }}>✓</span> : null}
                </span>
                <div>
                  <strong style={{ fontSize: "0.95rem" }}>{sheet.name}</strong>
                  <p style={{ margin: 0, fontSize: "0.77rem", color: "#6b7280" }}>
                    {sheet.columnCount} columnas · {sheet.rowCount} filas de datos
                    {(sheet.supportedFormulaCount || 0) > 0 ? ` · ${sheet.supportedFormulaCount} fórmula(s) detectada(s)` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {isForcedPasswordChange ? <ForcedPasswordChangeModal passwordForm={passwordForm} onPasswordChange={setPasswordForm} onSubmit={submitPasswordReset} /> : null}

      <Modal
        open={resetUserPasswordModal.open}
        title="Restablecer contraseña"
        confirmLabel="Guardar contraseña temporal"
        cancelLabel="Cancelar"
        onClose={() => {
          setShowResetUserPassword(false);
          setResetUserPasswordModal({ open: false, userId: null, userName: "", password: "", message: "", submitting: false });
        }}
        onConfirm={submitUserPasswordReset}
        confirmDisabled={resetUserPasswordModal.submitting}
      >
        <div className="modal-form-grid">
          <p className="modal-footnote">La sesión activa de {resetUserPasswordModal.userName || "este player"} se cerrará y en su siguiente acceso deberá capturar una contraseña nueva.</p>
          <label className="app-modal-field">
            <span>Contraseña temporal</span>
            <div className="password-visibility-field">
              <input
                type={showResetUserPassword ? "text" : "password"}
                value={resetUserPasswordModal.password}
                onChange={(event) => setResetUserPasswordModal((current) => ({ ...current, password: event.target.value, message: "" }))}
              />
              <button
                type="button"
                className="password-visibility-toggle"
                aria-label={showResetUserPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setShowResetUserPassword((current) => !current)}
              >
                {showResetUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {resetUserPasswordModal.message ? <p className="validation-text">{resetUserPasswordModal.message}</p> : null}
          <p className="modal-footnote">Solo Lead y Senior pueden restablecer la contraseña de otros players. La contraseña temporal puede tener desde {TEMPORARY_PASSWORD_MIN_LENGTH} caracteres.</p>
        </div>
      </Modal>

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

      <Modal open={Boolean(deleteUserId)} title="Eliminar player" confirmLabel="Eliminar player" cancelLabel="Cancelar" onClose={() => setDeleteUserId(null)} onConfirm={() => deleteUser(deleteUserId)}>
        <p>Esta acción no se puede deshacer.</p>
        <p>Se perderá el acceso y los registros del player quedarán sin responsabilidad asignada.</p>
      </Modal>

      <Modal open={Boolean(transferLeadTargetId)} title="Transferir rol de Lead" confirmLabel="Transferir Lead" cancelLabel="Cancelar" onClose={() => setTransferLeadTargetId(null)} onConfirm={() => transferLead(transferLeadTargetId)}>
        <p>El player <strong>{state.users?.find((u) => u.id === transferLeadTargetId)?.name || ""}</strong> pasará a ser Lead.</p>
        <p>Tu cuenta quedará como Senior. Esta acción no se puede deshacer desde aquí.</p>
      </Modal>

      <Modal open={Boolean(deleteInventoryId)} title="Eliminar artículo" confirmLabel="Eliminar artículo" cancelLabel="Cancelar" onClose={() => setDeleteInventoryId(null)} onConfirm={() => deleteInventoryItem(deleteInventoryId)}>
        <p>Esta acción quitará el artículo del inventario compartido.</p>
        <p>La información dejará de estar disponible para todos los dispositivos conectados.</p>
      </Modal>

      <Modal open={Boolean(deleteBoardId)} title="Eliminar tablero" confirmLabel="Eliminar tablero" cancelLabel="Cancelar" onClose={() => setDeleteBoardId(null)} onConfirm={() => deleteControlBoard(deleteBoardId)}>
        <p>Esta acción eliminará el tablero completo junto con sus filas guardadas.</p>
        <p>Úsalo cuando el tablero ya no se vaya a ocupar para que no quede abandonado.</p>
      </Modal>

      <Modal open={Boolean(historyPauseActivityId)} title="Pausas de la actividad" confirmLabel="Aceptar" cancelLabel="Cerrar" onClose={() => setHistoryPauseActivityId(null)}>
        <div className="modal-form-grid">
          {historyPauseLogs.length ? historyPauseLogs.map((log) => (
            <div key={log.id} className="week-activity-item pause-item">
              <div>
                <strong>{log.pauseReason}</strong>
                <span>Pausado: {formatDateTime(log.pausedAt)}</span>
                <span>Reanudado: {formatDateTime(log.resumedAt)}</span>
              </div>
              <strong>{formatDurationClock(log.pauseDurationSeconds)}</strong>
            </div>
          )) : <p>No hay pausas registradas para esta actividad.</p>}
        </div>
      </Modal>
      <CopmecAIWidget canUseAI={!!actionPermissions.useCopmecAI} isOpen={aiOpen} onClose={() => setAiOpen(false)} sidebarCollapsed={isSidebarCollapsed} />
    </main>
  );
}

export default App;
