export type ForecastConfidence = "high" | "medium" | "low";
export type ForecastEvidenceStatus = "manual" | "strong_estimate" | "provisional_estimate" | "deviation";

export const FORECAST_STATUS_LABELS: Record<ForecastEvidenceStatus, string> = {
  manual: "Zelf ingevuld",
  strong_estimate: "Sterke schatting",
  provisional_estimate: "Voorlopige schatting",
  deviation: "Afwijking",
};

export function estimateStatus(confidence: ForecastConfidence, deviates = false): ForecastEvidenceStatus {
  if (deviates) return "deviation";
  return confidence === "high" ? "strong_estimate" : "provisional_estimate";
}

export function forecastStatusTone(status: ForecastEvidenceStatus) {
  if (status === "manual" || status === "strong_estimate") return "success" as const;
  if (status === "deviation") return "warning" as const;
  return "info" as const;
}
