"use client";

import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border-brand bg-brand text-white hover:bg-[var(--color-brand-hover)]",
  secondary: "border-[var(--color-text)] bg-transparent text-[var(--color-text)] hover:bg-brand hover:text-[var(--color-on-brand)]",
  ghost: "border-transparent bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
  danger: "border-error bg-transparent text-error hover:bg-[var(--color-error-subtle)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3 text-[0.66rem] tracking-[0.1em] sm:min-h-8 sm:px-2",
  md: "min-h-11 px-4 text-[0.68rem] tracking-[0.16em] sm:min-h-9 sm:px-3.5",
  lg: "min-h-12 px-5 text-[0.7rem] tracking-[0.16em] sm:min-h-10",
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
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border font-medium uppercase transition-colors duration-200 disabled:pointer-events-none disabled:opacity-45",
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
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border font-medium uppercase transition-colors duration-200",
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
