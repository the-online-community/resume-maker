import { NextResponse } from "next/server";

import { trackEvent } from "@/lib/admin/track";
import { getAuthClient } from "@/lib/supabase/server";

export async function POST() {
  const { user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  trackEvent({ userId: user.id, eventType: "pdf_downloaded" });
  return NextResponse.json({ ok: true });
}
