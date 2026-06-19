"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QRImage({ value, size = 180 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: { dark: "#09090b", light: "#fafafa" },
      });
    }
  }, [value, size]);

  return (
    <div className="bg-zinc-50 rounded-2xl p-3 inline-block">
      <canvas ref={canvasRef} />
    </div>
  );
}
