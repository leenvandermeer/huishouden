import { appUrl } from "@/lib/http/redirect-url";
import { assertUploadedFilesWithinLimit, noStoreRedirect } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import type { FinanceDataset } from "@/modules/finance/bank-import";
import { parseBankFile } from "@/modules/finance/bank-import-camt";
import { importBankDataset, withBankImportLock, writeAuditLog } from "@/modules/finance/repository";

const maxImportFileBytes = 15 * 1024 * 1024;
const maxImportTotalBytes = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return noStoreRedirect(appUrl("/inloggen", request));
  }
  if (user.role === "readonly") {
    return noStoreRedirect(appUrl("/importeren?status=geen-rechten", request));
  }

  const response = await withBankImportLock(async () => {
    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);
  
    if (!files.length) {
      return noStoreRedirect(appUrl("/importeren?status=geen-bestanden", request));
    }
    try {
      assertUploadedFilesWithinLimit(files, { maxFileBytes: maxImportFileBytes, maxTotalBytes: maxImportTotalBytes });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload is te groot.";
      return noStoreRedirect(appUrl(`/importeren?status=formaatfout&message=${encodeURIComponent(message)}`, request));
    }
  
    const accountName = String(formData.get("accountName") ?? "").trim() || undefined;
    const accountIdentifier = String(formData.get("accountIdentifier") ?? "").trim() || undefined;
    const accountTypeInput = String(formData.get("accountType") ?? "");
    const accountType = accountTypeInput === "betaalrekening" || accountTypeInput === "spaarrekening" || accountTypeInput === "beleggingsrekening" || accountTypeInput === "schuld" ? accountTypeInput : undefined;
    const sourceBank = String(formData.get("sourceBank") ?? "").trim() || undefined;
    const results = [];
  
    for (const file of files) {
      let dataset: FinanceDataset | undefined;
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        dataset = parseBankFile(buffer, { filename: file.name, accountIdentifier, accountName, accountType, sourceBank });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Onbekend importformaat.";
        return noStoreRedirect(appUrl(`/importeren?status=formaatfout&message=${encodeURIComponent(message)}`, request));
      }
      if (!dataset) continue;
  
      const result = await importBankDataset(dataset);
      results.push(result);
      await writeAuditLog({
        actorUserId: user.id,
        eventType: "import.bank",
        entityType: "import",
        entityId: result.importId,
        details: {
          filename: result.filename,
          insertedTransactions: result.insertedTransactions,
          skippedTransactions: result.skippedTransactions,
          duplicateFile: result.duplicateFile,
        },
      });
    }
  
    if (!results.length) {
      return noStoreRedirect(appUrl("/importeren?status=geen-transacties", request));
    }
  
    const inserted = results.reduce((sum, result) => sum + result.insertedTransactions, 0);
    const skipped = results.reduce((sum, result) => sum + result.skippedTransactions, 0);
    const accounts = results.reduce((sum, result) => sum + result.accountCount, 0);
    const status = inserted > 0 ? "geimporteerd" : "geen-nieuwe-transacties";
    return noStoreRedirect(appUrl(`/importeren?status=${status}&inserted=${inserted}&skipped=${skipped}&files=${results.length}&accounts=${accounts}`, request));
  });
  return response ?? noStoreRedirect(appUrl("/importeren?status=import-bezig", request));
}
