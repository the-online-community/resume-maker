import { NextResponse } from "next/server";

import { isErrorResponse, MAX_SHORT_TEXT, safeJson, sanitizeString } from "@/lib/api/sanitize";
import { getAuthClient } from "@/lib/supabase/server";

/** GET — check if the user has a pending quota request */
export async function GET() {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: pending } = await supabase
    .from("quota_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .limit(1)
    .single();

  return NextResponse.json({ hasPending: !!pending });
}

/** POST — submit a quota increase request */
export async function POST(request: Request) {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from("quota_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a pending request" },
      { status: 409 },
    );
  }

  const body = await safeJson<{ reason?: string }>(request);
  if (isErrorResponse(body)) return body;
  const reason = sanitizeString(body.reason, MAX_SHORT_TEXT);

  const { error } = await supabase.from("quota_requests").insert({
    user_id: user.id,
    reason,
    status: "pending",
  });

  if (error) {
    console.error("Quota request insert error:", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
