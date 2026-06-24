import { isApiAuthorized, unauthorized } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isApiAuthorized(request)) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { workerId?: string };
  const store = await getStore();
  const job = await store.claimNextJob(body.workerId ?? "railway-worker");

  return Response.json({ job });
}
