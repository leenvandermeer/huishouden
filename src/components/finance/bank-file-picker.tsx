"use client";

import { useId, useState, type ChangeEvent } from "react";
import { FileUp } from "lucide-react";

export function BankFilePicker() {
  const id = useId();
  const [files, setFiles] = useState<string[]>([]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []).map((file) => file.name));
  }

  return (
    <div className="mt-4">
      <input id={id} name="files" type="file" accept=".csv,.xml,.sta,.mt940,text/csv,application/xml,text/xml,text/plain" multiple required className="sr-only" onChange={handleChange} />
      <label htmlFor={id} className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition hover:bg-[var(--color-brand-hover)]">
        <FileUp aria-hidden="true" size={16} /> Bestanden kiezen
      </label>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]" aria-live="polite">
        {files.length === 0 ? "Nog geen bestanden gekozen" : files.length === 1 ? files[0] : `${files.length} bestanden: ${files.join(", ")}`}
      </p>
    </div>
  );
}
