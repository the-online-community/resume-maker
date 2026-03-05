import OpenAI from "openai";

interface EditSectionRequest {
  sectionKey: string;
  currentContent: string;
  userInstruction: string;
  selectedText?: string;
  jobDescription?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EditSectionRequest;
    const {
      sectionKey,
      currentContent,
      userInstruction,
      selectedText,
      jobDescription,
    } = body;

    if (!sectionKey || !currentContent || !userInstruction) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const isPartialEdit = !!selectedText;

    const systemPrompt = isPartialEdit
      ? `You are a professional resume editor. The user has selected a specific portion of text within their resume's ${sectionKey} section and wants you to edit ONLY that selected text based on their instruction.

RULES:
- Return ONLY the replacement text for the selected portion — nothing else.
- Maintain the same formatting style and tone as the surrounding content.
- Do NOT fabricate information. Only rephrase, restructure, or enhance what exists.
- Do NOT include any explanation or commentary — output the replacement text only.
- Keep the same general length unless the user explicitly asks for more or less.`
      : `You are a surgical resume editor. The user wants a TARGETED edit to their resume's ${sectionKey} section.

CRITICAL RULES:
- You MUST output the COMPLETE section — every single entry, line, and bullet point that currently exists.
- ONLY modify the specific part the user's instruction refers to. Leave everything else EXACTLY as-is, word for word.
- For example, if the user says "add a bullet point to the second job", you must keep job 1, job 3, and all other jobs completely unchanged. Only the second job gets the new bullet point.
- NEVER drop, remove, summarize, or omit any existing content unless the user explicitly asks you to remove something.
- Do NOT fabricate skills, experiences, or qualifications not present in the original.
- Do NOT include any explanation or commentary — output the full section text only.
- Maintain the exact same formatting conventions (bullet points, line breaks, spacing).
- If a job description is provided, use it as context but still preserve all existing content.`;

    const userMessage = isPartialEdit
      ? `FULL SECTION (${sectionKey}):\n${currentContent}\n\nSELECTED TEXT TO EDIT:\n"${selectedText}"\n\nINSTRUCTION: ${userInstruction}${jobDescription ? `\n\nJOB DESCRIPTION (for context):\n${jobDescription}` : ""}`
      : `CURRENT ${sectionKey} SECTION:\n${currentContent}\n\nINSTRUCTION: ${userInstruction}${jobDescription ? `\n\nJOB DESCRIPTION (for context):\n${jobDescription}` : ""}`;

    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
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
