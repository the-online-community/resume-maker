import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { adminClient } = auth;
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || "20")));
  const search = url.searchParams.get("search")?.toLowerCase() ?? "";

  // Fetch users from Supabase Auth
  const { data: authData } = await adminClient.auth.admin.listUsers({
    page,
    perPage: limit,
  });
  const users = authData?.users ?? [];

  // Filter by search (email)
  const filtered = search
    ? users.filter((u) => u.email?.toLowerCase().includes(search))
    : users;

  // Get usage data for these users
  const userIds = filtered.map((u) => u.id);

  const [usageResult, subsResult, eventResult] = await Promise.all([
    adminClient.from("usage").select("*").in("user_id", userIds),
    adminClient
      .from("subscriptions")
      .select("user_id, status")
      .in("user_id", userIds),
    adminClient
      .from("analytics_events")
      .select("user_id, event_type")
      .in("user_id", userIds),
  ]);

  // Index lookup tables
  const usageMap = new Map(
    (usageResult.data ?? []).map((u) => [u.user_id, u]),
  );
  const subsMap = new Map(
    (subsResult.data ?? []).map((s) => [s.user_id, s.status]),
  );

  // Event counts per user
  const eventMap = new Map<string, Record<string, number>>();
  for (const e of eventResult.data ?? []) {
    if (!eventMap.has(e.user_id)) eventMap.set(e.user_id, {});
    const counts = eventMap.get(e.user_id)!;
    counts[e.event_type] = (counts[e.event_type] || 0) + 1;
  }

  const result = filtered.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    usage: usageMap.get(u.id) ?? null,
    subscription_status: subsMap.get(u.id) ?? null,
    event_counts: eventMap.get(u.id) ?? {},
  }));

  return NextResponse.json({
    users: result,
    page,
    limit,
    total: authData?.users?.length ?? 0,
  });
}
