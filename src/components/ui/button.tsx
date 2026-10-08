"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-brand bg-brand text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-brand-hover)] hover:shadow-[var(--shadow-md)]",
  secondary: "border-border bg-white/86 text-brand shadow-[var(--shadow-sm)] hover:border-brand hover:bg-[var(--color-brand-subtle)]",
  ghost: "border-transparent bg-transparent text-[var(--color-text-muted)] hover:bg-white/70 hover:text-brand",
  danger: "border-error bg-white/86 text-error shadow-[var(--shadow-sm)] hover:bg-[var(--color-error-subtle)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-sm sm:min-h-8 sm:px-2 sm:text-xs",
  md: "min-h-11 px-3.5 text-sm sm:min-h-9 sm:px-3 sm:text-xs",
  lg: "min-h-12 px-4 text-sm sm:min-h-10",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border font-semibold transition-colors duration-200 disabled:pointer-events-none disabled:opacity-45",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});

export function ButtonLink({
  className,
  variant = "secondary",
  size = "md",
  children,
  ...props
}: ComponentProps<typeof Link> & { className?: string; variant?: ButtonVariant; size?: ButtonSize; children: React.ReactNode }) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border font-semibold transition-colors duration-200",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
