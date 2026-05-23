import { Palette, Type } from "lucide-react";
import { getInitialRouteState } from "../utils/utilidades.jsx";
import {
  buildCrossPlatformFontStack,
  ensureUiWebFontLoaded,
  preloadCoreUiWebFonts,
  UI_FONT_WEB_SOURCES,
} from "./uiWebFonts.js";

const INITIAL_ROUTE_STATE = getInitialRouteState();
const HIDDEN_BASE_TEMPLATES_KEY = "copmec-hidden-base-templates";
const UI_THEME_KEY = "copmec-ui-theme";
const UI_FONT_KEY = "copmec-ui-font";
const UI_FONT_SIZE_KEY = "copmec-ui-font-size";
const getUserUiThemeKey = (userId) => `${UI_THEME_KEY}:${String(userId || "anon")}`;
const getUserUiFontKey = (userId) => `${UI_FONT_KEY}:${String(userId || "anon")}`;
const getUserUiFontSizeKey = (userId) => `${UI_FONT_SIZE_KEY}:${String(userId || "anon")}`;

const UI_THEME_OPTIONS = [
  { id: "copmec-bosque", label: "Acero AXO", kind: "solid", icon: Palette, primary: "#385878", shell: "#22384f", accent: "#6f8fa9" },
  { id: "copmec-arenisca", label: "Arenisca", kind: "solid", icon: Palette, primary: "#6a5a3f", shell: "#3f3526", accent: "#8e7a58" },
  { id: "copmec-noche", label: "Grafito", kind: "solid", icon: Palette, primary: "#2f3642", shell: "#1f242d", accent: "#475267" },
  { id: "copmec-oceano", label: "Oceano", kind: "solid", icon: Palette, primary: "#0f4c5c", shell: "#083742", accent: "#1f7085" },
  { id: "copmec-cobre", label: "Cobre", kind: "solid", icon: Palette, primary: "#8a4f2d", shell: "#5e341c", accent: "#b06b43" },
  { id: "copmec-vino", label: "Vino", kind: "solid", icon: Palette, primary: "#7d2245", shell: "#551731", accent: "#a63a66" },
  { id: "copmec-ceniza", label: "Ceniza", kind: "solid", icon: Palette, primary: "#3f4654", shell: "#2b303b", accent: "#5c677a" },
  { id: "copmec-indigo", label: "Indigo", kind: "solid", icon: Palette, primary: "#2f3f87", shell: "#202c5f", accent: "#4a5cb3" },
  { id: "copmec-oliva", label: "Oliva", kind: "solid", icon: Palette, primary: "#314658", shell: "#212f3c", accent: "#4a6987" },
  { id: "copmec-coral", label: "Coral", kind: "solid", icon: Palette, primary: "#b44b46", shell: "#7f2f2b", accent: "#d9776e" },
  { id: "copmec-menta", label: "Menta", kind: "solid", icon: Palette, primary: "#36546f", shell: "#263b4d", accent: "#5f8fbe" },
  { id: "copmec-solar", label: "Solar", kind: "solid", icon: Palette, primary: "#b37a18", shell: "#7e5411", accent: "#d4a017" },
  { id: "copmec-ciruela", label: "Ciruela", kind: "solid", icon: Palette, primary: "#6b2f6f", shell: "#48204b", accent: "#9b4dab" },
  { id: "copmec-petroleo", label: "Petroleo", kind: "solid", icon: Palette, primary: "#245964", shell: "#173b42", accent: "#3d7a88" },
  { id: "copmec-hielo", label: "Hielo", kind: "solid", icon: Palette, primary: "#5b8fa8", shell: "#2f4f62", accent: "#9ec5dc" },
  { id: "copmec-esmeralda", label: "Esmeralda", kind: "solid", icon: Palette, primary: "#1f6f4f", shell: "#0f3d2c", accent: "#34a36f" },
  { id: "copmec-rubi", label: "Rubi", kind: "solid", icon: Palette, primary: "#9f1239", shell: "#4c0519", accent: "#e11d48" },
  { id: "copmec-azul-real", label: "Azul Real", kind: "solid", icon: Palette, primary: "#1d4ed8", shell: "#1e3a8a", accent: "#60a5fa" },
  { id: "copmec-lino", label: "Lino", kind: "solid", icon: Palette, primary: "#78716c", shell: "#44403c", accent: "#a8a29e" },
  { id: "copmec-rosa-suave", label: "Rosa Suave", kind: "solid", icon: Palette, primary: "#db2777", shell: "#831843", accent: "#f472b6" },
  { id: "copmec-dorado", label: "Dorado", kind: "solid", icon: Palette, primary: "#a16207", shell: "#713f12", accent: "#eab308" },
  { id: "copmec-pino", label: "Pino", kind: "solid", icon: Palette, primary: "#166534", shell: "#14532d", accent: "#22c55e" },
  { id: "copmec-pizarra", label: "Pizarra", kind: "solid", icon: Palette, primary: "#334155", shell: "#1e293b", accent: "#64748b" },
  { id: "copmec-aurora", label: "Aurora", kind: "gradient", icon: Palette, primary: "#2c7a7b", shell: "#553c9a", accent: "#14b8a6", gradient: "135deg, #553c9a 0%, #2c7a7b 48%, #14b8a6 100%" },
  { id: "copmec-atardecer", label: "Atardecer", kind: "gradient", icon: Palette, primary: "#f97316", shell: "#be185d", accent: "#fbbf24", gradient: "135deg, #be185d 0%, #f97316 52%, #fbbf24 100%" },
  { id: "copmec-laguna", label: "Laguna", kind: "gradient", icon: Palette, primary: "#0ea5e9", shell: "#405db0", accent: "#67e8f9", gradient: "135deg, #405db0 0%, #0ea5e9 50%, #67e8f9 100%" },
  { id: "copmec-flama", label: "Flama", kind: "gradient", icon: Palette, primary: "#f59e0b", shell: "#ef4444", accent: "#fde047", gradient: "135deg, #ef4444 0%, #f59e0b 55%, #fde047 100%" },
  { id: "copmec-neon", label: "Neon", kind: "gradient", icon: Palette, primary: "#5f8fbe", shell: "#0ea5e9", accent: "#22d3ee", gradient: "135deg, #0ea5e9 0%, #5f8fbe 45%, #22d3ee 100%" },
  { id: "copmec-berry", label: "Berry", kind: "gradient", icon: Palette, primary: "#e11d48", shell: "#7c3aed", accent: "#fb7185", gradient: "135deg, #7c3aed 0%, #e11d48 52%, #fb7185 100%" },
  { id: "copmec-g-cielo", label: "Cielo Dia", kind: "gradient", icon: Palette, primary: "#0284c7", shell: "#0c4a6e", accent: "#7dd3fc", gradient: "135deg, #0c4a6e 0%, #0284c7 45%, #7dd3fc 100%" },
  { id: "copmec-g-fuego", label: "Fuego", kind: "gradient", icon: Palette, primary: "#dc2626", shell: "#7f1d1d", accent: "#fbbf24", gradient: "135deg, #7f1d1d 0%, #dc2626 42%, #fbbf24 100%" },
  { id: "copmec-g-bosque", label: "Bosque Vivo", kind: "gradient", icon: Palette, primary: "#15803d", shell: "#14532d", accent: "#86efac", gradient: "135deg, #14532d 0%, #15803d 50%, #86efac 100%" },
  { id: "copmec-g-violeta", label: "Violeta", kind: "gradient", icon: Palette, primary: "#7c3aed", shell: "#4c1d95", accent: "#c4b5fd", gradient: "135deg, #4c1d95 0%, #7c3aed 48%, #c4b5fd 100%" },
  { id: "copmec-g-rosa-dorado", label: "Rosa Dorado", kind: "gradient", icon: Palette, primary: "#ec4899", shell: "#9d174d", accent: "#fbbf24", gradient: "135deg, #9d174d 0%, #ec4899 45%, #fbbf24 100%" },
  { id: "copmec-g-hielo-fuego", label: "Hielo y Fuego", kind: "gradient", icon: Palette, primary: "#3b82f6", shell: "#1e3a8a", accent: "#f59e0b", gradient: "135deg, #1e3a8a 0%, #3b82f6 42%, #f59e0b 100%" },
  { id: "copmec-g-metal", label: "Metal", kind: "gradient", icon: Palette, primary: "#64748b", shell: "#334155", accent: "#cbd5e1", gradient: "135deg, #334155 0%, #64748b 50%, #cbd5e1 100%" },
  { id: "copmec-g-cereza", label: "Cereza", kind: "gradient", icon: Palette, primary: "#be123c", shell: "#881337", accent: "#fda4af", gradient: "135deg, #881337 0%, #be123c 48%, #fda4af 100%" },
  { id: "copmec-g-medianoche", label: "Medianoche", kind: "gradient", icon: Palette, primary: "#6366f1", shell: "#020617", accent: "#38bdf8", gradient: "135deg, #020617 0%, #312e81 45%, #38bdf8 100%" },
  { id: "copmec-g-tropical", label: "Tropical", kind: "gradient", icon: Palette, primary: "#059669", shell: "#0f766e", accent: "#facc15", gradient: "135deg, #0f766e 0%, #059669 42%, #facc15 100%" },
  { id: "copmec-g-liquido", label: "Liquido", kind: "gradient", icon: Palette, primary: "#06b6d4", shell: "#164e63", accent: "#a5f3fc", gradient: "120deg, #164e63 0%, #06b6d4 38%, #a5f3fc 100%" },
  { id: "copmec-g-royal", label: "Royal", kind: "gradient", icon: Palette, primary: "#1e40af", shell: "#172554", accent: "#93c5fd", gradient: "135deg, #172554 0%, #1e40af 50%, #93c5fd 100%" },
];

const UI_FONT_OPTIONS_RAW = [
  { id: "bahnschrift", label: "Bahnschrift", icon: Type, localStack: '"Bahnschrift", "Segoe UI"' },
  { id: "segoe", label: "Segoe UI", icon: Type, localStack: '"Segoe UI", "Segoe UI Variable"' },
  { id: "arial", label: "Arial", icon: Type, localStack: "Arial, Helvetica" },
  { id: "arial-black", label: "Arial Black", icon: Type, localStack: '"Arial Black", Arial' },
  { id: "trebuchet", label: "Trebuchet MS", icon: Type, localStack: '"Trebuchet MS", "Segoe UI"' },
  { id: "verdana", label: "Verdana", icon: Type, localStack: "Verdana, Arial" },
  { id: "tahoma", label: "Tahoma", icon: Type, localStack: "Tahoma, Verdana" },
  { id: "calibri", label: "Calibri", icon: Type, localStack: 'Calibri, "Segoe UI"' },
  { id: "candara", label: "Candara", icon: Type, localStack: "Candara, Calibri" },
  { id: "corbel", label: "Corbel", icon: Type, localStack: "Corbel, Candara" },
  { id: "franklin", label: "Franklin Gothic", icon: Type, localStack: '"Franklin Gothic Medium", Arial' },
  { id: "century", label: "Century Gothic", icon: Type, localStack: '"Century Gothic", "Trebuchet MS"' },
  { id: "futura", label: "Futura", icon: Type, localStack: 'Futura, "Century Gothic"' },
  { id: "gill", label: "Gill Sans", icon: Type, localStack: '"Gill Sans MT", "Trebuchet MS"' },
  { id: "optima", label: "Optima", icon: Type, localStack: 'Optima, "Segoe UI"' },
  { id: "lucida", label: "Lucida Sans", icon: Type, localStack: '"Lucida Sans Unicode", "Lucida Grande"' },
  { id: "lucida-console", label: "Lucida Console", icon: Type, localStack: '"Lucida Console", Consolas' },
  { id: "arialn", label: "Arial Narrow", icon: Type, localStack: '"Arial Narrow", Arial' },
  { id: "georgia", label: "Georgia", icon: Type, localStack: 'Georgia, "Times New Roman"' },
  { id: "times", label: "Times New Roman", icon: Type, localStack: '"Times New Roman", Times' },
  { id: "cambria", label: "Cambria", icon: Type, localStack: "Cambria, Georgia" },
  { id: "constantia", label: "Constantia", icon: Type, localStack: "Constantia, Cambria" },
  { id: "palatino", label: "Palatino", icon: Type, localStack: '"Palatino Linotype", "Book Antiqua"' },
  { id: "garamond", label: "Garamond", icon: Type, localStack: 'Garamond, "Times New Roman"' },
  { id: "bookman", label: "Bookman", icon: Type, localStack: '"Bookman Old Style", Garamond' },
  { id: "rockwell", label: "Rockwell", icon: Type, localStack: "Rockwell, Georgia" },
  { id: "sitka", label: "Sitka", icon: Type, localStack: "Sitka, Georgia" },
  { id: "serif", label: "Book Antiqua", icon: Type, localStack: '"Book Antiqua", Cambria' },
  { id: "impact", label: "Impact", icon: Type, localStack: "Impact, Haettenschweiler" },
  { id: "comic", label: "Comic Sans MS", icon: Type, localStack: '"Comic Sans MS", "Segoe UI"' },
  { id: "mono", label: "Consolas", icon: Type, localStack: 'Consolas, "Cascadia Mono"' },
  { id: "courier", label: "Courier New", icon: Type, localStack: '"Courier New", Courier' },
];

const UI_FONT_OPTIONS = UI_FONT_OPTIONS_RAW.map((option) => {
  const web = UI_FONT_WEB_SOURCES[option.id];
  const category = web?.category || (option.id === "mono" || option.id === "lucida-console" || option.id === "courier" ? "monospace" : option.id.includes("serif") || ["georgia", "times", "cambria", "constantia", "palatino", "garamond", "bookman", "rockwell", "sitka", "serif"].includes(option.id) ? "serif" : "sans-serif");
  return {
    ...option,
    webGoogle: web?.google || "",
    category,
    family: buildCrossPlatformFontStack(option.id, option.localStack, category),
  };
});

const UI_FONT_SIZE_OPTIONS = [
  { id: "compacta", label: "Compacta", scale: 0.94 },
  { id: "normal", label: "Normal", scale: 1 },
  { id: "grande", label: "Grande", scale: 1.08 },
  { id: "gigante", label: "Gigante", scale: 1.16 },
];

function getThemePreview(theme) {
  const shell = String(theme?.shell || theme?.primary || "#22384f");
  const primary = String(theme?.primary || "#385878");
  const accent = String(theme?.accent || theme?.primarySoft || primary);
  const isGradient = theme?.kind === "gradient";
  const previewBackground = isGradient
    ? `linear-gradient(${theme?.gradient || `135deg, ${shell} 0%, ${primary} 55%, ${accent} 100%`})`
    : null;

  return { shell, primary, accent, isGradient, previewBackground };
}

function groupThemesByKind(themes = UI_THEME_OPTIONS) {
  const solid = [];
  const gradient = [];
  themes.forEach((theme) => {
    if (theme.kind === "gradient") gradient.push(theme);
    else solid.push(theme);
  });
  return { solid, gradient };
}

const DEFAULT_UI_FONT_FAMILY = buildCrossPlatformFontStack("bahnschrift", '"Bahnschrift", "Segoe UI"', "sans-serif");

function getFontOptionById(fontId, fonts = UI_FONT_OPTIONS) {
  const normalized = String(fontId || "bahnschrift").trim() || "bahnschrift";
  return fonts.find((font) => font.id === normalized) || fonts[0];
}

function getFontFamilyStack(fontId, fonts = UI_FONT_OPTIONS) {
  const option = getFontOptionById(fontId, fonts);
  if (option?.family) return String(option.family);
  const web = UI_FONT_WEB_SOURCES[option?.id || fontId];
  return buildCrossPlatformFontStack(
    fontId,
    option?.localStack || "",
    web?.category || "sans-serif",
  );
}

function applyUiFontFamilyToDocument(fontId, fonts = UI_FONT_OPTIONS) {
  if (typeof document === "undefined") return getFontFamilyStack(fontId, fonts);
  const normalizedId = String(fontId || "bahnschrift").trim() || "bahnschrift";
  const stack = getFontFamilyStack(normalizedId, fonts);
  document.documentElement.style.setProperty("--ui-font-family", stack);
  void ensureUiWebFontLoaded(normalizedId);
  return stack;
}

export {
  INITIAL_ROUTE_STATE,
  HIDDEN_BASE_TEMPLATES_KEY,
  UI_THEME_KEY,
  UI_FONT_KEY,
  UI_FONT_SIZE_KEY,
  getUserUiThemeKey,
  getUserUiFontKey,
  getUserUiFontSizeKey,
  UI_THEME_OPTIONS,
  UI_FONT_OPTIONS,
  UI_FONT_SIZE_OPTIONS,
  getThemePreview,
  groupThemesByKind,
  DEFAULT_UI_FONT_FAMILY,
  getFontOptionById,
  getFontFamilyStack,
  applyUiFontFamilyToDocument,
  ensureUiWebFontLoaded,
  preloadCoreUiWebFonts,
  buildCrossPlatformFontStack,
  UI_FONT_WEB_SOURCES,
};
