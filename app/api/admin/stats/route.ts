import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { adminClient } = auth;
  const url = new URL(request.url);
  const days = Math.min(Number(url.searchParams.get("days") || "7"), 90);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  // Run queries in parallel
  const [
    usersResult,
    eventsResult,
    modelResult,
    subsResult,
    funnelSignupsResult,
  ] = await Promise.all([
    // Total users
    adminClient.auth.admin.listUsers({ perPage: 1, page: 1 }),

    // Events by type in time range
    adminClient
      .from("analytics_events")
      .select("event_type")
      .gte("created_at", since),

    // Model distribution in time range
    adminClient
      .from("analytics_events")
      .select("model")
      .eq("event_type", "resume_generated")
      .gte("created_at", since),

    // Active subscriptions
    adminClient
      .from("subscriptions")
      .select("id")
      .in("status", ["active", "trialing"]),

    // Signups in time range
    adminClient.auth.admin.listUsers({ perPage: 1000, page: 1 }),
  ]);

  // Count events by type
  const eventCounts: Record<string, number> = {};
  for (const row of eventsResult.data ?? []) {
    eventCounts[row.event_type] = (eventCounts[row.event_type] || 0) + 1;
  }

  // Model distribution
  const modelCounts: Record<string, number> = {};
  for (const row of modelResult.data ?? []) {
    const m = row.model || "unknown";
    modelCounts[m] = (modelCounts[m] || 0) + 1;
  }

  // Funnel: signups in period → generated → downloaded
  const signupsInPeriod =
    funnelSignupsResult.data?.users?.filter(
      (u) => new Date(u.created_at) >= new Date(since),
    ).length ?? 0;

  // Users who generated at least one resume in period
  const generatorResult = await adminClient
    .from("analytics_events")
    .select("user_id")
    .eq("event_type", "resume_generated")
    .gte("created_at", since);
  const uniqueGenerators = new Set(
    (generatorResult.data ?? []).map((r) => r.user_id),
  ).size;

  // Users who downloaded at least one PDF in period
  const downloaderResult = await adminClient
    .from("analytics_events")
    .select("user_id")
    .eq("event_type", "pdf_downloaded")
    .gte("created_at", since);
  const uniqueDownloaders = new Set(
    (downloaderResult.data ?? []).map((r) => r.user_id),
  ).size;

  return NextResponse.json({
    totalUsers:
      usersResult.data?.users?.length ?? 0,
    activeSubscriptions: subsResult.data?.length ?? 0,
    eventCounts,
    modelCounts,
    funnel: {
      signups: signupsInPeriod,
      generated: uniqueGenerators,
      downloaded: uniqueDownloaders,
    },
    days,
  });
}
