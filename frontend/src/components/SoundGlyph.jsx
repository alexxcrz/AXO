const GLYPHS = {
  campana: (
    <>
      <path d="M12 3a5 5 0 0 0-5 5v2.2c0 .8-.3 1.6-.8 2.2L5 14.5h14l-1.2-2.1c-.5-.6-.8-1.4-.8-2.2V8a5 5 0 0 0-5-5z" />
      <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
    </>
  ),
  urgent: (
    <>
      <path d="M12 4.5 3.5 18h17L12 4.5z" />
      <path d="M12 9.5v4.5" />
      <circle cx="12" cy="16.2" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  ping: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M6.4 17.6l1.4-1.4M16.2 7.8l1.4-1.4" />
    </>
  ),
  digital: (
    <>
      <rect x="5" y="6" width="14" height="10" rx="1.5" />
      <path d="M8 18h8" />
      <path d="M9.5 10.5h5M9.5 13h3.5" />
    </>
  ),
  pop: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M5.8 18.2l1.6-1.6M16.6 7.4l1.6-1.6" />
    </>
  ),
  tap: (
    <>
      <path d="M11.5 4.5 8.5 12.5a3 3 0 0 0 2.7 4.2h2.6a3 3 0 0 0 2.7-4.2L13.5 4.5" />
      <path d="M11 4.5h2" />
    </>
  ),
  nudge: (
    <>
      <path d="M8 12h8" />
      <path d="M14 9l3 3-3 3M10 9 7 12l3 3" />
    </>
  ),
  bright: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" />
    </>
  ),
  burbuja: (
    <>
      <circle cx="12" cy="13" r="6.5" />
      <circle cx="9" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M8.5 18.5c1.2 1.4 2.4 2 3.5 2s2.3-.6 3.5-2" />
    </>
  ),
  marimba: (
    <>
      <path d="M7 17V9M12 17V6M17 17v-5" />
      <path d="M5.5 17h13" />
    </>
  ),
  chime: (
    <>
      <path d="M8 5.5 6 17M12 4 12 17M16 5.5 18 17" />
      <path d="M5.5 17h13" />
    </>
  ),
  cristal: (
    <path d="M12 3.5 17.5 9 12 20.5 6.5 9 12 3.5z" />
  ),
  wave: (
    <path d="M4 12c1.8-2.2 3.2-2.2 5 0s3.2 2.2 5 0 3.2-2.2 5 0" />
  ),
  pulso: (
    <path d="M4 12h3l2.2-4.5L12.5 16l2.3-4H20" />
  ),
  soft: (
    <path d="M20 14.5A7.5 7.5 0 1 1 11 5.5a6 6 0 0 0 9 9z" />
  ),
  alertSoft: (
    <>
      <path d="M12 4a4.5 4.5 0 0 0-4.5 4.5V11l-1.2 2h11.4l-1.2-2V8.5A4.5 4.5 0 0 0 12 4z" />
      <path d="M10 16.5a2 2 0 0 0 4 0" />
    </>
  ),
  zen: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  ringIncoming: (
    <>
      <path d="M8.5 6.5A6.5 6.5 0 0 1 18 14" />
      <path d="M6 10v4h4" />
      <path d="M16 4.5 20 4.5 20 8.5" />
    </>
  ),
  ringOutgoing: (
    <>
      <path d="M15.5 6.5A6.5 6.5 0 0 0 6 14" />
      <path d="M18 10v4h-4" />
      <path d="M8 4.5 4 4.5 4 8.5" />
    </>
  ),
  default: (
    <>
      <path d="M5 10v4a2 2 0 0 0 2 2h1.2" />
      <path d="M19 10v4a2 2 0 0 1-2 2h-1.2" />
      <path d="M8.5 18.5a3.5 3.5 0 0 0 7 0" />
      <path d="M12 5a3 3 0 0 1 3 3v1.5H9V8a3 3 0 0 1 3-3z" />
    </>
  ),
};

export function SoundGlyph({ id, className = "", size = 16 }) {
  const content = GLYPHS[id] || GLYPHS.default;
  return (
    <svg
      className={`cp-sound-glyph ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}

export function VibrationRhythmGlyph({ pattern = [], className = "" }) {
  const bars = Array.isArray(pattern) && pattern.length
    ? pattern.filter((_, index) => index % 2 === 0).slice(0, 5)
    : [120, 120];
  const max = Math.max(...bars, 1);

  return (
    <svg
      className={`cp-vibration-glyph ${className}`.trim()}
      viewBox="0 0 24 14"
      width="24"
      height="14"
      aria-hidden="true"
    >
      {bars.map((value, index) => {
        const h = Math.max(4, Math.round((value / max) * 12));
        const x = 2 + index * 4.5;
        const y = 13 - h;
        return (
          <rect
            key={`${index}-${value}`}
            x={x}
            y={y}
            width="3"
            height={h}
            rx="1"
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}
