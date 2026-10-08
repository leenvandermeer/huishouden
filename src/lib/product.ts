export const PRODUCT_NAME = "Huishouden";
export const PRODUCT_EXPERIENCE = "Ruimte";
export const PRODUCT_RELEASE = "ruimte-2026.09";

export const LEGACY_ROUTE_REDIRECTS = [
  { source: "/dashboard.", destination: "/dashboard" },
  { source: "/analyse", destination: "/inzicht?rapport=trends" },
  { source: "/rapport", destination: "/rapportages" },
  { source: "/geldplanning", destination: "/planning" },
  { source: "/budget", destination: "/budgetten" },
] as const;
