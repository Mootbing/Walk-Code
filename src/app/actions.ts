"use server";

import { redirect } from "next/navigation";
import { dashboardToken, setDashboardCookie } from "@/lib/dashboard-auth";

export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = dashboardToken();

  if (!expected || password === process.env.DASHBOARD_PASSWORD) {
    await setDashboardCookie();
    redirect("/");
  }

  redirect("/?auth=failed");
}
