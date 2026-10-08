import type { ActionSignal } from "./reporting";

export type ReportSignalStatusValue = "open" | "resolved" | "dismissed";

export interface ReportSignalStatusRecord {
  signalId: string;
  status: ReportSignalStatusValue;
  updatedAt: string;
}

export interface ActionSignalWithStatus extends ActionSignal {
  status: ReportSignalStatusValue;
  updatedAt?: string;
}

export function mergeActionSignalStatuses(signals: ActionSignal[], statuses: ReportSignalStatusRecord[]): ActionSignalWithStatus[] {
  const statusById = new Map(statuses.map((status) => [status.signalId, status]));
  return signals.map((signal) => {
    const saved = statusById.get(signal.id);
    return { ...signal, status: saved?.status ?? "open", updatedAt: saved?.updatedAt };
  });
}
