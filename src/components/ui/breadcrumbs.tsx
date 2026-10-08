import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Kruimelpad" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-text-subtle)]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1">
              {index > 0 && <ChevronRight aria-hidden="true" size={12} className="text-[var(--color-text-subtle)]" />}
              {item.href && !isLast ? (
                <Link href={item.href} className="font-medium text-brand hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className={isLast ? "font-semibold text-brand" : "font-medium"}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
