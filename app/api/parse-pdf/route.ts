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

    if (files.length > 10) {
      return NextResponse.json({ error: "Too many files (max 10)" }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File "${file.name}" too large (max 10 MB)` }, { status: 413 });
      }

      // MIME type check
      if (file.type && file.type !== "application/pdf") {
        return NextResponse.json({ error: `File "${file.name}" is not a PDF` }, { status: 400 });
      }

      // File extension check
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: `File "${file.name}" must be a .pdf file` }, { status: 400 });
      }
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());

        // PDF magic bytes check (%PDF)
        if (buffer.length < 4 || buffer.subarray(0, 4).toString("ascii") !== "%PDF") {
          throw new Error(`File "${file.name}" is not a valid PDF`);
        }
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
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("File ") && message.endsWith("valid PDF")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("PDF parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF files" },
      { status: 500 },
    );
  }
}
