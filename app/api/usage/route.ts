import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;

/** GET — return the current usage count for the authenticated user */
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

  return NextResponse.json({ count: data?.count ?? 0, max: MAX_ATTEMPTS });
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

  // Get current count
  const { data: existing } = await supabase
    .from("usage")
    .select("count")
    .eq("user_id", user.id)
    .single();

  const currentCount = existing?.count ?? 0;

  if (currentCount >= MAX_ATTEMPTS) {
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

  return NextResponse.json({ count: newCount, max: MAX_ATTEMPTS });
}
