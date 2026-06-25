export default function BoardActivityFinishGateSwitch({
  enabled = false,
  disabled = false,
  label = "Actividad terminada",
  compact = false,
  onChange,
}) {
  const safeLabel = String(label || "Actividad terminada").trim();

  return (
    <div
      className={`board-finish-gate${compact ? " board-finish-gate--compact" : ""}`}
      title={disabled ? "No tienes permiso para cambiar este control" : safeLabel}
    >
      {!compact ? <span className="board-finish-gate-label">{safeLabel}</span> : null}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={safeLabel}
        className={`switch-button board-finish-gate-switch${enabled ? " on" : ""}`}
        disabled={disabled}
        onClick={() => {
          if (disabled || typeof onChange !== "function") return;
          onChange(!enabled);
        }}
      >
        <span className="switch-thumb" />
      </button>
    </div>
  );
}
