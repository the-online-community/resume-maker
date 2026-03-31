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
}

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
    profile.projects.length === 0
  );
}
