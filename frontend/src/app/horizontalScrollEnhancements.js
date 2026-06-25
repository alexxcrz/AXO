const HORIZONTAL_SCROLL_CONTAINER_SELECTORS = [
  ".table-wrap",
  ".board-table-wrap",
  ".custom-board-table-wrap",
  ".board-preview-table-wrap",
  ".dashboard-table-wrap",
  ".smart-grid-table-wrap",
];

const HORIZONTAL_SCROLL_INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "a",
  "label",
  "[role='button']",
  "[contenteditable='true']",
  "[contenteditable='']",
].join(",");

function ensureHorizontalScrollAnchor(container) {
  if (!container.dataset.horizontalScrollAnchor) {
    container.dataset.horizontalScrollAnchor = `hs-${Math.random().toString(36).slice(2, 10)}`;
  }
  return container.dataset.horizontalScrollAnchor;
}

function restoreLegacyScrollShell(container) {
  const parent = container.parentElement;
  if (!parent?.classList.contains("table-scroll-shell")) {
    return container.parentElement;
  }

  const scrollHost = parent.parentElement;
  if (!scrollHost) return parent;

  const topScrollbar = parent.querySelector(":scope > .table-scroll-top");
  parent.removeChild(container);
  if (topScrollbar) parent.removeChild(topScrollbar);
  scrollHost.insertBefore(container, parent);
  if (topScrollbar) scrollHost.insertBefore(topScrollbar, container);
  parent.remove();

  return scrollHost;
}

function getScrollHost(container) {
  const host = restoreLegacyScrollShell(container);
  if (!host) return null;

  const isLayoutCard = host.classList.contains("table-card")
    || host.classList.contains("surface-card")
    || host.tagName === "ARTICLE"
    || host.tagName === "SECTION";

  if (!isLayoutCard) {
    host.classList.add("table-scroll-shell");
  }

  return host;
}

function getHorizontalScrollMetrics(container) {
  const table = container.querySelector("table");
  const isCardsView = table?.classList.contains("board-cards-view");
  let contentWidth = Math.max(
    table?.scrollWidth || 0,
    table?.offsetWidth || 0,
    container.scrollWidth,
  );
  if (isCardsView) {
    container.querySelectorAll(".cleaning-card, .board-card, .cleaning-card-body, .board-card-body").forEach((node) => {
      contentWidth = Math.max(contentWidth, node.scrollWidth || 0, node.offsetWidth || 0);
    });
  }
  const viewportWidth = container.clientWidth;
  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  return { contentWidth, viewportWidth, maxScroll };
}

export function setupGlobalHorizontalScrollEnhancements() {
  if (typeof document === "undefined") {
    return () => {};
  }

  const selector = HORIZONTAL_SCROLL_CONTAINER_SELECTORS.join(",");
  const bindings = new Map();
  let scanRafId = 0;

  const clearDragState = (binding) => {
    if (!binding?.isDragging) return;
    binding.isDragging = false;
    binding.container.classList.remove("is-horizontal-dragging");
    document.body.classList.remove("horizontal-dragging-active");
    window.removeEventListener("mousemove", binding.handleDragMove, { passive: false });
    window.removeEventListener("mouseup", binding.handleDragEnd);
    window.removeEventListener("mouseleave", binding.handleDragEnd);
  };

  const enhanceContainer = (container) => {
    if (!container || bindings.has(container)) return;

    const scrollHost = getScrollHost(container);
    if (!scrollHost) return;

    const anchor = ensureHorizontalScrollAnchor(container);

    let topScrollbar = scrollHost.querySelector(`:scope > .table-scroll-top[data-scroll-anchor="${anchor}"]`);
    if (!topScrollbar) {
      topScrollbar = document.createElement("div");
      topScrollbar.className = "table-scroll-top";
      topScrollbar.dataset.scrollAnchor = anchor;
      topScrollbar.setAttribute("aria-hidden", "true");

      const topTrack = document.createElement("div");
      topTrack.className = "table-scroll-top-track";
      topScrollbar.appendChild(topTrack);
      scrollHost.insertBefore(topScrollbar, container);
    }

    const topTrack = topScrollbar.querySelector(".table-scroll-top-track");

    const binding = {
      container,
      shell: scrollHost,
      topScrollbar,
      topTrack,
      isDragging: false,
      dragStartX: 0,
      dragStartScrollLeft: 0,
      syncingSource: "",
      resizeObserver: null,
      handleContainerScroll: null,
      handleTopScroll: null,
      handleMouseDown: null,
      handleDragMove: null,
      handleDragEnd: null,
      updateMetrics: null,
    };

    binding.updateMetrics = () => {
      const { contentWidth, maxScroll } = getHorizontalScrollMetrics(container);
      if (binding.topTrack) {
        binding.topTrack.style.width = `${contentWidth}px`;
      }
      binding.topScrollbar.style.display = maxScroll > 0 ? "block" : "none";
      if (Math.abs(binding.topScrollbar.scrollLeft - container.scrollLeft) > 1) {
        binding.topScrollbar.scrollLeft = container.scrollLeft;
      }
      container.classList.toggle("is-horizontal-draggable", maxScroll > 0);
      if (scrollHost.classList.contains("table-scroll-shell")) {
        scrollHost.classList.toggle("has-horizontal-scroll", maxScroll > 0);
      }
    };

    binding.handleContainerScroll = () => {
      if (binding.syncingSource === "top") return;
      binding.syncingSource = "container";
      binding.topScrollbar.scrollLeft = container.scrollLeft;
      binding.syncingSource = "";
    };

    binding.handleTopScroll = () => {
      if (binding.syncingSource === "container") return;
      binding.syncingSource = "top";
      container.scrollLeft = binding.topScrollbar.scrollLeft;
      binding.syncingSource = "";
    };

    binding.handleDragMove = (event) => {
      if (!binding.isDragging) return;
      event.preventDefault();
      const deltaX = event.clientX - binding.dragStartX;
      container.scrollLeft = binding.dragStartScrollLeft - deltaX;
    };

    binding.handleDragEnd = () => {
      clearDragState(binding);
    };

    binding.handleMouseDown = (event) => {
      if (event.button !== 0) return;
      if (document.body.classList.contains("board-column-resizing")) return;
      if (event.target instanceof Element) {
        if (event.target.closest(HORIZONTAL_SCROLL_INTERACTIVE_SELECTOR)) return;
        if (event.target.closest(".table-scroll-top")) return;
        if (event.target.closest(".board-column-resize-handle")) return;

        const headerCell = event.target.closest("th");
        if (headerCell) {
          const rect = headerCell.getBoundingClientRect();
          const nearResizeEdge = event.clientX >= rect.right - 14;
          if (nearResizeEdge || headerCell.classList.contains("resizing")) return;
          return;
        }
      }

      const { maxScroll } = getHorizontalScrollMetrics(container);
      if (maxScroll <= 0) return;

      binding.isDragging = true;
      binding.dragStartX = event.clientX;
      binding.dragStartScrollLeft = container.scrollLeft;
      container.classList.add("is-horizontal-dragging");
      document.body.classList.add("horizontal-dragging-active");
      window.addEventListener("mousemove", binding.handleDragMove, { passive: false });
      window.addEventListener("mouseup", binding.handleDragEnd);
      window.addEventListener("mouseleave", binding.handleDragEnd);
    };

    container.addEventListener("scroll", binding.handleContainerScroll, { passive: true });
    binding.topScrollbar.addEventListener("scroll", binding.handleTopScroll, { passive: true });
    container.addEventListener("mousedown", binding.handleMouseDown);
    scrollHost.addEventListener("mousedown", binding.handleMouseDown);

    if (typeof ResizeObserver !== "undefined") {
      binding.resizeObserver = new ResizeObserver(() => binding.updateMetrics());
      binding.resizeObserver.observe(container);
      binding.resizeObserver.observe(scrollHost);
      const tableElement = container.querySelector("table");
      if (tableElement) {
        binding.resizeObserver.observe(tableElement);
      }
    }

    bindings.set(container, binding);
    requestAnimationFrame(() => binding.updateMetrics());
    setTimeout(() => binding.updateMetrics(), 120);
  };

  const cleanupMissingContainers = () => {
    Array.from(bindings.entries()).forEach(([container, binding]) => {
      if (document.contains(container)) return;
      clearDragState(binding);
      binding.resizeObserver?.disconnect();
      container.removeEventListener("scroll", binding.handleContainerScroll);
      container.removeEventListener("mousedown", binding.handleMouseDown);
      binding.shell?.removeEventListener("mousedown", binding.handleMouseDown);
      binding.topScrollbar?.removeEventListener("scroll", binding.handleTopScroll);
      binding.topScrollbar?.remove();
      bindings.delete(container);
    });
  };

  const scan = () => {
    document.querySelectorAll(selector).forEach((container) => enhanceContainer(container));
    cleanupMissingContainers();
    document.querySelectorAll(".table-scroll-sync").forEach((node) => node.remove());
  };

  const scheduleScan = () => {
    if (scanRafId) return;
    scanRafId = window.requestAnimationFrame(() => {
      scanRafId = 0;
      scan();
    });
  };

  const mutationObserver = new MutationObserver(() => scheduleScan());
  const observeRoot = document.getElementById("root");
  if (observeRoot) {
    mutationObserver.observe(observeRoot, { childList: true, subtree: true });
  }
  window.addEventListener("resize", scheduleScan);

  scan();

  return () => {
    if (scanRafId) {
      window.cancelAnimationFrame(scanRafId);
      scanRafId = 0;
    }
    mutationObserver.disconnect();
    window.removeEventListener("resize", scheduleScan);
    Array.from(bindings.values()).forEach((binding) => {
      clearDragState(binding);
      binding.resizeObserver?.disconnect();
      binding.container.removeEventListener("scroll", binding.handleContainerScroll);
      binding.container.removeEventListener("mousedown", binding.handleMouseDown);
      binding.shell?.removeEventListener("mousedown", binding.handleMouseDown);
      binding.topScrollbar?.removeEventListener("scroll", binding.handleTopScroll);
      binding.topScrollbar?.remove();
      binding.container.classList.remove("is-horizontal-draggable");
      binding.shell?.classList.remove("has-horizontal-scroll");
    });
    bindings.clear();
    document.body.classList.remove("horizontal-dragging-active");
  };
}
