"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui";
import type { Category } from "@/modules/finance/types";

interface CategoryComboboxProps {
  categories: Category[];
  defaultCategoryId?: string;
  id: string;
}

export function CategoryCombobox({ categories, defaultCategoryId, id }: CategoryComboboxProps) {
  const options = useMemo(() => buildOptions(categories), [categories]);
  const defaultOption = options.find((option) => option.id === defaultCategoryId);
  const [text, setText] = useState(defaultOption?.label ?? "");

  const selectedId = options.find((option) => option.label.toLowerCase() === text.trim().toLowerCase())?.id ?? "";
  const listId = `category-options-${id}`;

  return (
    <div className="grid min-w-0 gap-1">
      <input type="hidden" name="categoryId" value={selectedId} />
      <Input
        aria-label="Categorie zoeken"
        list={listId}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Typ categorie..."
        className="min-w-0"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.id} value={option.label} />
        ))}
      </datalist>
      {text && !selectedId ? <p className="text-[0.65rem] font-semibold text-amber-700">Kies een categorie uit de lijst.</p> : null}
    </div>
  );
}

function buildOptions(categories: Category[]) {
  const nameCounts = new Map<string, number>();
  for (const category of categories) {
    const key = category.name.toLowerCase();
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }

  return categories
    .map((category) => ({
      id: category.id,
      label: (nameCounts.get(category.name.toLowerCase()) ?? 0) > 1 && category.parent ? `${category.name} (${category.parent})` : category.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "nl", { sensitivity: "base" }));
}
