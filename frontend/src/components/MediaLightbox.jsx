import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import "./MediaLightbox.css";

export function isImageMedia(item = {}) {
  const mime = String(item.mimeType || item.type || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  const name = String(item.name || item.url || "");
  return /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(name);
}

export function isVideoMedia(item = {}) {
  const mime = String(item.mimeType || item.type || "").toLowerCase();
  if (mime.startsWith("video/")) return true;
  const name = String(item.name || item.url || "");
  return /\.(mp4|webm|mov|m4v|ogg)$/i.test(name);
}

export function MediaLightbox({ items = [], startIndex = 0, onClose }) {
  const gallery = (Array.isArray(items) ? items : []).filter((item) => item?.url && (isImageMedia(item) || isVideoMedia(item)));
  const [currentIndex, setCurrentIndex] = useState(() => {
    const safeStart = Number(startIndex) || 0;
    if (!gallery.length) return 0;
    return Math.min(Math.max(safeStart, 0), gallery.length - 1);
  });
  const total = gallery.length;
  const current = gallery[currentIndex] || null;

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
      if (event.key === "ArrowRight" && total > 1) setCurrentIndex((index) => (index + 1) % total);
      if (event.key === "ArrowLeft" && total > 1) setCurrentIndex((index) => (index - 1 + total) % total);
    }
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [onClose, total]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!current) return null;

  return createPortal(
    <div
      className="media-lightbox-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div className="media-lightbox-shell" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="media-lightbox-close" onClick={onClose} aria-label="Cerrar vista previa">
          <X size={18} />
        </button>
        {total > 1 ? (
          <button
            type="button"
            className="media-lightbox-nav prev"
            onClick={() => setCurrentIndex((index) => (index - 1 + total) % total)}
            aria-label="Anterior"
          >
            <ChevronLeft size={22} />
          </button>
        ) : null}
        {isVideoMedia(current) ? (
          <video
            src={current.url}
            poster={current.thumbnailUrl || undefined}
            className="media-lightbox-media"
            controls
            autoPlay
          />
        ) : (
          <img src={current.url} alt={current.name || "Vista previa"} className="media-lightbox-media" />
        )}
        {total > 1 ? (
          <button
            type="button"
            className="media-lightbox-nav next"
            onClick={() => setCurrentIndex((index) => (index + 1) % total)}
            aria-label="Siguiente"
          >
            <ChevronRight size={22} />
          </button>
        ) : null}
        <div className="media-lightbox-caption">
          <span>{current.name || "Vista previa"}</span>
          {total > 1 ? <small>{currentIndex + 1} / {total}</small> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
