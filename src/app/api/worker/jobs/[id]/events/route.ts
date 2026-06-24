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
  const body = (await request.json()) as { level?: "debug" | "info" | "warn" | "error"; message?: string };

  if (!body.message) return Response.json({ error: "message is required." }, { status: 400 });

  const store = await getStore();
  const event = await store.addEvent(id, body.level ?? "info", body.message);

  return Response.json({ event });
}
