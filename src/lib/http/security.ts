import { NextResponse } from "next/server";

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
  Expires: "0",
};

export function noStoreResponse(body: BodyInit | null, init: ResponseInit = {}) {
  return new NextResponse(body, {
    ...init,
    headers: {
      ...noStoreHeaders,
      ...Object.fromEntries(new Headers(init.headers).entries()),
    },
  });
}

export function noStoreRedirect(url: URL | string, status: 303 | 307 | 308 = 303) {
  const response = NextResponse.redirect(url, status);
  for (const [key, value] of Object.entries(noStoreHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export function assertUploadedFilesWithinLimit(files: File[], input: { maxFileBytes: number; maxTotalBytes: number }) {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > input.maxTotalBytes) {
    throw new Error(`Upload is te groot. Maximum totaal is ${formatBytes(input.maxTotalBytes)}.`);
  }
  const largeFile = files.find((file) => file.size > input.maxFileBytes);
  if (largeFile) {
    throw new Error(`${largeFile.name} is te groot. Maximum per bestand is ${formatBytes(input.maxFileBytes)}.`);
  }
}

function formatBytes(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}
