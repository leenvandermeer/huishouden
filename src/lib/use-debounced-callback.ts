"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

export function useDebouncedCallback<TArgs extends unknown[]>(callback: (...args: TArgs) => void, delayMs: number) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
  }, []);

  const run = useCallback((...args: TArgs) => {
    cancel();
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
      timeoutRef.current = undefined;
    }, delayMs);
  }, [cancel, delayMs]);

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ cancel, run }), [cancel, run]);
}
