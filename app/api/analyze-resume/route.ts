import OpenAI from "openai";

interface AnalyzeRequest {
  placeholders: Record<string, string>;
  jobDescription: string;
}

export interface AnalysisSuggestion {
  id: string;
  section: string;
  title: string;
  description: string;
  currentText: string;
  suggestedText: string;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  suggestions: AnalysisSuggestion[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;
    const { placeholders, jobDescription } = body;

    if (!placeholders || !jobDescription) {
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

    const systemPrompt = `You are an expert ATS resume analyst. Compare a resume against a job description and provide surgical, section-specific improvement suggestions.

You MUST respond with valid JSON using this exact schema:
{
  "score": <number 0-100>,
  "summary": "<1-2 sentence overall assessment>",
  "suggestions": [
    {
      "id": "<unique id like s1, s2, etc>",
      "section": "<exact section key: SUMMARY, EXPERIENCE, SKILLS, EDUCATION, or CERTIFICATIONS>",
      "title": "<short title of what to improve>",
      "description": "<1-2 sentence explanation of WHY this improvement helps>",
      "currentText": "<the EXACT current text of the section, copied character-for-character from the resume>",
      "suggestedText": "<the COMPLETE improved section text, ready to drop in as-is>"
    }
  ]
}

CRITICAL RULES FOR suggestedText:
- suggestedText must be the COMPLETE, FINAL text for that section — ready to be used directly in the resume with zero further editing.
- It must be PLAIN TEXT only. No Markdown (no ##, no **, no *). No HTML. No formatting syntax of any kind.
- NEVER include meta-instructions, labels like "Add:", "Note:", "Also:", "Remove:", or any commentary within suggestedText. It is the literal resume text, nothing else.
- Preserve ALL existing content. Only make targeted, surgical changes: weave in missing keywords, strengthen specific verbs, add quantification to specific bullets.
- The suggestedText should read as a natural, polished resume section — not a list of edits.
- Do NOT reorder, restructure, or reformat the section unless the suggestion is specifically about order/format.
- currentText must be copied EXACTLY as it appears in the resume input — character for character, including line breaks.

GENERAL RULES:
- Score reflects how well the resume matches the job description (0=no match, 100=perfect)
- Provide 3-6 suggestions, prioritised by impact
- Only suggest changes for sections that exist in the resume
- Focus on: missing keywords from the JD, weak action verbs, missing quantification, skills gaps
- Be specific: name the exact keywords, verbs, or metrics to add`;

    const userMessage = `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resumeSections}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
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

    const result = JSON.parse(content) as AnalysisResult;

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
