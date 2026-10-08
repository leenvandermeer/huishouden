import { NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/service";
import { isProductEventType, normalizeProductPath, recordProductEvent } from "@/modules/finance/product-health";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const body = await request.json().catch(() => undefined);
  if (!body || !isProductEventType(body.eventType)) {
    return NextResponse.json({ error: "Ongeldig signaal" }, { status: 400 });
  }
  await recordProductEvent({ userId: user.id, eventType: body.eventType, path: normalizeProductPath(body.path) });
  return new NextResponse(null, { status: 204 });
}
