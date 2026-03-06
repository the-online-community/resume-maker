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
