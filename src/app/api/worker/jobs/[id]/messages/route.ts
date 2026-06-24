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
  const messages = await store.listMessages(id, true);

  return Response.json({ messages });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isApiAuthorized(request)) return unauthorized();

  const { id } = await params;
  const body = (await request.json()) as { ids?: string[] };

  const store = await getStore();
  await store.markMessagesConsumed(id, body.ids ?? []);

  return Response.json({ ok: true });
}
