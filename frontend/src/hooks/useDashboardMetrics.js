import { useEffect, useMemo } from "react";
import {
  STATUS_PENDING,
  STATUS_RUNNING,
  STATUS_PAUSED,
  STATUS_FINISHED,
  ROLE_LEAD,
  RESPONSIBLE_VISUALS,
} from "../utils/constantes.js";
import {
  normalizeAreaOption,
  normalizeCatalogArea,
  getAreaRoot,
  getUserArea,
  getNormalizedBoardVisibility,
  getActivityLabel,
  getTimeLimitMinutes,
  getElapsedSeconds,
  getLivePauseOverflowSeconds,
  getOperationalElapsedSeconds,
  getManagedUserIds,
  getBoardVisibleToUser,
  getDashboardFilterStartDate,
  getDashboardFilterEndDate,
  getDashboardPeriodKey,
  getDashboardPeriodRange,
  formatDashboardPeriodLabel,
  getDashboardPeriodTypeLabel,
  getIshikawaCategory,
  getResponsibleVisual,
  resolveDashboardInventoryRowMetrics,
} from "../utils/utilidades.jsx";

export function useDashboardMetrics({
  state,
  currentUser,
  selectedWeekId,
  selectedHistoryWeekId,
  dashboardFilters,
  setDashboardFilters,
  now,
  operationalPauseState,
  historyPauseActivityId,
}) {
  const catalogMap = useMemo(() => new Map(state.catalog.map((item) => [item.id, item])), [state.catalog]);
  const userMap = useMemo(() => new Map(state.users.map((item) => [item.id, item])), [state.users]);
  const inventoryItemsById = useMemo(() => {
    const map = new Map();
    (state.inventoryItems || []).forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
    return map;
  }, [state.inventoryItems]);
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
      const explicitLimit = Number(activity.timeLimitMinutes || activity.limitMinutes || activity.timeLimit || 0);
      const limitMinutes = getTimeLimitMinutes(activity, catalogMap) || (Number.isFinite(explicitLimit) ? explicitLimit : 0);
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
        pauseLogEntries: pauseSummary.logs.map((entry) => ({ ...entry, rowId: row.id, boardId: board.id })),
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
        pauseLogEntries: pauseSummary.logs.map((entry) => ({ ...entry, rowId: row.id, boardId: resolvedSnapshotBoardId })),
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

  function isInventoryProductTimeRecord(record) {
    const values = record.rowValues || {};
    const fields = Array.isArray(record.sourceFields) ? record.sourceFields : [];
    const inventoryLabels = ["tarima", "pallet", "palet", "producto", "sku", "articulo", "item", "lote", "caducidad", "caja", "pieza", "piezas", "cantidad"];
    const inventoryFields = fields.filter((field) => {
      const label = String(field?.label || field?.name || field?.key || "").toLowerCase();
      return inventoryLabels.some((keyword) => label.includes(keyword));
    });
    if (!inventoryFields.length) return false;

    const hasInventoryValue = inventoryFields.some((field) => {
      const raw = String(values[field.id] ?? values[field.key] ?? values[field.name] ?? "").trim().toLowerCase();
      return raw !== "" && raw !== "sin tarima" && raw !== "sin producto" && raw !== "n/a" && raw !== "-";
    });

    return hasInventoryValue;
  }

  const dashboardInventoryProductTimeRows = useMemo(() => {
    // Mostrar LITERALMENTE cada registro del tablero con sus campos REALES,
    // pero sólo si realmente parece un registro de inventario/producto/tarima.
    const inventoryRecords = filteredDashboardRecords
      .filter((record) => record.source === "board" && isInventoryProductTimeRecord(record));
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

  const dashboardEnrichedInventoryRows = useMemo(() => (
    dashboardInventoryProductTimeRows.map((row) => ({
      ...row,
      ...resolveDashboardInventoryRowMetrics(row, inventoryItemsById),
    }))
  ), [dashboardInventoryProductTimeRows, inventoryItemsById]);

  const dashboardPalletLeaderboardRows = useMemo(() => {
    const palletMap = new Map();

    dashboardEnrichedInventoryRows.forEach((row) => {
      const tarimaKey = String(row.tarimaValue || "Sin tarima").trim() || "Sin tarima";
      const durationMinutes = Math.max(0, Number(row.durationMinutes || 0));
      const pieces = Math.max(0, Number(row.piecesReviewed || 0));

      if (!palletMap.has(tarimaKey)) {
        palletMap.set(tarimaKey, {
          key: tarimaKey,
          tarima: tarimaKey,
          sessions: 0,
          totalMinutes: 0,
          totalPieces: 0,
          products: new Set(),
          boards: new Set(),
        });
      }

      const entry = palletMap.get(tarimaKey);
      entry.sessions += 1;
      entry.totalMinutes += durationMinutes;
      entry.totalPieces += pieces;
      entry.products.add(String(row.productValue || "Sin producto"));
      entry.boards.add(String(row.boardName || "Tablero"));
    });

    return Array.from(palletMap.values())
      .map((entry) => {
        const avgMinutesPerSession = entry.sessions > 0 ? entry.totalMinutes / entry.sessions : 0;
        const secondsPerPiece = entry.totalPieces > 0
          ? (entry.totalMinutes * 60) / entry.totalPieces
          : null;
        return {
          ...entry,
          productCount: entry.products.size,
          boardCount: entry.boards.size,
          avgMinutesPerSession,
          secondsPerPiece,
          minutesPerPiece: secondsPerPiece !== null ? secondsPerPiece / 60 : null,
          topProducts: Array.from(entry.products).slice(0, 3).join(", "),
        };
      })
      .sort((left, right) => right.totalMinutes - left.totalMinutes);
  }, [dashboardEnrichedInventoryRows]);

  const dashboardProductPerformanceRows = useMemo(() => {
    const productMap = new Map();

    dashboardEnrichedInventoryRows.forEach((row) => {
      const productKey = row.productKey || String(row.productValue || "sin producto").trim().toLowerCase();
      const tarimaKey = String(row.tarimaValue || "Sin tarima").trim() || "Sin tarima";

      if (!productMap.has(productKey)) {
        productMap.set(productKey, {
          key: productKey,
          product: row.productValue || "Sin producto",
          sessions: 0,
          totalMinutes: 0,
          totalPieces: 0,
          boards: new Set(),
          tarimas: new Map(),
        });
      }

      const productEntry = productMap.get(productKey);
      productEntry.sessions += 1;
      productEntry.totalMinutes += Math.max(0, Number(row.durationMinutes || 0));
      productEntry.totalPieces += Math.max(0, Number(row.piecesReviewed || 0));
      productEntry.boards.add(String(row.boardName || "Tablero"));

      if (!productEntry.tarimas.has(tarimaKey)) {
        productEntry.tarimas.set(tarimaKey, {
          key: `${productKey}::${tarimaKey}`,
          tarima: tarimaKey,
          sessions: 0,
          totalMinutes: 0,
          totalPieces: 0,
        });
      }

      const tarimaEntry = productEntry.tarimas.get(tarimaKey);
      tarimaEntry.sessions += 1;
      tarimaEntry.totalMinutes += Math.max(0, Number(row.durationMinutes || 0));
      tarimaEntry.totalPieces += Math.max(0, Number(row.piecesReviewed || 0));
    });

    return Array.from(productMap.values())
      .map((entry) => {
        const tarimas = Array.from(entry.tarimas.values())
          .map((tarima) => ({
            ...tarima,
            avgMinutesPerSession: tarima.sessions > 0 ? tarima.totalMinutes / tarima.sessions : 0,
            secondsPerPiece: tarima.totalPieces > 0 ? (tarima.totalMinutes * 60) / tarima.totalPieces : null,
          }))
          .sort((left, right) => right.totalPieces - left.totalPieces || right.totalMinutes - left.totalMinutes);

        const palletCount = tarimas.length;
        const avgMinutesPerPallet = palletCount > 0 ? entry.totalMinutes / palletCount : 0;
        const avgMinutesPerSession = entry.sessions > 0 ? entry.totalMinutes / entry.sessions : 0;
        const secondsPerPiece = entry.totalPieces > 0 ? (entry.totalMinutes * 60) / entry.totalPieces : null;

        return {
          key: entry.key,
          product: entry.product,
          sessions: entry.sessions,
          palletCount,
          totalMinutes: entry.totalMinutes,
          totalPieces: entry.totalPieces,
          avgMinutesPerPallet,
          avgMinutesPerSession,
          secondsPerPiece,
          boardCount: entry.boards.size,
          tarimas,
        };
      })
      .sort((left, right) => right.totalPieces - left.totalPieces || right.totalMinutes - left.totalMinutes);
  }, [dashboardEnrichedInventoryRows]);

  const dashboardProductAggregateRows = useMemo(() => {
    // Agregación por tarima + producto con tiempo REAL
    const aggregateMap = new Map();
    
    dashboardEnrichedInventoryRows.forEach((row) => {
      if (!row.rowValues || typeof row.rowValues !== "object") return;
      if (!Array.isArray(row.sourceFields)) return;
      
      const tarimValue = row.tarimaValue || "Sin tarima";
      const productValue = row.productValue || "Sin producto";
      const timeMinutes = Math.max(0, Number(row.durationMinutes || 0));
      const piecesReviewed = Math.max(0, Number(row.piecesReviewed || 0));
      
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
          totalPieces: 0,
          minMinutes: Infinity,
          maxMinutes: -Infinity,
        });
      }
      
      const entry = aggregateMap.get(aggregateKey);
      entry.count += 1;
      entry.totalMinutes += timeMinutes;
      entry.totalPieces += piecesReviewed;
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
        secondsPerPiece: row.totalPieces > 0 ? (row.totalMinutes * 60) / row.totalPieces : null,
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [dashboardEnrichedInventoryRows]);

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

  const dashboardBoardInsightRows = useMemo(() => {
    function normalizeBoardText(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }

    function isReturnsReconditionBoard(boardName, boardId) {
      const key = normalizeBoardText(`${boardId} ${boardName}`);
      return key.includes("devolucion") || key.includes("reacondicion");
    }

    const boardMap = new Map();

    filteredDashboardRecords
      .filter((record) => record.source === "board")
      .forEach((record) => {
        const boardToken = String(record.boardId || "").trim()
          ? `id:${String(record.boardId).trim()}`
          : `name:${String(record.boardName || "Tablero").trim()}`;
        if (!boardMap.has(boardToken)) {
          boardMap.set(boardToken, {
            key: boardToken,
            boardId: String(record.boardId || "").trim(),
            boardName: record.boardName || "Tablero",
            area: record.area || "Sin área",
            totalRecords: 0,
            completed: 0,
            running: 0,
            paused: 0,
            totalSeconds: 0,
            pauseSeconds: 0,
            responsibleIds: new Set(),
            dynamicMetrics: [],
            inventoryProducts: [],
            isReturnsBoard: isReturnsReconditionBoard(record.boardName, record.boardId),
            returnsDevolucion: 0,
            returnsReacondicionado: 0,
            tarimas: new Set(),
            piecesTotal: 0,
          });
        }

        const entry = boardMap.get(boardToken);
        entry.totalRecords += 1;
        if (record.status === STATUS_FINISHED) entry.completed += 1;
        if (record.status === STATUS_RUNNING) entry.running += 1;
        if (record.status === STATUS_PAUSED) entry.paused += 1;
        entry.totalSeconds += Number(record.durationSeconds || 0);
        entry.pauseSeconds += Number(record.pauseSeconds || 0);
        if (record.responsibleId) entry.responsibleIds.add(record.responsibleId);

        if (entry.isReturnsBoard) {
          const fields = Array.isArray(record.sourceFields) ? record.sourceFields : [];
          const values = record.rowValues && typeof record.rowValues === "object" ? record.rowValues : {};
          fields.forEach((field) => {
            const label = normalizeBoardText(field?.label || field?.name || field?.key || "");
            const rawValue = values[field.id] ?? values[field.key] ?? values[field.name];
            const textValue = normalizeBoardText(rawValue);
            if (label.includes("tarima") && textValue) entry.tarimas.add(String(rawValue || "").trim());
            if (label.includes("flujo") || label.includes("tipo") || label.includes("proceso")) {
              if (textValue.includes("reacond")) entry.returnsReacondicionado += 1;
              else if (textValue.includes("devoluc")) entry.returnsDevolucion += 1;
            }
          });
        }

        const metrics = resolveDashboardInventoryRowMetrics(record, inventoryItemsById);
        if (metrics.piecesReviewed > 0) entry.piecesTotal += metrics.piecesReviewed;
      });

    const metricsByBoardToken = new Map();
    dashboardDynamicMetricRows.forEach((metric) => {
      const boardToken = metric.boardId ? `id:${metric.boardId}` : `name:${metric.boardName || "Tablero"}`;
      if (!metricsByBoardToken.has(boardToken)) metricsByBoardToken.set(boardToken, []);
      metricsByBoardToken.get(boardToken).push(metric);
    });

    dashboardAreaBoardDetailedRows.forEach((areaItem) => {
      (areaItem.boards || []).forEach((board) => {
        const boardToken = board.boardToken || (board.boardId ? `id:${board.boardId}` : `name:${board.boardName}`);
        if (!boardMap.has(boardToken)) {
          boardMap.set(boardToken, {
            key: boardToken,
            boardId: board.boardId || "",
            boardName: board.boardName || "Tablero",
            area: areaItem.area || "Sin área",
            totalRecords: board.totalRecords || 0,
            completed: board.completed || 0,
            running: board.running || 0,
            paused: board.paused || 0,
            totalSeconds: (board.productionHours || 0) * 3600,
            pauseSeconds: (board.pauseHours || 0) * 3600,
            responsibleIds: new Set(),
            dynamicMetrics: board.dynamicMetrics || [],
            inventoryProducts: board.inventoryProducts || [],
            isReturnsBoard: isReturnsReconditionBoard(board.boardName, board.boardId),
            returnsDevolucion: 0,
            returnsReacondicionado: 0,
            tarimas: new Set(),
            piecesTotal: 0,
          });
        } else {
          const entry = boardMap.get(boardToken);
          entry.dynamicMetrics = board.dynamicMetrics || entry.dynamicMetrics;
          entry.inventoryProducts = board.inventoryProducts || entry.inventoryProducts;
        }
      });
    });

    return Array.from(boardMap.values())
      .map((entry) => {
        const boardToken = entry.key;
        const mergedMetrics = (metricsByBoardToken.get(boardToken) || entry.dynamicMetrics || [])
          .slice()
          .sort((left, right) => right.count - left.count || right.average - left.average)
          .slice(0, 8);
        const completionPercent = entry.totalRecords ? (entry.completed / entry.totalRecords) * 100 : 0;
        const averageCycleMinutes = entry.completed ? entry.totalSeconds / entry.completed / 60 : 0;
        const efficiencyPercent = entry.totalSeconds + entry.pauseSeconds > 0
          ? (entry.totalSeconds / (entry.totalSeconds + entry.pauseSeconds)) * 100
          : 100;

        return {
          ...entry,
          responsibleCount: entry.responsibleIds.size,
          completionPercent,
          averageCycleMinutes,
          productionHours: entry.totalSeconds / 3600,
          pauseHours: entry.pauseSeconds / 3600,
          efficiencyPercent,
          dynamicMetrics: mergedMetrics,
          tarimaCount: entry.tarimas.size,
        };
      })
      .sort((left, right) => right.totalRecords - left.totalRecords || left.boardName.localeCompare(right.boardName, "es-MX"));
  }, [
    dashboardAreaBoardDetailedRows,
    dashboardDynamicMetricRows,
    filteredDashboardRecords,
    inventoryItemsById,
  ]);

  const dashboardBoardKpiCards = useMemo(() => (
    dashboardBoardInsightRows.flatMap((board) => {
      const prefix = board.boardName.length > 22 ? `${board.boardName.slice(0, 22)}…` : board.boardName;
      const cards = [
        {
          cardKey: `${board.key}-records`,
          title: `${prefix} · Registros`,
          value: String(board.totalRecords),
          subtitle: `${board.area} · ${board.completed} cerrados`,
          tone: "cyan",
        },
        {
          cardKey: `${board.key}-completion`,
          title: `${prefix} · Cumplimiento`,
          value: `${Math.round(board.completionPercent)}%`,
          subtitle: `${board.running} en curso · ${board.paused} pausados`,
          tone: board.completionPercent >= 80 ? "green" : board.completionPercent >= 50 ? "amber" : "red",
          progress: board.completionPercent,
        },
        {
          cardKey: `${board.key}-cycle`,
          title: `${prefix} · Ciclo prom.`,
          value: `${(board.averageCycleMinutes || 0).toFixed(1)} min`,
          subtitle: `${(board.productionHours || 0).toFixed(1)} h productivas`,
          tone: "slate",
        },
        {
          cardKey: `${board.key}-efficiency`,
          title: `${prefix} · Eficiencia`,
          value: `${(board.efficiencyPercent || 0).toFixed(1)}%`,
          subtitle: `${(board.pauseHours || 0).toFixed(1)} h en pausa`,
          tone: board.efficiencyPercent >= 80 ? "lime" : board.efficiencyPercent >= 60 ? "amber" : "red",
          progress: board.efficiencyPercent,
        },
      ];

      (board.dynamicMetrics || []).slice(0, 2).forEach((metric, index) => {
        cards.push({
          cardKey: `${board.key}-metric-${metric.fieldId || index}`,
          title: `${prefix} · ${metric.fieldLabel}`,
          value: `${(metric.average || 0).toFixed(2)}${metric.unit ? ` ${metric.unit}` : ""}`,
          subtitle: `${metric.count} muestra(s) · prom. detectado`,
          tone: metric.fieldType === "time" || metric.fieldType === "duration" ? "cyan" : "slate",
        });
      });

      if (board.isReturnsBoard) {
        cards.push(
          {
            cardKey: `${board.key}-returns-dev`,
            title: "Devoluciones · flujo",
            value: String(board.returnsDevolucion || 0),
            subtitle: `${board.boardName} · registros marcados`,
            tone: "amber",
          },
          {
            cardKey: `${board.key}-returns-recon`,
            title: "Reacondicionado · flujo",
            value: String(board.returnsReacondicionado || 0),
            subtitle: `${board.boardName} · registros marcados`,
            tone: "green",
          },
          {
            cardKey: `${board.key}-returns-tarimas`,
            title: "Tarimas revisadas",
            value: String(board.tarimaCount || 0),
            subtitle: "Devoluciones / Reacondicionado",
            tone: "cyan",
          },
        );
      }

      if (board.piecesTotal > 0) {
        cards.push({
          cardKey: `${board.key}-pieces`,
          title: `${prefix} · Piezas`,
          value: String(Math.round(board.piecesTotal)),
          subtitle: "Piezas revisadas en el periodo",
          tone: "lime",
        });
      }

      return cards;
    })
  ), [dashboardBoardInsightRows]);
  return {
    catalogMap,
    userMap,
    activeWeek,
    historyWeek,
    visibleDashboardActivities,
    completedActivities,
    dashboardVisibleControlBoards,
    dashboardVisibleBoardHistorySnapshots,
    activityPauseSummaryMap,
    dashboardRecords,
    dateFilteredDashboardRecords,
    dashboardPeriodOptions,
    dashboardEffectiveAreaFilter,
    filteredDashboardRecords,
    filteredDashboardActivities,
    filteredDashboardCompleted,
    dashboardPauseLogs,
    dashboardMetrics,
    rankingByUser,
    distributionByUser,
    activityVsLimit,
    pauseAnalysis,
    dashboardDynamicMetricRows,
    dashboardInventoryProductTimeRows,
    dashboardEnrichedInventoryRows,
    dashboardPalletLeaderboardRows,
    dashboardProductPerformanceRows,
    dashboardProductAggregateRows,
    dashboardBoardInsightRows,
    dashboardBoardKpiCards,
    inventoryItemsById,
    dashboardAreaBoardDetailedRows,
    dashboardAreaRows,
    dashboardTrendRows,
    dashboardParetoRows,
    dashboardIshikawaRows,
    adminReportRows,
    historyPauseLogs,
    dashboardResponsibleRows,
    dashboardActivityRows,
    dashboardDistributionRows,
  };
}
