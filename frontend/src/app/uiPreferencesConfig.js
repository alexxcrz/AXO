import { Palette, Type } from "lucide-react";
import { getInitialRouteState } from "../utils/utilidades.jsx";

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

const UI_FONT_OPTIONS = [
  { id: "bahnschrift", label: "Bahnschrift", icon: Type, family: '"Bahnschrift", "Segoe UI", sans-serif' },
  { id: "segoe", label: "Segoe UI", icon: Type, family: '"Segoe UI", "Segoe UI Variable", sans-serif' },
  { id: "arial", label: "Arial", icon: Type, family: 'Arial, Helvetica, sans-serif' },
  { id: "arial-black", label: "Arial Black", icon: Type, family: '"Arial Black", Arial, sans-serif' },
  { id: "trebuchet", label: "Trebuchet MS", icon: Type, family: '"Trebuchet MS", "Segoe UI", sans-serif' },
  { id: "verdana", label: "Verdana", icon: Type, family: 'Verdana, "Segoe UI", sans-serif' },
  { id: "tahoma", label: "Tahoma", icon: Type, family: 'Tahoma, Verdana, sans-serif' },
  { id: "calibri", label: "Calibri", icon: Type, family: 'Calibri, "Segoe UI", sans-serif' },
  { id: "candara", label: "Candara", icon: Type, family: 'Candara, "Segoe UI", sans-serif' },
  { id: "corbel", label: "Corbel", icon: Type, family: 'Corbel, Candara, sans-serif' },
  { id: "franklin", label: "Franklin Gothic", icon: Type, family: '"Franklin Gothic Medium", Arial, sans-serif' },
  { id: "century", label: "Century Gothic", icon: Type, family: '"Century Gothic", "Trebuchet MS", sans-serif' },
  { id: "futura", label: "Futura", icon: Type, family: 'Futura, "Century Gothic", sans-serif' },
  { id: "gill", label: "Gill Sans", icon: Type, family: '"Gill Sans MT", "Trebuchet MS", sans-serif' },
  { id: "optima", label: "Optima", icon: Type, family: 'Optima, "Segoe UI", sans-serif' },
  { id: "lucida", label: "Lucida Sans", icon: Type, family: '"Lucida Sans Unicode", "Lucida Grande", sans-serif' },
  { id: "lucida-console", label: "Lucida Console", icon: Type, family: '"Lucida Console", Consolas, monospace' },
  { id: "arialn", label: "Arial Narrow", icon: Type, family: '"Arial Narrow", Arial, sans-serif' },
  { id: "georgia", label: "Georgia", icon: Type, family: 'Georgia, "Times New Roman", serif' },
  { id: "times", label: "Times New Roman", icon: Type, family: '"Times New Roman", Times, serif' },
  { id: "cambria", label: "Cambria", icon: Type, family: 'Cambria, Georgia, serif' },
  { id: "constantia", label: "Constantia", icon: Type, family: 'Constantia, Cambria, serif' },
  { id: "palatino", label: "Palatino", icon: Type, family: '"Palatino Linotype", "Book Antiqua", serif' },
  { id: "garamond", label: "Garamond", icon: Type, family: 'Garamond, "Times New Roman", serif' },
  { id: "bookman", label: "Bookman", icon: Type, family: '"Bookman Old Style", Garamond, serif' },
  { id: "rockwell", label: "Rockwell", icon: Type, family: 'Rockwell, Georgia, serif' },
  { id: "sitka", label: "Sitka", icon: Type, family: 'Sitka, Georgia, serif' },
  { id: "serif", label: "Book Antiqua", icon: Type, family: '"Book Antiqua", Cambria, serif' },
  { id: "impact", label: "Impact", icon: Type, family: 'Impact, Haettenschweiler, sans-serif' },
  { id: "comic", label: "Comic Sans MS", icon: Type, family: '"Comic Sans MS", "Segoe UI", cursive' },
  { id: "mono", label: "Consolas", icon: Type, family: 'Consolas, "Cascadia Mono", monospace' },
  { id: "courier", label: "Courier New", icon: Type, family: '"Courier New", Courier, monospace' },
];

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

const DEFAULT_UI_FONT_FAMILY = '"Bahnschrift", "Segoe UI", sans-serif';

function getFontOptionById(fontId, fonts = UI_FONT_OPTIONS) {
  const normalized = String(fontId || "bahnschrift").trim() || "bahnschrift";
  return fonts.find((font) => font.id === normalized) || fonts[0];
}

function getFontFamilyStack(fontId, fonts = UI_FONT_OPTIONS) {
  return String(getFontOptionById(fontId, fonts)?.family || DEFAULT_UI_FONT_FAMILY);
}

function applyUiFontFamilyToDocument(fontId, fonts = UI_FONT_OPTIONS) {
  if (typeof document === "undefined") return getFontFamilyStack(fontId, fonts);
  const stack = getFontFamilyStack(fontId, fonts);
  document.documentElement.style.setProperty("--ui-font-family", stack);
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
};
