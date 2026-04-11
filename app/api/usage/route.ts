import { NextResponse } from "next/server";

import { getAuthClient } from "@/lib/supabase/server";

/** Get UTC midnight for today (start of current day) */
function getUtcMidnightToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Get UTC midnight for tomorrow (next reset time) */
function getNextResetTime(): string {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return tomorrow.toISOString();
}

/** GET — return the current usage count, dynamic limits, and subscription status */
export async function GET() {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data } = await supabase
    .from("usage")
    .select("count, daily_limit, bonus_credits, updated_at")
    .eq("user_id", user.id)
    .single();

  let count = data?.count ?? 0;
  const dailyLimit = data?.daily_limit ?? 5;
  const bonusCredits = data?.bonus_credits ?? 0;
  const effectiveLimit = dailyLimit + bonusCredits;

  // Daily reset: if updated_at is before today's UTC midnight, reset count
  if (data?.updated_at) {
    const updatedAt = new Date(data.updated_at);
    const todayMidnight = getUtcMidnightToday();
    if (updatedAt < todayMidnight) {
      // Reset count for the new day
      count = 0;
      await supabase.from("usage").update({
        count: 0,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    }
  }

  // Check subscription status
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, cancel_at_period_end, cancel_at")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  return NextResponse.json({
    count,
    max: effectiveLimit,
    dailyLimit,
    bonusCredits,
    subscribed: !!subscription,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    cancelAt: subscription?.cancel_at ?? null,
    resetsAt: getNextResetTime(),
  });
}

/** POST — increment usage count (called after a successful tailor) */
export async function POST() {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user has active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  const isSubscribed = !!subscription;

  // Get current usage row
  const { data: existing } = await supabase
    .from("usage")
    .select("count, daily_limit, bonus_credits, updated_at")
    .eq("user_id", user.id)
    .single();

  let currentCount = existing?.count ?? 0;
  const dailyLimit = existing?.daily_limit ?? 5;
  const bonusCredits = existing?.bonus_credits ?? 0;
  const effectiveLimit = dailyLimit + bonusCredits;

  // Daily reset check before incrementing
  if (existing?.updated_at) {
    const updatedAt = new Date(existing.updated_at);
    const todayMidnight = getUtcMidnightToday();
    if (updatedAt < todayMidnight) {
      currentCount = 0;
    }
  }

  if (!isSubscribed && currentCount >= effectiveLimit) {
    return NextResponse.json(
      { error: "Usage limit reached", count: currentCount, max: effectiveLimit },
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
    max: effectiveLimit,
    subscribed: isSubscribed,
  });
}
