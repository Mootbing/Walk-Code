import { createHash } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "walk_dashboard";

export function dashboardToken() {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return null;
  return createHash("sha256").update(password).digest("hex");
}

export async function isDashboardAuthorized() {
  const expected = dashboardToken();
  if (!expected) return true;

  const jar = await cookies();
  return jar.get(COOKIE_NAME)?.value === expected;
}

export async function setDashboardCookie() {
  const token = dashboardToken();
  if (!token) return;

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}
