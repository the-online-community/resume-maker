/**
 * Safely parse a JSON response from an AI model.
 *
 * Handles common issues:
 *  - Markdown code fences (```json ... ``` or ``` ... ```)
 *  - Leading/trailing whitespace or commentary
 *  - Extracts the first top-level {...} or [...] block if the model adds prose
 */
export function parseAiJson<T = unknown>(raw: string): T {
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty AI response");
  }

  let text = raw.trim();

  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else if (text.startsWith("```")) {
    // Unclosed or malformed fence — strip leading fence marker
    text = text.replace(/^```(?:json|JSON)?\s*\n?/, "").replace(/\n?```\s*$/, "").trim();
  }

  // Fast path: already valid JSON
  try {
    return JSON.parse(text) as T;
  } catch {
    // Fallback: extract the first top-level object or array
    const objStart = text.indexOf("{");
    const arrStart = text.indexOf("[");
    const start =
      objStart === -1
        ? arrStart
        : arrStart === -1
          ? objStart
          : Math.min(objStart, arrStart);

    if (start === -1) {
      throw new Error(`AI response is not JSON: ${text.slice(0, 200)}`);
    }

    const opener = text[start];
    const closer = opener === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;
    let end = -1;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === opener) depth++;
      else if (ch === closer) {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }

    if (end === -1) {
      throw new Error(`AI response JSON is unterminated: ${text.slice(0, 200)}`);
    }

    return JSON.parse(text.slice(start, end + 1)) as T;
  }
}
