import { NextResponse } from "next/server";

import { isErrorResponse, MAX_SHORT_TEXT, safeJson, sanitizeString, sanitizeUrl } from "@/lib/api/sanitize";
import { getAuthClient } from "@/lib/supabase/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await safeJson<Record<string, unknown>>(req);
  if (isErrorResponse(body)) return body;

  // Only allow updating specific fields, with sanitization per type
  const sanitizers: Record<string, (v: unknown) => unknown> = {
    position: (v) => sanitizeString(v, 500),
    company: (v) => sanitizeString(v, 500) || null,
    platform: (v) => sanitizeString(v, 200) || null,
    job_url: (v) => sanitizeUrl(v) || null,
    status: (v) => sanitizeString(v, 50),
    resume_data: (v) => v, // structured object, passed through
    resume_url: (v) => sanitizeUrl(v) || null,
    notes: (v) => sanitizeString(v, MAX_SHORT_TEXT) || null,
    applied_at: (v) => sanitizeString(v, 20),
  };
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of Object.keys(sanitizers)) {
    if (key in body) {
      updates[key] = sanitizers[key](body[key]);
    }
  }

  const { data, error } = await supabase
    .from("applications")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
