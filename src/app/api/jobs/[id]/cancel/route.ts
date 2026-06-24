import { isApiAuthorized, unauthorized } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isApiAuthorized(request)) return unauthorized();

  const { id } = await params;
  const store = await getStore();
  const job = await store.updateJobStatus(id, "cancelled");
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });

  await store.addEvent(id, "warn", "Cancellation requested.");
  return Response.json({ job });
}
