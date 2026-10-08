import { createHash } from "node:crypto";

export const BACKUP_CHECKSUM_ALGORITHM = "sha256" as const;

export function checksumJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function backupDataChecksum(data: Record<string, unknown>) {
  return checksumJson(data);
}
