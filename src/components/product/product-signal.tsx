"use client";

import { useEffect } from "react";
import type { ProductEventType } from "@/modules/finance/product-health";

export function ProductSignal({ eventType }: { eventType: ProductEventType }) {
  useEffect(() => {
    void fetch("/api/product-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, path: window.location.pathname }),
      keepalive: true,
    });
  }, [eventType]);
  return null;
}
