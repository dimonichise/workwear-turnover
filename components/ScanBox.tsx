"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, Keyboard } from "lucide-react";

export function ScanBox({
  operationId,
  direction,
  label
}: {
  operationId: string;
  direction: string;
  label: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [camera, setCamera] = useState(false);

  useEffect(() => {
    if (!camera || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let controls: { stop: () => void } | undefined;
    let stopped = false;
    reader
      .decodeFromVideoDevice(undefined, videoRef.current, async (result) => {
        if (result && !stopped) {
          stopped = true;
          controls?.stop();
          await submit(result.getText());
          setCamera(false);
        }
      })
      .then((scannerControls) => {
        controls = scannerControls;
      });
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [camera]);

  async function submit(value = barcode) {
    const code = value.trim();
    if (!code) return;
    const res = await fetch(`/api/operations/${operationId}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: code, direction })
    });
    const data = await res.json();
    if (data.unknown) {
      const status =
        direction === "sent_to_laundry"
          ? "in_laundry"
          : direction === "returned_after_firing"
            ? "returned_after_firing"
            : "with_employee";
      location.href = `/garments/new?barcode=${encodeURIComponent(code)}&status=${status}&redirectTo=${encodeURIComponent(`/operations/${operationId}`)}`;
      return;
    }
    if (!res.ok) {
      setMessage(data.error || "Ошибка");
      return;
    }
    setMessage(data.warning || "Добавлено");
    setBarcode("");
    setTimeout(() => location.reload(), 350);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{label}</h3>
        <button type="button" onClick={() => setCamera((v) => !v)} className="bg-panel" title="Камера">
          <Camera size={18} />
        </button>
      </div>
      {camera && <video ref={videoRef} className="aspect-video w-full rounded-lg bg-black" muted playsInline />}
      <div className="flex gap-2">
        <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Штрих-код" inputMode="numeric" />
        <button type="button" onClick={() => submit()} className="bg-brand text-white" title="Ввести вручную">
          <Keyboard size={18} />
        </button>
      </div>
      {message && <p className="text-sm text-warn">{message}</p>}
    </div>
  );
}
