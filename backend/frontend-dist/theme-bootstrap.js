(function bootstrapThemeBeforePaint() {
  var THEME_ACTIVE = "copmec-ui-theme-active";
  var THEME_PREFIX = "copmec-ui-theme:";
  var FONT_ACTIVE = "copmec-ui-font-active";
  var FONT_PREFIX = "copmec-ui-font:";
  var SIZE_ACTIVE = "copmec-ui-font-size-active";
  var SIZE_PREFIX = "copmec-ui-font-size:";

  function applyViewportHeight() {
    var height = Math.round((window.visualViewport && window.visualViewport.height) || window.innerHeight || 0);
    if (height > 0) {
      document.documentElement.style.setProperty("--app-viewport-height", height + "px");
    }
  }

  function readValue(activeKey, prefix) {
    try {
      var active = localStorage.getItem(activeKey);
      if (active) return String(active).trim();
      for (var i = 0; i < localStorage.length; i += 1) {
        var key = localStorage.key(i);
        if (key && key.indexOf(prefix) === 0) {
          var value = localStorage.getItem(key);
          if (value) return String(value).trim();
        }
      }
    } catch (e) {
      return "";
    }
    return "";
  }

  function isTheme(value) {
    return typeof value === "string" && /^copmec-[\w-]+$/.test(value);
  }

  var root = document.documentElement;
  var theme = readValue(THEME_ACTIVE, THEME_PREFIX);
  var font = readValue(FONT_ACTIVE, FONT_PREFIX);
  var fontSize = readValue(SIZE_ACTIVE, SIZE_PREFIX);

  if (isTheme(theme)) root.setAttribute("data-ui-theme", theme);
  if (font) root.setAttribute("data-ui-font", font);
  if (fontSize) root.setAttribute("data-ui-font-size", fontSize);

  applyViewportHeight();
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", applyViewportHeight);
  }
  window.addEventListener("resize", applyViewportHeight);
})();
