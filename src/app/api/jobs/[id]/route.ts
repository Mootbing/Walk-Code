import { isApiAuthorized, unauthorized } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isApiAuthorized(request)) return unauthorized();

  const { id } = await params;
  const store = await getStore();
  const [job, events, messages] = await Promise.all([
    store.getJob(id),
    store.listEvents(id),
    store.listMessages(id),
  ]);

  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });

  return Response.json({ job, events, messages });
}
