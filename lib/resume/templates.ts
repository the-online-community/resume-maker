export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  placeholders: string[];
}

/**
 * Resume template definitions.
 */
export const templates: ResumeTemplate[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional, clean layout with clear sections",
    thumbnailUrl: "/templates/classic.png",
    placeholders: [
      "FULL_NAME",
      "JOB_TITLE",
      "EMAIL",
      "PHONE",
      "LOCATION",
      "LINKEDIN",
      "GITHUB",
      "WEBSITE",
      "SUMMARY",
      "EXPERIENCE",
      "EDUCATION",
      "SKILLS",
    ],
  },
  {
    id: "modern",
    name: "Modern",
    description: "Sleek, minimal design with accent colors",
    thumbnailUrl: "/templates/modern.png",
    placeholders: [
      "FULL_NAME",
      "EMAIL",
      "PHONE",
      "LOCATION",
      "LINKEDIN",
      "SUMMARY",
      "EXPERIENCE",
      "EDUCATION",
      "SKILLS",
      "CERTIFICATIONS",
    ],
  },
  {
    id: "compact",
    name: "Compact",
    description: "Dense, single-page layout for experienced professionals",
    thumbnailUrl: "/templates/compact.png",
    placeholders: [
      "FULL_NAME",
      "EMAIL",
      "PHONE",
      "LOCATION",
      "LINKEDIN",
      "SUMMARY",
      "EXPERIENCE",
      "EDUCATION",
      "SKILLS",
    ],
  },
];

export const DEFAULT_TEMPLATE = templates.find((t) => t.id === "classic")!;

// ── Template Settings (user-customizable) ──

export interface TemplateSettings {
  sections: string[];
  headerFields: string[];
  boldLabels: boolean;
  bulletStyle: "dot" | "dash";
}

/** All sections that can appear in a resume, with display labels. */
export const ALL_SECTIONS: { key: string; label: string }[] = [
  { key: "SUMMARY", label: "Summary" },
  { key: "EXPERIENCE", label: "Experience" },
  { key: "EDUCATION", label: "Education" },
  { key: "SKILLS", label: "Skills" },
  { key: "CERTIFICATIONS", label: "Certifications" },
];

/** All header contact fields that can appear, with display labels. */
export const ALL_HEADER_FIELDS: { key: string; label: string }[] = [
  { key: "EMAIL", label: "Email" },
  { key: "PHONE", label: "Phone" },
  { key: "LOCATION", label: "Location" },
  { key: "LINKEDIN", label: "LinkedIn" },
  { key: "GITHUB", label: "GitHub" },
  { key: "WEBSITE", label: "Website" },
];

export const DEFAULT_SETTINGS: TemplateSettings = {
  sections: ["SUMMARY", "EXPERIENCE", "EDUCATION", "SKILLS", "CERTIFICATIONS"],
  headerFields: ["EMAIL", "PHONE", "LOCATION", "LINKEDIN", "GITHUB", "WEBSITE"],
  boldLabels: true,
  bulletStyle: "dot",
};

/** Merge partial (from DB) with defaults to get full settings. */
export function resolveSettings(
  partial?: Partial<TemplateSettings>,
): TemplateSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
  };
}
