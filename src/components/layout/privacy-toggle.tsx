"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "huishouden-privacy-mode";

export function PrivacyToggle() {
  const hidden = useSyncExternalStore(subscribe, getSnapshot, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle("privacy-mode", hidden);
  }, [hidden]);

  function togglePrivacy() {
    const next = !hidden;
    document.documentElement.classList.toggle("privacy-mode", next);
    window.localStorage.setItem(STORAGE_KEY, next ? "hidden" : "visible");
    window.dispatchEvent(new Event("huishouden-privacy"));
    if ("vibrate" in navigator) navigator.vibrate(10);
  }

  return (
    <button type="button" className="privacy-control" aria-label={hidden ? "Toon bedragen" : "Verberg bedragen"} aria-pressed={hidden} onClick={togglePrivacy}>
      {hidden ? <EyeOff aria-hidden="true" size={17} /> : <Eye aria-hidden="true" size={17} />}
    </button>
  );
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("huishouden-privacy", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("huishouden-privacy", callback);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "hidden";
}
