export const PROFILE_PHOTO_CROP_VIEWPORT = 280;
export const PROFILE_PHOTO_OUTPUT_SIZE = 512;
export const PROFILE_PHOTO_THUMB_SIZE = 256;

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar la imagen seleccionada."));
    image.src = src;
  });
}

export function getCoverScale(image, viewportSize) {
  return Math.max(
    viewportSize / image.naturalWidth,
    viewportSize / image.naturalHeight,
  );
}

export function renderProfilePhotoCrop({
  image,
  viewportSize = PROFILE_PHOTO_CROP_VIEWPORT,
  scale,
  offsetX = 0,
  offsetY = 0,
  outputSize = PROFILE_PHOTO_OUTPUT_SIZE,
  mimeType = "image/jpeg",
  quality = 0.92,
}) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("No se pudo preparar el recorte de la imagen."));
      return;
    }

    const displayWidth = image.naturalWidth * scale;
    const displayHeight = image.naturalHeight * scale;
    const centerX = viewportSize / 2 + offsetX;
    const centerY = viewportSize / 2 + offsetY;
    const drawX = centerX - displayWidth / 2;
    const drawY = centerY - displayHeight / 2;
    const factor = outputSize / viewportSize;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      image,
      drawX * factor,
      drawY * factor,
      displayWidth * factor,
      displayHeight * factor,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo generar la imagen recortada."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}
