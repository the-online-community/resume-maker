import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { adminClient } = auth;
  const url = new URL(request.url);
  const days = Math.min(Number(url.searchParams.get("days") || "7"), 90);
  const route = url.searchParams.get("route") || null;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  let query = adminClient
    .from("api_errors")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  if (route) {
    query = query.eq("route", route);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also return route summary
  const routeCounts: Record<string, number> = {};
  for (const row of data ?? []) {
    routeCounts[row.route] = (routeCounts[row.route] || 0) + 1;
  }

  return NextResponse.json({
    errors: data ?? [],
    routeSummary: routeCounts,
    days,
  });
}
