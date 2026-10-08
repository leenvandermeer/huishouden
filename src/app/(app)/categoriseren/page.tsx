import { redirect } from "next/navigation";

export default async function CategorizationReviewPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const next = new URLSearchParams({ mode: "review" });
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  if (query?.trim()) next.set("q", query.trim());
  redirect(`/transacties?${next.toString()}`);
}
