import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function FieldLabel({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn("mb-1 block text-xs font-semibold text-[var(--color-text)]", className)} {...props}>
      {children}
    </label>
  );
}

// Styles live in globals.css (.form-control): pages render hundreds of controls and the
// full utility string was repeated in both the HTML and the RSC payload. The background
// utilities stay literal: the dark theme overrides them by class name, and a layered
// disabled background would lose to the bg-white utility.
const controlClass = "form-control bg-white focus:bg-white disabled:bg-[var(--color-surface)]";

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
