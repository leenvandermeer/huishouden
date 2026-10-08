import { readFile } from "node:fs/promises";
import { previewRestoreSnapshot, restoreSnapshot } from "../src/modules/finance/restore";

async function main() {
  const backupFile = process.env.BACKUP_FILE;
  if (!backupFile) throw new Error("BACKUP_FILE ontbreekt. Wijs naar een JSON-back-upbestand.");
  if (!process.env.DATABASE_URL || !/rehearsal|test/i.test(process.env.DATABASE_URL)) throw new Error("DATABASE_URL moet expliciet naar een geïsoleerde rehearsal- of testdatabase wijzen.");
  const rawJson = await readFile(backupFile, "utf8");
  const preview = await previewRestoreSnapshot(rawJson);
  const restored = await restoreSnapshot(rawJson);
  const verified = await previewRestoreSnapshot(rawJson);
  const differences = Object.entries(verified.tables).filter(([, counts]) => counts.backupRows !== counts.currentRows);
  if (differences.length) throw new Error(`Rijenaantallen wijken na herstel af: ${differences.map(([table]) => table).join(", ")}`);
  console.log(`Restore-repetitie geslaagd: ${restored.totalRows} rijen, schema ${restored.schemaVersion}, integriteit ${preview.integrity}, checksum ${restored.checksum.slice(0, 12)}…`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
