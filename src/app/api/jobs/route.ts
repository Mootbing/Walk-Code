import { isApiAuthorized, unauthorized } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isApiAuthorized(request)) return unauthorized();

  const store = await getStore();
  const jobs = await store.listJobs();

  return Response.json({ jobs });
}
