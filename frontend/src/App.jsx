import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  X,
  Users,
  Zap,
} from "lucide-react";
import { Modal } from "./components/Modal";
const GestionInventario = lazy(() => import("./paginas/GestionInventario"));
const GestionTransporte = lazy(() => import("./paginas/GestionTransporte"));
const GestionIncidencias = lazy(() => import("./paginas/GestionIncidencias"));
const GestionUsuarios = lazy(() => import("./paginas/GestionUsuarios"));
const HistorialSemanas = lazy(() => import("./paginas/HistorialSemanas"));
const AuditoriasProcesos = lazy(() => import("./paginas/AuditoriasProcesosCompact"));
const MisTableros = lazy(() => import("./paginas/MisTableros"));
const ConfiguracionSistema = lazy(() => import("./paginas/ConfiguracionSistema"));
const PaginaNoEncontrada = lazy(() => import("./paginas/PaginaNoEncontrada"));
const GestionRetail = lazy(() => import("./paginas/GestionRetail"));
const PanelIndicadores = lazy(() => import("./paginas/PanelIndicadores"));
const TablerosCreados = lazy(() => import("./paginas/TablerosCreados"));
const BibliotecaPage = lazy(() => import("./paginas/BibliotecaPage"));
const CopmecAIWidget = lazy(() => import("./components/CopmecAIWidget"));

import "./App.css";
import "./app/sidebarNav.css";
import "./app/uiContrast.css";

const PageFallback = () => (
  <div className="page-fallback" style={{ padding: "2rem", textAlign: "center", color: "#475569" }}>
    Cargando contenido...
  </div>
);


// â”€â”€ Modulos extraidos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import {

  StatusBadge, MetricCard, InventoryStockBar, DashboardKpiCard, DashboardKpiBento, DashboardBarRow,

  DashboardRankItem, DashboardProgressMetric, DashboardParetoRow, DashboardCauseCard,

  DashboardSection, DashboardPieChart, DashboardColumnChart, DashboardLineChart,

  DashboardParetoChart, DashboardIshikawaDiagram, CopmecBrand, StatTile,

} from "./components/ComponentesDashboard";

import { LoginScreen, BootstrapLeadSetup } from "./components/ComponentesAutenticacion";

import { Sidebar } from "./components/BarraLateral";

import {

  EmployeeProfileSummarySection,

  EmployeeProfileDetailsSection,

  EmployeeProfilePasswordSection,

  EmployeeProfileMessages,

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
import { isDeprecatedDynamicArea } from "./config/deprecatedAreas.js";
import { isMobileShellActive } from "./app/mobileAppShell.js";

// â”€â”€ Constantes globales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import {

  STORAGE_KEY, SIDEBAR_COLLAPSED_KEY, ACTIVE_PAGE_KEY, DASHBOARD_SECTIONS_KEY,

  NOTIFICATION_READ_KEY, NOTIFICATION_DELETED_KEY, NOTIFICATION_INBOX_KEY,

  EMPTY_OBJECT, BOOTSTRAP_MASTER_ID, MASTER_USERNAME, API_BASE_URL,

  ENABLE_LEGACY_WHOLE_STATE_SYNC,

  PAGE_BOARD, PAGE_CUSTOM_BOARDS, PAGE_ADMIN, PAGE_DASHBOARD, PAGE_HISTORY, PAGE_PROCESS_AUDITS,

  PAGE_INVENTORY, PAGE_USERS, PAGE_BIBLIOTECA, PAGE_INCIDENCIAS, PAGE_NOT_FOUND, PAGE_AREA_SHELL,
  PAGE_TRANSPORT, PAGE_RETAIL,
  PAGE_SYSTEM_SETTINGS,

  PAGE_ROUTE_SLUGS, PAGE_ROUTE_ALIASES, EMPTY_LOGIN_DIRECTORY,

  ROLE_LEAD, ROLE_SR, ROLE_SSR, ROLE_JR,

  STATUS_PENDING, STATUS_RUNNING, STATUS_PAUSED, STATUS_FINISHED, CUSTOM_PAUSE_REASON_VALUE,

  INVENTORY_DOMAIN_BASE, INVENTORY_DOMAIN_CLEANING, INVENTORY_DOMAIN_ORDERS, INVENTORY_DOMAIN_MAINTENANCE, INVENTORY_DOMAIN_DESTINATIONS,

  INVENTORY_MOVEMENT_RESTOCK, INVENTORY_MOVEMENT_CONSUME, INVENTORY_MOVEMENT_TRANSFER,
  ORDER_INVENTORY_PRIMARY_WAREHOUSE,

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

import { EXTRA_SYSTEM_BOARD_TEMPLATES, PROTECTED_SYSTEM_BOARD_TEMPLATE_IDS } from "./utils/systemBoardTemplates.js";

// â”€â”€ Utilidades puras â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import {

  getInitialRouteState,

  getNormalizedBoardColumnOrder,

  sortBoardFieldsByColumnOrder,

  reorderBoardColumnOrderTokens,

  getOrderedBoardColumns,

  normalizeInventoryDomain,

  inventoryDomainUsesPresentation,

  inventoryDomainUsesPackagingMetrics,

  normalizeCleaningSite,

  normalizeBoardOperationalContextValue,

  normalizeInventoryItemRecord,

  collectOrderInventorySecondaryWarehouses,

  filterOrderInventoryItemsByWarehouse,

  normalizeInventoryMovementRecord,
  normalizeInventoryTransferTargetRecord,

  findInventoryTransferTarget,

  getInventoryAllocatedUnits,

  getInventoryAvailableToTransfer,

  getComparableDateMs,

  getInventorySavedStorageLocations,

  getInventorySavedTransferDestinations,

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

  setWarehouseSyncHooks,

  createWarehouseEventSource,

  buildLoginDirectoryFromState,

  buildRouteQuery,

  buildRoutePath,

  normalizeAdminTab,

  getActivityFrequencyLabel,

  normalizeCatalogScheduledDays,

  normalizeCatalogCleaningSites,

  normalizeCatalogArea,

  normalizeCatalogScheduledDaysBySite,

  isStrongPassword,

  isTemporaryPassword,

  withDefaultBoardSettings,

  getDashboardPeriodTypeLabel,


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


  getFieldColorRule,

  resolveInventoryPropertySourceFieldId,

  resolveInventoryPropertyValue,

  getBoardFieldDisplayType,

  createEmptyFieldDraft,

  createEmptyBoardDraft,

  createBoardDraftFromBoard,

  buildDraftPreviewBoard,

  buildTemplatePreviewBoard,

  formatBoardPreviewValue,

  getBoardFieldTypeDescription,

  renderBoardFieldLabel,

  getHeaderEyebrowText,

  getBoardTemplateCategory,

  getBoardSectionGroups,

  triggerBrowserDownload,

  parseInventoryImportFile,

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

  getAreaRoot,

  normalizeBoardVisibilityType,

  normalizeBoardSharedDepartments,

  normalizeBoardAccessUserIds,


  getBoardAssignmentSummary,

  buildAreaCatalog,

  getUserArea,

  getUserJobTitle,

  normalizeUserRecord,

  canBypassSelfProfileEditLimit,

  canViewUserByAreaScope,

  canAccessPage,
  canAccessAreaNavItem,
  canAccessAreaDashboardPage,
  canAccessGlobalDashboardPage,
  canAccessAreaShellPage,
  userHasAnyRetailAreaScope,
  resolveFirstAccessiblePage,
  normalizeStoredActivePage,

  canDoAction,

  canUserAccessInventoryDomain,

  getInventoryDomainNotificationLabel,

  canUserReceiveBibliotecaNotification,

  canUserReceiveIncidenciaNotification,

  canUserReceiveOperationalDashboardNotification,

  canUserReceiveTransportAreaNotification,

  canUserReceiveOrderInventoryNotification,

  canUserAccessTemplate,

  canEditBoard,

  getBoardVisibleToUser,

  canDoBoardAction,

  canDoBoardActionForUser,

  canEditBoardRowRecord,

  canDeleteBoardRowRecord,

  canOperateBoardRowRecord,

  buildSelectOptions,

  getActivityLabel,

  getTimeLimitMinutes,

  getElapsedSeconds,


  getOperationalElapsedSeconds,

  findActiveBoardRowsForUser,

  getNormalizedFormulaTerms,

  evaluateFormulaFieldValue,

  normalizeWarehouseState,

  loadState,

} from "./utils/utilidades.jsx";
import {
  applyAreaLandingState,
  isGlobalAreaRouteContext,
  resolveAreaLandingForPage,
  resolveFirstAccessibleAreaLanding,
} from "./utils/areaLandingNavigation.js";
import {
  extractDelegationGrantsFromUserOverride,
  intersectGrantableScope,
  isPermissionMetaEditor,
  canGrantKeyInScope,
  mergePermissionOverridesForPayload,
  normalizeDelegationGrants,
} from "./utils/userDelegationGrants.js";
import { summarizeProcessAuditMetrics } from "./utils/processAuditMetrics.js";
import {
  INITIAL_ROUTE_STATE,
  HIDDEN_BASE_TEMPLATES_KEY,
  getUserUiThemeKey,
  getUserUiFontKey,
  getUserUiFontSizeKey,
  UI_THEME_OPTIONS,
  UI_FONT_OPTIONS,
  UI_FONT_SIZE_OPTIONS,
  applyUiFontFamilyToDocument,
} from "./app/uiPreferencesConfig.js";
import {
  applyDocumentUiPreferences,
  persistLastSessionUserId,
  readStoredUiFont,
  readStoredUiFontSize,
  readStoredUiTheme,
} from "./app/uiPreferencesBootstrap.js";
import {
  CATALOG_WEEKDAY_OPTIONS,
  serializeCatalogScheduledDaysBySite,
  parseCatalogScheduledDaysBySite,
  createEmptyCatalogModalState,
} from "./app/catalogHelpers.js";
import { setupGlobalHorizontalScrollEnhancements } from "./app/horizontalScrollEnhancements.js";
import { urlBase64ToUint8Array, uint8ArrayEquals } from "./app/pushHelpers.js";
import {
  installServiceWorkerMessageBridge,
  syncNotificationPrefsToServiceWorker,
} from "./utils/pushBridge.js";
import {
  clearPushQueryFromUrl,
  consumePendingPush,
  parsePushFromSearch,
} from "./utils/pushDeepLink.js";
import {
  AREA_SECTIONS_WITHOUT_TABS,
  APP_AREA_SECTIONS,
  NAV_AREA_ACTION_BY_SECTION,
  NAV_UTILITY_ACTION_BY_GROUP,
  AREA_TAB_PERMISSION_ACTIONS,
  TRANSPORT_SECTION_ACTIONS,
  TRANSPORT_DOCUMENTACION_LEGACY_SCOPED_ACTIONS,
  AREA_TAB_BASE_ACTIONS,
  normalizeAreaSectionId,
  findAreaSectionByLabel,
} from "./app/areaNavigationConfig.js";
import {
  buildMenuPermissionSections,
  filterAssignableMenuPermissionSections,
  flattenPermissionRegistry,
  getPermissionRegistryStats,
} from "./app/permissionRegistry.js";
import { useDashboardMetrics } from "./hooks/useDashboardMetrics.js";
import { buildPaginasContexto } from "./app/buildPageContext.js";
import { assembleAppModalContext } from "./app/assembleAppModalContext.js";
import { useInventoryModalPresentation } from "./app/useInventoryModalPresentation.js";
import { createInventoryModalActions } from "./app/inventoryModalActions.js";
import { createBoardToolModalActions } from "./app/createBoardToolModalActions.js";
import { createBoardRuntimeModalActions } from "./app/createBoardRuntimeModalActions.js";
import { createCatalogAreaActions } from "./app/createCatalogAreaActions.js";
import { createPauseModalActions } from "./app/createPauseModalActions.js";
import { AppModals } from "./components/AppModals.jsx";
import { ES_MX_AREA_MODAL as AREA_T } from "./locale/esMXAreaModal.js";
import { AppToastStack, AppNotificationCenter } from "./components/Notificaciones.jsx";
import { InventoryLookupInput } from "./components/BuscadorInventario.jsx";
import { createAppSocket } from "./utils/socketClient.js";
const ChatPro = lazy(() => import("./components/ChatPro.jsx"));
import { AlertModalProvider } from "./components/AlertModal.jsx";
import {
  initNotificationService,
  showTransportNotification,
  showTransportNotificationForNewRecord,
  showTransportNotificationForAssignment,
  showTransportNotificationForStatusUpdate,
  showOrderInventoryTransferNotification,
  showOrderInventoryRestockNotification,
  showOrderInventoryItemCreatedNotification,
} from "./services/notification.service.js";

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
      return normalizeStoredActivePage(saved);
    } catch {
      return PAGE_DASHBOARD;
    }
  });
  const [selectedAreaSectionId, setSelectedAreaSectionId] = useState(() => String(INITIAL_ROUTE_STATE.area || "all").trim() || "all");
  const [navTransportSection, setNavTransportSection] = useState(() => String(INITIAL_ROUTE_STATE.transportSection || "registros-envios").trim() || "registros-envios");
  const [navTransportTab, setNavTransportTab] = useState("");
  const [navRetailTab, setNavRetailTab] = useState("dashboard");
  const [navAuditTab, setNavAuditTab] = useState("");
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
    historySnapshotId: null,
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
  const [expandedDelegationTabs, setExpandedDelegationTabs] = useState([]);
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
      return parsed.filter((id) => id && !PROTECTED_SYSTEM_BOARD_TEMPLATE_IDS.has(String(id).trim()));
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
  const [mobilePageTransitionKey, setMobilePageTransitionKey] = useState(0);
  const mobileOverlayStackRef = useRef(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) !== "false");
  const [selectedCustomBoardId, setSelectedCustomBoardId] = useState(INITIAL_ROUTE_STATE.selectedBoardId);
  const [selectedCustomBoardViewId, setSelectedCustomBoardViewId] = useState("current");
  const [selectedCustomBoardRowId, setSelectedCustomBoardRowId] = useState("");
  const [pendingOpenIncidenciaId, setPendingOpenIncidenciaId] = useState("");
  const [pendingOpenBibliotecaFileId, setPendingOpenBibliotecaFileId] = useState("");
  const [pendingOpenTransportRecordId, setPendingOpenTransportRecordId] = useState("");
  const [boardNavigationFocus, setBoardNavigationFocus] = useState(null);
  const [customBoardActionsMenuOpen, setCustomBoardActionsMenuOpen] = useState(false);
  const [uiTheme, setUiTheme] = useState(() => {
    const stored = readStoredUiTheme();
    return UI_THEME_OPTIONS.some((option) => option.id === stored) ? stored : "copmec-bosque";
  });
  const [uiFont, setUiFont] = useState(() => {
    const stored = readStoredUiFont();
    return UI_FONT_OPTIONS.some((option) => option.id === stored) ? stored : "bahnschrift";
  });
  const [uiFontSize, setUiFontSize] = useState(() => {
    const stored = readStoredUiFontSize();
    return UI_FONT_SIZE_OPTIONS.some((option) => option.id === stored) ? stored : "normal";
  });
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
  const boardPauseOvertimeSeconds = Math.max(0, boardPauseElapsedSeconds - Number(boardPauseState.authorizedPauseSeconds || 0));
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
  const starterByRowIdRef = useRef({});
  const routeLastUrlRef = useRef(`${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash || ""}`);
  const routeSyncFromPopRef = useRef(false);
  const warehouseRefreshTimerRef = useRef(null);
  const warehouseRefreshQueuedRef = useRef(false);
  const warehouseRefreshInFlightRef = useRef(false);
  const warehouseRefreshPendingRevisionRef = useRef(null);
  const warehouseSyncPausedUntilRef = useRef(0);
  const warehouseRevisionRef = useRef(0);
  const WAREHOUSE_REFRESH_DEBOUNCE_MS = 2000;
  const suppressWarehouseRefreshUntilRef = useRef(0);
  const sseHealthyRef = useRef(false);
  const syncStatusRef = useRef("Sincronizado");
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

  function trackWarehouseRevision(remoteState) {
    const revision = Number(remoteState?.revision || 0);
    if (revision > 0) warehouseRevisionRef.current = revision;
  }

  function shouldSkipWarehouseRefresh(incomingRevision) {
    if (Date.now() < suppressWarehouseRefreshUntilRef.current) return true;
    const revision = Number(incomingRevision || 0);
    if (revision > 0 && revision <= warehouseRevisionRef.current) return true;
    return false;
  }

  function applyRemoteStatePreservingBoardDrafts(remoteState) {
    const normalizedState = normalizeWarehouseState(remoteState);
    const revision = Number(normalizedState.revision || 0);
    if (revision > 0 && revision === warehouseRevisionRef.current) {
      setSyncStatus("Sincronizado");
      return mergeRemoteStateWithBoardDrafts(remoteState);
    }
    skipNextSyncRef.current = true;
    const mergedState = mergeRemoteStateWithBoardDrafts(remoteState);
    trackWarehouseRevision(mergedState);
    setState(mergedState);
    setLoginDirectory(buildLoginDirectoryFromState(mergedState));
    setSyncStatus("Sincronizado");
    syncStatusRef.current = "Sincronizado";
    return mergedState;
  }

  function revalidateSessionAfterRemoteState(mergedState) {
    const nextSessionUser = mergedState.users.find((user) => user.id === sessionUserId) || null;
    const shouldRevalidateSession = Boolean(
      sessionUserId
      && sessionUserId !== BOOTSTRAP_MASTER_ID
      && (!nextSessionUser || Number(nextSessionUser.sessionVersion || 0) !== Number(sessionSnapshotRef.current.sessionVersion || 0)),
    );
    if (!shouldRevalidateSession) return;
    requestJson("/auth/session").catch((error) => {
      if (error?.status === 401) {
        invalidateClientSession("Tu sesión se cerró porque tu acceso cambió. Si te restablecieron la contraseña, entra con la clave temporal.");
      }
    });
  }

  function scheduleWarehouseStateRefresh(incomingRevision) {
    const revision = Number(incomingRevision || 0);
    if (revision > 0) {
      const pending = Number(warehouseRefreshPendingRevisionRef.current || 0);
      warehouseRefreshPendingRevisionRef.current = Math.max(pending, revision);
    }
    if (Date.now() < warehouseSyncPausedUntilRef.current) return;
    if (shouldSkipWarehouseRefresh(incomingRevision)) return;
    if (warehouseRefreshInFlightRef.current) {
      warehouseRefreshQueuedRef.current = true;
      return;
    }
    if (warehouseRefreshTimerRef.current) {
      warehouseRefreshQueuedRef.current = true;
      return;
    }
    warehouseRefreshTimerRef.current = globalThis.setTimeout(async () => {
      warehouseRefreshTimerRef.current = null;
      const queuedRevision = warehouseRefreshPendingRevisionRef.current;
      warehouseRefreshPendingRevisionRef.current = null;
      if (warehouseRefreshInFlightRef.current) {
        warehouseRefreshQueuedRef.current = true;
        return;
      }
      warehouseRefreshInFlightRef.current = true;
      try {
        if (shouldSkipWarehouseRefresh(queuedRevision)) return;
        const meta = await requestJson("/warehouse/meta");
        const remoteRevision = Number(meta?.revision || 0);
        if (remoteRevision > 0 && remoteRevision <= warehouseRevisionRef.current) {
          setSyncStatus("Sincronizado");
          syncStatusRef.current = "Sincronizado";
          sseHealthyRef.current = true;
          return;
        }
        const remoteState = await requestJson("/warehouse/state");
        const mergedState = applyRemoteStatePreservingBoardDrafts(remoteState);
        revalidateSessionAfterRemoteState(mergedState);
        sseHealthyRef.current = true;
      } catch (error) {
        sseHealthyRef.current = false;
        if (!isSessionRequiredError(error)) {
          warehouseSyncPausedUntilRef.current = Date.now() + 45_000;
        }
        if (isSessionRequiredError(error)) {
          invalidateClientSession("Tu sesión terminó. Vuelve a iniciar sesión.");
        } else {
          setSyncStatus((current) => {
            const next = current === "Modo local" ? current : "Reconectando";
            syncStatusRef.current = next;
            return next;
          });
        }
      } finally {
        warehouseRefreshInFlightRef.current = false;
      }
      if (warehouseRefreshQueuedRef.current) {
        warehouseRefreshQueuedRef.current = false;
        scheduleWarehouseStateRefresh();
      }
    }, WAREHOUSE_REFRESH_DEBOUNCE_MS);
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

  function applyLocalNotificationReadIds(notificationIds = []) {
    if (!sessionUserId || !notificationIds.length) return;
    setNotificationReadState((current) => {
      const knownIds = new Set(Array.isArray(current[sessionUserId]) ? current[sessionUserId] : []);
      let changed = false;
      notificationIds.forEach((notificationId) => {
        if (notificationId && !knownIds.has(notificationId)) {
          knownIds.add(notificationId);
          changed = true;
        }
      });
      if (!changed) return current;
      return {
        ...current,
        [sessionUserId]: Array.from(knownIds).slice(-300),
      };
    });
  }

  function markNotificationIdsAsRead(notificationIds = []) {
    const ids = Array.from(new Set(
      (Array.isArray(notificationIds) ? notificationIds : [notificationIds])
        .map((entry) => String(entry || "").trim())
        .filter(Boolean),
    ));
    if (!sessionUserId || !ids.length) return;
    applyLocalNotificationReadIds(ids);
    if (sessionUserId === BOOTSTRAP_MASTER_ID) return;
    requestJson("/warehouse/notifications/read", {
      method: "POST",
      body: JSON.stringify({ notificationIds: ids }),
    }).catch(() => { /* SSE sincroniza en otros dispositivos */ });
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

  function resolveTransportSectionForRecord(recordId = "") {
    const id = String(recordId || "").trim();
    if (!id) return "registros-envios";
    const records = [
      ...(Array.isArray(state?.transport?.activeRecords) ? state.transport.activeRecords : []),
      ...(Array.isArray(state?.transport?.historyRecords) ? state.transport.historyRecords : []),
      ...(Array.isArray(state?.documentacion?.records) ? state.documentacion.records : []),
    ];
    const match = records.find((entry) => String(entry?.id || "") === id);
    if (match?.areaId === "documentacion" || String(match?.kind || "").includes("documentacion")) {
      return "documentacion";
    }
    return "registros-envios";
  }

  function navigateToBoardFocus(focus) {
    if (!focus?.boardId) return;
    setBoardNavigationFocus(focus);
    setSelectedCustomBoardId(String(focus.boardId));
    setSelectedCustomBoardViewId(String(focus.boardViewId || "current"));
    setSelectedCustomBoardRowId(String(focus.rowId || ""));
    setPage(PAGE_CUSTOM_BOARDS);
  }

  function clearBoardNavigationFocus() {
    setBoardNavigationFocus(null);
  }

  function handleOpenNotification(notification) {
    if (!notification) return;
    if (!notification.isLocked) {
      markNotificationIdsAsRead([notification.id]);
    }
    setNotificationPanelOpen(false);

    if (notification.targetAction === "profile") {
      openProfileModal();
      return;
    }

    if (notification.targetDomain) {
      setInventoryTab(notification.targetDomain);
    }

    if (notification.targetBoardId) {
      setSelectedCustomBoardId(String(notification.targetBoardId));
      setSelectedCustomBoardViewId("current");
      if (notification.targetRowId) {
        setSelectedCustomBoardRowId(String(notification.targetRowId));
      }
      setPage(PAGE_CUSTOM_BOARDS);
      return;
    }

    if (notification.targetIncidenciaId) {
      setPendingOpenIncidenciaId(String(notification.targetIncidenciaId));
      setPage(PAGE_INCIDENCIAS);
      return;
    }

    if (notification.targetBibliotecaFileId) {
      setPendingOpenBibliotecaFileId(String(notification.targetBibliotecaFileId));
      setPage(PAGE_BIBLIOTECA);
      return;
    }

    if (notification.targetRecordId) {
      setPendingOpenTransportRecordId(String(notification.targetRecordId));
      const transportSection = String(notification.targetTransportSection || "").trim()
        || resolveTransportSectionForRecord(notification.targetRecordId);
      setNavTransportSection(transportSection === "documentacion" ? "registros-envios" : transportSection);
      const transportMainTab = String(notification.targetTransportMainTab || "").trim();
      if (transportMainTab) {
        setNavTransportTab(transportMainTab);
      } else if (transportSection === "documentacion") {
        setNavTransportTab("documentacion");
      }
      setPage(PAGE_TRANSPORT);
      return;
    }

    if (notification.targetPage) {
      setPage(notification.targetPage);
    }
  }

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 5000);
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

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => document.removeEventListener("pointerdown", handleDocumentPointerDown);
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
    if (!sessionUserId) {
      uiPrefsHydratedRef.current = false;
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
      } catch { /* ignore server prefs */ }
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
    persistLastSessionUserId(sessionUserId);
  }, [sessionUserId]);

  useEffect(() => {
    const normalizedTheme = UI_THEME_OPTIONS.some((option) => option.id === uiTheme) ? uiTheme : "copmec-bosque";
    const normalizedFont = UI_FONT_OPTIONS.some((option) => option.id === uiFont) ? uiFont : "bahnschrift";
    const normalizedFontSize = UI_FONT_SIZE_OPTIONS.some((option) => option.id === uiFontSize) ? uiFontSize : "normal";
    applyDocumentUiPreferences({
      theme: normalizedTheme,
      font: normalizedFont,
      fontSize: normalizedFontSize,
    });
    applyUiFontFamilyToDocument(normalizedFont);

    if (!sessionUserId) return undefined;

    try {
      localStorage.setItem(getUserUiThemeKey(sessionUserId), normalizedTheme);
      localStorage.setItem(getUserUiFontKey(sessionUserId), normalizedFont);
      localStorage.setItem(getUserUiFontSizeKey(sessionUserId), normalizedFontSize);
    } catch { /* noop */ }

    if (!uiPrefsHydratedRef.current) return undefined;

    const saveTimer = globalThis.setTimeout(() => {
      requestJson("/chat/ui-preferences", {
        method: "POST",
        body: JSON.stringify({
          theme: normalizedTheme,
          font: normalizedFont,
          fontSize: normalizedFontSize,
        }),
      }).catch(() => { /* noop */ });
    }, 1800);

    return () => globalThis.clearTimeout(saveTimer);
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

  function pushMobileOverlayState(overlayId) {
    if (!isMobileShellActive()) return;
    mobileOverlayStackRef.current += 1;
    globalThis.history.pushState({ axoOverlay: overlayId, axoOverlayDepth: mobileOverlayStackRef.current }, "");
  }

  function openMobileSidebar() {
    setIsSidebarOpen(true);
    pushMobileOverlayState("sidebar");
  }

  function openProfileModal() {
    setProfileModalOpen(true);
    pushMobileOverlayState("profile");
  }

  useEffect(() => {
    setMobilePageTransitionKey((current) => current + 1);
  }, [page, selectedAreaSectionId]);

  useEffect(() => {
    function handlePopState(event) {
      if (profileModalOpen) {
        setProfileModalOpen(false);
        setPasswordForm({ password: "", confirmPassword: "", message: "" });
        mobileOverlayStackRef.current = Math.max(0, mobileOverlayStackRef.current - 1);
        return;
      }
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
        mobileOverlayStackRef.current = Math.max(0, mobileOverlayStackRef.current - 1);
        return;
      }
      if (event?.state?.axoOverlay) {
        mobileOverlayStackRef.current = Math.max(0, mobileOverlayStackRef.current - 1);
        return;
      }

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
  }, [profileModalOpen, isSidebarOpen]);

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
    setWarehouseSyncHooks({
      onApplied: (normalizedState) => {
        trackWarehouseRevision(normalizedState);
        suppressWarehouseRefreshUntilRef.current = Date.now() + 3000;
      },
    });
    return () => setWarehouseSyncHooks({ onApplied: null });
  }, []);

  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) {
      if (!sessionUserId) {
        setSyncStatus("Modo local");
        syncStatusRef.current = "Modo local";
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
        trackWarehouseRevision(normalizedState);
        setState(normalizedState);
        setLoginDirectory(buildLoginDirectoryFromState(normalizedState));
        setSyncStatus("Sincronizado");
        syncStatusRef.current = "Sincronizado";
        sseHealthyRef.current = true;
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
        if (payload.type === "updated") {
          sseHealthyRef.current = true;
          scheduleWarehouseStateRefresh(payload.revision);
          return;
        }
        // Compatibilidad con servidores que aún envían el estado completo por SSE.
        if (payload.type === "state" && payload.state) {
          const mergedState = mergeRemoteStateWithBoardDrafts(payload.state);
          skipNextSyncRef.current = true;
          setState(mergedState);
          setLoginDirectory(buildLoginDirectoryFromState(mergedState));
          setSyncStatus("Sincronizado");
          revalidateSessionAfterRemoteState(mergedState);
        }
      } catch {
        setSyncStatus("Sincronizado");
      }
    };

    events.onerror = () => {
      sseHealthyRef.current = false;
      if (active) {
        setSyncStatus((current) => {
          const next = current === "Modo local" ? current : "Reconectando";
          syncStatusRef.current = next;
          return next;
        });
      }
    };

    return () => {
      active = false;
      events.close();
      if (warehouseRefreshTimerRef.current) {
        globalThis.clearTimeout(warehouseRefreshTimerRef.current);
        warehouseRefreshTimerRef.current = null;
      }
      warehouseRefreshQueuedRef.current = false;
    };
  }, [sessionUserId]);

  // ── Sincronización en tiempo real: Socket.IO "warehouse_updated" ──────────────
  // Cuando el backend emite "warehouse_updated" (tras cualquier cambio de estado),
  // el cliente re-carga el estado completo como respaldo del SSE.
  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) return;
    const socket = socketRef.current;
    if (!socket) return;

    const handleWarehouseUpdate = (payload) => {
      // Con SSE activo, evitar doble GET /warehouse/state (socket + events).
      if (sseHealthyRef.current) return;
      scheduleWarehouseStateRefresh(payload?.revision);
    };

    socket.on("warehouse_updated", handleWarehouseUpdate);
    return () => {
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
    const canReceiveTransportAreaNotification = (options = {}) => (
      canUserReceiveTransportAreaNotification(sessionUser, sessionPermissions, options)
    );
    const shouldShowTransportDeviceNotification = (options = {}) => (
      canReceiveTransportAreaNotification(options) && !isLeadSession
    );
    const canReceiveOrderInventoryNotification = () => (
      canUserReceiveOrderInventoryNotification(sessionUser, sessionPermissions)
    );

    const queueWarehouseRefresh = (data) => {
      if (ignoreResponse) return;
      scheduleWarehouseStateRefresh(data?.revision);
    };

    const handleTransportRecordCreated = async (data) => {
      if (ignoreResponse) return;
      const areaId = String(data?.record?.areaId || "").trim();
      const transportNotifyOptions = { areaId, type: "transport_record_created" };
      // Mostrar notificación de nuevo envío
      if (data?.record && canReceiveTransportAreaNotification(transportNotifyOptions)) {
        if (shouldShowTransportDeviceNotification(transportNotifyOptions)) {
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
          targetRecordId: String(data.record?.id || "").trim(),
        });
      }
      queueWarehouseRefresh(data);
    };

    const handleTransportRouteAssigned = async (data) => {
      if (ignoreResponse) return;
      const areaId = String(data?.record?.areaId || "").trim();
      const transportNotifyOptions = { areaId, type: "transport_route_assigned" };
      // Mostrar notificación de asignación
      if (data?.record && data?.driver && canReceiveTransportAreaNotification(transportNotifyOptions)) {
        if (shouldShowTransportDeviceNotification(transportNotifyOptions)) {
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
          targetRecordId: String(data.record?.id || "").trim(),
        });
      }
      // Actualizar estado
      queueWarehouseRefresh(data);
    };

    const handleTransportStatusUpdated = async (data) => {
      if (ignoreResponse) return;
      const areaId = String(data?.record?.areaId || "").trim();
      const transportNotifyOptions = { areaId, type: "transport_status_updated" };
      // Mostrar notificación de cambio de estado
      if (data?.record && canReceiveTransportAreaNotification(transportNotifyOptions)) {
        if (shouldShowTransportDeviceNotification(transportNotifyOptions)) {
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
          targetRecordId: String(data.record?.id || "").trim(),
        });
      }
      // Actualizar estado
      queueWarehouseRefresh(data);
    };

    const handleTransportRecordPostponed = async (data) => {
      if (ignoreResponse) return;
      const areaId = String(data?.record?.areaId || "").trim();
      const transportNotifyOptions = { areaId, type: "transport_record_postponed" };
      if (data?.record && canReceiveTransportAreaNotification(transportNotifyOptions)) {
        if (shouldShowTransportDeviceNotification(transportNotifyOptions)) {
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
          targetRecordId: String(data.record?.id || "").trim(),
        });
      }
      queueWarehouseRefresh(data);
    };

    const handleTransportRecordDeleted = async () => {
      if (ignoreResponse) return;
      queueWarehouseRefresh();
    };

    const handleDocumentacionRecordCreated = async (data) => {
      if (ignoreResponse) return;
      const transportNotifyOptions = { areaId: "documentacion", type: "documentacion_record_created", targetTransportMainTab: "documentacion" };
      if (data?.record && canReceiveTransportAreaNotification(transportNotifyOptions)) {
        if (shouldShowTransportDeviceNotification(transportNotifyOptions)) {
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
          targetRecordId: String(data.record?.id || "").trim(),
          targetTransportSection: "registros-envios",
          targetTransportMainTab: "documentacion",
        });
      }
      queueWarehouseRefresh(data);
    };

    const handleDocumentacionRecordUpdated = async (data) => {
      if (ignoreResponse) return;
      const transportNotifyOptions = { areaId: "documentacion", type: "documentacion_record_updated", targetTransportMainTab: "documentacion" };
      if (data?.record && canReceiveTransportAreaNotification(transportNotifyOptions)) {
        if (shouldShowTransportDeviceNotification(transportNotifyOptions)) {
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
          targetRecordId: String(data.record?.id || "").trim(),
          targetTransportSection: "registros-envios",
          targetTransportMainTab: "documentacion",
        });
      }
      queueWarehouseRefresh(data);
    };

    const handleDocumentacionRouteAssigned = async (data) => {
      if (ignoreResponse) return;
      const transportNotifyOptions = { areaId: "documentacion", type: "documentacion_route_assigned", targetTransportMainTab: "documentacion" };
      if (data?.record && data?.driver && canReceiveTransportAreaNotification(transportNotifyOptions)) {
        if (shouldShowTransportDeviceNotification(transportNotifyOptions)) {
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
          targetRecordId: String(data.record?.id || "").trim(),
          targetTransportSection: "registros-envios",
          targetTransportMainTab: "documentacion",
        });
      }
      queueWarehouseRefresh(data);
    };

    const handleDocumentacionStatusUpdated = async (data) => {
      if (ignoreResponse) return;
      const transportNotifyOptions = { areaId: "documentacion", type: "documentacion_status_updated", targetTransportMainTab: "documentacion" };
      if (data?.record && canReceiveTransportAreaNotification(transportNotifyOptions)) {
        if (shouldShowTransportDeviceNotification(transportNotifyOptions)) {
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
          targetRecordId: String(data.record?.id || "").trim(),
          targetTransportSection: "registros-envios",
          targetTransportMainTab: "documentacion",
        });
      }
      queueWarehouseRefresh(data);
    };

    const handleTransportRoadAlert = async (data) => {
      if (ignoreResponse) return;
      const transportNotifyOptions = { type: "transport_road_alert" };
      if (canReceiveTransportAreaNotification(transportNotifyOptions)) {
        const alertCount = Number(data?.newAlerts || 0);
        if (shouldShowTransportDeviceNotification(transportNotifyOptions) && alertCount > 0) {
          showTransportNotification("Alerta vial en envio activo", {
            body: `${alertCount} posible afectacion detectada en ruta. Revisa Transporte.`,
            tag: `transport-road-alert-${data?.ts || Date.now()}`,
            playAlert: true,
          });
        }
        if (alertCount > 0) {
          pushNotificationToInbox({
            id: `transport-road-${data?.ts || Date.now()}`,
            title: "Alerta vial en envio activo",
            message: `${alertCount} coincidencia(s) con noticias o incidentes en corredor.`,
            meta: "Monitoreo automatico cada 7 min",
            tone: "warning",
            timestamp: new Date(data?.ts || Date.now()).toISOString(),
            targetPage: PAGE_TRANSPORT,
          });
        }
      }
      queueWarehouseRefresh(data);
    };

    const showOrderInventoryDeviceAlertIfNeeded = async (showAlert) => {
      if (!document.hidden) return;
      try {
        const registration = await navigator.serviceWorker?.ready;
        const subscription = await registration?.pushManager?.getSubscription();
        if (subscription) return;
      } catch {
        // Sin push activo: mostrar alerta local como respaldo.
      }
      showAlert();
    };

    const handleOrderInventoryTransferCreated = async (data) => {
      if (ignoreResponse) return;
      if (!data?.movement) return;
      if (String(data?.performedById || "").trim() === String(sessionUserId || "").trim()) return;
      if (!canReceiveOrderInventoryNotification()) return;

      const movement = data.movement;
      const destination = [movement?.warehouse, movement?.storageLocation]
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .join(" · ") || "destino";

      pushNotificationToInbox({
        id: `order-inv-transfer-${movement.id}`,
        title: "Transferencia de insumos para pedidos",
        message: `${movement.quantity || 0} ${movement.unitLabel || "pzas"} de ${movement.itemName || "insumo"} → ${destination}`,
        meta: `Transferido por: ${data?.performedByName || "Operador"}`,
        tone: "warning",
        timestamp: new Date(data.ts || Date.now()).toISOString(),
        targetPage: PAGE_INVENTORY,
        targetDomain: INVENTORY_DOMAIN_ORDERS,
      });
      await showOrderInventoryDeviceAlertIfNeeded(() => {
        showOrderInventoryTransferNotification(movement, data?.performedByName || "", { alertMode: "sound-vibration" });
      });
      queueWarehouseRefresh(data);
    };

    const handleOrderInventoryRestockCreated = async (data) => {
      if (ignoreResponse) return;
      if (!data?.movement) return;
      if (String(data?.performedById || "").trim() === String(sessionUserId || "").trim()) return;
      if (!canReceiveOrderInventoryNotification()) return;

      const movement = data.movement;
      const location = String(movement?.storageLocation || "").trim();
      const locationSuffix = location ? ` · ${location}` : "";

      pushNotificationToInbox({
        id: `order-inv-restock-${movement.id}`,
        title: "Surtido de insumos para pedidos",
        message: `+${movement.quantity || 0} ${movement.unitLabel || "pzas"} de ${movement.itemName || "insumo"}${locationSuffix}`,
        meta: `Surtido por: ${data?.performedByName || "Operador"}`,
        tone: "success",
        timestamp: new Date(data.ts || Date.now()).toISOString(),
        targetPage: PAGE_INVENTORY,
        targetDomain: INVENTORY_DOMAIN_ORDERS,
      });
      await showOrderInventoryDeviceAlertIfNeeded(() => {
        showOrderInventoryRestockNotification(movement, data?.performedByName || "", { alertMode: "sound-vibration" });
      });
      queueWarehouseRefresh(data);
    };

    const handleOrderInventoryItemCreated = async (data) => {
      if (ignoreResponse) return;
      if (!data?.item) return;
      if (String(data?.performedById || "").trim() === String(sessionUserId || "").trim()) return;
      if (!canReceiveOrderInventoryNotification()) return;

      const item = data.item;
      const stockUnits = Math.max(0, Number(item?.stockUnits || 0));
      const stockSuffix = stockUnits > 0
        ? ` · stock inicial: ${stockUnits} ${item.unitLabel || "pzas"}`
        : "";

      pushNotificationToInbox({
        id: `order-inv-item-${item.id}`,
        title: "Nuevo insumo para pedidos",
        message: `${item.code || "sin código"} · ${item.name || "insumo"}${stockSuffix}`,
        meta: `Registrado por: ${data?.performedByName || "Operador"}`,
        tone: "info",
        timestamp: new Date(data.ts || Date.now()).toISOString(),
        targetPage: PAGE_INVENTORY,
        targetDomain: INVENTORY_DOMAIN_ORDERS,
      });
      await showOrderInventoryDeviceAlertIfNeeded(() => {
        showOrderInventoryItemCreatedNotification(item, data?.performedByName || "", { alertMode: "sound-vibration" });
      });
      queueWarehouseRefresh(data);
    };

    socket.on("transport_record_created", handleTransportRecordCreated);
    socket.on("transport_route_assigned", handleTransportRouteAssigned);
    socket.on("transport_record_postponed", handleTransportRecordPostponed);
    socket.on("transport_record_deleted", handleTransportRecordDeleted);
    socket.on("transport_status_updated", handleTransportStatusUpdated);
    socket.on("transport_road_alert", handleTransportRoadAlert);
    socket.on("documentacion_record_created", handleDocumentacionRecordCreated);
    socket.on("documentacion_record_updated", handleDocumentacionRecordUpdated);
    socket.on("documentacion_route_assigned", handleDocumentacionRouteAssigned);
    socket.on("documentacion_status_updated", handleDocumentacionStatusUpdated);
    socket.on("order_inventory_transfer_created", handleOrderInventoryTransferCreated);
    socket.on("order_inventory_restock_created", handleOrderInventoryRestockCreated);
    socket.on("order_inventory_item_created", handleOrderInventoryItemCreated);

    return () => {
      ignoreResponse = true;
      socket.off("transport_record_created", handleTransportRecordCreated);
      socket.off("transport_route_assigned", handleTransportRouteAssigned);
      socket.off("transport_record_postponed", handleTransportRecordPostponed);
      socket.off("transport_record_deleted", handleTransportRecordDeleted);
      socket.off("transport_status_updated", handleTransportStatusUpdated);
      socket.off("transport_road_alert", handleTransportRoadAlert);
      socket.off("documentacion_record_created", handleDocumentacionRecordCreated);
      socket.off("documentacion_record_updated", handleDocumentacionRecordUpdated);
      socket.off("documentacion_route_assigned", handleDocumentacionRouteAssigned);
      socket.off("documentacion_status_updated", handleDocumentacionStatusUpdated);
      socket.off("order_inventory_transfer_created", handleOrderInventoryTransferCreated);
      socket.off("order_inventory_restock_created", handleOrderInventoryRestockCreated);
      socket.off("order_inventory_item_created", handleOrderInventoryItemCreated);
    };
  }, [sessionUserId, socketConnectCount, state?.permissions, state?.users]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) return;

    const sessionUser = Array.isArray(state?.users)
      ? state.users.find((user) => user.id === sessionUserId) || null
      : null;
    const sessionPermissions = normalizePermissions(state?.permissions);
    const isLeadSession = normalizeRole(sessionUser?.role) === ROLE_LEAD;
    const canReceiveTransportAreaNotification = (options = {}) => (
      canUserReceiveTransportAreaNotification(sessionUser, sessionPermissions, options)
    );
    const shouldShowTransportDeviceNotification = (options = {}) => (
      canReceiveTransportAreaNotification(options) && !isLeadSession
    );
    if (!canReceiveTransportAreaNotification({ type: "transport_pending_reminder" })) return;

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

          const areaId = String(record?.areaId || "").trim();
          const transportNotifyOptions = { areaId, type: "transport_pending_reminder" };
          if (!canReceiveTransportAreaNotification(transportNotifyOptions)) return;

          if (shouldShowTransportDeviceNotification(transportNotifyOptions)) {
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
            targetRecordId: recordId,
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
    const handleVisibilityChange = () => {
      if (document.hidden || ignoreResponse) return;
      scheduleWarehouseStateRefresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      ignoreResponse = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [sessionUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling de respaldo solo si SSE no está sano (cada 90 s) ─────────────────
  useEffect(() => {
    if (!sessionUserId || sessionUserId === BOOTSTRAP_MASTER_ID) return;

    let ignoreResponse = false;
    const poll = async () => {
      if (ignoreResponse || sseHealthyRef.current) return;
      try {
        const meta = await requestJson("/warehouse/meta");
        if (ignoreResponse) return;
        if (Number(meta?.revision || 0) <= warehouseRevisionRef.current) return;
        const remoteState = await requestJson("/warehouse/state");
        if (ignoreResponse) return;
        applyRemoteStatePreservingBoardDrafts(remoteState);
      } catch (_) { /* Ignorar */ }
    };

    const intervalId = globalThis.setInterval(poll, 90_000);
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
        if (!cancelled) await syncNotificationPrefsToServiceWorker();
      } catch (_) {
        // Push subscription is optional; fail silently
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser?.name]);

  useEffect(() => {
    return installServiceWorkerMessageBridge({
      onNotificationClick: (data) => {
        window.dispatchEvent(new CustomEvent("axo-notification-action", { detail: data }));
      },
      onPushReply: (data) => {
        window.dispatchEvent(new CustomEvent("axo-push-reply", { detail: data }));
      },
      onRejectCall: (data) => {
        window.dispatchEvent(new CustomEvent("axo-reject-call", { detail: data }));
      },
    });
  }, []);

  useEffect(() => {
    if (!currentUser?.name) return undefined;
    let data = consumePendingPush();
    if (!data) data = parsePushFromSearch(window.location.search);
    if (!data?.type) return undefined;
    clearPushQueryFromUrl();
    const timer = globalThis.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("axo-notification-action", { detail: data }));
    }, 500);
    return () => globalThis.clearTimeout(timer);
  }, [currentUser?.name]);

  useEffect(() => {
    const ORDER_INVENTORY_PUSH_TYPES = new Set([
      "order_inventory_transfer_created",
      "order_inventory_restock_created",
      "order_inventory_item_created",
    ]);
    const TRANSPORT_PUSH_TYPES = new Set([
      "transport_record_created",
      "transport_record_updated",
      "transport_record_deleted",
      "transport_route_assigned",
      "transport_status_updated",
      "transport_record_postponed",
      "transport_record_reactivated",
      "documentacion_record_created",
      "documentacion_record_updated",
      "documentacion_route_assigned",
      "documentacion_status_updated",
      "transport_road_alert",
    ]);

    function handlePushAreaNavigation(event) {
      const data = event?.detail || {};
      const type = String(data.type || "").trim();

      if (type === "message" || type === "group_message" || type === "call_invite"
        || type.startsWith("reunion_")) {
        return;
      }

      if (ORDER_INVENTORY_PUSH_TYPES.has(type) || data.targetPage === "inventory" || data.url === "/inventory") {
        setInventoryTab(data.targetDomain || INVENTORY_DOMAIN_ORDERS);
        setPage(PAGE_INVENTORY);
        return;
      }

      if (TRANSPORT_PUSH_TYPES.has(type) || data.url === "/transport") {
        if (data.recordId) {
          setPendingOpenTransportRecordId(String(data.recordId));
        }
        setPage(PAGE_TRANSPORT);
      }
    }

    window.addEventListener("axo-notification-action", handlePushAreaNavigation);
    return () => window.removeEventListener("axo-notification-action", handlePushAreaNavigation);
  }, []);

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
  const managedUserIds = useMemo(
    () => (currentUser ? getManagedUserIds(state.users, currentUser.id) : new Set()),
    [currentUser, state.users],
  );
  const isBootstrapMasterSession = sessionUserId === BOOTSTRAP_MASTER_ID && loginDirectory.system?.masterBootstrapEnabled;
  const isForcedPasswordChange = Boolean(currentUser?.mustChangePassword && sessionUserId && !isBootstrapMasterSession);
  const {
    catalogMap,
    userMap,
    activeWeek,
    historyWeek,
    dashboardVisibleControlBoards,
    dashboardRecords,
    dateFilteredDashboardRecords,
    dashboardPeriodOptions,
    dashboardEffectiveAreaFilter,
    filteredDashboardRecords,
    dashboardMetrics,
    pauseAnalysis,
    dashboardDynamicMetricRows,
    dashboardInventoryProductTimeRows,
    dashboardPalletLeaderboardRows,
    dashboardProductPerformanceRows,
    dashboardProductAggregateRows,
    dashboardBoardInsightRows,
    dashboardBoardKpiCards,
    dashboardAreaBoardDetailedRows,
    dashboardAreaRows,
    dashboardTrendRows,
    dashboardParetoRows,
    dashboardIshikawaRows,
    adminReportRows,
    historyPauseLogs,
    dashboardResponsibleRows,
    dashboardActivityRows,
    dashboardActivitySlaSummaryRows,
    dashboardDistributionRows,
  } = useDashboardMetrics({
    state,
    currentUser,
    selectedWeekId,
    selectedHistoryWeekId,
    dashboardFilters,
    setDashboardFilters,
    now,
    operationalPauseState,
    historyPauseActivityId,
  });
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
      return filterOrderInventoryItemsByWarehouse(items, inventoryDestinationWarehouse);
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
      return filterOrderInventoryItemsByWarehouse(items, inventoryDestinationWarehouse);
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

  const inventoryTransferDestinationWarehouses = useMemo(
    () => collectOrderInventorySecondaryWarehouses(
      inventoryDestinations,
      [...orderInventoryTransferSummary, ...maintenanceInventoryTransferSummary],
    ),
    [inventoryDestinations, orderInventoryTransferSummary, maintenanceInventoryTransferSummary],
  );

  const inventoryTransferAvailableWarehouses = useMemo(
    () => [ORDER_INVENTORY_PRIMARY_WAREHOUSE, ...inventoryTransferDestinationWarehouses],
    [inventoryTransferDestinationWarehouses],
  );

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

  useEffect(() => {
    if (!inventoryDestinationWarehouse && !inventoryDestinationWarehouseAutoSet) {
      setInventoryDestinationWarehouse(ORDER_INVENTORY_PRIMARY_WAREHOUSE);
      setInventoryDestinationWarehouseAutoSet(true);
    }
  }, [inventoryDestinationWarehouse, inventoryDestinationWarehouseAutoSet]);

  const isOrderTransferMovementModal = inventoryMovementModal.movementType === INVENTORY_MOVEMENT_TRANSFER && inventoryMovementModal.domain === INVENTORY_DOMAIN_ORDERS;
  const inventoryMovementModalTitle = isOrderTransferMovementModal ? "Registrar transferencia" : "Registrar movimiento";
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

  useEffect(() => {
    if (!sessionUserId) return;
    const remoteReadIds = Array.isArray(state?.notificationReadByUser?.[sessionUserId])
      ? state.notificationReadByUser[sessionUserId]
      : [];
    if (!remoteReadIds.length) return;
    applyLocalNotificationReadIds(remoteReadIds);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.notificationReadByUser, sessionUserId]);

  const inventoryTransferViewerTitle = inventoryTransferViewerItem
    ? `Historial de transferencias · ${inventoryTransferViewerItem.name}`
    : "Transferencias por destino";

  const inventoryModalPresentation = useInventoryModalPresentation({ inventoryModal, state, allInventoryItems });
  const { inventorySystemColumnSuggestions } = inventoryModalPresentation;

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
      .filter((rootArea) => rootArea && !staticRoots.has(rootArea) && !isDeprecatedDynamicArea(rootArea));
  }, [rootAreaOptions]);

  const activeAreaScopes = useMemo(() => {
    if (selectedAreaSectionId === "all") return [];
    const selectedStaticSection = APP_AREA_SECTIONS.find((section) => section.id === selectedAreaSectionId) || null;
    if (selectedStaticSection?.scopes?.length) return selectedStaticSection.scopes;
    const matchedDynamicRoot = dynamicAreaSectionRoots.find((root) => normalizeAreaSectionId(root) === selectedAreaSectionId);
    return matchedDynamicRoot ? [matchedDynamicRoot] : [];
  }, [selectedAreaSectionId, dynamicAreaSectionRoots]);

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

  function handleAddAreaOption() {
    if (currentUser && currentUser.role !== ROLE_LEAD) {
      return;
    }
    setAreaModal({ open: true, target: "user", name: "", parentArea: "", error: "" });
  }

  function handleAddAreaToBootstrap() {
    setAreaModal({ open: true, target: "bootstrap", name: "", parentArea: "", error: "" });
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
    const normalizedPage = normalizeStoredActivePage(page);
    if (normalizedPage !== page) {
      setPage(normalizedPage);
      return;
    }
    const canStayOnPage = allowedPages.includes(page)
      || (page === PAGE_DASHBOARD && selectedAreaSectionId === "admin" && canAccessGlobalDashboardPage(currentUser, normalizedPermissions))
      || (page === PAGE_DASHBOARD && canAccessAreaDashboardPage(currentUser, selectedAreaSectionId, normalizedPermissions))
      || (page === PAGE_AREA_SHELL && canAccessAreaShellPage(currentUser, selectedAreaSectionId, normalizedPermissions))
      || (page === PAGE_RETAIL && userHasAnyRetailAreaScope(currentUser, normalizedPermissions));
    if (!canStayOnPage && page !== PAGE_NOT_FOUND) {
      setPage(resolveLandingPageForUser(currentUser, normalizedPermissions, selectedAreaSectionId));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedPagesKey, currentUser?.role, page, selectedAreaSectionId]);

  function resolveLandingPageForUser(user, permissions, areaSectionId) {
    if (areaSectionId === "retail" && userHasAnyRetailAreaScope(user, permissions)) {
      return PAGE_RETAIL;
    }
    if (AREA_SECTIONS_WITHOUT_TABS.has(areaSectionId) && canAccessAreaShellPage(user, areaSectionId, permissions)) {
      return PAGE_AREA_SHELL;
    }
    return resolveFirstAccessiblePage(user, permissions);
  }

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

  const canManageDashboardState = useMemo(
    () => Boolean(baseActionPermissions.manageDashboardState),
    [baseActionPermissions.manageDashboardState],
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
      const legacyScopedActionId = TRANSPORT_DOCUMENTACION_LEGACY_SCOPED_ACTIONS[actionId];
      const hasScopedPermission = Boolean(baseActionPermissions[scopedActionId]);
      const hasLegacyScopedPermission = legacyScopedActionId
        ? Boolean(baseActionPermissions[legacyScopedActionId])
        : false;
      next[actionId] = Boolean(baseActionPermissions[actionId] || hasScopedPermission || hasLegacyScopedPermission);
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
    }
    if (actionPermissions.viewMaintenanceInventory || actionPermissions.manageMaintenanceInventory || actionPermissions.deleteMaintenanceInventory || actionPermissions.importMaintenanceInventory) {
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
    const canSeeOperationalAlerts = canUserReceiveOperationalDashboardNotification(currentUser, normalizedPermissions);
    const canSeeBibliotecaAlerts = canUserReceiveBibliotecaNotification(currentUser, normalizedPermissions);
    const canSeeIncidenciaAlerts = canUserReceiveIncidenciaNotification(currentUser, normalizedPermissions);

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

    const buildOperationalRecordNotificationTargets = (record) => {
      if (record.source === "board" && record.boardId && record.rawId) {
        return {
          targetPage: PAGE_CUSTOM_BOARDS,
          targetBoardId: record.boardId,
          targetRowId: record.rowId || record.rawId,
        };
      }
      if (record.source === "activity" && record.rawId) {
        return {
          targetPage: PAGE_BOARD,
          targetActivityId: record.rawId,
        };
      }
      return { targetPage: PAGE_DASHBOARD };
    };

    if (canSeeOperationalAlerts) {
      dashboardRecords
        .filter((record) => !String(record.id).startsWith("board-history-") && visibleResponsibleIds.has(record.responsibleId) && record.status === STATUS_PAUSED)
        .slice(0, 6)
        .forEach((record) => {
          const rowLabel = record.source === "board"
            ? (record.rowValues?.actividad || record.rowValues?.Actividad || record.label || record.boardName)
            : record.label;
          notifications.push({
            id: `paused-${record.id}`,
            title: isOwnRecord(record.responsibleId)
              ? "Tienes una actividad pausada"
              : `${record.responsibleName} pausó una actividad`,
            message: `${rowLabel} sigue en pausa en ${record.boardName || record.sourceLabel}.`,
            meta: record.boardName || record.sourceLabel,
            tone: "danger",
            timestamp: record.occurredAt || new Date(now).toISOString(),
            ...buildOperationalRecordNotificationTargets(record),
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
            ...buildOperationalRecordNotificationTargets(record),
          });
        });
    }

    actionableLowStockInventoryItems
      .filter((item) => canUserAccessInventoryDomain(currentUser, normalizedPermissions, item.domain))
      .slice(0, 8)
      .forEach((item) => {
        notifications.push({
          id: `inventory-low-${item.id}`,
          title: "Stock bajo en inventario",
          message: `${item.name} quedó en ${item.stockUnits} ${item.unitLabel || "pzas"} y su mínimo es ${item.minStockUnits}.`,
          meta: getInventoryDomainNotificationLabel(item.domain),
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

    if (canSeeBibliotecaAlerts) {
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
            targetBibliotecaFileId: notif.fileId || "",
            isLocked: notif.priority === "alta",
            keepUntilResolved: notif.priority === "alta",
          });
        });
    }

    // Notificaciones de incidencias asignadas al usuario actual
    if (canSeeIncidenciaAlerts) {
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
            targetIncidenciaId: notif.incidenciaId || "",
            isLocked: notif.priority === "critica",
          });
        });
    }

    return notifications.toSorted((left, right) => getComparableDateMs(right.timestamp) - getComparableDateMs(left.timestamp));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionableLowStockInventoryItems,
    currentUser,
    dashboardRecords,
    isForcedPasswordChange,
    managedUserIds,
    normalizedPermissions,
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

  const areaBoardScopeTokens = useMemo(() => {
    if (selectedAreaSectionId === "all") return [];
    const staticSection = APP_AREA_SECTIONS.find((section) => section.id === selectedAreaSectionId);
    if (staticSection) {
      const scopes = Array.isArray(staticSection.scopes) ? staticSection.scopes : [staticSection.id];
      return Array.from(new Set(
        scopes.map((scope) => String(scope || "").trim().toUpperCase()).filter(Boolean),
      ));
    }
    const matchedDynamic = dynamicAreaSectionRoots.find(
      (root) => normalizeAreaSectionId(root) === selectedAreaSectionId,
    );
    if (matchedDynamic) {
      return [normalizeAreaOption(matchedDynamic)];
    }
    return [String(selectedAreaSectionId).trim().toUpperCase()].filter(Boolean);
  }, [selectedAreaSectionId, dynamicAreaSectionRoots]);

  const visibleControlBoards = useMemo(() => {
    if (!currentUser) return [];
    const canViewHistoricalBoardScopes = canDoAction(currentUser, "viewHistoricalBoardScopes", normalizedPermissions);
    return (state.controlBoards || []).filter((board) => (
      canViewHistoricalBoardScopes || getBoardVisibleToUser(board, currentUser)
    ));
  }, [currentUser, normalizedPermissions, state.controlBoards]);

  const areaScopedVisibleControlBoards = useMemo(() => {
    if (!areaBoardScopeTokens.length) return visibleControlBoards;
    return visibleControlBoards.filter((board) => {
      const directArea = String(board?.settings?.ownerArea || board?.ownerArea || "").trim().toUpperCase();
      const ownerArea = String(userMap.get(board?.ownerId)?.area || "").trim().toUpperCase();
      const boardArea = directArea || ownerArea || "SIN AREA";
      return areaBoardScopeTokens.includes(boardArea);
    });
  }, [areaBoardScopeTokens, userMap, visibleControlBoards]);

  const filteredVisibleControlBoards = useMemo(() => {
    const sourceBoards = areaBoardScopeTokens.length ? areaScopedVisibleControlBoards : visibleControlBoards;
    const term = customBoardSearch.trim().toLowerCase();
    if (!term) return sourceBoards;
    return sourceBoards.filter((board) => [board.name, board.description, userMap.get(board.ownerId)?.name, ...(board.sharedDepartments || [])]
      .some((value) => String(value || "").toLowerCase().includes(term)));
  }, [customBoardSearch, userMap, visibleControlBoards, areaBoardScopeTokens, areaScopedVisibleControlBoards]);

  useEffect(() => {
    if (!areaBoardScopeTokens.length) return;
    if (!areaScopedVisibleControlBoards.length) return;
    const currentInArea = areaScopedVisibleControlBoards.some((board) => board.id === selectedCustomBoardId);
    if (!currentInArea) {
      setSelectedCustomBoardId(areaScopedVisibleControlBoards[0].id);
    }
  }, [selectedAreaSectionId, areaBoardScopeTokens, areaScopedVisibleControlBoards, selectedCustomBoardId]);

  const selectedCustomBoard = useMemo(() => {
    return filteredVisibleControlBoards.find((board) => board.id === selectedCustomBoardId) || filteredVisibleControlBoards[0] || null;
  }, [selectedCustomBoardId, filteredVisibleControlBoards]);

  const visibleBoardHistorySnapshots = useMemo(() => {
    if (!currentUser) return [];
    const canViewHistoricalBoardScopes = canDoAction(currentUser, "viewHistoricalBoardScopes", normalizedPermissions);
    return (state.boardWeekHistory || []).filter((snapshot) => (
      canViewHistoricalBoardScopes || getBoardVisibleToUser(snapshot, currentUser)
    ));
  }, [currentUser, normalizedPermissions, state.boardWeekHistory]);

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

  const canEditHistoricalBoardWeeks = useMemo(() => {
    if (!isHistoricalCustomBoardView || !currentUser) return false;
    if (canManageDashboardState) return true;
    if (canDoAction(currentUser, "editHistoryRecords", normalizedPermissions)) return true;
    if (canDoAction(currentUser, "manageWeeks", normalizedPermissions)) return true;
    if (!selectedCustomBoard) return false;
    return canDoBoardActionForUser(currentUser, selectedCustomBoard, "boardWorkflow", normalizedPermissions)
      || canDoBoardActionForUser(currentUser, selectedCustomBoard, "createBoardRow", normalizedPermissions);
  }, [isHistoricalCustomBoardView, currentUser, canManageDashboardState, normalizedPermissions, selectedCustomBoard]);

  const isHistoricalBoardReadOnly = isHistoricalCustomBoardView && !canEditHistoricalBoardWeeks;

  const boardStartConflictRows = useMemo(() => {
    if (!boardStartConfirm.open || !currentUser?.id) return [];
    return findActiveBoardRowsForUser(state, currentUser.id, {
      starterByRowId: starterByRowIdRef.current,
      excludeBoardId: boardStartConfirm.boardId,
      excludeRowId: boardStartConfirm.rowId,
    });
  }, [boardStartConfirm.open, boardStartConfirm.boardId, boardStartConfirm.rowId, currentUser?.id, state.controlBoards]);

  const selectedCustomBoardDisplay = useMemo(
    () => selectedCustomBoardSnapshot || selectedCustomBoard,
    [selectedCustomBoard, selectedCustomBoardSnapshot],
  );

  const selectedPermissionBoard = useMemo(
    () => (state.controlBoards || []).find((board) => board.id === selectedPermissionBoardId) || state.controlBoards?.[0] || null,
    [selectedPermissionBoardId, state.controlBoards],
  );

  const selectedBoardActionPermissions = useMemo(
    () => Object.fromEntries(BOARD_PERMISSION_ACTIONS.map((item) => [
      item.id,
      canDoBoardActionForUser(currentUser, selectedCustomBoard, item.id, normalizedPermissions),
    ])),
    [currentUser, normalizedPermissions, selectedCustomBoard],
  );

  const canChangeSelectedBoardOperationalContext = useMemo(() => {
    if (!currentUser || !selectedCustomBoard || !canDoBoardAction(currentUser, selectedCustomBoard)) {
      return false;
    }

    return canDoBoardActionForUser(currentUser, selectedCustomBoard, "boardWorkflow", normalizedPermissions)
      || canDoBoardActionForUser(currentUser, selectedCustomBoard, "editBoard", normalizedPermissions);
  }, [currentUser, normalizedPermissions, selectedCustomBoard]);

  const extraSystemBoardTemplates = useMemo(() => EXTRA_SYSTEM_BOARD_TEMPLATES, []);

  const allowedSystemTemplateIds = useMemo(() => PROTECTED_SYSTEM_BOARD_TEMPLATE_IDS, []);

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

  function canDeleteControlBoardEntry(_entry) {
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

  const processAuditMetrics = useMemo(
    () => summarizeProcessAuditMetrics(state.processAudits),
    [state.processAudits],
  );

  const {
    problemCount: processAuditProblemCount,
    pendingProposalCount: processAuditPendingProposalsCount,
    authorizationCount: processAuditAuthorizationCount,
    implementationCount: processAuditImplementationCount,
    rejectedCount: processAuditRejectedCount,
    attentionCount: processAuditAttentionCount,
  } = processAuditMetrics;

  const utilityNavItems = useMemo(
    () => allowedNavItems.filter((item) => {
      if (item.id === PAGE_DASHBOARD) return false;
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
          : section.id === "retail"
            ? [
              { pageId: PAGE_RETAIL, label: "Dashboard", shortLabel: "Dash", retailTab: "dashboard", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.retail.dashboard },
              { pageId: PAGE_RETAIL, label: "Ordenes de compra", shortLabel: "OC", retailTab: "ordenes-compra", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.retail["ordenes-compra"] },
              { pageId: PAGE_RETAIL, label: "Surtido", shortLabel: "Surtido", retailTab: "surtido", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.retail.surtido },
              { pageId: PAGE_RETAIL, label: "Cerrado", shortLabel: "Cerrado", retailTab: "cerrado", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.retail.cerrado },
              { pageId: PAGE_RETAIL, label: "Clientes y huellas", shortLabel: "Clientes", retailTab: "clientes", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.retail.clientes },
              { pageId: PAGE_RETAIL, label: "Inventario retail", shortLabel: "Inventario", retailTab: "inventario", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.retail.inventario },
              { pageId: PAGE_RETAIL, label: "Prearmado", shortLabel: "Prearmado", retailTab: "prearmado", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.retail.prearmado },
              { pageId: PAGE_RETAIL, label: "Incidencias", shortLabel: "Incid.", retailTab: "incidencias", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.retail.incidencias },
            ]
          : section.id === "mantenimiento"
            ? [
              { pageId: PAGE_INCIDENCIAS, label: "Incidencias", shortLabel: "Incidencias", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.incidencias },
              { pageId: PAGE_DASHBOARD, label: "Dashboard", shortLabel: "Dash", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.dashboard },
              { pageId: PAGE_BOARD, label: "Creador de tableros", shortLabel: "Creador", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.board },
              { pageId: PAGE_CUSTOM_BOARDS, label: "Mis tableros", shortLabel: "Tableros", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.customBoards },
              { pageId: PAGE_HISTORY, label: "Historial", shortLabel: "Hist.", requiredActionId: AREA_TAB_PERMISSION_ACTIONS.mantenimiento.history },
            ]
          : section.id === "mejora-continua"
            ? [
              { pageId: "auditDashboard", label: "Dashboard", shortLabel: "Dashboard", auditPreset: { tab: "dashboard" }, requiredActionId: "auditDashboard", requiredKind: "pages", order: 5 },
              { pageId: PAGE_PROCESS_AUDITS, label: "Auditoría", shortLabel: "Auditoría", auditPreset: { tab: "auditoria" }, requiredActionId: "accessAuditTabCaptura", order: 10 },
              { pageId: PAGE_PROCESS_AUDITS, label: "Problemas", shortLabel: "Problemas", auditPreset: { tab: "problemas" }, notificationCount: processAuditProblemCount, requiredActionId: "accessAuditTabPropuestas", order: 20 },
              { pageId: PAGE_PROCESS_AUDITS, label: "Propuestas", shortLabel: "Propuestas", auditPreset: { tab: "propuestas" }, notificationCount: processAuditPendingProposalsCount, requiredActionId: "accessAuditTabPropuestas", order: 25 },
              { pageId: PAGE_PROCESS_AUDITS, label: "Autorizar / Rechazar", shortLabel: "Autorizar", auditPreset: { tab: "seguimiento" }, notificationCount: processAuditAuthorizationCount, requiredActionId: "accessAuditTabAutorizar", order: 30 },
              { pageId: PAGE_PROCESS_AUDITS, label: "Seguimiento", shortLabel: "Seguimiento", auditPreset: { tab: "implementacion" }, notificationCount: processAuditImplementationCount, requiredActionId: "accessAuditTabSeguimiento", order: 40 },
              { pageId: PAGE_PROCESS_AUDITS, label: "Historial", shortLabel: "Hist.", auditPreset: { tab: "history" }, notificationCount: processAuditRejectedCount, requiredActionId: "accessAuditTabHistorial", order: 50 },
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
      .map((section) => {
        const items = (section.items || []).filter((item) => (
          canAccessAreaNavItem(currentUser, item, normalizedPermissions)
        ));
        const sectionNotificationCount = section.id === "mejora-continua"
          ? processAuditAttentionCount
          : items.reduce((sum, item) => sum + (Number(item.notificationCount) || 0), 0);
        return {
          ...section,
          items,
          sectionNotificationCount,
        };
      })
      .filter((section) => {
        const requiredActionId = NAV_AREA_ACTION_BY_SECTION[section.id] || "";
        const canSeeSection = requiredActionId
          ? canDoAction(currentUser, requiredActionId, normalizedPermissions)
          : true;
        if (!canSeeSection) return false;
        if (AREA_SECTIONS_WITHOUT_TABS.has(section.id)) return true;
        return section.items.length > 0;
      });
  }, [currentUser, normalizedPermissions, dynamicAreaSectionRoots, processAuditAttentionCount, processAuditProblemCount, processAuditPendingProposalsCount, processAuditAuthorizationCount, processAuditImplementationCount, processAuditRejectedCount]);

  // Evita rutas globales (/tableros, /dashboard sin área): siempre aterriza en el área permitida.
  useEffect(() => {
    if (!currentUser || isBootstrapMasterSession) return;
    if (!isGlobalAreaRouteContext(page, selectedAreaSectionId)) return;
    const landing = resolveFirstAccessibleAreaLanding(currentUser, normalizedPermissions, areaNavSections);
    if (!landing?.areaSectionId || landing.areaSectionId === "all") return;
    applyAreaLandingState(landing, {
      setSelectedAreaSectionId,
      setPage,
      setNavTransportSection,
      setNavTransportTab,
      setNavRetailTab,
      setAuditShortcutPreset,
      setNavAuditTab,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isBootstrapMasterSession, page, selectedAreaSectionId, areaNavSections, normalizedPermissions]);

  useEffect(() => {
    if (!currentUser) return;
    if (!AREA_SECTIONS_WITHOUT_TABS.has(selectedAreaSectionId)) return;
    if (!canAccessAreaShellPage(currentUser, selectedAreaSectionId, normalizedPermissions)) return;
    if (page !== PAGE_AREA_SHELL) setPage(PAGE_AREA_SHELL);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, selectedAreaSectionId, page, normalizedPermissions]);

  const selectedAreaSection = useMemo(
    () => areaNavSections.find((section) => section.id === selectedAreaSectionId) || null,
    [areaNavSections, selectedAreaSectionId],
  );

  const inventoryModalActions = createInventoryModalActions({
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
  });

  const {
    openCreateInventoryItem,
    openEditInventoryItem,
    openInventoryMovement,
    openOrderInventoryTransfer,
    openInventoryTransferViewer,
    openInventoryTransferHistory,
    openInventoryRestockModal,
    openInventoryBulkRestockModal,
    openInventoryDestinationModal,
    closeInventoryDestinationModal,
    submitInventoryDestinationModal,
    deleteInventoryDestination,
    returnAllInventoryToAlmacen,
  } = inventoryModalActions;

  const pauseModalActions = createPauseModalActions({
    pauseState, setPauseState, pauseContinueTimerRef,
    boardPauseState, setBoardPauseState, boardPauseContinueTimerRef,
    operationalPauseState, setState, requestJson, applyRemoteWarehouseState,
    setLoginDirectory, skipNextSyncRef, setSyncStatus, enabledPauseReasons, pauseReasonOptions,
  });
  const catalogAreaActions = createCatalogAreaActions({
    areaModal, setAreaModal, areaDeleteModal, setAreaDeleteModal,
    catalogModal, setCatalogModal, departmentOptions,
    userModal, setUserModal, bootstrapLeadForm, setBootstrapLeadForm,
    editWeekId, editWeekActivityId, setEditWeekActivityId,
    state, setState, actionPermissions, currentUser,
    requestJson, setLoginDirectory, skipNextSyncRef, setSyncStatus, pushAppToast,
  });
  const boardToolModalActions = createBoardToolModalActions({
    controlBoardDraft, setControlBoardDraft, editingDraftColumnId, setEditingDraftColumnId,
    setComponentStudioOpen, setControlBoardFeedback, templateEditorModal, setTemplateEditorModal,
    templateDeleteModal, setTemplateDeleteModal, templatePreviewId, setTemplatePreviewId,
    boardBuilderModal, setBoardBuilderModal, isBoardSaveSubmitting, setIsBoardSaveSubmitting,
    boardImportedRowsDraft, setBoardImportedRowsDraft, setExcelFormulaWizard,
    hiddenBaseTemplateIds, setHiddenBaseTemplateIds, customTemplateIds, availableBoardTemplates,
    currentUser, actionPermissions, selectedAreaSectionId, selectedAreaSection, userMap,
    visibleUsers, state, setState, setPage, setSelectedCustomBoardId, setSelectedCustomBoardViewId,
    setBoardRuntimeFeedback, activeAreaScopes, canDeleteBoardTemplateEntry, resolveProtectedSystemTemplate,
    getBoardVisibleToUser, requestJson, setLoginDirectory, skipNextSyncRef, setSyncStatus, EMPTY_OBJECT,
  });
  const { openCatalogCreate, openCatalogEdit, removeWeekActivity, softDeleteCatalog } = catalogAreaActions;
  const { resolveBoardOwnerAreaByUserId } = boardToolModalActions;

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

    const landing = resolveFirstAccessibleAreaLanding(currentUser, normalizedPermissions, areaNavSections);
    if (landing?.areaSectionId && landing.areaSectionId !== "all") {
      applyAreaLandingState(landing, {
        setSelectedAreaSectionId,
        setPage,
        setNavTransportSection,
        setNavTransportTab,
        setNavRetailTab,
        setAuditShortcutPreset,
        setNavAuditTab,
      });
    }
  }, [areaNavSections, currentUser, normalizedPermissions, selectedAreaSectionId]);

  const permissionManagedUsers = useMemo(
    () => visibleUsers.filter((user) => user.isActive),
    [visibleUsers],
  );

  const permissionPages = useMemo(() => NAV_ITEMS, []);

  const menuPermissionSections = useMemo(
    () => buildMenuPermissionSections({ permissionPages }),
    [permissionPages],
  );

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

  function invalidateClientSession(message) {
    clearSessionExpiredHandler();
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setSessionUserId("");
    setProfileModalOpen(false);
    setPasswordForm({ password: "", confirmPassword: "", message: "" });
    setLoginError(message || "");
  }

  function openBoardPauseModal(boardId, rowId) {
    const permissionBoard = selectedCustomBoard?.id === boardId ? selectedCustomBoard : resolveBoardMutationBoard(boardId);
    const board = resolveBoardMutationBoard(boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    if (!board || !row || !canOperateBoardRowRecord(currentUser, permissionBoard, row, normalizedPermissions) || row.status !== STATUS_RUNNING) return;
    const historySnapshotId = isHistoricalCustomBoardView && selectedCustomBoardSnapshot?.boardId === boardId
      ? selectedCustomBoardSnapshot.id
      : null;
    setBoardPauseState({
      open: true,
      boardId,
      rowId,
      historySnapshotId,
      reason: pauseReasonOptions[0] || "",
      customReason: "",
      error: "",
      completed: false,
      continueReady: false,
      authorizedPauseSeconds: 0,
      pauseStartedAtMs: 0,
    });
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

  const editorIsMeta = isPermissionMetaEditor(currentUser, actionPermissions);

  const editorDelegableScope = useMemo(() => {
    if (!currentUser) return { pages: {}, actions: {} };
    const editorDelegation = extractDelegationGrantsFromUserOverride(
      normalizedPermissions.userOverrides?.[currentUser.id],
    );
    return intersectGrantableScope(
      currentUserGrantablePermissions,
      editorDelegation,
      editorIsMeta,
    );
  }, [currentUser, currentUserGrantablePermissions, normalizedPermissions.userOverrides, editorIsMeta]);

  const canAssignPlayerPermissions = useMemo(() => {
    const pageGrant = Object.values(editorDelegableScope.pages || {}).some(Boolean);
    const actionGrant = Object.values(editorDelegableScope.actions || {}).some(Boolean);
    return pageGrant || actionGrant;
  }, [editorDelegableScope]);

  const canConfigureDelegationSection = editorIsMeta;

  function canGrantManagedPermission(kind, key) {
    return canGrantKeyInScope(editorDelegableScope, kind, key);
  }

  const assignableMenuPermissionSections = useMemo(
    () => filterAssignableMenuPermissionSections(
      menuPermissionSections,
      (kind, key) => canGrantKeyInScope(editorDelegableScope, kind, key),
    ),
    [menuPermissionSections, editorDelegableScope],
  );

  const permissionRegistryFlat = useMemo(
    () => flattenPermissionRegistry(assignableMenuPermissionSections),
    [assignableMenuPermissionSections],
  );

  const permissionRegistryStats = useMemo(
    () => getPermissionRegistryStats(assignableMenuPermissionSections),
    [assignableMenuPermissionSections],
  );

  function canGrantDelegationKey(kind, key) {
    if (!canConfigureDelegationSection) return false;
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
      permissionPageId: pageId,
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

  function toggleUserModalDelegationSection(pageId) {
    setUserModal((current) => ({
      ...current,
      delegationPageId: pageId,
    }));
  }

  function toggleUserModalDelegationTab(tabId) {
    setExpandedDelegationTabs((current) => (current.includes(tabId)
      ? current.filter((item) => item !== tabId)
      : [...current, tabId]));
  }

  function toggleUserModalDelegation(kind, key) {
    if (!canGrantDelegationKey(kind, key)) return;
    setUserModal((current) => {
      const grants = normalizeDelegationGrants(current.delegationGrants);
      return {
        ...current,
        delegationGrants: {
          ...grants,
          [kind]: {
            ...grants[kind],
            [key]: !grants[kind]?.[key],
          },
        },
      };
    });
  }

  function toggleUserModalDelegationEnabled() {
    setUserModal((current) => {
      const grants = normalizeDelegationGrants(current.delegationGrants);
      return {
        ...current,
        delegationGrants: { ...grants, enabled: !grants.enabled },
        delegationPageId: grants.enabled ? "" : current.delegationPageId,
      };
    });
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
          permissionOverrides: buildEmptyPermissionSelection(),
        };
      }
      return {
        ...nextDraft,
        permissionOverrides: buildPermissionSelectionFromModalDraft(nextDraft, normalizedPermissions, { preserveDisabled: true }),
      };
    });
  }

  function buildEmptyPermissionSelection() {
    return {
      pages: Object.fromEntries(permissionPages.map((item) => [item.id, false])),
      actions: Object.fromEntries(ACTION_DEFINITIONS.map((item) => [item.id, false])),
    };
  }

  function openCreateUser() {
    if (!actionPermissions.createUsers) return;
    setUserModalMessage({ tone: "", text: "" });
    setExpandedPermissionTabs([]);
    const defaultRole = creatableRoles[0] || ROLE_JR;
    const currentUserArea = getAreaRoot(getUserArea(currentUser)) || getUserArea(currentUser);
    const nextModal = createUserModalState({
      open: true,
      mode: "create",
      id: null,
      name: "",
      username: "",
      role: defaultRole,
      area: currentUserArea,
      jobTitle: "",
      isActive: "true",
      password: "",
      managerId: currentUser?.id || "",
    });
    setUserModal({
      ...nextModal,
      permissionOverrides: buildEmptyPermissionSelection(),
    });
  }

  function openEditUser(user) {
    if (!actionPermissions.editUsers) return;
    setUserModalMessage({ tone: "", text: "" });
    setExpandedPermissionTabs([]);
    setExpandedDelegationTabs([]);
    const userArea = getAreaRoot(getUserArea(user)) || getUserArea(user);
    const storedOverride = normalizedPermissions.userOverrides?.[user.id];
    const nextModal = createUserModalState({
      open: true,
      mode: "edit",
      id: user.id,
      name: user.name,
      username: user.email,
      role: user.role,
      area: userArea,
      jobTitle: getUserJobTitle(user),
      isActive: String(user.isActive),
      password: "",
      managerId: user.managerId || "",
      delegationGrants: extractDelegationGrantsFromUserOverride(storedOverride),
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
    const fullArea = normalizeAreaOption(userModal.area);
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
      permissionOverrides: mergePermissionOverridesForPayload(
        userModal.permissionOverrides,
        userModal.delegationGrants,
      ),
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
      correoElectronico: String(identityPatch.correoElectronico || "").trim(),
      fechaIngreso: String(identityPatch.fechaIngreso || "").trim(),
      photo: String(identityPatch.photo ?? currentUser.photo ?? "").trim(),
      photoThumbnailUrl: String(identityPatch.photoThumbnailUrl ?? currentUser.photoThumbnailUrl ?? "").trim(),
    };
    if (!trimmedPatch.name || !trimmedPatch.area || !trimmedPatch.jobTitle) {
      return { ok: false, message: "Captura nombre, área y cargo para guardar el perfil del player." };
    }
    if (trimmedPatch.correoElectronico && !trimmedPatch.correoElectronico.includes("@")) {
      return { ok: false, message: "El correo electrónico debe incluir @ (ejemplo: nombre@empresa.com)." };
    }
    const profileChanges = [
      trimmedPatch.name !== String(currentUser.name || "").trim(),
      trimmedPatch.email !== String(currentUser.email || "").trim(),
      trimmedPatch.area !== getUserArea(currentUser),
      trimmedPatch.jobTitle !== getUserJobTitle(currentUser),
      trimmedPatch.telefono !== String(currentUser.telefono || "").trim(),
      trimmedPatch.telefono_visible !== Boolean(currentUser.telefono_visible),
      trimmedPatch.birthday !== String(currentUser.birthday || "").trim(),
      trimmedPatch.correoElectronico !== String(currentUser.correoElectronico || "").trim(),
      trimmedPatch.fechaIngreso !== String(currentUser.fechaIngreso || "").trim(),
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
      ? ["C1", "C2", "C3"]
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

        const result = await requestJson("/warehouse/inventory/movements", {
          method: "POST",
          body: JSON.stringify({
            itemId: selectedItem.id,
            movementType: INVENTORY_MOVEMENT_CONSUME,
            quantity: Number(usage.quantity),
            notes: usage.note?.trim() || "Uso en mantenimiento",
            warehouse: "",
            recipientName: "",
            storageLocation: selectedItem.storageLocation || "",
            unitLabel: selectedItem.unitLabel || "pzas",
            remainingUnits: null,
          }),
        });
        applyRemoteWarehouseState(result.data.state, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      }

      setInventoryImportFeedback({ tone: "success", message: "Uso de insumos de mantenimiento registrado." });
    } catch (error) {
      setInventoryImportFeedback({ tone: "danger", message: error?.message || "No se pudo registrar el uso de mantenimiento." });
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
      setSyncStatus("Sincronizado");
      // El efecto de aterrizaje por área redirige desde rutas globales (/tableros, etc.).
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

  const [boardRowCreationPending, setBoardRowCreationPending] = useState(false);

  async function createBoardRow(boardId) {
    const board = (state.controlBoards || []).find((item) => item.id === boardId);
    if (!board || !currentUser || !canDoBoardActionForUser(currentUser, board, "createBoardRow", normalizedPermissions)) {
      setBoardRuntimeFeedback({ tone: "danger", message: "No tienes permiso para crear filas en este tablero." });
      return;
    }

    setBoardRowCreationPending(true);

    try {
      const remoteState = await requestJson(`/warehouse/boards/${boardId}/rows`, {
        method: "POST",
      });
      applyRemoteWarehouseState(remoteState, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus);
      setBoardRuntimeFeedback({ tone: "success", message: "Fila creada." });
    } catch (error) {
      setBoardRuntimeFeedback({ tone: "danger", message: error?.message || "No se pudo crear la fila." });
    } finally {
      setBoardRowCreationPending(false);
    }
  }

  function resolveBoardMutationBoard(boardId) {
    if (isHistoricalCustomBoardView && selectedCustomBoardSnapshot?.boardId === boardId) {
      return selectedCustomBoardSnapshot;
    }
    return (state.controlBoards || []).find((item) => item.id === boardId) || null;
  }

  function getBoardRowPatchEndpoint(boardId, rowId) {
    if (isHistoricalCustomBoardView && selectedCustomBoardSnapshot?.boardId === boardId && selectedCustomBoardSnapshot?.id) {
      return `/warehouse/board-history/${selectedCustomBoardSnapshot.id}/rows/${rowId}`;
    }
    return `/warehouse/boards/${boardId}/rows/${rowId}`;
  }

  function applyOptimisticBoardRowPatch(boardId, rowId, updater) {
    if (isHistoricalCustomBoardView && selectedCustomBoardSnapshot) {
      const snapshotId = selectedCustomBoardSnapshot.id;
      setState((current) => ({
        ...current,
        boardWeekHistory: (current.boardWeekHistory || []).map((snapshot) => {
          if (snapshot.id !== snapshotId) return snapshot;
          return {
            ...snapshot,
            rows: (snapshot.rows || []).map((boardRow) => (
              boardRow.id !== rowId ? boardRow : updater(boardRow, snapshot)
            )),
          };
        }),
      }));
      return;
    }
    setState((current) => ({
      ...current,
      controlBoards: (current.controlBoards || []).map((controlBoard) => {
        if (controlBoard.id !== boardId) return controlBoard;
        return {
          ...controlBoard,
          rows: (controlBoard.rows || []).map((boardRow) => (
            boardRow.id !== rowId ? boardRow : updater(boardRow, controlBoard)
          )),
        };
      }),
    }));
  }

  function updateBoardRowValue(boardId, rowId, field, rawValue) {
    const permissionBoard = selectedCustomBoard?.id === boardId ? selectedCustomBoard : resolveBoardMutationBoard(boardId);
    const board = resolveBoardMutationBoard(boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    if (!canEditBoardRowRecord(currentUser, permissionBoard, row, normalizedPermissions)) return;

    applyOptimisticBoardRowPatch(boardId, rowId, (boardRow) => ({
      ...boardRow,
      values: {
        ...(boardRow.values || {}),
        [field.id]: rawValue,
      },
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
      requestJson(getBoardRowPatchEndpoint(boardId, rowId), {
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
    const permissionBoard = selectedCustomBoard?.id === boardId ? selectedCustomBoard : resolveBoardMutationBoard(boardId);
    const board = resolveBoardMutationBoard(boardId);
    const row = board?.rows?.find((item) => item.id === rowId);
    if (!canEditBoardRowRecord(currentUser, permissionBoard, row, normalizedPermissions)) return;

    applyOptimisticBoardRowPatch(boardId, rowId, (boardRow) => ({ ...boardRow, ...overrides }));

    requestJson(getBoardRowPatchEndpoint(boardId, rowId), {
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
    const duplicateAction = includeRows ? "duplicateBoardWithRows" : "duplicateBoard";
    const canDuplicate = canDoBoardActionForUser(currentUser, board, duplicateAction, normalizedPermissions)
      || (!includeRows && canDoBoardActionForUser(currentUser, board, "duplicateBoardWithRows", normalizedPermissions));
    if (!canDuplicate) {
      setBoardRuntimeFeedback({ tone: "danger", message: "No tienes permiso para duplicar este tablero." });
      return;
    }

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

  async function exportSelectedBoardToExcel() {
    if (!selectedCustomBoard || !canDoBoardActionForUser(currentUser, selectedCustomBoard, "exportBoardExcel", normalizedPermissions)) {
      setBoardRuntimeFeedback({ tone: "danger", message: "No tienes permiso para exportar este tablero a Excel." });
      return;
    }

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
    const { loadJsPdfWithAutoTable } = await import("./utils/jspdfLoader.js");
    const { jsPDF, autoTable } = await loadJsPdfWithAutoTable();
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

    doc.setFillColor(15, 76, 92);
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
      headStyles: { fillColor: [15, 76, 92], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 250, 252] },
      bodyStyles: { valign: "middle" },
      margin: { left: 26, right: 26 },
      didParseCell: (hookData) => {
        if (hookData.section !== "head") return;
        const column = pdfColumns[hookData.column.index];
        if (!column) return;
        hookData.cell.styles.fillColor = [15, 76, 92];
      },
    });

    return doc;
  }

  async function previewSelectedBoardPdf() {
    if (!selectedCustomBoard || !canDoBoardActionForUser(currentUser, selectedCustomBoard, "previewBoardPdf", normalizedPermissions)) {
      setBoardRuntimeFeedback({ tone: "danger", message: "No tienes permiso para previsualizar este tablero en PDF." });
      return;
    }

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
    if (!selectedCustomBoard || !canDoBoardActionForUser(currentUser, selectedCustomBoard, "exportBoardPdf", normalizedPermissions)) {
      setBoardRuntimeFeedback({ tone: "danger", message: "No tienes permiso para exportar este tablero a PDF." });
      return;
    }

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

  const boardRuntimeModalActions = createBoardRuntimeModalActions({
    state, currentUser, normalizedPermissions, operationalPauseState,
    selectedCustomBoard, boardStartConfirm, setBoardStartConfirm, boardStartConflictRows,
    boardFinishConfirm, setBoardFinishConfirm, pieceDeductionModal, setPieceDeductionModal,
    deleteBoardRowState, setDeleteBoardRowState, canOperateBoardRowRecord, canDeleteBoardRowRecord,
    canManageDashboardState, resolveBoardMutationBoard, getBoardRowPatchEndpoint,
    applyOptimisticBoardRowPatch, getBoardFieldValue, starterByRowIdRef, setBoardRuntimeFeedback,
    requestJson, setState, setLoginDirectory, skipNextSyncRef, setSyncStatus,
  });
  const { changeBoardRowStatus, openFinishBoardRowConfirm } = boardRuntimeModalActions;

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
    [PAGE_AREA_SHELL]: selectedAreaSection?.label || "Area",
    [PAGE_RETAIL]: selectedAreaSection?.label || "RETAIL",
  }[page];
  const headerEyebrow = getHeaderEyebrowText(page);
  const shouldShowUserPermissionNote = !supportsManagedPermissionOverrides(userModal.role);

  const playerEditor = {
    userModal,
    setUserModal,
    userModalMessage,
    showUserModalPassword,
    setShowUserModalPassword,
    userModalRoleOptions,
    updateUserModalRole,
    closeUserModal,
    submitUserModal,
    menuPermissionSections: assignableMenuPermissionSections,
    expandedPermissionTabs,
    expandedDelegationTabs,
    canGrantManagedPermission,
    canGrantDelegationKey,
    canConfigureDelegationSection,
    canAssignPlayerPermissions,
    toggleUserModalPermission,
    toggleUserModalPermissionSection,
    toggleUserModalPermissionTab,
    toggleUserModalDelegation,
    toggleUserModalDelegationSection,
    toggleUserModalDelegationTab,
    toggleUserModalDelegationEnabled,
    editorIsMeta,
    shouldShowUserPermissionNote,
    rootAreaOptions,
    userAreaOptions,
    getAreaRoot,
    currentUser,
    ROLE_LEAD,
    ROLE_SSR,
    ROLE_JR,
    handleAddAreaOption,
    openDeleteAreaModal,
    activeAssignableUsers,
    Plus,
    Trash2,
    canResetOtherPasswords,
    openResetUserPassword,
    state,
    isRootLead,
    isDemoMode,
    deactivateDemoMode,
    activateDemoMode,
    actionPermissions,
  };


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

  const transportRecordsForDashboard = useMemo(
    () => [
      ...(Array.isArray(state?.transport?.activeRecords) ? state.transport.activeRecords : []),
      ...(Array.isArray(state?.transport?.historyRecords) ? state.transport.historyRecords : []),
    ],
    [state?.transport?.activeRecords, state?.transport?.historyRecords],
  );

  const paginasContexto = buildPaginasContexto({
    ACTION_DEFINITIONS,
    actionPermissions,
    activateDemoMode,
    activeAreaScopes,
    activeAssignableUsers,
    activeWeek,
    ACTIVITY_FREQUENCY_OPTIONS,
    addDocumentacionArea,
    adminReportRows,
    adminTab,
    AlertTriangle,
    allRoles,
    applyPermissionPreset,
    applyRemoteWarehouseState,
    ArrowUp,
    auditFilters,
    auditShortcutPreset,
    processAuditMetrics,
    BarChart3,
    boardAssignmentsByUser,
    boardRowCreationPending,
    boardRuntimeFeedback,
    BOOTSTRAP_MASTER_ID,
    buildSelectOptions,
    CalendarDays,
    canChangeSelectedBoardOperationalContext,
    canDeleteControlBoardEntry,
    canDoBoardAction,
    canEditBoard,
    canEditBoardRowRecord,
    canDeleteBoardRowRecord,
    canExportDashboardData,
    canManageDashboardControls,
    canManageDashboardState,
    canOperateBoardRowRecord,
    catalogMap,
    catalogWeekGroups,
    changeBoardRowStatus,
    CircleCheckBig,
    CLEANING_SITE_OPTIONS,
    ClipboardList,
    Clock3,
    closeInventoryDestinationModal,
    Copy,
    creatableRoles,
    createBoardRow,
    createDocumentacionRecord,
    createTransportRecord,
    currentInventoryDeletePermission,
    currentInventoryImportPermission,
    currentInventoryItems,
    currentInventoryManagePermission,
    currentInventoryMovements,
    currentInventorySupplyableItems,
    currentUser,
    customBoardActionsMenuOpen,
    customBoardActionsMenuRef,
    customBoardMetrics,
    customBoardSearch,
    dashboardActivityRows,
    dashboardActivitySlaSummaryRows,
    dashboardAreaBoardDetailedRows,
    dashboardAreaRows,
    DashboardBarRow,
    dashboardCatalogFrequencyRows,
    dashboardCatalogTypeRows,
    DashboardCauseCard,
    DashboardColumnChart,
    dashboardDistributionRows,
    dashboardDynamicMetricRows,
    dashboardFilters,
    dateFilteredDashboardRecords,
    dashboardRecords,
    areaNavSections,
    dynamicAreaSectionRoots,
    transportRecords: transportRecordsForDashboard,
    dashboardInventoryProductTimeRows,
    dashboardPalletLeaderboardRows,
    dashboardProductPerformanceRows,
    DashboardIshikawaDiagram,
    dashboardIshikawaRows,
    DashboardKpiCard,
    DashboardKpiBento,
    DashboardLineChart,
    dashboardMetrics,
    DashboardParetoChart,
    DashboardParetoRow,
    dashboardParetoRows,
    dashboardPeriodOptions,
    DashboardPieChart,
    dashboardProductAggregateRows,
    dashboardBoardInsightRows,
    dashboardBoardKpiCards,
    DashboardProgressMetric,
    DashboardRankItem,
    dashboardResponsibleRows,
    DashboardSection,
    dashboardSectionsOpen,
    dashboardTrendRows,
    dashboardVisibleControlBoards,
    deactivateDemoMode,
    deleteDocumentacionArea,
    deleteInventoryDestination,
    departmentOptions,
    Download,
    downloadInventoryTemplate,
    duplicateBoardRecord,
    editableVisibleBoards,
    exportCatalogToCsv,
    exportMaintenanceInventoryItemsToCsv,
    exportPermissionRules,
    exportSelectedBoardToExcel,
    exportSelectedBoardToPdf,
    Eye,
    filteredAuditLog,
    filteredBoardTemplates,
    filteredDashboardRecords,
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
    getActivityFrequencyLabel,
    getActivityLabel,
    getBoardAssignmentSummary,
    getBoardFieldCellStyle,
    getBoardFieldValue,
    getDashboardPeriodTypeLabel,
    getElapsedSeconds,
    getFieldColorRule,
    getOrderedBoardColumns,
    getResponsibleVisual,
    getRoleBadgeClass,
    getTimeLimitMinutes,
    getUserArea,
    getUserJobTitle,
    handleAddAreaOption,
    handleDeleteCustomRole,
    handleInventoryImport,
    handlePermissionImport,
    hardResetDashboard,
    historyWeek,
    importCatalogFromCsv,
    INVENTORY_DOMAIN_BASE,
    INVENTORY_DOMAIN_CLEANING,
    INVENTORY_DOMAIN_MAINTENANCE,
    INVENTORY_DOMAIN_DESTINATIONS,
    INVENTORY_DOMAIN_ORDERS,
    INVENTORY_MOVEMENT_CONSUME,
    INVENTORY_MOVEMENT_RESTOCK,
    INVENTORY_MOVEMENT_TRANSFER,
    inventoryActionsMenuOpen,
    inventoryActionsMenuRef,
    inventoryCleaningSite,
    inventoryDestinationModal,
    inventoryDestinationWarehouse,
    inventoryFileInputRef,
    inventoryImportFeedback,
    inventoryItemsById,
    inventoryLinkedCleaningRows,
    InventoryLookupInput,
    inventoryMovementSavedDestinations,
    inventoryMovementSavedLocations,
    inventorySearch,
    inventoryStats,
    InventoryStockBar,
    inventorySystemColumnSuggestions,
    inventoryTab,
    inventoryTransferAvailableWarehouses,
    inventoryTransferDestinationWarehouses,
    ORDER_INVENTORY_PRIMARY_WAREHOUSE,
    inventoryTransferDestinationsByWarehouse,
    isDemoMode,
    isHistoricalCustomBoardView,
    isHistoricalBoardReadOnly,
    canEditHistoricalBoardWeeks,
    isRootLead,
    LayoutDashboard,
    lowStockInventoryItems,
    maintenanceInventoryItems,
    maintenanceInventoryTransferMovements,
    maintenanceInventoryTransferSummary,
    Menu,
    MetricCard,
    Modal,
    NAV_ITEMS,
    navTransportSection,
    navTransportTab,
    navRetailTab,
    setNavRetailTab,
    retailState: state.retail || {},
    canRetailAction: (actionId) => canDoAction(currentUser, actionId, normalizedPermissions),
    normalizedPermissions,
    now,
    OctagonAlert,
    openBoardPauseModal,
    openCatalogCreate,
    openCatalogEdit,
    openCreateBoardBuilder,
    openCreateBoardBuilderFromChecklistTemplate,
    openCreateInventoryItem,
    openCreateRoleModal,
    openCreateUser,
    openEditBoardBuilder,
    openEditInventoryItem,
    openEditRoleModal,
    openEditUser,
    openFinishBoardRowConfirm,
    openInventoryBulkRestockModal,
    openInventoryDestinationModal,
    openInventoryMovement,
    openInventoryRestockModal,
    openInventoryTransferHistory,
    openInventoryTransferViewer,
    openOrderInventoryTransfer,
    returnAllInventoryToAlmacen,
    orderInventoryTransferMovements,
    orderInventoryTransferSummary,
    Package,
    page,
    PAGE_CUSTOM_BOARDS,
    PAGE_DASHBOARD,
    PAGE_PROCESS_AUDITS,
    PAGE_TRANSPORT,
    Pause,
    pauseAnalysis,
    PauseCircle,
    Pencil,
    PERMISSION_PRESETS,
    permissionFileInputRef,
    permissionsFeedback,
    PieChart,
    Play,
    Plus,
    previewSelectedBoardPdf,
    pushAppToast,
    renderBoardFieldLabel,
    requestJson,
    removeWeekActivity,
    ROLE_JR,
    ROLE_LEAD,
    roleModalEditId,
    roleModalError,
    roleModalName,
    roleModalOpen,
    roleSaving,
    rootAreaOptions,
    RotateCcw,
    Search,
    securityEvents,
    securityEventsStatus,
    selectedAreaSection,
    selectedAreaSectionId,
    selectedBoardActionPermissions,
    selectedCustomBoard,
    selectedCustomBoardId,
    selectedCustomBoardDisplay,
    selectedCustomBoardHistoryOptions,
    selectedCustomBoardRowId,
    selectedCustomBoardSections,
    selectedCustomBoardSnapshot,
    selectedCustomBoardViewId,
    selectedPermissionBoard,
    setAdminTab,
    setAuditFilters,
    setAuditShortcutPreset,
    onAuditTabChange: setNavAuditTab,
    setBoardRuntimeFeedback,
    setCustomBoardActionsMenuOpen,
    setCustomBoardSearch,
    setDashboardFilters,
    setDashboardSectionsOpen,
    setDeleteBoardId,
    setDeleteBoardRowState,
    setDeleteInventoryId,
    setDeleteUserId,
    setEditWeekId,
    setHistoryPauseActivityId,
    setInventoryActionsMenuOpen,
    setInventoryCleaningSite,
    setInventoryDestinationWarehouse,
    setInventorySearch,
    setInventoryTab,
    setLoginDirectory,
    setNavTransportSection,
    setNavTransportTab,
    setPage,
    setRoleModalName,
    setRoleModalOpen,
    setSelectedAreaSectionId,
    setSelectedCustomBoardId,
    setSelectedCustomBoardRowId,
    boardNavigationFocus,
    navigateToBoardFocus,
    clearBoardNavigationFocus,
    pendingOpenIncidenciaId,
    setPendingOpenIncidenciaId,
    pendingOpenTransportRecordId,
    setPendingOpenTransportRecordId,
    setSelectedCustomBoardViewId,
    setSelectedHistoryWeekId,
    setSelectedPermissionBoardId,
    setState,
    setSyncStatus,
    Settings,
    setTransferLeadTargetId,
    setUserRoleFilter,
    setUserSearch,
    setUsersViewTab,
    skipNextSyncRef,
    softDeleteCatalog,
    splitAreaAndSubArea,
    Square,
    state,
    StatTile,
    STATUS_FINISHED,
    STATUS_PAUSED,
    STATUS_PENDING,
    STATUS_RUNNING,
    StatusBadge,
    submitInventoryDestinationModal,
    submitMaintenanceUsage,
    submitRoleModal,
    togglePermissionRole,
    toggleUserActive,
    transferLead,
    transferLeadTargetId,
    Trash2,
    updateBoardAssignment,
    updateBoardOperationalContext,
    updateBoardRowTimeOverride,
    updateBoardRowValue,
    getBoardRowPatchEndpoint,
    updateDocumentacionRecord,
    updatePermissionEntry,
    updateSystemOperationalSettings,
    updateTransportRecord,
    Upload,
    USER_ROLES,
    userMap,
    userRoleFilter,
    Users,
    usersByAreaGroups,
    usersByCreatorGroups,
    usersCreatedByMap,
    userSearch,
    userStats,
    usersViewTab,
    menuPermissionSections: assignableMenuPermissionSections,
    permissionRegistryFlat,
    permissionRegistryStats,
    playerEditor,
    visibleControlBoards,
    visibleUsers,
    weeklyAreaCoverageRows,
    Zap,
  });

  const appModalContext = assembleAppModalContext({
    core: {
      state,
      currentUser,
      now,
      operationalPauseState,
      actionPermissions,
      STATUS_RUNNING,
      FORMULA_OPERATIONS,
      TEMPORARY_PASSWORD_MIN_LENGTH,
      DEFAULT_CLEANING_SITE,
      INVENTORY_DOMAIN_MAINTENANCE,
      INVENTORY_DOMAIN_CLEANING,
      INVENTORY_DOMAIN_OPTIONS,
      normalizeInventoryDomain,
      inventoryDomainUsesPresentation,
      inventoryDomainUsesPackagingMetrics,
      inventoryCleaningSite,
      normalizeCatalogCleaningSites,
      normalizeCatalogScheduledDays,
      normalizeCatalogScheduledDaysBySite,
      CATALOG_WEEKDAY_OPTIONS,
      CLEANING_SITE_OPTIONS,
      AREA_T,
      createEmptyCatalogModalState,
      createEmptyFieldDraft,
      createInventoryModalState,
      getActivityLabel,
      catalogMap,
      BOARD_OPERATIONAL_CONTEXT_OPTIONS,
      boardSectionOptions,
      activityCatalogCategoryOptions,
      contextoConstructor,
      orderInventoryItems,
      UI_THEME_OPTIONS,
      UI_FONT_OPTIONS,
      UI_FONT_SIZE_OPTIONS,
    },
    pause: {
      ...pauseModalActions,
      pauseState, setPauseState, pauseContinueTimerRef, pauseReasonOptions, CUSTOM_PAUSE_REASON_VALUE,
      boardPauseState, setBoardPauseState, boardPauseContinueTimerRef,
      boardPauseIsOutOfTime, boardPauseOvertimeSeconds, boardPauseRemainingSeconds,
      historyPauseActivityId, setHistoryPauseActivityId, historyPauseLogs,
    },
    board: {
      ...boardRuntimeModalActions,
      boardFinishConfirm, setBoardFinishConfirm,
      boardStartConfirm,
      boardStartConflictRows,
      deleteBoardRowState, setDeleteBoardRowState,
      pieceDeductionModal,
      deleteBoardId, setDeleteBoardId, deleteControlBoard,
    },
    catalog: {
      ...catalogAreaActions,
      catalogModal, setCatalogModal, createEmptyCatalogModalState, catalogAreaOptions,
      areaModal, setAreaModal, AREA_T, areaDeleteModal, setAreaDeleteModal,
      editWeekId, setEditWeekId, editWeekActivityId, setEditWeekActivityId,
      getActivityLabel, catalogMap, actionPermissions,
    },
    boardTools: {
      ...boardToolModalActions,
      templateEditorModal, setTemplateEditorModal, departmentOptions, activeAssignableUsers,
      templateDeleteModal, setTemplateDeleteModal, boardBuilderModal, controlBoardDraft, setControlBoardDraft,
      closeBoardBuilderModal, isBoardSaveSubmitting, openBoardExcelImportPicker, clearControlBoardDraft,
      controlBoardFeedback, templateSearch, setTemplateSearch, templateCategoryFilter, setTemplateCategoryFilter,
      templateCategories, filteredBoardTemplates, canDeleteBoardTemplateEntry,
      selectedPreviewTemplate, setTemplatePreviewId, boardBuilderPreview, draftColumnGroups,
      visibleUsers, userMap, selectedAreaSectionId, selectedAreaSection,
      boardExcelFileInputRef, importBoardStructureFromExcel, componentStudioOpen, setComponentStudioOpen,
      editingDraftColumnId, setEditingDraftColumnId, createEmptyFieldDraft,
      boardSectionOptions, activityCatalogCategoryOptions, contextoConstructor,
      excelFormulaWizard, setExcelFormulaWizard, applyExcelFormulaWizard,
      updateExcelFormulaWizardItem, removeExcelFormulaWizardItem,
      actionPermissions, currentUser, state,
    },
    user: {
      profileModalOpen,
      setProfileModalOpen,
      passwordForm,
      setPasswordForm,
      submitPasswordReset,
      updateCurrentUserIdentity,
      uiTheme,
      setUiTheme,
      uiFont,
      setUiFont,
      uiFontSize,
      setUiFontSize,
      handleLogout,
      excelSheetSelector,
      setExcelSheetSelector,
      applyImportedSheet,
      isForcedPasswordChange,
      resetUserPasswordModal,
      setResetUserPasswordModal,
      showResetUserPassword,
      setShowResetUserPassword,
      submitUserPasswordReset,
      deleteUserId,
      setDeleteUserId,
      deleteUser,
      transferLeadTargetId,
      setTransferLeadTargetId,
      transferLead,
    },
    inventory: {
      ...inventoryModalPresentation,
      ...inventoryModalActions,
      inventoryModal,
      setInventoryModal,
      activeCatalogItems,
      inventoryMovementModal,
      inventoryMovementModalTitle,
      isOrderTransferMovementModal,
      inventoryMovementTypeOptions,
      inventoryMovementSavedLocations,
      inventoryMovementSelectedSavedLocation,
      inventoryMovementSelectedItem,
      inventoryMovementAvailableUnits,
      inventoryMovementTransferTarget,
      inventoryTransferAvailableWarehouses,
    inventoryTransferDestinationWarehouses,
    ORDER_INVENTORY_PRIMARY_WAREHOUSE,
      inventoryTransferDestinationsByWarehouse,
      setInventoryTransferConfirmModal,
      inventoryDestinationModal,
      setInventoryDestinationModal,
      inventoryTransferConfirmModal,
      inventoryRestockModal,
      inventoryRestockModalTitle,
      inventoryRestockModalItems,
      inventoryTransferViewerState,
      setInventoryTransferViewerState,
      inventoryTransferViewerTitle,
      inventoryTransferViewerItem,
      viewedOrderInventoryTransferTargets,
      viewedOrderInventoryTransferMovements,
      deleteInventoryId,
      setDeleteInventoryId,
      closeInventoryDestinationModal,
      submitInventoryDestinationModal,
      deleteInventoryDestination,
    },
  });



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

    const socket = createAppSocket(socketBaseUrl, { forceNew: true });

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
        navAuditTab={navAuditTab}
        onPageChange={(nextPage, nextAreaSectionId, transportSection, transportTab, auditPreset, retailTab) => {
          const normalizedArea = String(nextAreaSectionId || "").trim();
          const resolvedArea = normalizedArea && normalizedArea !== "all"
            ? normalizedArea
            : (selectedAreaSectionId !== "all" ? selectedAreaSectionId : "");
          if (!resolvedArea && currentUser && isGlobalAreaRouteContext(nextPage, "all")) {
            const landing = resolveAreaLandingForPage(currentUser, normalizedPermissions, areaNavSections, nextPage)
              || resolveFirstAccessibleAreaLanding(currentUser, normalizedPermissions, areaNavSections);
            applyAreaLandingState(landing, {
              setSelectedAreaSectionId,
              setPage,
              setNavTransportSection,
              setNavTransportTab,
              setNavRetailTab,
              setAuditShortcutPreset,
              setNavAuditTab,
            });
            return;
          }
          setSelectedAreaSectionId(resolvedArea || selectedAreaSectionId || "all");
          setPage(nextPage);
          if (transportSection) setNavTransportSection(transportSection);
          setNavTransportTab(transportTab || "");
          if (retailTab) setNavRetailTab(retailTab);
          setAuditShortcutPreset(auditPreset || null);
          setNavAuditTab(auditPreset?.tab || "");
        }}
        isOpen={isSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        onClose={() => setIsSidebarOpen(false)}
        onOpenProfile={openProfileModal}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
        areaSections={areaNavSections}
        utilityNavItems={utilityNavItems}
        selectedAreaSectionId={selectedAreaSectionId}
        navTransportSection={navTransportSection}
        navTransportTab={navTransportTab}
        navRetailTab={navRetailTab}
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
          <button type="button" className="mobile-nav-toggle" onClick={openMobileSidebar} aria-label="Abrir menú">
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

        <div className="content-scroll-region">
        <div key={mobilePageTransitionKey} className="page-transition-shell">
        <Suspense fallback={<PageFallback />}>
          {page === PAGE_BOARD || page === PAGE_ADMIN ? <TablerosCreados contexto={paginasContexto} /> : null}
          {page === PAGE_CUSTOM_BOARDS ? <MisTableros contexto={paginasContexto} /> : null}
          {page === PAGE_DASHBOARD ? <PanelIndicadores contexto={paginasContexto} /> : null}
          {page === PAGE_HISTORY ? <HistorialSemanas contexto={paginasContexto} /> : null}
          {page === PAGE_PROCESS_AUDITS ? <AuditoriasProcesos contexto={paginasContexto} /> : null}
          {page === PAGE_INVENTORY ? <GestionInventario contexto={paginasContexto} /> : null}
          {page === PAGE_TRANSPORT ? <GestionTransporte contexto={paginasContexto} /> : null}
          {page === PAGE_RETAIL ? <GestionRetail contexto={paginasContexto} /> : null}
          {page === PAGE_USERS ? <GestionUsuarios contexto={paginasContexto} /> : null}
          {page === PAGE_BIBLIOTECA ? (
            <BibliotecaPage
              currentUser={currentUser}
              canUpload={actionPermissions.uploadBiblioteca}
              canRenameName={actionPermissions.editBibliotecaName}
              canDelete={actionPermissions.deleteBiblioteca}
              pendingOpenFileId={pendingOpenBibliotecaFileId}
              onPendingOpenFileConsumed={() => setPendingOpenBibliotecaFileId("")}
            />
          ) : null}
          {page === PAGE_INCIDENCIAS ? <GestionIncidencias contexto={paginasContexto} /> : null}
          {page === PAGE_SYSTEM_SETTINGS ? <ConfiguracionSistema contexto={paginasContexto} /> : null}
          {page === PAGE_NOT_FOUND ? <PaginaNoEncontrada contexto={paginasContexto} /> : null}
        </Suspense>
        </div>
        </div>
      </section>

      <div className="warehouse-app-floating-layer">
        <AppModals {...appModalContext} />

        {currentUser ? (
          <AlertModalProvider>
            <Suspense fallback={null}>
              <ChatPro socket={socketRef.current} user={currentUser} connectCount={socketConnectCount} />
            </Suspense>
          </AlertModalProvider>
        ) : null}

        <Suspense fallback={null}>
          <CopmecAIWidget canUseAI={!!actionPermissions.useCopmecAI} isOpen={aiOpen} onClose={() => setAiOpen(false)} sidebarCollapsed={isSidebarCollapsed} />
        </Suspense>
      </div>
    </main>
  );
}

export default App;
