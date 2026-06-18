const UI_THEME_ACTIVE_KEY = "copmec-ui-theme-active";
const UI_THEME_PREFIX = "copmec-ui-theme:";
const UI_FONT_ACTIVE_KEY = "copmec-ui-font-active";
const UI_FONT_PREFIX = "copmec-ui-font:";
const UI_FONT_SIZE_ACTIVE_KEY = "copmec-ui-font-size-active";
const UI_FONT_SIZE_PREFIX = "copmec-ui-font-size:";
const UI_LAST_SESSION_USER_KEY = "copmec-ui-last-session-user";
const SESSION_STORAGE_KEY = "copmec_sess";

function isValidThemeId(themeId) {
  return typeof themeId === "string" && /^copmec-[\w-]+$/.test(themeId.trim());
}

function readStoredPreference(activeKey, prefix) {
  try {
    const hadSession = localStorage.getItem(SESSION_STORAGE_KEY) === "1";
    const lastUser = String(localStorage.getItem(UI_LAST_SESSION_USER_KEY) || "").trim();
    if (hadSession && lastUser) {
      const userValue = String(localStorage.getItem(`${prefix}${lastUser}`) || "").trim();
      if (userValue) return userValue;
    }

    const active = String(localStorage.getItem(activeKey) || "").trim();
    if (active) return active;

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const value = String(localStorage.getItem(key) || "").trim();
      if (value) return value;
    }
  } catch {
    // Ignorar bloqueos de almacenamiento.
  }
  return "";
}

export function persistLastSessionUserId(userId) {
  const normalized = String(userId || "").trim();
  try {
    if (normalized) {
      localStorage.setItem(UI_LAST_SESSION_USER_KEY, normalized);
    } else {
      localStorage.removeItem(UI_LAST_SESSION_USER_KEY);
    }
  } catch {
    // noop
  }
}

export function readStoredUiTheme(fallback = "copmec-bosque") {
  const stored = readStoredPreference(UI_THEME_ACTIVE_KEY, UI_THEME_PREFIX);
  return isValidThemeId(stored) ? stored : fallback;
}

export function readStoredUiFont(fallback = "bahnschrift") {
  const stored = readStoredPreference(UI_FONT_ACTIVE_KEY, UI_FONT_PREFIX);
  return stored || fallback;
}

export function readStoredUiFontSize(fallback = "normal") {
  const stored = readStoredPreference(UI_FONT_SIZE_ACTIVE_KEY, UI_FONT_SIZE_PREFIX);
  return stored || fallback;
}

export function applyDocumentUiPreferences({ theme, font, fontSize } = {}) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme && isValidThemeId(theme)) {
    root.dataset.uiTheme = theme;
    try {
      localStorage.setItem(UI_THEME_ACTIVE_KEY, theme);
    } catch {
      // noop
    }
  }
  if (font) {
    root.dataset.uiFont = font;
    try {
      localStorage.setItem(UI_FONT_ACTIVE_KEY, font);
    } catch {
      // noop
    }
  }
  if (fontSize) {
    root.dataset.uiFontSize = fontSize;
    try {
      localStorage.setItem(UI_FONT_SIZE_ACTIVE_KEY, fontSize);
    } catch {
      // noop
    }
  }
}

export function bootstrapUiPreferencesFromStorage() {
  applyDocumentUiPreferences({
    theme: readStoredUiTheme(),
    font: readStoredUiFont(),
    fontSize: readStoredUiFontSize(),
  });
}

export function bindViewportHeightCssVar() {
  if (typeof window === "undefined") return () => {};

  const apply = () => {
    const height = Math.round(window.visualViewport?.height || window.innerHeight || 0);
    if (height > 0) {
      document.documentElement.style.setProperty("--app-viewport-height", `${height}px`);
    }
  };

  apply();
  window.visualViewport?.addEventListener("resize", apply);
  window.addEventListener("resize", apply);
  return () => {
    window.visualViewport?.removeEventListener("resize", apply);
    window.removeEventListener("resize", apply);
  };
}

export {
  UI_THEME_ACTIVE_KEY,
  UI_FONT_ACTIVE_KEY,
  UI_FONT_SIZE_ACTIVE_KEY,
  UI_LAST_SESSION_USER_KEY,
};
