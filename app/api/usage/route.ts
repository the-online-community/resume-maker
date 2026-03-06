import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;

/** GET — return the current usage count and subscription status */
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

  const { data } = await supabase
    .from("usage")
    .select("count")
    .eq("user_id", user.id)
    .single();

  // Check subscription status
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, cancel_at_period_end, cancel_at")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  return NextResponse.json({
    count: data?.count ?? 0,
    max: MAX_ATTEMPTS,
    subscribed: !!subscription,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    cancelAt: subscription?.cancel_at ?? null,
  });
}

/** POST — increment usage count (called after a successful tailor) */
export async function POST() {
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

  // Check if user has active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  const isSubscribed = !!subscription;

  // Get current count
  const { data: existing } = await supabase
    .from("usage")
    .select("count")
    .eq("user_id", user.id)
    .single();

  const currentCount = existing?.count ?? 0;

  if (!isSubscribed && currentCount >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Usage limit reached", count: currentCount, max: MAX_ATTEMPTS },
      { status: 429 },
    );
  }

  // Upsert: insert or update
  const newCount = currentCount + 1;
  const { error } = await supabase.from("usage").upsert(
    {
      user_id: user.id,
      count: newCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json(
      { error: "Failed to update usage" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    count: newCount,
    max: MAX_ATTEMPTS,
    subscribed: isSubscribed,
  });
}
