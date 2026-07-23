"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface AdUnitDisplayProps {
  clientId: string;
  slot: string;
}

export default function AdUnitDisplay({ clientId, slot }: AdUnitDisplayProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    window.adsbygoogle = window.adsbygoogle ?? [];
    window.adsbygoogle.push({});
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: "block", textAlign: "center" }}
      data-ad-format="auto"
      data-full-width-responsive="true"
      data-ad-client={clientId}
      data-ad-slot={slot}
      aria-label="Advertisement"
    />
  );
}
