import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { parseAiJson } from "@/lib/ai-json";
import { isErrorResponse, MAX_RESUME_TEXT, safeJson, sanitizeString } from "@/lib/api/sanitize";
import { ANTHROPIC_API_KEY, OPENAI_API_KEY } from "@/lib/env.server";
import { MODELS } from "@/lib/models";
import { EXTRACT_PROFILE_PROMPT } from "@/lib/prompts";
import { getAuthClient } from "@/lib/supabase/server";

interface ExtractProfileRequest {
  resumeText: string;
  model?: string;
}


export async function POST(request: Request) {
  const { user } = await getAuthClient();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await safeJson<ExtractProfileRequest>(request);
  if (isErrorResponse(body)) return body;

  try {
    const resumeText = sanitizeString(body.resumeText, MAX_RESUME_TEXT);
    const modelId = sanitizeString(body.model, 100) || "gpt-4o-mini";

    if (!resumeText) {
      return new Response(
        JSON.stringify({ error: "Missing resume text" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
    const userMessage = `RESUME TEXT:\n\n${resumeText}\n\nExtract structured profile data from this resume.`;

    if (modelDef.provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

      const message = await anthropic.messages.create({
        model: modelId,
        max_tokens: 4096,
        system: EXTRACT_PROFILE_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const text =
        message.content[0]?.type === "text" ? message.content[0].text : "";
      const parsed = parseAiJson(text);

      return new Response(JSON.stringify(parsed), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: modelId,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACT_PROFILE_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = parseAiJson(text);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Extract profile API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to extract profile data";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
