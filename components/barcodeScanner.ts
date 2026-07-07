import { BarcodeFormat, BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";

const barcodeHints = new Map();
barcodeHints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.ITF
]);

export const fastScannerConstraints: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet]
  },
  audio: false
};

export function createFastBarcodeReader() {
  return new BrowserMultiFormatReader(barcodeHints, {
    delayBetweenScanAttempts: 80,
    delayBetweenScanSuccess: 250,
    tryPlayVideoTimeout: 5000
  });
}
