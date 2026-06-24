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
  const body = (await request.json()) as { conflictBranch?: string; body?: string };

  if (!body.conflictBranch || !body.body) {
    return Response.json({ error: "conflictBranch and body are required." }, { status: 400 });
  }

  const store = await getStore();
  const job = await store.markConflict(id, body.conflictBranch, body.body);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });

  return Response.json({ job });
}
