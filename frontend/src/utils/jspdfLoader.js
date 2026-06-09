let jspdfBundlePromise = null;

/** Carga jsPDF + jspdf-autotable una sola vez (chunk separado del bundle principal). */
export function loadJsPdfWithAutoTable() {
  if (!jspdfBundlePromise) {
    jspdfBundlePromise = Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]).then(([jspdfModule, autoTableModule]) => ({
      jsPDF: jspdfModule.jsPDF,
      autoTable: autoTableModule.default || autoTableModule.autoTable,
    }));
  }
  return jspdfBundlePromise;
}

/** Solo jsPDF (p. ej. etiquetas retail sin tablas). */
export async function loadJsPdf() {
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}
