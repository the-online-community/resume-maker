import OpenAI from "openai";

import { OPENAI_API_KEY } from "@/lib/env.server";
import { buildEditSectionFullPrompt, buildEditSectionPartialPrompt } from "@/lib/prompts";
import { rateLimitResponse } from "@/lib/rate-limit";

import {
  isErrorResponse,
  MAX_JOB_DESCRIPTION,
  MAX_RESUME_TEXT,
  MAX_SHORT_TEXT,
  safeJson,
  sanitizeString,
} from "@/lib/api/sanitize";
import { getAuthClient } from "@/lib/supabase/server";

interface EditSectionRequest {
  sectionKey: string;
  currentContent: string;
  userInstruction: string;
  selectedText?: string;
  jobDescription?: string;
}

export async function POST(request: Request) {
  const { user } = await getAuthClient();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const blocked = rateLimitResponse(user.id);
  if (blocked) return blocked;

  const parsed = await safeJson<EditSectionRequest>(request);
  if (isErrorResponse(parsed)) return parsed;

  try {
    const sectionKey = sanitizeString(parsed.sectionKey, 100);
    const currentContent = sanitizeString(parsed.currentContent, MAX_RESUME_TEXT);
    const userInstruction = sanitizeString(parsed.userInstruction, MAX_SHORT_TEXT);
    const selectedText = parsed.selectedText ? sanitizeString(parsed.selectedText, MAX_RESUME_TEXT) : undefined;
    const jobDescription = parsed.jobDescription ? sanitizeString(parsed.jobDescription, MAX_JOB_DESCRIPTION) : undefined;

    if (!sectionKey || !currentContent || !userInstruction) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const isPartialEdit = !!selectedText;

    const systemPrompt = isPartialEdit
      ? buildEditSectionPartialPrompt(sectionKey)
      : buildEditSectionFullPrompt(sectionKey);

    const userMessage = isPartialEdit
      ? `FULL SECTION (for context only — do NOT output this):\n${currentContent}\n\nSELECTED TEXT TO REPLACE:\n"${selectedText}"\n\nINSTRUCTION: ${userInstruction}${jobDescription ? `\n\nJOB DESCRIPTION (for context):\n${jobDescription}` : ""}\n\nOutput ONLY the replacement for the selected text, nothing else.`
      : `CURRENT ${sectionKey} SECTION:\n${currentContent}\n\nINSTRUCTION: ${userInstruction}${jobDescription ? `\n\nJOB DESCRIPTION (for context):\n${jobDescription}` : ""}`;

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Edit section API error:", error);
    return new Response(JSON.stringify({ error: "Failed to edit section" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
