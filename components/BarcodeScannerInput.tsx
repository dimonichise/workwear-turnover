"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, Keyboard } from "lucide-react";

export function BarcodeScannerInput({ defaultValue = "" }: { defaultValue?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [barcode, setBarcode] = useState(defaultValue);
  const [camera, setCamera] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!camera || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | undefined;
    let stopped = false;
    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result && !stopped) {
          stopped = true;
          controls?.stop();
          setBarcode(result.getText());
          setMessage("Штрих-код считан");
          setCamera(false);
        }
      })
      .then((scannerControls) => {
        controls = scannerControls;
      })
      .catch(() => {
        setMessage("Камера недоступна");
      });
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [camera]);

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span>Штрих-код</span>
        <div className="flex gap-2">
          <input name="barcode" value={barcode} onChange={(event) => setBarcode(event.target.value)} required inputMode="numeric" />
          <button type="button" onClick={() => setCamera((value) => !value)} className="bg-panel" title="Сканировать">
            {camera ? <Keyboard size={18} /> : <Camera size={18} />}
          </button>
        </div>
      </label>
      {camera && <video ref={videoRef} className="aspect-video w-full rounded-lg bg-black" muted playsInline />}
      {message && <p className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
