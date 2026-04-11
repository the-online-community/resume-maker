import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { parseAiJson } from "@/lib/ai-json";
import { isErrorResponse, safeJson, sanitizeString, MAX_JOB_DESCRIPTION } from "@/lib/api/sanitize";
import { rateLimitResponse } from "@/lib/rate-limit";
import { ANTHROPIC_API_KEY, OPENAI_API_KEY } from "@/lib/env.server";
import { MODELS } from "@/lib/models";
import { ANALYZE_RESUME_PROMPT } from "@/lib/prompts";
import type { KeywordFix, ScoreResult } from "@/lib/score-types";
import { getAuthClient } from "@/lib/supabase/server";

interface AnalyzeRequest {
  placeholders: Record<string, string>;
  jobDescription: string;
  requiredKeywords: string[];
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

  const blocked = rateLimitResponse(user.id);
  if (blocked) return blocked;

  const parsed = await safeJson<AnalyzeRequest>(request);
  if (isErrorResponse(parsed)) return parsed;

  try {
    const placeholders = parsed.placeholders;
    const jobDescription = sanitizeString(parsed.jobDescription, MAX_JOB_DESCRIPTION);
    const requiredKeywords = Array.isArray(parsed.requiredKeywords) ? parsed.requiredKeywords : [];
    const modelId = sanitizeString(parsed.model, 100) || "gpt-4o-mini";

    if (!placeholders || typeof placeholders !== "object" || !jobDescription || !requiredKeywords.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];

    // Build a text representation of the resume
    const resumeSections = Object.entries(placeholders)
      .filter(([, v]) => v && v.trim().length > 0)
      .map(([key, value]) => `## ${key}\n${value}`)
      .join("\n\n");

    // First pass: deterministic keyword matching
    // Atomize compound keywords for accurate matching
    const resumeTextLower = resumeSections.toLowerCase();

    function atomize(kw: string): string[] {
      const parenMatch = kw.match(/\(([^)]+)\)/);
      const parenItems = parenMatch
        ? parenMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const mainPart = kw.replace(/\s*\([^)]*\)\s*/g, "").trim();
      const mainItems = mainPart
        .split(/\s*[&,/]\s*|\s+and\s+/i)
        .map((s) => s.trim())
        .filter((s) => s.length >= 2);
      const all = [...mainItems, ...parenItems].filter((s) => s.length >= 2);
      return all.length > 0 ? all : [kw];
    }

    function foundInText(term: string): boolean {
      const termLower = term.toLowerCase();
      const boundary = /[\s,;.:()\-/&|!#'"[\]{}+]/;
      // Iterate through ALL occurrences — a short term like "git" can appear
      // as a substring of "github" (which fails the boundary check) while
      // still existing as a standalone word elsewhere in the resume.
      let startIdx = 0;
      while (startIdx < resumeTextLower.length) {
        const idx = resumeTextLower.indexOf(termLower, startIdx);
        if (idx === -1) return false;
        const before = idx > 0 ? resumeTextLower[idx - 1] : " ";
        const after =
          idx + termLower.length < resumeTextLower.length
            ? resumeTextLower[idx + termLower.length]
            : " ";
        if (boundary.test(before) && boundary.test(after)) return true;
        startIdx = idx + 1;
      }
      return false;
    }

    const matched: string[] = [];
    const missing: string[] = [];

    for (const kw of requiredKeywords) {
      const atoms = atomize(kw);
      // A compound keyword is "matched" if ANY of its atomic terms are found
      const anyFound = atoms.some((a) => foundInText(a));
      if (anyFound) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    }

    const score = requiredKeywords.length > 0
      ? Math.round((matched.length / requiredKeywords.length) * 100)
      : 100;

    // If nothing is missing, no need for AI fixes
    if (missing.length === 0) {
      const result: ScoreResult = {
        score,
        missingKeywords: [],
        fixes: [],
      };
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Second pass: ask AI to generate surgical fixes ONLY for the missing keywords
    const systemPrompt = ANALYZE_RESUME_PROMPT;

    const userMessage = `RESUME:\n${resumeSections}\n\nMISSING KEYWORDS:\n${missing.join(", ")}\n\nGenerate surgical fixes to weave these keywords into the resume.`;

    // Route to the correct provider based on the selected model
    let content: string;

    if (modelDef.provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
      const message = await anthropic.messages.create({
        model: modelId,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      content =
        message.content[0]?.type === "text" ? message.content[0].text : "";
    } else {
      const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: modelId,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });
      content = response.choices[0]?.message?.content ?? "";
    }

    if (!content) {
      throw new Error("No response from AI");
    }

    const raw = parseAiJson<{ fixes: KeywordFix[] }>(content);

    // Server-side validation: drop fixes whose currentSnippet doesn't match
    const validFixes: KeywordFix[] = [];
    for (const fix of raw.fixes ?? []) {
      const sectionText = placeholders[fix.section];
      if (!sectionText) continue;

      // Check snippet exists
      const firstIdx = sectionText.indexOf(fix.currentSnippet);
      if (firstIdx === -1) continue;

      // Check snippet is unique
      const secondIdx = sectionText.indexOf(fix.currentSnippet, firstIdx + 1);
      if (secondIdx !== -1) continue;

      // Ensure fixedSnippet is different
      if (fix.fixedSnippet === fix.currentSnippet) continue;

      // Ensure the keyword is actually in the missing list
      if (!missing.some((kw) => kw.toLowerCase() === fix.keyword.toLowerCase())) continue;

      validFixes.push(fix);
    }

    // Fallback: for any missing keyword that DIDN'T get a surgical fix,
    // generate a deterministic "Add to Skills" append fix so the user always
    // has an option for every gap.
    const coveredKeywords = new Set(
      validFixes.map((f) => f.keyword.toLowerCase()),
    );
    let fixCounter = validFixes.length + 1;

    for (const kw of missing) {
      if (coveredKeywords.has(kw.toLowerCase())) continue;
      validFixes.push({
        id: `f${fixCounter++}`,
        keyword: kw,
        section: "SKILLS",
        action: `Add '${kw}' to Skills`,
        currentSnippet: "",
        fixedSnippet: "",
        append: kw,
      });
    }

    const result: ScoreResult = {
      score,
      missingKeywords: missing,
      fixes: validFixes,
    };

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Analyze resume API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyze resume";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
