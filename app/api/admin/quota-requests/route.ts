import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/auth";
import { isErrorResponse, safeJson, sanitizeString } from "@/lib/api/sanitize";

/** GET — list quota requests (filterable by status) */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { adminClient } = auth;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "pending";

  const { data, error } = await adminClient
    .from("quota_requests")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with user emails
  const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
  const emailMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: authData } =
      await adminClient.auth.admin.listUsers({ perPage: 1000, page: 1 });
    for (const u of authData?.users ?? []) {
      if (userIds.includes(u.id)) {
        emailMap.set(u.id, u.email ?? "");
      }
    }
  }

  const enriched = (data ?? []).map((r) => ({
    ...r,
    user_email: emailMap.get(r.user_id) ?? "",
  }));

  return NextResponse.json({ requests: enriched });
}

/** PATCH — approve or deny a quota request */
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { adminClient } = auth;
  const body = await safeJson<{
    id: string;
    action: "approve" | "deny";
    bonusCredits?: number;
  }>(request);
  if (isErrorResponse(body)) return body;

  const { id, action, bonusCredits = 10 } = body;
  const requestId = sanitizeString(id, 100);
  if (!requestId || !["approve", "deny"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Get the request to find user_id
  const { data: qr } = await adminClient
    .from("quota_requests")
    .select("user_id, status")
    .eq("id", requestId)
    .single();

  if (!qr) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (qr.status !== "pending") {
    return NextResponse.json(
      { error: "Request already processed" },
      { status: 409 },
    );
  }

  // Update status
  await adminClient
    .from("quota_requests")
    .update({ status: action === "approve" ? "approved" : "denied" })
    .eq("id", requestId);

  // On approve, grant bonus credits
  if (action === "approve") {
    const { data: usage } = await adminClient
      .from("usage")
      .select("bonus_credits")
      .eq("user_id", qr.user_id)
      .single();

    const currentBonus = usage?.bonus_credits ?? 0;

    await adminClient
      .from("usage")
      .upsert({
        user_id: qr.user_id,
        bonus_credits: currentBonus + bonusCredits,
        updated_at: new Date().toISOString(),
      });
  }

  return NextResponse.json({ success: true, action });
}
