import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const BONUS_PER_REFERRAL = 5;

/** GET — return the user's referral code and stats (creates code if needed) */
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

  // Check for existing referral row with a code for this user
  const { data: existing } = await supabase
    .from("referrals")
    .select("referral_code, status, bonus_granted")
    .eq("referrer_id", user.id);

  let code: string;

  if (existing && existing.length > 0) {
    code = existing[0].referral_code;
  } else {
    // Generate a new referral code
    code = nanoid(8);
    const { error } = await supabase.from("referrals").insert({
      referrer_id: user.id,
      referral_code: code,
      status: "pending",
    });

    if (error) {
      console.error("Referral code creation error:", error);
      return NextResponse.json(
        { error: "Failed to create referral code" },
        { status: 500 },
      );
    }
  }

  // Count completed referrals
  const completedCount = existing
    ? existing.filter((r) => r.status === "completed").length
    : 0;

  const bonusEarned = existing
    ? existing.filter((r) => r.bonus_granted).length * BONUS_PER_REFERRAL
    : 0;

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://resumemaker.cc";
  const referralUrl = `${origin}?ref=${code}`;

  return NextResponse.json({
    code,
    referralUrl,
    completedCount,
    bonusEarned,
  });
}

/** POST — process a referral code (called after signup) */
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

  const body = await request.json();
  const code = (body.code as string)?.trim();

  if (!code) {
    return NextResponse.json({ error: "Missing referral code" }, { status: 400 });
  }

  const supabase = await createClient();

  // Find the referral row
  const { data: referral } = await supabase
    .from("referrals")
    .select("id, referrer_id, referred_id, status")
    .eq("referral_code", code)
    .eq("status", "pending")
    .is("referred_id", null)
    .single();

  if (!referral) {
    return NextResponse.json(
      { error: "Invalid or already used referral code" },
      { status: 400 },
    );
  }

  // Can't refer yourself
  if (referral.referrer_id === user.id) {
    return NextResponse.json(
      { error: "Cannot use your own referral code" },
      { status: 400 },
    );
  }

  // Mark referral as completed
  const { error: updateError } = await supabase
    .from("referrals")
    .update({
      referred_id: user.id,
      status: "completed",
      bonus_granted: true,
    })
    .eq("id", referral.id);

  if (updateError) {
    console.error("Referral update error:", updateError);
    return NextResponse.json(
      { error: "Failed to process referral" },
      { status: 500 },
    );
  }

  // Grant bonus credits to the referrer
  // First ensure usage row exists for the referrer
  const { data: referrerUsage } = await supabase
    .from("usage")
    .select("bonus_credits")
    .eq("user_id", referral.referrer_id)
    .single();

  if (referrerUsage) {
    await supabase
      .from("usage")
      .update({
        bonus_credits: (referrerUsage.bonus_credits ?? 0) + BONUS_PER_REFERRAL,
      })
      .eq("user_id", referral.referrer_id);
  } else {
    await supabase.from("usage").upsert({
      user_id: referral.referrer_id,
      count: 0,
      bonus_credits: BONUS_PER_REFERRAL,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  // Create a new pending referral row for the referrer so they can keep inviting
  const newCode = nanoid(8);
  await supabase.from("referrals").insert({
    referrer_id: referral.referrer_id,
    referral_code: newCode,
    status: "pending",
  });

  return NextResponse.json({ success: true });
}
