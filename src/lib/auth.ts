import type { NextRequest } from "next/server";

export function isApiAuthorized(request: NextRequest) {
  const expected = process.env.WALK_API_TOKEN;

  if (!expected) {
    return true;
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  return token.length > 0 && token === expected;
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
