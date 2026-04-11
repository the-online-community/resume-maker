import { NextResponse } from "next/server";

import { isErrorResponse, MAX_SHORT_TEXT, safeJson, sanitizeString, sanitizeUrl } from "@/lib/api/sanitize";
import { getAuthClient } from "@/lib/supabase/server";

export async function GET() {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("applied_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await safeJson<{
    position: string;
    company?: string;
    platform?: string;
    job_url?: string;
    status?: string;
    notes?: string;
    applied_at?: string;
    resume_data?: Record<string, string>;
  }>(req);
  if (isErrorResponse(body)) return body;

  const position = sanitizeString(body.position, 500);
  if (!position) {
    return NextResponse.json(
      { error: "Position is required" },
      { status: 400 },
    );
  }

  const VALID_STATUSES = ["applied", "interviewing", "offered", "rejected", "withdrawn"];
  const status = VALID_STATUSES.includes(body.status ?? "") ? body.status! : "applied";

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      position,
      company: sanitizeString(body.company, 500) || null,
      platform: sanitizeString(body.platform, 200) || null,
      job_url: sanitizeUrl(body.job_url) || null,
      status,
      resume_data: body.resume_data || null,
      notes: sanitizeString(body.notes, MAX_SHORT_TEXT) || null,
      applied_at: body.applied_at || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
