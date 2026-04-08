import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/** GET — check if the user has a pending quota request */
export async function GET() {
  let user;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

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
  let user;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

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

  const body = await request.json();
  const reason = (body.reason as string)?.trim() || "";

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
