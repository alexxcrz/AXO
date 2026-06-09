export function isStandaloneApp() {
  return Boolean(
    globalThis.matchMedia?.("(display-mode: standalone)").matches
    || globalThis.navigator?.standalone === true,
  );
}

export function isAndroidDevice() {
  return /android/i.test(String(globalThis.navigator?.userAgent || ""));
}

export function isCoarsePointer() {
  return Boolean(globalThis.matchMedia?.("(pointer: coarse)")?.matches);
}

export function isMobileShellViewport() {
  return Number(globalThis.innerWidth || 0) <= 900;
}

/** PWA instalada o telefono/tablet tactil estrecho */
export function isMobileShellActive() {
  return isStandaloneApp() || (isCoarsePointer() && isMobileShellViewport());
}

export function prefersSystemDarkMode() {
  return Boolean(globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches);
}

/** Solo sigue la preferencia del sistema (modo oscuro del celular). */
export function resolveMobileColorScheme() {
  return prefersSystemDarkMode() ? "dark" : "light";
}

export function applyMobileDocumentShell() {
  const html = document.documentElement;
  const standalone = isStandaloneApp();
  const mobileShell = isMobileShellActive();
  const scheme = resolveMobileColorScheme();

  html.classList.toggle("standalone-app", standalone);
  html.classList.toggle("mobile-shell", mobileShell);
  html.classList.remove("android-standalone-dark");
  html.dataset.colorScheme = scheme;
  html.style.colorScheme = scheme;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.content = scheme === "dark" ? "#0f1419" : "#314d69";
  }
}

export function bindMobileDocumentShell() {
  applyMobileDocumentShell();
  const resizeHandler = () => applyMobileDocumentShell();
  const schemeMq = globalThis.matchMedia?.("(prefers-color-scheme: dark)");
  const schemeHandler = () => applyMobileDocumentShell();
  globalThis.addEventListener("resize", resizeHandler, { passive: true });
  schemeMq?.addEventListener?.("change", schemeHandler);
  return () => {
    globalThis.removeEventListener("resize", resizeHandler);
    schemeMq?.removeEventListener?.("change", schemeHandler);
  };
}
