import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function FieldLabel({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1 block text-xs font-semibold text-[var(--color-text)]", className)} {...props}>
      {children}
    </label>
  );
}

const controlClass =
  "min-h-11 w-full rounded-[var(--radius-md)] border border-border bg-white px-3 text-base text-[var(--color-text)] shadow-[var(--shadow-sm)] transition focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--color-brand-subtle)] disabled:bg-[var(--color-surface)] disabled:text-[var(--color-text-subtle)] sm:min-h-9 sm:text-xs";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(controlClass, className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...props }, ref) {
  return <select ref={ref} className={cn(controlClass, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(controlClass, "min-h-16 py-2", className)} {...props} />;
});

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs leading-5 text-[var(--color-text-subtle)]">{children}</p>;
}

export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return <p id={id} role="alert" className="mt-1 text-xs font-medium text-error">{children}</p>;
}
