"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

interface AutocompleteItem {
  label: string;
  value: string;
  count?: number;
}

interface AutocompleteProps {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions: AutocompleteItem[];
  className?: string;
}

export function Autocomplete({ id, name, value, onChange, placeholder, suggestions, className }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = value.trim().length > 0
    ? suggestions.filter((item) =>
        item.label.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
    : [];

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!isOpen || filtered.length === 0) {
      if (event.key === "Escape") inputRef.current?.blur();
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
        break;
      case "Enter":
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          event.preventDefault();
          onChange(filtered[highlightedIndex].label);
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  }

  function selectItem(label: string) {
    onChange(label);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-subtle)]" />
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlightedIndex(-1);
          setIsOpen(true);
        }}
        onFocus={() => { if (filtered.length > 0) setIsOpen(true); }}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-expanded={isOpen && filtered.length > 0}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        role="combobox"
        aria-activedescendant={highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined}
        className="h-9 w-full rounded-md border border-border bg-white/86 px-2.5 pl-8 text-xs font-medium text-brand placeholder:text-[var(--color-text-subtle)] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      />
      {isOpen && filtered.length > 0 ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label="Suggesties"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-md border border-border bg-white shadow-lg"
        >
          {filtered.map((item, index) => (
            <li
              key={item.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              className={cn(
                "flex items-center justify-between px-3 py-2 text-xs cursor-pointer",
                highlightedIndex === index ? "bg-[var(--color-brand-subtle)] text-brand" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              )}
              onMouseDown={() => selectItem(item.label)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <span className="truncate font-medium">{item.label}</span>
              {item.count != null ? (
                <span className="ml-2 shrink-0 text-[0.65rem] text-[var(--color-text-subtle)]">{item.count}x</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
