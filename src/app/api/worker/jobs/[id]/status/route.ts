import { isApiAuthorized, unauthorized } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { JobStatus } from "@/lib/types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const statuses = new Set<JobStatus>([
  "queued",
  "running",
  "waiting_for_input",
  "conflict",
  "completed",
  "failed",
  "cancelled",
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isApiAuthorized(request)) return unauthorized();

  const { id } = await params;
  const body = (await request.json()) as {
    status?: JobStatus;
    error?: string | null;
    handoffSha?: string | null;
  };

  if (!body.status || !statuses.has(body.status)) {
    return Response.json({ error: "Valid status is required." }, { status: 400 });
  }

  const store = await getStore();
  const job = await store.updateJobStatus(id, body.status, {
    error: body.error ?? undefined,
    handoffSha: body.handoffSha ?? undefined,
  });

  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });

  await store.addEvent(id, body.status === "failed" ? "error" : "info", `Status changed to ${body.status}.`);
  return Response.json({ job });
}
