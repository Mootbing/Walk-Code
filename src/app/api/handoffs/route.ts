import { isApiAuthorized, unauthorized } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { CreateJobInput } from "@/lib/types";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isApiAuthorized(request)) return unauthorized();

  const body = (await request.json()) as Partial<CreateJobInput>;

  if (!body.title || !body.repoUrl || !body.sourceBranch || !body.handoffBranch || !body.currentSha || !body.summary) {
    return Response.json({ error: "Missing required handoff fields." }, { status: 400 });
  }

  const store = await getStore();
  const job = await store.createJob({
    id: body.id,
    title: body.title,
    repoUrl: body.repoUrl,
    sourceBranch: body.sourceBranch,
    handoffBranch: body.handoffBranch,
    resultBranch: body.resultBranch,
    currentSha: body.currentSha,
    handoffSha: body.handoffSha,
    enqueuedBy: typeof body.enqueuedBy === "string" ? body.enqueuedBy : undefined,
    summary: body.summary,
  });

  return Response.json({ job });
}
