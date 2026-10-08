import { NextResponse } from "next/server";
import { query } from "@/server/db/pool";

export async function GET() {
  const database = await query("select 1").then(
    () => "bereikbaar",
    () => "onbereikbaar",
  );
  const healthy = database === "bereikbaar";

  return NextResponse.json(
    { status: healthy ? "gezond" : "ongezond", database },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
