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
  skills: SkillsMap;
  years_of_experience?: number;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  projects: ProjectEntry[];
  languages: LanguageEntry[];
}

export const EMPTY_PROFILE: UserProfile = {
  full_name: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  website: "",
  skills: {},
  experience: [],
  education: [],
  projects: [],
  languages: [],
};

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
  // Old format: flat string array → put everything in "General"
  if (Array.isArray(skills)) {
    const arr = skills.filter((s): s is string => typeof s === "string" && s.trim() !== "");
    return arr.length > 0 ? { General: arr } : {};
  }
  return {};
}

/** Count total skills across all categories */
export function countSkills(skills: SkillsMap): number {
  return Object.values(skills).reduce((sum, arr) => sum + arr.length, 0);
}

export function isProfileEmpty(profile: UserProfile): boolean {
  return (
    !profile.full_name &&
    !profile.email &&
    !profile.phone &&
    !profile.location &&
    !profile.linkedin &&
    !profile.github &&
    !profile.website &&
    countSkills(profile.skills) === 0 &&
    profile.experience.length === 0 &&
    profile.education.length === 0 &&
    profile.projects.length === 0 &&
    (profile.languages ?? []).length === 0
  );
}
