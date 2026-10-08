"use client";

import { useEffect } from "react";

export default function ApplicationError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/product-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "client.error", path: window.location.pathname }),
      keepalive: true,
    });
  }, []);

  return (
    <main id="hoofdinhoud" className="mx-auto grid min-h-[60vh] max-w-xl place-content-center px-5 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Dat ging niet goed</p>
      <h1 className="mt-2 text-3xl font-bold text-[var(--color-text)]">Deze pagina kon niet worden geladen</h1>
      <p className="mt-3 text-[var(--color-text-muted)]">Je gegevens zijn niet aangepast. Probeer het opnieuw; de fout is zonder financiële details geregistreerd.</p>
      <button type="button" onClick={reset} className="mx-auto mt-6 min-h-11 rounded-xl bg-brand px-5 font-bold text-white">Opnieuw proberen</button>
    </main>
  );
}
