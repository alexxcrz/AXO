import { createDashboardPdfContext, DASHBOARD_PDF_THEME, getDashboardPdfAreaAccent } from "./dashboardPdfTheme.js";
import { loadJsPdfWithAutoTable } from "./jspdfLoader.js";

export function kpiCardsToPdfGridItems(cards = []) {
  return (Array.isArray(cards) ? cards : []).map((card) => ({
    value: card.valueMeta ? `${card.value} (${card.valueMeta})` : String(card.value ?? "-"),
    label: String(card.title || ""),
    sub: String(card.subtitle || ""),
    warn: card.tone === "amber",
    alert: card.tone === "red",
  }));
}

export function spotlightsToPdfTableBody(spotlights = []) {
  return spotlights.map((item) => [String(item.label || ""), String(item.value ?? "-")]);
}

export function boardRowsToPdfTableBody(boardRows = [], formatMetricNumber) {
  return (Array.isArray(boardRows) ? boardRows : []).map((board) => [
    String(board.boardName || "-"),
    String(board.totalRecords || 0),
    `${Math.round(board.completionPercent || 0)}%`,
    board.piecesTotal > 0 ? formatMetricNumber(board.piecesTotal, 0) : "-",
  ]);
}

function buildFilterSummaryRows(dashboardFilters, visibleUsers, areaLabel) {
  const playerLabel = dashboardFilters.responsibleId === "all"
    ? "Todos los players"
    : visibleUsers.find((user) => user.id === dashboardFilters.responsibleId)?.name || "Player filtrado";
  const rangeLabel = dashboardFilters.startDate || dashboardFilters.endDate
    ? `${dashboardFilters.startDate || "inicio"} -> ${dashboardFilters.endDate || "fin"}`
    : "Sin filtro por fecha";
  return [
    ["Area / vista", areaLabel],
    ["Player", playerLabel],
    ["Rango de fechas", rangeLabel],
    ["Periodo", dashboardFilters.periodKey === "all" ? "Todo el historial filtrado" : String(dashboardFilters.periodKey || "-")],
  ];
}

function slugifyFilePart(value) {
  return String(value || "dashboard")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "dashboard";
}

/** PDF de un panel de area (vista general corporativa). */
export async function exportAreaPanelDashboardPdf({
  panel,
  dashboardFilters,
  visibleUsers,
  formatMetricNumber,
}) {
  if (!panel?.section) return;

  const { jsPDF, autoTable } = await loadJsPdfWithAutoTable();
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const areaLabel = panel.section.label;
  const accent = getDashboardPdfAreaAccent(areaLabel);
  const pdfCtx = createDashboardPdfContext(pdf, { areaLabel, accent });
  const { marginX, printableWidth, exportDate, addPageHeader, addPageFooter, drawSectionTable, drawKpiGrid } = pdfCtx;

  pdf.setFillColor(...accent);
  pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text(`Dashboard - ${areaLabel}`, marginX, 100);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text(panel.theme?.subtitle || "Resumen operativo del area", marginX, 128);
  pdf.setFontSize(10);
  pdf.text(`Exportado: ${exportDate}`, marginX, 148);
  if (panel.hasActivity) {
    pdf.text(`${panel.sharePercent}% del volumen general`, marginX, 166);
  }

  const coverKpis = (panel.kpiCards || []).slice(0, 4);
  coverKpis.forEach((kpi, index) => {
    const bx = marginX + index * (printableWidth / 4 + 4);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(String(kpi.value ?? "-"), bx, 220);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(String(kpi.title || "").substring(0, 24), bx, 236);
  });

  pdf.addPage();
  addPageHeader(`KPIs - ${areaLabel}`, panel.theme?.executiveSubtitle || panel.theme?.subtitle || "");
  autoTable(pdf, {
    startY: 66,
    head: [["Filtro", "Valor"]],
    body: buildFilterSummaryRows(dashboardFilters, visibleUsers, areaLabel),
    margin: { left: marginX, right: marginX },
    tableWidth: printableWidth * 0.5,
    styles: { fontSize: 7.5, cellPadding: 4 },
    headStyles: { fillColor: accent, textColor: [255, 255, 255] },
  });

  const kpiStartY = (pdf.lastAutoTable?.finalY || 66) + 14;
  drawKpiGrid(kpiStartY, kpiCardsToPdfGridItems(panel.kpiCards));

  if (panel.dataSourceNote) {
    const noteY = (pdf.lastAutoTable?.finalY || kpiStartY + 120) + 10;
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8);
    pdf.setTextColor(...DASHBOARD_PDF_THEME.textMid);
    pdf.text(panel.dataSourceNote, marginX, noteY, { maxWidth: printableWidth });
  }

  if (panel.spotlights?.length) {
    drawSectionTable(
      "Indicadores destacados",
      ["Indicador", "Valor"],
      spotlightsToPdfTableBody(panel.spotlights),
      { autoTable, accent },
    );
  }

  if (panel.boardRows?.length) {
    drawSectionTable(
      "Tableros del area",
      ["Tablero", "Registros", "Cumplimiento", "Piezas"],
      boardRowsToPdfTableBody(panel.boardRows, formatMetricNumber),
      { autoTable, accent },
    );
  } else {
    drawSectionTable(
      "Tableros del area",
      ["Mensaje"],
      [["Sin registros de tableros en el periodo para esta area."]],
      { autoTable, accent },
    );
  }

  addPageFooter(`Dashboard ${areaLabel} - AXIS ORDO`);
  const datePart = new Date().toISOString().slice(0, 10);
  pdf.save(`dashboard-${slugifyFilePart(panel.section.id)}-${datePart}.pdf`);
}

/** Anade al PDF una pagina por cada panel del dashboard general. */
export function appendGeneralAreaPanelsToPdf(pdf, pdfCtx, {
  panels = [],
  autoTable,
  formatMetricNumber,
}) {
  const { addPageHeader, drawSectionTable, drawKpiGrid } = pdfCtx;

  panels.forEach((panel) => {
    pdf.addPage();
    const accent = getDashboardPdfAreaAccent(panel.section?.label);
    addPageHeader(
      `Dashboard - ${panel.section?.label || "Area"}`,
      panel.theme?.subtitle || "KPIs operativos del area en el periodo filtrado",
      accent,
    );

    let cursorY = 76;
    cursorY = drawKpiGrid(cursorY, kpiCardsToPdfGridItems(panel.kpiCards));

    if (panel.dataSourceNote) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(...DASHBOARD_PDF_THEME.textMid);
      pdf.text(panel.dataSourceNote, pdfCtx.marginX, cursorY + 4, { maxWidth: pdfCtx.printableWidth });
      cursorY += 18;
    }

    if (panel.spotlights?.length) {
      drawSectionTable(
        "Indicadores destacados",
        ["Indicador", "Valor"],
        spotlightsToPdfTableBody(panel.spotlights),
        { autoTable, accent },
      );
    }

    if (panel.boardRows?.length) {
      drawSectionTable(
        "Tableros",
        ["Tablero", "Registros", "Cumplimiento", "Piezas"],
        boardRowsToPdfTableBody(panel.boardRows, formatMetricNumber),
        { autoTable, accent },
      );
    }
  });
}

export function buildDashboardPdfFileName({
  areaLabel,
  sectionId,
  startDate,
  endDate,
  isGeneralView,
}) {
  const datePart = new Date().toISOString().slice(0, 10);
  if (startDate || endDate) {
    return `dashboard-${slugifyFilePart(sectionId || areaLabel)}-${startDate || "inicio"}-${endDate || "fin"}.pdf`;
  }
  if (isGeneralView) {
    return `dashboard-general-${datePart}.pdf`;
  }
  return `dashboard-${slugifyFilePart(sectionId || areaLabel)}-${datePart}.pdf`;
}
