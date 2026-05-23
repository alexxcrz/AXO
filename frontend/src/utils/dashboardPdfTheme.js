/** Tema PDF alineado al dashboard v2 (COPMEC / AXIS ORDO). */

export const DASHBOARD_PDF_THEME = {
  brand: [15, 76, 92],
  brandLight: [20, 184, 166],
  brandAccent: [29, 78, 216],
  surface: [247, 250, 252],
  border: [203, 213, 225],
  textDark: [15, 23, 42],
  textMid: [71, 85, 105],
  textMuted: [100, 116, 139],
  success: [22, 163, 74],
  warning: [217, 119, 6],
  danger: [220, 38, 38],
  info: [14, 165, 233],
};

function normalizePdfAreaKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getDashboardPdfAreaAccent(areaName) {
  const key = normalizePdfAreaKey(areaName);
  if (key.includes("inventario") || key.includes("revision")) return [15, 118, 110];
  if (key.includes("limpieza")) return [29, 78, 216];
  if (key.includes("regulatorio") || key.includes("calidad")) return [109, 40, 217];
  if (key.includes("recepcion") || key.includes("pedido")) return [180, 83, 9];
  if (key.includes("operacion") || key.includes("transporte")) return [3, 105, 161];
  if (key.includes("retail") || key.includes("mayoreo") || key.includes("ecommerce")) return [190, 24, 93];
  return DASHBOARD_PDF_THEME.brand;
}

export function getDashboardPdfBoardAccent(boardName, areaName) {
  const boardKey = normalizePdfAreaKey(boardName);
  if (boardKey.includes("devolucion") || boardKey.includes("reacondicion")) return [180, 83, 9];
  if (boardKey.includes("tarima") || boardKey.includes("inventario")) return [15, 118, 110];
  if (boardKey.includes("limpieza")) return [29, 78, 216];
  return getDashboardPdfAreaAccent(areaName);
}

export function createDashboardPdfContext(pdf, options = {}) {
  const marginX = Number(options.marginX) || 28;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const printableWidth = pageWidth - marginX * 2;
  const exportDate = options.exportDate
    || new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  const areaLabel = String(options.areaLabel || "General").trim() || "General";
  const accent = options.accent || DASHBOARD_PDF_THEME.brand;

  function addPageHeader(title, subtitle, headerAccent = accent) {
    pdf.setFillColor(...headerAccent);
    pdf.rect(0, 0, pageWidth, 54, "F");
    pdf.setFillColor(...DASHBOARD_PDF_THEME.brandLight);
    pdf.rect(0, 48, pageWidth, 4, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(title, marginX, 24);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.text(subtitle || `Exportado: ${exportDate}`, marginX, 40);
    pdf.text(`AXIS ORDO � ${areaLabel}`, pageWidth - marginX, 40, { align: "right" });
  }

  function addPageFooter(footerLabel = "Dashboard operativo") {
    const totalPages = pdf.getNumberOfPages();
    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
      pdf.setPage(pageIndex);
      pdf.setFillColor(...DASHBOARD_PDF_THEME.surface);
      pdf.rect(0, pageHeight - 22, pageWidth, 22, "F");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...DASHBOARD_PDF_THEME.textMuted);
      pdf.text(`${footerLabel} � ${exportDate}`, marginX, pageHeight - 8);
      pdf.text(`P�gina ${pageIndex} de ${totalPages}`, pageWidth - marginX, pageHeight - 8, { align: "right" });
    }
  }

  function drawSectionTable(title, head, body, tableOptions = {}) {
    const tableAccent = tableOptions.accent || accent;
    const startY = (pdf.lastAutoTable?.finalY || 70) + 16;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...DASHBOARD_PDF_THEME.textDark);
    pdf.text(title, marginX, startY);
    pdf.setDrawColor(...tableAccent);
    pdf.setLineWidth(1.5);
    pdf.line(marginX, startY + 3, marginX + pdf.getTextWidth(title) + 8, startY + 3);

    const autoTable = tableOptions.autoTable;
    if (!autoTable) return startY;

    autoTable(pdf, {
      startY: startY + 10,
      head: [head],
      body,
      margin: { left: marginX, right: marginX },
      tableWidth: printableWidth,
      styles: {
        fontSize: 7.5,
        cellPadding: 4.5,
        lineColor: DASHBOARD_PDF_THEME.border,
        lineWidth: 0.3,
        textColor: DASHBOARD_PDF_THEME.textDark,
      },
      headStyles: {
        fillColor: tableAccent,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: DASHBOARD_PDF_THEME.surface },
      ...tableOptions.tableConfig,
    });
    return pdf.lastAutoTable?.finalY || startY;
  }

  function drawKpiGrid(startY, items, columns = 6) {
    const cellW = printableWidth / columns;
    const cellH = 44;
    items.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const cx = marginX + col * cellW;
      const cy = startY + row * (cellH + 6);
      const accentColor = item.accent || (item.alert ? DASHBOARD_PDF_THEME.danger : item.warn ? DASHBOARD_PDF_THEME.warning : accent);
      pdf.setFillColor(...DASHBOARD_PDF_THEME.surface);
      pdf.setDrawColor(...DASHBOARD_PDF_THEME.border);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(cx, cy, cellW - 6, cellH, 4, 4, "FD");
      pdf.setFillColor(...accentColor);
      pdf.roundedRect(cx, cy, 4, cellH, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...DASHBOARD_PDF_THEME.textDark);
      pdf.text(String(item.value ?? "-"), cx + 10, cy + 22);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(...DASHBOARD_PDF_THEME.textMuted);
      pdf.text(String(item.label || "").substring(0, 28), cx + 10, cy + 34);
    });
    const rows = Math.ceil(items.length / columns);
    return startY + rows * (cellH + 6) + 8;
  }

  return {
    marginX,
    pageWidth,
    pageHeight,
    printableWidth,
    exportDate,
    areaLabel,
    accent,
    addPageHeader,
    addPageFooter,
    drawSectionTable,
    drawKpiGrid,
  };
}
