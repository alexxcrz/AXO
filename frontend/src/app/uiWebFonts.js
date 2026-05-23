/**
 * Web fonts so the selected typography looks the same on PC, tablet and mobile.
 * System fonts (Bahnschrift, Comic Sans MS, Calibri, etc.) are Windows-only;
 * Android/iOS need a loaded web font file.
 */

export const UI_FONT_WEB_SOURCES = {
  bahnschrift: { google: "Barlow", weights: "400;500;600;700", category: "sans-serif" },
  segoe: { google: "Open Sans", weights: "400;600;700", category: "sans-serif" },
  arial: { google: "Arimo", weights: "400;700", category: "sans-serif" },
  "arial-black": { google: "Archivo Black", weights: "400", category: "sans-serif" },
  trebuchet: { google: "Mulish", weights: "400;600;700", category: "sans-serif" },
  verdana: { google: "Noto Sans", weights: "400;600;700", category: "sans-serif" },
  tahoma: { google: "Noto Sans", weights: "400;600;700", category: "sans-serif" },
  calibri: { google: "Carlito", weights: "400;700", category: "sans-serif" },
  candara: { google: "Cantarell", weights: "400;700", category: "sans-serif" },
  corbel: { google: "Source Sans 3", weights: "400;600;700", category: "sans-serif" },
  franklin: { google: "Libre Franklin", weights: "400;600;700", category: "sans-serif" },
  century: { google: "Josefin Sans", weights: "400;600;700", category: "sans-serif" },
  futura: { google: "Jost", weights: "400;600;700", category: "sans-serif" },
  gill: { google: "Source Sans 3", weights: "400;600", category: "sans-serif" },
  optima: { google: "Nunito Sans", weights: "400;600;700", category: "sans-serif" },
  lucida: { google: "Source Sans 3", weights: "400;600", category: "sans-serif" },
  "lucida-console": { google: "Ubuntu Mono", weights: "400;700", category: "monospace" },
  arialn: { google: "Oswald", weights: "400;600", category: "sans-serif" },
  georgia: { google: "Merriweather", weights: "400;700", category: "serif" },
  times: { google: "Libre Baskerville", weights: "400;700", category: "serif" },
  cambria: { google: "Lora", weights: "400;600;700", category: "serif" },
  constantia: { google: "Cormorant", weights: "400;600;700", category: "serif" },
  palatino: { google: "Domine", weights: "400;600;700", category: "serif" },
  garamond: { google: "EB Garamond", weights: "400;600;700", category: "serif" },
  bookman: { google: "Libre Baskerville", weights: "400;700", category: "serif" },
  rockwell: { google: "Roboto Slab", weights: "400;600;700", category: "serif" },
  sitka: { google: "Spectral", weights: "400;600;700", category: "serif" },
  serif: { google: "Libre Baskerville", weights: "400;700", category: "serif" },
  impact: { google: "Anton", weights: "400", category: "sans-serif" },
  comic: { google: "Comic Neue", weights: "400;700", category: "sans-serif" },
  mono: { google: "JetBrains Mono", weights: "400;600", category: "monospace" },
  courier: { google: "Courier Prime", weights: "400;700", category: "monospace" },
};

const loadedFontIds = new Set();
const loadingPromises = new Map();

function buildGoogleFontsStylesheetUrl(fontId) {
  const source = UI_FONT_WEB_SOURCES[fontId];
  if (!source) return "";
  const family = encodeURIComponent(source.google).replace(/%20/g, "+");
  const weights = String(source.weights || "400");
  return `https://fonts.googleapis.com/css2?family=${family}:wght@${weights}&display=swap`;
}

function appendStylesheetOnce(href, key) {
  if (!href || typeof document === "undefined") return;
  const selector = `link[data-ui-web-font="${key}"]`;
  if (document.head.querySelector(selector)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.uiWebFont = key;
  document.head.appendChild(link);
}

export function ensureUiWebFontLoaded(fontId) {
  const normalizedId = String(fontId || "bahnschrift").trim() || "bahnschrift";
  const source = UI_FONT_WEB_SOURCES[normalizedId];
  if (!source || typeof document === "undefined") {
    return Promise.resolve(false);
  }
  if (loadedFontIds.has(normalizedId)) {
    return Promise.resolve(true);
  }
  if (loadingPromises.has(normalizedId)) {
    return loadingPromises.get(normalizedId);
  }

  const promise = new Promise((resolve) => {
    appendStylesheetOnce(buildGoogleFontsStylesheetUrl(normalizedId), normalizedId);
    const ready = () => {
      loadedFontIds.add(normalizedId);
      resolve(true);
    };
    if (document.fonts?.load) {
      document.fonts.load(`400 16px "${source.google}"`).then(ready).catch(ready);
      return;
    }
    globalThis.setTimeout(ready, 120);
  });

  loadingPromises.set(normalizedId, promise);
  return promise;
}

export function preloadCoreUiWebFonts() {
  return Promise.all([
    ensureUiWebFontLoaded("bahnschrift"),
    ensureUiWebFontLoaded("segoe"),
  ]);
}

export function buildCrossPlatformFontStack(fontId, localStack = "", category = "sans-serif") {
  const normalizedId = String(fontId || "bahnschrift").trim() || "bahnschrift";
  const source = UI_FONT_WEB_SOURCES[normalizedId];
  const safeLocal = String(localStack || "").trim();
  const safeCategory = String(category || source?.category || "sans-serif").trim() || "sans-serif";

  if (!source) {
    return safeLocal || safeCategory;
  }

  const parts = [`"${source.google}"`];
  if (safeLocal) parts.push(safeLocal);
  parts.push(safeCategory);
  return parts.join(", ");
}

export function getWebFontLabel(fontId) {
  return UI_FONT_WEB_SOURCES[String(fontId || "").trim()]?.google || "";
}
