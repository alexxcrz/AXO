let jsBarcodePromise = null;
let qrcodePromise = null;

export function loadJsBarcode() {
  if (!jsBarcodePromise) {
    jsBarcodePromise = import("jsbarcode").then((mod) => mod.default || mod);
  }
  return jsBarcodePromise;
}

export function loadQRCode() {
  if (!qrcodePromise) {
    qrcodePromise = import("qrcode");
  }
  return qrcodePromise;
}
