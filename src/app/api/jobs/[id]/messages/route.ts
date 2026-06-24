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
  const body = (await request.json()) as { body?: string; author?: "local-agent" | "operator" | "worker" };

  if (!body.body?.trim()) {
    return Response.json({ error: "Message body is required." }, { status: 400 });
  }

  const store = await getStore();
  const job = await store.getJob(id);
  if (!job) return Response.json({ error: "Job not found." }, { status: 404 });

  const message = await store.addMessage(id, body.author ?? "operator", body.body.trim());
  return Response.json({ message });
}
