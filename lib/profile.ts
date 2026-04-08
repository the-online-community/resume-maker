export interface ExperienceEntry {
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
  projects?: string[]; // project names linked to this role
}

export interface EducationEntry {
  degree: string;
  institution: string;
  start_year?: string;
  year: string; // end year / graduation year
  achievement?: string;
}

export interface ProjectEntry {
  name: string;
  stack: string; // comma-separated, e.g. "React, Node.js, PostgreSQL"
  description: string;
  url?: string;
  role?: string;
  highlights?: string[]; // key achievements / accomplishments within this project
}

export interface LanguageEntry {
  language: string;
  proficiency: string; // e.g. "Native", "Fluent", "Advanced", "Intermediate", "Basic"
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  date?: string; // e.g. "2023", "Jan 2024"
  url?: string; // credential URL
}

export interface ContactField {
  id: string;
  type: "text" | "link";
  label: string;
  value: string;
  url?: string; // only for 'link' type
  visible: boolean; // toggle on/off for resume
}

export const LANGUAGE_PROFICIENCIES = [
  "Native",
  "Fluent",
  "Advanced",
  "Intermediate",
  "Basic",
] as const;

/** Skill categories for grouped display. Keys are category names, values are skill arrays. */
export type SkillsMap = Record<string, string[]>;

export const DEFAULT_SKILL_CATEGORIES = [
  "Languages",
  "Frontend",
  "Backend",
  "Databases",
  "DevOps & Cloud",
  "Tools & Libraries",
  "General",
] as const;

export interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  contact_fields: ContactField[];
  skills: SkillsMap;
  years_of_experience?: number;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  certifications: CertificationEntry[];
  languages: LanguageEntry[];
  onboarding_complete?: boolean;
}

/** Default contact fields for a new profile */
export function defaultContactFields(): ContactField[] {
  return [
    { id: "full_name", type: "text", label: "Full Name", value: "", visible: true },
    { id: "email", type: "link", label: "Email", value: "", visible: true },
    { id: "phone", type: "text", label: "Phone", value: "", visible: true },
    { id: "location", type: "text", label: "Location", value: "", visible: true },
    { id: "linkedin", type: "link", label: "LinkedIn", value: "", url: "", visible: true },
    { id: "github", type: "link", label: "GitHub", value: "", url: "", visible: true },
    { id: "website", type: "link", label: "Website", value: "", url: "", visible: true },
  ];
}

export const EMPTY_PROFILE: UserProfile = {
  full_name: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  website: "",
  contact_fields: defaultContactFields(),
  skills: {},
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  languages: [],
};

/**
 * Migrate old fixed contact fields to dynamic contact_fields array.
 * Called when loading profile data that may be in the old format.
 */
export function migrateContactFields(profile: Partial<UserProfile>): ContactField[] {
  // If contact_fields already exist and have values, use them
  if (
    profile.contact_fields?.length &&
    profile.contact_fields.some((f) => f.value)
  ) {
    return profile.contact_fields;
  }

  // Migrate from old fixed fields
  const fields: ContactField[] = [];
  const add = (
    id: string,
    type: "text" | "link",
    label: string,
    value: string,
    url?: string,
  ) => {
    fields.push({ id, type, label, value, url, visible: true });
  };

  if (profile.full_name) add("full_name", "text", "Full Name", profile.full_name);
  if (profile.email) add("email", "link", "Email", profile.email);
  if (profile.phone) add("phone", "text", "Phone", profile.phone);
  if (profile.location) add("location", "text", "Location", profile.location);
  if (profile.linkedin) add("linkedin", "link", "LinkedIn", profile.linkedin, profile.linkedin);
  if (profile.github) add("github", "link", "GitHub", profile.github, profile.github);
  if (profile.website) add("website", "link", "Website", profile.website, profile.website);

  // If nothing was migrated, return defaults
  return fields.length > 0 ? fields : defaultContactFields();
}

/**
 * Flatten grouped skills into a single deduplicated array.
 * Used when passing skills to AI APIs.
 */
export function flattenSkills(skills: SkillsMap): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const group of Object.values(skills)) {
    for (const skill of group) {
      const key = skill.toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(skill.trim());
      }
    }
  }
  return result;
}

/**
 * Migrate old flat skills array to grouped map.
 * Called when loading profile data that may be in the old format.
 */
export function migrateSkills(skills: unknown): SkillsMap {
  if (!skills) return {};
  // Already a grouped map
  if (typeof skills === "object" && !Array.isArray(skills)) {
    return skills as SkillsMap;
  }
  // Old format: flat string array → categorize into proper groups
  if (Array.isArray(skills)) {
    const arr = skills.filter((s): s is string => typeof s === "string" && s.trim() !== "");
    return arr.length > 0 ? categorizeSkills(arr) : {};
  }
  return {};
}

/** Count total skills across all categories */
export function countSkills(skills: SkillsMap): number {
  return Object.values(skills).reduce((sum, arr) => sum + arr.length, 0);
}

// ── Skill suggestions per category (shared by skills tab + import) ───────────

export const SKILL_SUGGESTIONS: Record<string, string[]> = {
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
    "React Native", "Expo", "Electron", "Tauri", "Element UI", "MUI",
    "HTML Canvas",
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

/**
 * Build a reverse lookup: lowercase skill name → category name.
 * Cached on first call.
 */
let _skillCategoryLookup: Map<string, string> | null = null;

function getSkillCategoryLookup(): Map<string, string> {
  if (_skillCategoryLookup) return _skillCategoryLookup;
  _skillCategoryLookup = new Map();
  for (const [category, skills] of Object.entries(SKILL_SUGGESTIONS)) {
    for (const skill of skills) {
      _skillCategoryLookup.set(skill.toLowerCase(), category);
    }
  }
  return _skillCategoryLookup;
}

/**
 * Categorize a flat array of skills into a SkillsMap using the known suggestions.
 * Skills that don't match any known category go into "General".
 */
export function categorizeSkills(skills: string[]): SkillsMap {
  const lookup = getSkillCategoryLookup();
  const result: SkillsMap = {};

  for (const skill of skills) {
    const trimmed = skill.trim();
    if (!trimmed) continue;
    const category = lookup.get(trimmed.toLowerCase()) ?? "General";
    if (!result[category]) result[category] = [];
    result[category].push(trimmed);
  }

  return result;
}

export function isProfileEmpty(profile: UserProfile): boolean {
  const hasContactData = profile.contact_fields?.some((f) => f.value.trim()) ?? false;
  return (
    !hasContactData &&
    countSkills(profile.skills) === 0 &&
    profile.experience.length === 0 &&
    profile.education.length === 0 &&
    profile.projects.length === 0 &&
    (profile.languages ?? []).length === 0
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  targetTab: string | null; // null = navigate to "/"
}

export function getOnboardingSteps(profile: UserProfile): OnboardingStep[] {
  const hasProjectWithHighlights = profile.projects.some(
    (p) => p.highlights && p.highlights.length > 0 && p.highlights.some((h) => h.trim()),
  );

  return [
    {
      id: "contact",
      label: "Add your contact info",
      completed: (profile.contact_fields ?? []).filter((f) => f.value.trim()).length >= 2,
      targetTab: "contact",
    },
    {
      id: "experience",
      label: "Add your experience",
      completed: profile.experience.length > 0,
      targetTab: "experience",
    },
    {
      id: "skills",
      label: "Add your skills",
      completed: countSkills(profile.skills) > 0,
      targetTab: "skills",
    },
    {
      id: "projects",
      label: "Add projects with highlights",
      completed: hasProjectWithHighlights,
      targetTab: "projects",
    },
    {
      id: "generate",
      label: "Generate your first resume",
      completed: false, // manual action — navigate to main page
      targetTab: null,
    },
  ];
}
