import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import type { ImportField } from "@/modules/finance/bank-import";
import { parseBankFile } from "@/modules/finance/bank-import-camt";
import { getCategoryReviewCount, getImportMappingPresets, getPendingImport, importBankDataset, withBankImportLock, markPendingImportImported, saveImportMappingPreset, touchImportMappingPreset, writeAuditLog } from "@/modules/finance/repository";

const fields: ImportField[] = ["account", "date", "amount", "balance", "counterAccount", "counterparty", "description", "sequence"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role === "readonly") return noStoreRedirect(appUrl("/importeren?status=geen-rechten", request));

  const response = await withBankImportLock(async () => {
    const formData = await request.formData();
    const pendingImportId = String(formData.get("pendingImportId") ?? "");
    const pendingImport = await getPendingImport(pendingImportId);
    if (!pendingImport) return noStoreRedirect(appUrl("/importeren?status=preview-verlopen", request));
  
    const columnMapping: Partial<Record<ImportField, string>> = {};
    for (const field of fields) {
      const value = String(formData.get(`mapping.${field}`) ?? "").trim();
      if (value) columnMapping[field] = value;
    }
    const presetId = stringOption(pendingImport.options.mappingPresetId);
    const preset = presetId ? (await getImportMappingPresets()).find((candidate) => candidate.id === presetId) : undefined;
    const effectiveMapping = Object.keys(columnMapping).length ? columnMapping : preset?.mapping;
    if (preset) await touchImportMappingPreset(preset.id);
  
    const results = [];
    for (const file of pendingImport.files) {
      const dataset = parseBankFile(Buffer.from(file.contentBase64, "base64"), {
        filename: file.filename,
        accountName: stringOption(pendingImport.options.accountName),
        accountIdentifier: stringOption(pendingImport.options.accountIdentifier),
        accountType: accountTypeOption(pendingImport.options.accountType),
        sourceBank: stringOption(pendingImport.options.sourceBank),
        columnMapping: effectiveMapping,
      });
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
          skippedExcludedTransactions: result.skippedExcludedTransactions,
          duplicateFile: result.duplicateFile,
        },
      });
    }
  
    await markPendingImportImported(pendingImportId);
    if (!results.length) return noStoreRedirect(appUrl("/importeren?status=geen-transacties", request));
  
    const inserted = results.reduce((sum, result) => sum + result.insertedTransactions, 0);
    const skipped = results.reduce((sum, result) => sum + Math.max(0, result.skippedTransactions - result.skippedExcludedTransactions), 0);
    const excluded = results.reduce((sum, result) => sum + result.skippedExcludedTransactions, 0);
    const accounts = results.reduce((sum, result) => sum + result.accountCount, 0);
    if (Object.keys(columnMapping).length) {
      const sourceBank = stringOption(pendingImport.options.sourceBank) ?? results[0]?.filename.split("_")[0] ?? "Bank";
      await saveImportMappingPreset({
        name: `${sourceBank} CSV`,
        sourceBank,
        mapping: columnMapping,
      });
    }
    const reviewCount = await getCategoryReviewCount();
    const status = inserted > 0 ? "geimporteerd" : "geen-nieuwe-transacties";
    return noStoreRedirect(appUrl(`/importeren?status=${status}&inserted=${inserted}&skipped=${skipped}&excluded=${excluded}&files=${results.length}&accounts=${accounts}&review=${reviewCount}`, request));
  });
  return response ?? noStoreRedirect(appUrl("/importeren?status=import-bezig", request));
}

function stringOption(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function accountTypeOption(value: unknown) {
  return value === "betaalrekening" || value === "spaarrekening" || value === "beleggingsrekening" || value === "schuld" ? value : undefined;
}
