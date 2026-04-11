import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { adminClient } = auth;
  const { id } = await params;

  const [userResult, profileResult, usageResult, subsResult, eventsResult] =
    await Promise.all([
      adminClient.auth.admin.getUserById(id),
      adminClient.from("profiles").select("*").eq("user_id", id).single(),
      adminClient.from("usage").select("*").eq("user_id", id).single(),
      adminClient
        .from("subscriptions")
        .select("*")
        .eq("user_id", id)
        .single(),
      adminClient
        .from("analytics_events")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  if (!userResult.data?.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: userResult.data.user.id,
      email: userResult.data.user.email,
      avatar_url:
        userResult.data.user.user_metadata?.picture ??
        userResult.data.user.user_metadata?.avatar_url ??
        null,
      full_name:
        userResult.data.user.user_metadata?.full_name ??
        userResult.data.user.user_metadata?.name ??
        null,
      created_at: userResult.data.user.created_at,
      last_sign_in_at: userResult.data.user.last_sign_in_at,
    },
    profile: profileResult.data ?? null,
    usage: usageResult.data ?? null,
    subscription: subsResult.data ?? null,
    recentEvents: eventsResult.data ?? [],
  });
}
