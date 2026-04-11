import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { adminClient } = auth;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
  const last24h = new Date(Date.now() - 86_400_000).toISOString();

  const [errorsResult, todayEventsResult, yesterdayEventsResult, modelResult] =
    await Promise.all([
      // Errors in last 24h
      adminClient
        .from("api_errors")
        .select("route, status_code")
        .gte("created_at", last24h),

      // Events today
      adminClient
        .from("analytics_events")
        .select("event_type")
        .gte("created_at", today),

      // Events yesterday
      adminClient
        .from("analytics_events")
        .select("event_type")
        .gte("created_at", yesterday)
        .lt("created_at", today),

      // Model usage last 24h
      adminClient
        .from("analytics_events")
        .select("model")
        .eq("event_type", "resume_generated")
        .gte("created_at", last24h),
    ]);

  // Error rate per route
  const errorsByRoute: Record<string, number> = {};
  for (const row of errorsResult.data ?? []) {
    errorsByRoute[row.route] = (errorsByRoute[row.route] || 0) + 1;
  }

  // Today vs yesterday event counts
  const todayCount = todayEventsResult.data?.length ?? 0;
  const yesterdayCount = yesterdayEventsResult.data?.length ?? 0;

  // Model usage
  const modelUsage: Record<string, number> = {};
  for (const row of modelResult.data ?? []) {
    const m = row.model || "unknown";
    modelUsage[m] = (modelUsage[m] || 0) + 1;
  }

  return NextResponse.json({
    errorsByRoute,
    totalErrors24h: errorsResult.data?.length ?? 0,
    eventsToday: todayCount,
    eventsYesterday: yesterdayCount,
    trend:
      yesterdayCount === 0
        ? todayCount > 0
          ? 100
          : 0
        : Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100),
    modelUsage,
  });
}
