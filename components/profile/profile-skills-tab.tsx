"use client";

import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  countSkills,
  DEFAULT_SKILL_CATEGORIES,
  type SkillsMap,
  type UserProfile,
} from "@/lib/profile";

// ── Skill suggestions per category ──────────────────────────────────────────

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  Languages: [
    "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "C",
    "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "Dart",
    "R", "Lua", "Perl", "Elixir", "Clojure", "Haskell", "SQL",
    "HTML", "CSS", "Bash", "PowerShell", "Objective-C",
  ],
  Frontend: [
    "React", "Next.js", "Vue", "Nuxt", "Angular", "Svelte", "SvelteKit",
    "Astro", "Remix", "Gatsby", "Tailwind CSS", "CSS Modules", "Sass",
    "styled-components", "Radix UI", "shadcn/ui", "Material UI",
    "Chakra UI", "Ant Design", "Bootstrap", "Framer Motion",
    "Three.js", "D3.js", "Redux", "Zustand", "Jotai", "Recoil",
    "TanStack Query", "React Hook Form", "Storybook", "Playwright",
    "Cypress", "Jest", "Vitest", "Webpack", "Vite", "Turbopack",
    "React Native", "Expo", "Electron", "Tauri",
  ],
  Backend: [
    "Node.js", "Express", "Fastify", "NestJS", "Hono", "Koa",
    "Django", "Flask", "FastAPI", "Spring Boot", "ASP.NET",
    "Ruby on Rails", "Laravel", "Phoenix", "Gin", "Fiber",
    "GraphQL", "REST API", "tRPC", "gRPC", "WebSockets",
    "Server-Sent Events", "Microservices", "Message Queues",
    "RabbitMQ", "Kafka", "Bull", "Celery", "Cron Jobs",
  ],
  Databases: [
    "PostgreSQL", "MySQL", "MariaDB", "SQLite", "MongoDB",
    "Redis", "Elasticsearch", "DynamoDB", "Cassandra", "CockroachDB",
    "Supabase", "Firebase", "PlanetScale", "Neon", "Turso",
    "Prisma", "Drizzle", "TypeORM", "Sequelize", "Mongoose",
    "Knex", "SQL Server", "Oracle DB", "Neo4j", "InfluxDB",
  ],
  "DevOps & Cloud": [
    "AWS", "Google Cloud", "Azure", "Vercel", "Netlify", "Cloudflare",
    "Docker", "Kubernetes", "Terraform", "Pulumi", "Ansible",
    "GitHub Actions", "GitLab CI", "CircleCI", "Jenkins",
    "Nginx", "Caddy", "Linux", "Ubuntu", "Debian",
    "S3", "EC2", "Lambda", "CloudFront", "RDS", "ECS", "EKS",
    "Cloud Functions", "Cloud Run", "App Engine",
    "Datadog", "Grafana", "Prometheus", "Sentry", "New Relic",
  ],
  "Tools & Libraries": [
    "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence",
    "Figma", "Notion", "Slack", "Linear",
    "Stripe", "Twilio", "SendGrid", "Auth0", "Clerk",
    "OpenAI API", "Anthropic API", "LangChain", "Pinecone",
    "Zod", "Yup", "Joi", "date-fns", "Lodash", "Axios",
    "Socket.io", "Puppeteer", "Cheerio", "Sharp",
    "ESLint", "Prettier", "Biome", "Husky",
    "npm", "pnpm", "Yarn", "Bun", "Deno",
    "Postman", "Insomnia", "VS Code", "Cursor",
  ],
  General: [
    "SEO Optimization", "Performance Optimization", "Lazy Loading",
    "Code Splitting", "Tree Shaking", "Bundle Optimization",
    "Web Accessibility", "WCAG Compliance", "Responsive Design",
    "Mobile-First Design", "Progressive Web Apps", "Server-Side Rendering",
    "Static Site Generation", "Incremental Static Regeneration",
    "Caching Strategies", "CDN Optimization", "Image Optimization",
    "Core Web Vitals", "Lighthouse Audits",
    "Authentication", "Authorization", "OAuth", "JWT", "RBAC",
    "API Design", "Rate Limiting", "Input Validation", "Data Modeling",
    "Design Patterns", "Clean Architecture", "SOLID Principles", "DRY",
    "Test-Driven Development", "Unit Testing", "Integration Testing", "E2E Testing",
    "CI/CD", "Agile", "Scrum", "Kanban", "Code Review",
    "Technical Writing", "Documentation", "Mentoring",
    "Monorepos", "Turborepo", "Nx",
    "Internationalization", "Localization",
    "Real-Time Applications", "WebRTC", "Streaming",
    "Security Best Practices", "OWASP", "XSS Prevention", "CSRF Protection",
  ],
};

// ── Autocomplete input ──────────────────────────────────────────────────────

function SkillAutocomplete({
  category,
  existingSkills,
  onAdd,
}: {
  category: string;
  existingSkills: Set<string>;
  onAdd: (skill: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const suggestions = (SKILL_SUGGESTIONS[category] ?? []).filter(
    (s) =>
      !existingSkills.has(s.toLowerCase()) &&
      s.toLowerCase().includes(query.toLowerCase().trim()),
  );

  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (items[highlightIndex]) {
      (items[highlightIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const addSkill = (skill: string) => {
    onAdd(skill);
    setQuery("");
    // Keep dropdown open — don't setIsOpen(false)
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) {
        // If the highlighted suggestion matches what the user typed, use it (preserves casing)
        const highlighted = suggestions[highlightIndex];
        if (isOpen && highlighted && highlighted.toLowerCase() === query.trim().toLowerCase()) {
          addSkill(highlighted);
        } else {
          // Add whatever the user typed — supports comma-separated
          const items = query.split(",").map((s) => s.trim()).filter(Boolean);
          for (const item of items) onAdd(item);
          setQuery("");
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => setIsOpen(false), 150);
        }}
        onKeyDown={handleKeyDown}
        placeholder={`Add skill to ${category}...`}
        className="h-8 text-xs"
      />
      {isOpen && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="bg-popover border-border absolute z-10 mt-1 max-h-56 w-full overflow-y-auto border shadow-md"
        >
          {suggestions.map((skill, i) => (
            <button
              key={skill}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                addSkill(skill);
              }}
              className={`w-full cursor-pointer px-3 py-1.5 text-left text-xs transition-colors ${
                i === highlightIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              }`}
            >
              {skill}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main tab ────────────────────────────────────────────────────────────────

interface ProfileSkillsTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfileSkillsTab({ draft, onChange }: ProfileSkillsTabProps) {
  const skills: SkillsMap = draft.skills ?? {};
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);

  const categories = Object.keys(skills);
  const totalCount = countSkills(skills);

  // Build a set of all existing skills (lowercase) for dedup
  const allExisting = new Set<string>();
  for (const group of Object.values(skills)) {
    for (const s of group) allExisting.add(s.toLowerCase());
  }

  const updateSkills = (next: SkillsMap) => {
    onChange({ ...draft, skills: next });
  };

  const addCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || skills[trimmed]) return;
    updateSkills({ ...skills, [trimmed]: [] });
    setNewCategoryName("");
    setShowAddCategory(false);
  };

  const removeCategory = (name: string) => {
    const next = { ...skills };
    delete next[name];
    updateSkills(next);
  };

  const addSkillToCategory = (category: string, skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;

    // Deduplicate across ALL categories (case-insensitive, strip trailing version)
    const normalize = (s: string) =>
      s.toLowerCase().replace(/\s*\d+(\.\d+)*\s*$/, "").trim();
    const normalized = normalize(trimmed);

    for (const groupSkills of Object.values(skills)) {
      if (groupSkills.some((s) => normalize(s) === normalized)) return;
    }

    updateSkills({
      ...skills,
      [category]: [...(skills[category] ?? []), trimmed],
    });
  };

  const removeSkill = (category: string, index: number) => {
    const next = { ...skills };
    next[category] = next[category].filter((_, i) => i !== index);
    if (next[category].length === 0) delete next[category];
    updateSkills(next);
  };

  const unusedDefaults = DEFAULT_SKILL_CATEGORIES.filter(
    (cat) => !skills[cat],
  );

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        Organize your skills by category. The AI uses these as a database to
        pick the most relevant ones for each job. Type to search or press Enter
        for custom skills (supports comma-separated).
      </p>

      {/* Skill groups */}
      {categories.map((category) => (
        <div key={category} className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium">{category}</h3>
            <button
              type="button"
              onClick={() => removeCategory(category)}
              className="text-muted-foreground hover:text-destructive cursor-pointer text-[10px] transition-colors"
            >
              Remove group
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(skills[category] ?? []).map((skill, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(category, i)}
                  className="text-muted-foreground hover:text-destructive ml-0.5 cursor-pointer transition-colors"
                  aria-label={`Remove ${skill}`}
                >
                  <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <SkillAutocomplete
            category={category}
            existingSkills={allExisting}
            onAdd={(skill) => addSkillToCategory(category, skill)}
          />
        </div>
      ))}

      {/* Quick-add default categories */}
      {unusedDefaults.length > 0 && categories.length < 10 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-[10px]">
            Quick add category:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unusedDefaults.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => addCategory(cat)}
                className="border-border text-muted-foreground hover:border-foreground hover:text-foreground cursor-pointer border border-dashed px-2 py-0.5 text-xs transition-colors"
              >
                + {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom category */}
      {showAddCategory ? (
        <div className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCategory(newCategoryName);
              }
              if (e.key === "Escape") {
                setShowAddCategory(false);
                setNewCategoryName("");
              }
            }}
            placeholder="Category name..."
            className="h-8 flex-1 text-xs"
            autoFocus
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCategory(newCategoryName)}
            className="h-8 text-xs"
          >
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowAddCategory(false);
              setNewCategoryName("");
            }}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddCategory(true)}
          className="w-full gap-1.5"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
          Add Custom Category
        </Button>
      )}

      {totalCount > 0 && (
        <p className="text-muted-foreground text-xs">
          {totalCount} skill{totalCount !== 1 ? "s" : ""} across{" "}
          {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
        </p>
      )}
    </div>
  );
}
