import { NextResponse } from "next/server";

import { getAuthClient } from "@/lib/supabase/server";

export async function GET() {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ subscribed: false });
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single();

  return NextResponse.json({
    subscribed: !!data,
    status: data?.status ?? null,
  });
}
