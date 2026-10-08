"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";

export function BankImportConfirmForm({ children }: { children: ReactNode }) {
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);

  return (
    <form
      action="/api/import/bank/confirm"
      method="post"
      className="rounded-[var(--radius-lg)] border border-border bg-white p-4 shadow-[var(--shadow-sm)]"
      onSubmit={(event) => {
        if (submitting.current) {
          event.preventDefault();
          return;
        }
        submitting.current = true;
        setPending(true);
      }}
    >
      {children}
      <div className="mt-4 flex justify-end">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Betalingen worden opgeslagen…" : "Betalingen opslaan"}
        </Button>
      </div>
    </form>
  );
}
