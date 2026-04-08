import OpenAI from "openai";

import type { KeywordFix, ScoreResult } from "@/lib/score-types";

interface AnalyzeRequest {
  placeholders: Record<string, string>;
  jobDescription: string;
  requiredKeywords: string[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { placeholders, jobDescription, requiredKeywords } = body;

    if (!placeholders || !jobDescription || !requiredKeywords?.length) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      const idx = resumeTextLower.indexOf(termLower);
      if (idx === -1) return false;
      const boundary = /[\s,;.:()\-/&|!#'"[\]{}+]/;
      const before = idx > 0 ? resumeTextLower[idx - 1] : " ";
      const after = idx + termLower.length < resumeTextLower.length
        ? resumeTextLower[idx + termLower.length] : " ";
      return boundary.test(before) && boundary.test(after);
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
    const systemPrompt = `You are an expert resume editor. You will be given a resume and a list of MISSING KEYWORDS that need to be woven into the resume text.

For each missing keyword, find the best place in the resume to insert it and produce a surgical fix.

You MUST respond with valid JSON using this exact schema:
{
  "fixes": [
    {
      "id": "f1",
      "keyword": "the missing keyword",
      "section": "<exact section key from the resume: SUMMARY, EXPERIENCE, SKILLS, EDUCATION, or CERTIFICATIONS>",
      "action": "<short 5-10 word description, e.g. Add 'Kubernetes' to DevOps bullet>",
      "currentSnippet": "<exact substring from the resume section — a single bullet point, line, or short phrase>",
      "fixedSnippet": "<the same snippet reworded to include the keyword naturally>"
    }
  ]
}

CRITICAL RULES:
- ONLY produce fixes for the keywords in the MISSING KEYWORDS list. Do NOT invent new keywords.
- currentSnippet MUST be an EXACT, character-for-character substring of the section text. Copy it precisely — including spacing, punctuation, and line breaks.
- currentSnippet should be a single bullet point, sentence, or short phrase (1-2 lines). NEVER the full section.
- fixedSnippet must be approximately the SAME LENGTH as currentSnippet. Weave the keyword in by replacing a synonym, rephrasing slightly, or naturally incorporating it. Do NOT add new sentences, bullet points, or significantly more text.
- Each currentSnippet must appear EXACTLY ONCE in its section.
- If a keyword truly cannot be woven into any existing text naturally, skip it — do NOT force it.
- For skills sections, you can add the keyword to an existing comma-separated list.
- Prioritize placing keywords where they make the most semantic sense.`;

    const userMessage = `RESUME:\n${resumeSections}\n\nMISSING KEYWORDS:\n${missing.join(", ")}\n\nGenerate surgical fixes to weave these keywords into the resume.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const raw = JSON.parse(content) as { fixes: KeywordFix[] };

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
    return new Response(
      JSON.stringify({ error: "Failed to analyze resume" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
