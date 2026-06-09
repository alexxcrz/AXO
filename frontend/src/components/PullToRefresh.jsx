import { useRef, useState } from "react";

const PULL_THRESHOLD = 72;
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, disabled = false, className = "", children }) {
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  async function finishRefresh() {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }

  function handleTouchStart(event) {
    if (disabled || refreshing) return;
    const scrollTop = event.currentTarget.scrollTop || 0;
    if (scrollTop > 2) return;
    startYRef.current = event.touches[0]?.clientY || 0;
    pullingRef.current = true;
  }

  function handleTouchMove(event) {
    if (!pullingRef.current || disabled || refreshing) return;
    const currentY = event.touches[0]?.clientY || 0;
    const delta = Math.max(0, Math.min(MAX_PULL, currentY - startYRef.current));
    if (delta > 0 && (event.currentTarget.scrollTop || 0) <= 0) {
      setPullDistance(delta);
      if (delta > 12) event.preventDefault();
    }
  }

  function handleTouchEnd() {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    if (pullDistance >= PULL_THRESHOLD) {
      void finishRefresh();
      return;
    }
    setPullDistance(0);
  }

  const visible = pullDistance > 8 || refreshing;
  const label = refreshing
    ? "Actualizando..."
    : pullDistance >= PULL_THRESHOLD
      ? "Suelta para actualizar"
      : "Desliza para actualizar";

  return (
    <div
      className={`ptr-root ${className}`.trim()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className={`ptr-indicator ${visible ? "is-visible" : ""} ${refreshing ? "is-refreshing" : ""}`}
        style={{ transform: `translate(-50%, ${Math.max(-120, -120 + pullDistance * 0.55)}px)` }}
        aria-live="polite"
      >
        <span className="ptr-spinner" aria-hidden="true" />
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
