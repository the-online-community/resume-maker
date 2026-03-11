import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("user_id", user.id)
    .order("applied_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    position: string;
    company?: string;
    platform?: string;
    job_url?: string;
    status?: string;
    notes?: string;
    applied_at?: string;
    resume_data?: Record<string, string>;
  };

  if (!body.position?.trim()) {
    return NextResponse.json(
      { error: "Position is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      position: body.position.trim(),
      company: body.company?.trim() || null,
      platform: body.platform?.trim() || null,
      job_url: body.job_url?.trim() || null,
      status: body.status || "applied",
      resume_data: body.resume_data || null,
      notes: body.notes?.trim() || null,
      applied_at: body.applied_at || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
