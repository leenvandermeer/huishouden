import { appUrl } from "@/lib/http/redirect-url";
import { noStoreRedirect } from "@/lib/http/security";
import { logout } from "@/modules/auth/service";

export async function POST(request: Request) {
  await logout();
  return noStoreRedirect(appUrl("/inloggen", request));
}
