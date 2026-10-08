export const reportDestinations = [
  { id: "overview", slug: "overzicht", label: "Overzicht", href: "/inzicht?rapport=overzicht#overzicht" },
  { id: "trends", slug: "trends", label: "Trends", href: "/inzicht?rapport=trends#trends" },
  { id: "year", slug: "jaar", label: "Jaar", href: "/inzicht?rapport=jaar#jaar" },
  { id: "forecast", slug: "verwachting", label: "Verwachting", href: "/inzicht?rapport=verwachting#verwachting" },
  { id: "month", slug: "maandrapport", label: "Maandrapport", href: "/rapportages" },
] as const;

export type ReportDestinationId = (typeof reportDestinations)[number]["id"];
export type HubReportDestination = Exclude<ReportDestinationId, "month">;

export function parseReportSlug(value?: string | null): HubReportDestination {
  if (value === "trends") return "trends";
  if (value === "jaar") return "year";
  if (value === "verwachting") return "forecast";
  return "overview";
}

export function getReportDestination(report: HubReportDestination) {
  return reportDestinations.find((destination) => destination.id === report)!;
}
