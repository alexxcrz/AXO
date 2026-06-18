import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "./Modal.jsx";
import {
  getCoverScale,
  PROFILE_PHOTO_CROP_VIEWPORT,
  renderProfilePhotoCrop,
} from "../utils/profilePhotoCrop.js";
import "./ProfilePhotoCropModal.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.02;

export function ProfilePhotoCropModal({
  open,
  imageSrc,
  onClose,
  onConfirm,
  uploading = false,
}) {
  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    setImageSize({ width: 0, height: 0 });
    setBaseScale(1);
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    dragRef.current = null;
  }, [open, imageSrc]);

  const displayScale = baseScale * zoom;
  const imageStyle = useMemo(() => ({
    width: `${imageSize.width * displayScale}px`,
    height: `${imageSize.height * displayScale}px`,
    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
  }), [displayScale, imageSize.height, imageSize.width, offset.x, offset.y]);

  function handleImageLoad(event) {
    const image = event.currentTarget;
    setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
    setBaseScale(getCoverScale(image, PROFILE_PHOTO_CROP_VIEWPORT));
  }

  function handlePointerDown(event) {
    if (uploading) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setIsDragging(true);
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    });
  }

  function handlePointerEnd(event) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  async function handleConfirm() {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || uploading) return;
    try {
      const blob = await renderProfilePhotoCrop({
        image,
        viewportSize: PROFILE_PHOTO_CROP_VIEWPORT,
        scale: displayScale,
        offsetX: offset.x,
        offsetY: offset.y,
      });
      await onConfirm(blob);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Modal
      open={open}
      title="Ajustar foto de perfil"
      className="profile-photo-crop-modal"
      disableBackdropClose={uploading || isDragging}
      onClose={uploading ? undefined : onClose}
      onConfirm={() => { void handleConfirm(); }}
      confirmLabel={uploading ? "Guardando..." : "Usar foto"}
      cancelLabel="Cancelar"
      confirmDisabled={uploading || !imageSize.width}
    >
      <p className="profile-photo-crop-modal__hint">
        Arrastra para encuadrar y usa el zoom. Al confirmar se guardará en tu perfil.
      </p>
      <div
        className={`profile-photo-crop-viewport${isDragging ? " is-dragging" : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div className="profile-photo-crop-stage">
          {imageSrc ? (
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Vista previa de foto de perfil"
              className="profile-photo-crop-image"
              style={imageStyle}
              onLoad={handleImageLoad}
              draggable={false}
            />
          ) : null}
        </div>
      </div>
      <div className="profile-photo-crop-zoom">
        <label htmlFor="profile-photo-crop-zoom-range">Zoom</label>
        <input
          id="profile-photo-crop-zoom-range"
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_STEP}
          value={zoom}
          disabled={uploading || !imageSize.width}
          onChange={(event) => setZoom(Number(event.target.value))}
        />
      </div>
    </Modal>
  );
}
