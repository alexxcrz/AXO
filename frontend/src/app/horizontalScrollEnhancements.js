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

    const topScrollbar = document.createElement("div");
    topScrollbar.className = "table-scroll-top";
    topScrollbar.setAttribute("aria-hidden", "true");

    const topScrollbarTrack = document.createElement("div");
    topScrollbarTrack.className = "table-scroll-top-track";
    topScrollbar.appendChild(topScrollbarTrack);

    container.parentNode?.insertBefore(topScrollbar, container);

    const binding = {
      container,
      topScrollbar,
      topScrollbarTrack,
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
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      topScrollbarTrack.style.width = `${container.scrollWidth}px`;
      topScrollbar.style.display = maxScroll > 0 ? "block" : "none";
      if (Math.abs(topScrollbar.scrollLeft - container.scrollLeft) > 1) {
        topScrollbar.scrollLeft = container.scrollLeft;
      }
      container.classList.toggle("is-horizontal-draggable", maxScroll > 0);
    };

    binding.handleContainerScroll = () => {
      if (binding.syncingSource === "top") return;
      binding.syncingSource = "container";
      topScrollbar.scrollLeft = container.scrollLeft;
      binding.syncingSource = "";
    };

    binding.handleTopScroll = () => {
      if (binding.syncingSource === "container") return;
      binding.syncingSource = "top";
      container.scrollLeft = topScrollbar.scrollLeft;
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
      if (event.target instanceof Element && event.target.closest(HORIZONTAL_SCROLL_INTERACTIVE_SELECTOR)) return;
      if (container.scrollWidth <= container.clientWidth) return;

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
    topScrollbar.addEventListener("scroll", binding.handleTopScroll, { passive: true });
    container.addEventListener("mousedown", binding.handleMouseDown);

    if (typeof ResizeObserver !== "undefined") {
      binding.resizeObserver = new ResizeObserver(() => binding.updateMetrics());
      binding.resizeObserver.observe(container);
      const tableElement = container.querySelector("table");
      if (tableElement) {
        binding.resizeObserver.observe(tableElement);
      }
    }

    bindings.set(container, binding);
    binding.updateMetrics();
  };

  const cleanupMissingContainers = () => {
    Array.from(bindings.entries()).forEach(([container, binding]) => {
      if (document.contains(container)) return;
      clearDragState(binding);
      binding.resizeObserver?.disconnect();
      container.removeEventListener("scroll", binding.handleContainerScroll);
      container.removeEventListener("mousedown", binding.handleMouseDown);
      binding.topScrollbar.removeEventListener("scroll", binding.handleTopScroll);
      binding.topScrollbar.remove();
      bindings.delete(container);
    });
  };

  const scan = () => {
    document.querySelectorAll(selector).forEach((container) => enhanceContainer(container));
    cleanupMissingContainers();
  };

  const scheduleScan = () => {
    if (scanRafId) return;
    scanRafId = window.requestAnimationFrame(() => {
      scanRafId = 0;
      scan();
    });
  };

  const mutationObserver = new MutationObserver(() => scheduleScan());
  mutationObserver.observe(document.body, { childList: true, subtree: true });
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
      binding.topScrollbar.removeEventListener("scroll", binding.handleTopScroll);
      binding.topScrollbar.remove();
      binding.container.classList.remove("is-horizontal-draggable");
    });
    bindings.clear();
    document.body.classList.remove("horizontal-dragging-active");
  };
}
