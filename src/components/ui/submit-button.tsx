"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button, type ButtonProps } from "./button";

export function SubmitButton({
  children,
  pendingLabel = "Bezig...",
  ...props
}: ButtonProps & { children: ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} type="submit" disabled={pending || props.disabled}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
