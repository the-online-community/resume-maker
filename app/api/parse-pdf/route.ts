import { NextResponse } from "next/server";

import { checkCsrf, MAX_FILE_SIZE } from "@/lib/api/sanitize";
import { getAuthClient } from "@/lib/supabase/server";

// pdf-parse v1 uses CommonJS default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require("pdf-parse/lib/pdf-parse") as (
  buffer: Buffer,
) => Promise<{ text: string; numpages: number }>;

export async function POST(request: Request) {
  const csrfError = checkCsrf(request);
  if (csrfError) return csrfError;

  const { user } = await getAuthClient();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json({ error: "Too many files (max 5)" }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" too large (max 10 MB)` }, { status: 413 });
      }
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = await pdf(buffer);
        return {
          fileName: file.name,
          text: parsed.text.trim(),
          pageCount: parsed.numpages,
        };
      }),
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("PDF parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF files" },
      { status: 500 },
    );
  }
}
