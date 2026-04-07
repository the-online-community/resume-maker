export interface ExperienceEntry {
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year: string;
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

export interface UserProfile {
  full_name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  skills: string[];
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
  skills: [],
  experience: [],
  education: [],
  projects: [],
  languages: [],
};

export function isProfileEmpty(profile: UserProfile): boolean {
  return (
    !profile.full_name &&
    !profile.email &&
    !profile.phone &&
    !profile.location &&
    !profile.linkedin &&
    !profile.github &&
    !profile.website &&
    profile.skills.length === 0 &&
    profile.experience.length === 0 &&
    profile.education.length === 0 &&
    profile.projects.length === 0 &&
    (profile.languages ?? []).length === 0
  );
}
