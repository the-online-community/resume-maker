/**
 * Shared prompt fragments used across multiple AI routes.
 * Centralised here so tone and voice rules stay consistent.
 */

export const HUMAN_VOICE_RULES = `HUMAN VOICE RULES:

1. AVOID GENERIC LANGUAGE
Never use vague corporate phrases like "architected scalable solutions", "leveraged modern technologies", "collaborated with cross-functional teams" unless followed immediately by a specific result or context. Every sentence must pass this test: could this bullet apply to any developer anywhere? If yes, rewrite it until it cannot.

2. LEAD WITH THE STORY
When writing experience bullets, think about what actually happened — what was broken, what the person did, what changed as a result. Structure bullets as: [what I did] + [how I did it] + [what it changed]. Example: "Took page load from 10s to 200ms by introducing TanStack Query caching and consolidating shared state — eliminating redundant API calls across the entire component tree"

3. USE EVERY NUMBER AVAILABLE
If the user's profile contains any metric — percentage, user count, visitor count, time saved, languages supported, integrations built, months to ship — use it. Numbers are the difference between generic and specific. Never write "improved performance" when you can write "reduced load time by 98%". Never write "grew user base" when you can write "grew to 27 active users through word of mouth alone".

4. HONOR SOLO WORK
When the user built something alone, say so explicitly and make it feel like the achievement it is. Solo shipping a production SaaS is rare. Frame it that way. Use phrases like: "Built and shipped entirely solo in X months", "Owned every layer — from database schema to deployment — as sole developer", "Took from zero to production alone".

5. INDEPENDENT WORK PERIODS
Never omit or minimize periods where the user worked independently, built their own products, or freelanced. Frame these as founder experience. The user was not unemployed — they were building. Treat this chapter with the same weight as any employer entry. It often contains the most impressive work.

6. SUMMARY MUST BE PERSONAL
The summary must follow the 3-sentence structure (WHO / SPECIALTY / PROOF). No exceptions. It must sound like it was written about one specific person — not a template with variables swapped in. Every claim must be backed by real data from the profile.

7. PROJECTS ARE PRODUCTS
When writing project bullets, treat each project as a real product not a portfolio piece. Write about it the way a founder would describe their company — what it does, who uses it, what technical problems were solved to make it real. Always include the live URL. Always include real user metrics if they exist.`;

export const HUMAN_VOICE_RULES_SHORT = `HUMAN VOICE: Avoid generic corporate phrases — every bullet must be specific to what the user actually did. Lead with the story (what was broken \u2192 what they did \u2192 what changed). Use every number available. Honor solo work explicitly. Treat projects as real products, not portfolio pieces.`;

export const SUMMARY_RULES = `The summary is 3 sentences. No bullet points. No fluff. Every word earns its place.

Sentence 1 — WHO THEY ARE:
"[Role] with [X]+ years [doing what specifically]."
State the role, years, and what they actually do day to day — not a job title, but the work. Use phrases like "building and shipping production SaaS products end to end" or "designing and scaling frontend architecture for high-traffic platforms". Be specific to their actual stack and domain.

Sentence 2 — WHAT THEY SPECIALIZE IN:
"Specialized in [core stack] with proven experience [2-3 specific capabilities]."
Name the exact technologies they are strongest in, then list 2-3 concrete capabilities drawn from their real experience — things like "integrating AI APIs", "optimizing performance at scale", "owning frontend architecture in fast-moving startup environments". Never use generic phrases like "developing robust solutions" or "building scalable applications".

Sentence 3 — PROOF THEY DELIVER:
"Known for delivering measurable impact — [2-3 specific achievements with real numbers]."
This sentence is a highlight reel. Pull the most impressive metrics from their experience and projects — percentage improvements, user counts, things they built solo, systems they designed. Use real numbers from their profile. Examples: "reducing page load by 98%", "building dual AI provider systems", "launching products solo from concept to production", "attracting 100,000+ visitors".

NEVER write summaries that:
- Use bullet points or line breaks — it must be a flowing paragraph
- Start with "Results-driven" or "Passionate" or "Detail-oriented" or any similar cliche
- Use vague phrases like "proven track record of success" or "strong problem-solving skills"
- Could apply to any developer — every word must be specific to this person`;
