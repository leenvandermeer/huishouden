export function appUrl(path: string, request: Request) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Redirect-pad moet relatief binnen de app blijven.");
  }
  const requestUrl = new URL(request.url);
  if (!process.env.APP_URL && requestUrl.hostname === "0.0.0.0") {
    requestUrl.hostname = "localhost";
  }
  const baseUrl = process.env.APP_URL || requestUrl.origin;
  return new URL(path, baseUrl);
}
