import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { MODELS } from "@/lib/models";

interface ExtractProfileRequest {
  resumeText: string;
  model?: string;
}

const SYSTEM_PROMPT = `You are a resume parser. Given raw text extracted from a PDF resume, extract structured profile data. Return ONLY valid JSON with these fields:

{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string",
  "github": "string",
  "website": "string",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, State",
      "start_date": "2020",
      "end_date": "2024 or Present"
    }
  ],
  "education": [
    {
      "degree": "B.S. Computer Science",
      "institution": "University Name",
      "year": "2019"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "stack": "React, Node.js",
      "description": "Brief description",
      "url": "https://...",
      "role": "Lead Developer",
      "highlights": ["specific measurable achievement or accomplishment"]
    }
  ],
  "languages": [
    {
      "language": "English",
      "proficiency": "Native"
    }
  ]
}

Rules:
- Extract ALL information available. If a field isn't found, use empty string or empty array.
- For skills, extract individual technologies/tools/frameworks mentioned anywhere.
- For project highlights, extract notable bullet points that show measurable impact or key accomplishments.
- Proficiency must be one of: "Native", "Fluent", "Advanced", "Intermediate", "Basic".
- Return ONLY valid JSON, no markdown, no extra text.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExtractProfileRequest;
    const { resumeText, model: modelId = "gpt-4o-mini" } = body;

    if (!resumeText?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing resume text" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const modelDef = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
    const userMessage = `RESUME TEXT:\n\n${resumeText}\n\nExtract structured profile data from this resume.`;

    if (modelDef.provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const message = await anthropic.messages.create({
        model: modelId,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "";
      const parsed = JSON.parse(text);

      return new Response(JSON.stringify(parsed), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: modelId,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Extract profile API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to extract profile data" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
