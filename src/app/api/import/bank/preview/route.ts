import { appUrl } from "@/lib/http/redirect-url";
import { assertUploadedFilesWithinLimit, noStoreRedirect } from "@/lib/http/security";
import { getCurrentUser } from "@/modules/auth/service";
import { createPendingImport } from "@/modules/finance/repository";

const maxImportFileBytes = 15 * 1024 * 1024;
const maxImportTotalBytes = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return noStoreRedirect(appUrl("/inloggen", request));
  if (user.role === "readonly") return noStoreRedirect(appUrl("/importeren?status=geen-rechten", request));

  const formData = await request.formData();
  const uploadedFiles = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!uploadedFiles.length) return noStoreRedirect(appUrl("/importeren?status=geen-bestanden", request));
  try {
    assertUploadedFilesWithinLimit(uploadedFiles, { maxFileBytes: maxImportFileBytes, maxTotalBytes: maxImportTotalBytes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload is te groot.";
    return noStoreRedirect(appUrl(`/importeren?status=formaatfout&message=${encodeURIComponent(message)}`, request));
  }

  const files = await Promise.all(uploadedFiles.map(async (file) => ({
    filename: file.name,
    contentBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
  })));
  const id = await createPendingImport({
    actorUserId: user.id,
    files,
    options: {
      accountName: String(formData.get("accountName") ?? "").trim(),
      accountIdentifier: String(formData.get("accountIdentifier") ?? "").trim(),
      accountType: String(formData.get("accountType") ?? "").trim(),
      sourceBank: String(formData.get("sourceBank") ?? "").trim(),
      mappingPresetId: String(formData.get("mappingPresetId") ?? "").trim(),
    },
  });

  return noStoreRedirect(appUrl(`/importeren/preview/${id}`, request));
}
