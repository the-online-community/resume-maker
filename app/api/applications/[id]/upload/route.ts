import { NextRequest, NextResponse } from "next/server";

import { checkCsrf, MAX_FILE_SIZE } from "@/lib/api/sanitize";
import { getAuthClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  const { supabase, user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Read the raw body as ArrayBuffer
  let fileBuffer: ArrayBuffer;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
    }
    if (file.type && file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }
    fileBuffer = await file.arrayBuffer();
  } catch {
    // Fallback: read the raw body directly
    fileBuffer = await req.arrayBuffer();
    if (!fileBuffer || fileBuffer.byteLength === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
  }

  // Upload to Supabase Storage
  const filePath = `${user.id}/${id}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(filePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: uploadError.message },
      { status: 500 },
    );
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("resumes").getPublicUrl(filePath);

  // Update the application row
  const { data, error } = await supabase
    .from("applications")
    .update({ resume_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
