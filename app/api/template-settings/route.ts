import { NextResponse } from "next/server";

import { isErrorResponse, safeJson } from "@/lib/api/sanitize";
import { getAuthClient } from "@/lib/supabase/server";
import {
  DEFAULT_SETTINGS,
  type TemplateSettings,
} from "@/lib/resume/templates";

/** GET — return the user's template settings (or defaults) */
export async function GET() {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json(DEFAULT_SETTINGS);
  }

  const { data } = await supabase
    .from("template_settings")
    .select("sections, header_fields, bold_labels, bullet_style")
    .eq("user_id", user.id)
    .single();

  if (!data) {
    return NextResponse.json(DEFAULT_SETTINGS);
  }

  const settings: TemplateSettings = {
    sections: data.sections as string[],
    headerFields: data.header_fields as string[],
    boldLabels: data.bold_labels as boolean,
    bulletStyle: data.bullet_style as "dot" | "dash",
  };

  return NextResponse.json(settings);
}

/** PUT — upsert the user's template settings */
export async function PUT(request: Request) {
  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await safeJson<TemplateSettings>(request);
  if (isErrorResponse(body)) return body;

  // Validate types
  if (!Array.isArray(body.sections) || !Array.isArray(body.headerFields)) {
    return NextResponse.json({ error: "Invalid settings format" }, { status: 400 });
  }

  const { error } = await supabase.from("template_settings").upsert(
    {
      user_id: user.id,
      sections: body.sections.map(String).slice(0, 20),
      header_fields: body.headerFields.map(String).slice(0, 20),
      bold_labels: !!body.boldLabels,
      bullet_style: body.bulletStyle === "dash" ? "dash" : "dot",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Template settings upsert error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 },
    );
  }

  return NextResponse.json(body);
}
