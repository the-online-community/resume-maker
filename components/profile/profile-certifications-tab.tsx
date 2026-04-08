"use client";

import { Cancel01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserProfile } from "@/lib/profile";

interface ProfileCertificationsTabProps {
  draft: UserProfile;
  onChange: (profile: UserProfile) => void;
}

export function ProfileCertificationsTab({
  draft,
  onChange,
}: ProfileCertificationsTabProps) {
  const certifications = draft.certifications ?? [];

  const addCertification = () =>
    onChange({
      ...draft,
      certifications: [
        ...certifications,
        { name: "", issuer: "", date: "", url: "" },
      ],
    });

  const updateCertification = (
    i: number,
    field: string,
    value: string,
  ) => {
    const updated = [...certifications];
    updated[i] = { ...updated[i], [field]: value };
    onChange({ ...draft, certifications: updated });
  };

  const removeCertification = (i: number) =>
    onChange({
      ...draft,
      certifications: certifications.filter((_, idx) => idx !== i),
    });

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Add professional certifications, licenses, or credentials.
      </p>

      {certifications.length === 0 && (
        <p className="text-muted-foreground text-xs">
          No certifications yet. Add one below.
        </p>
      )}

      {certifications.map((entry, i) => (
        <div key={i} className="border-border relative border p-3">
          <button
            type="button"
            onClick={() => removeCertification(i)}
            className="text-muted-foreground hover:text-destructive absolute top-2 right-2 cursor-pointer transition-colors"
            aria-label="Remove certification"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
          </button>
          <div className="grid grid-cols-2 gap-2 pr-6">
            <div className="col-span-2 space-y-1">
              <label className="text-muted-foreground text-xs">
                Certification Name
              </label>
              <Input
                value={entry.name}
                onChange={(e) =>
                  updateCertification(i, "name", e.target.value)
                }
                placeholder="AWS Solutions Architect"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Issuer</label>
              <Input
                value={entry.issuer}
                onChange={(e) =>
                  updateCertification(i, "issuer", e.target.value)
                }
                placeholder="Amazon Web Services"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground text-xs">Date</label>
              <Input
                value={entry.date ?? ""}
                onChange={(e) =>
                  updateCertification(i, "date", e.target.value)
                }
                placeholder="Jan 2024"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-muted-foreground text-xs">
                Credential URL (optional)
              </label>
              <Input
                value={entry.url ?? ""}
                onChange={(e) =>
                  updateCertification(i, "url", e.target.value)
                }
                placeholder="https://www.credly.com/badges/..."
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCertification}
        className="w-full gap-1.5"
      >
        <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" />
        Add Certification
      </Button>
    </div>
  );
}
