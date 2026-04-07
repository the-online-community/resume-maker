"use client";

import { Badge } from "@/components/ui/badge";
import { countSkills, isProfileEmpty, type UserProfile } from "@/lib/profile";

interface ProfileMeTabProps {
  draft: UserProfile;
  onTabChange: (tab: string) => void;
}

function SectionHeader({
  title,
  tab,
  onTabChange,
}: {
  title: string;
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium">{title}</h3>
      <button
        type="button"
        className="text-primary cursor-pointer text-xs hover:underline"
        onClick={() => onTabChange(tab)}
      >
        Edit
      </button>
    </div>
  );
}

export function ProfileMeTab({ draft, onTabChange }: ProfileMeTabProps) {
  if (isProfileEmpty(draft)) {
    return (
      <div className="space-y-4 py-8 text-center">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Welcome to your profile</h3>
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">
            Your profile is the AI&apos;s knowledge base. Fill it in once, and
            every resume it generates will be grounded in your real experience.
          </p>
        </div>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            className="text-primary cursor-pointer text-sm font-medium hover:underline"
            onClick={() => onTabChange("contact")}
          >
            Start manually
          </button>
          <span className="text-muted-foreground">or</span>
          <button
            type="button"
            className="text-primary cursor-pointer text-sm font-medium hover:underline"
            onClick={() => onTabChange("import")}
          >
            Import from resume
          </button>
        </div>
      </div>
    );
  }

  const hasContact =
    draft.full_name || draft.email || draft.phone || draft.location;
  const hasLinks = draft.linkedin || draft.github || draft.website;

  return (
    <div className="space-y-5">
      {/* Contact */}
      {(hasContact || hasLinks) && (
        <div className="space-y-2">
          <SectionHeader
            title="Contact"
            tab="contact"
            onTabChange={onTabChange}
          />
          <div className="text-sm">
            {draft.full_name && (
              <p className="font-medium">{draft.full_name}</p>
            )}
            <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
              {draft.email && <span>{draft.email}</span>}
              {draft.phone && <span>{draft.phone}</span>}
              {draft.location && <span>{draft.location}</span>}
            </div>
            {hasLinks && (
              <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 text-xs">
                {draft.linkedin && <span>{draft.linkedin}</span>}
                {draft.github && <span>{draft.github}</span>}
                {draft.website && <span>{draft.website}</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Skills */}
      {countSkills(draft.skills) > 0 && (
        <div className="space-y-2">
          <SectionHeader
            title="Skills"
            tab="skills"
            onTabChange={onTabChange}
          />
          <div className="space-y-2">
            {Object.entries(draft.skills).map(
              ([category, categorySkills]) =>
                categorySkills.length > 0 && (
                  <div key={category}>
                    <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {categorySkills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ),
            )}
          </div>
        </div>
      )}

      {/* Experience */}
      {(draft.experience.length > 0 || draft.years_of_experience != null) && (
        <div className="space-y-2">
          <SectionHeader
            title="Experience"
            tab="experience"
            onTabChange={onTabChange}
          />
          {draft.years_of_experience != null && (
            <p className="text-muted-foreground text-xs">
              {draft.years_of_experience}+ years of experience
            </p>
          )}
          <div className="space-y-2">
            {draft.experience.map((exp, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">
                  {exp.title}
                  {exp.company && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      at {exp.company}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-xs">
                  {[exp.location, `${exp.start_date} - ${exp.end_date}`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {(exp.projects?.length ?? 0) > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {exp.projects!.map((name) => (
                      <span
                        key={name}
                        className="bg-secondary text-secondary-foreground px-1.5 py-0.5 text-[10px]"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {draft.education.length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            title="Education"
            tab="education"
            onTabChange={onTabChange}
          />
          <div className="space-y-2">
            {draft.education.map((edu, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">{edu.degree}</p>
                <p className="text-muted-foreground text-xs">
                  {[
                    edu.institution,
                    [edu.start_year, edu.year].filter(Boolean).join(" – "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {edu.achievement && (
                  <p className="text-muted-foreground text-xs italic">
                    {edu.achievement}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {(draft.projects ?? []).length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            title="Projects"
            tab="projects"
            onTabChange={onTabChange}
          />
          <div className="space-y-2">
            {(draft.projects ?? []).map((proj, i) => (
              <div key={i} className="text-sm">
                <p className="font-medium">
                  {proj.name}
                  {proj.role && (
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      — {proj.role}
                    </span>
                  )}
                </p>
                {proj.stack && (
                  <p className="text-muted-foreground text-xs">{proj.stack}</p>
                )}
                {proj.description && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {proj.description}
                  </p>
                )}
                {(proj.highlights ?? []).length > 0 && (
                  <ul className="text-muted-foreground mt-1 list-inside list-disc text-xs">
                    {proj.highlights!.map((h, j) => (
                      <li key={j}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {(draft.languages ?? []).length > 0 && (
        <div className="space-y-2">
          <SectionHeader
            title="Languages"
            tab="languages"
            onTabChange={onTabChange}
          />
          <div className="flex flex-wrap gap-2">
            {(draft.languages ?? []).map((lang, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {lang.language}
                <span className="text-muted-foreground ml-1">
                  ({lang.proficiency})
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
