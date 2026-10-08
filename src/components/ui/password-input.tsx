"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "./form-controls";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        className="absolute right-1 top-1 grid h-6 w-8 place-items-center rounded-md text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface)] hover:text-brand focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-subtle)]"
        aria-label={visible ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" size={15} /> : <Eye aria-hidden="true" size={15} />}
      </button>
    </div>
  );
}
