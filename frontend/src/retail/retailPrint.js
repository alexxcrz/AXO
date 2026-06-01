/** Abre plantilla PDF en nueva ventana para imprimir desde el navegador. */
export function openRetailPdfPrint(templatePdfDataUrl, title = "Etiqueta retail") {
  const src = String(templatePdfDataUrl || "").trim();
  if (!src) {
    window.alert("No hay plantilla PDF cargada para esta huella.");
    return false;
  }
  const win = window.open("", "_blank");
  if (!win) {
    window.alert("Permite ventanas emergentes para imprimir.");
    return false;
  }
  const safeTitle = String(title || "Etiqueta").replace(/</g, "");
  win.document.write(`<!doctype html><html><head><title>${safeTitle}</title></head><body style="margin:0">`);
  if (src.startsWith("data:")) {
    win.document.write(`<embed src="${src}" type="application/pdf" width="100%" height="100%" style="position:fixed;inset:0" />`);
  } else {
    win.document.write(`<iframe src="${src}" style="border:0;position:fixed;inset:0;width:100%;height:100%"></iframe>`);
  }
  win.document.write("</body></html>");
  win.document.close();
  win.focus();
  return true;
}

export function readCsvFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Archivo no valido"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo"));
    reader.readAsText(file, "UTF-8");
  });
}

export function readPdfFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Archivo no valido"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el PDF"));
    reader.readAsDataURL(file);
  });
}
