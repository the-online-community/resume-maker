"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useProfile } from "@/lib/profile-context";
import { isProfileEmpty } from "@/lib/profile";
import { DEFAULT_MODEL_ID, MODELS } from "@/lib/models";

export default function MasterResumePage() {
  const { draft, setDraft, handleSave } = useProfile();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editValue, setEditValue] = useState("");

  const resumeText = draft.master_resume ?? "";
  const profileEmpty = isProfileEmpty(draft);

  // Get selected model from localStorage
  const getModel = () => {
    if (typeof window === "undefined") return DEFAULT_MODEL_ID;
    return localStorage.getItem("selected_model") || DEFAULT_MODEL_ID;
  };

  const handleGenerate = useCallback(async () => {
    if (profileEmpty) {
      toast.error("Please fill in your profile first");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/master-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: draft,
          model: getModel(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate");
      }

      const data = await res.json();
      setDraft((prev) => ({ ...prev, master_resume: data.resume }));
      toast.success("Master resume generated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to generate master resume",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [draft, profileEmpty, setDraft]);

  const handleStartEdit = useCallback(() => {
    setEditValue(resumeText);
    setIsEditing(true);
  }, [resumeText]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    setDraft((prev) => ({ ...prev, master_resume: editValue }));
    setIsEditing(false);
    // Save to DB
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ master_resume: editValue }),
      });
      toast.success("Master resume saved");
    } catch {
      toast.error("Failed to save");
    }
  }, [editValue, setDraft]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || !isEditing) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [isEditing, editValue]);

  // No resume yet
  if (!resumeText && !isGenerating) {
    return (
      <div>
        <h2 className="text-lg font-semibold">Master Resume</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Your complete, unabridged resume — AI will transform your profile data
          into a compelling career document with strong action verbs, measurable
          impact, and confident language.
        </p>

        {profileEmpty && (
          <div className="text-muted-foreground mt-6 border p-4 text-sm">
            Fill in your profile sections first (experience, skills, projects)
            before generating your master resume.
          </div>
        )}

        <Button
          className="mt-6"
          onClick={handleGenerate}
          disabled={isGenerating || profileEmpty}
        >
          Generate Master Resume
        </Button>
      </div>
    );
  }

  // Generating
  if (isGenerating) {
    return (
      <div>
        <h2 className="text-lg font-semibold">Master Resume</h2>
        <div className="mt-8 flex flex-col items-center gap-3 py-12">
          <div className="border-primary size-5 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-muted-foreground text-sm">
            Generating your master resume...
          </p>
          <p className="text-muted-foreground text-xs">
            This may take 15-30 seconds
          </p>
        </div>
      </div>
    );
  }

  // Resume exists — show it
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Master Resume</h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                Save
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleStartEdit}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                Regenerate
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="border-input bg-background text-foreground w-full resize-none border p-4 font-mono text-sm leading-relaxed focus:outline-none"
          style={{ minHeight: 400 }}
        />
      ) : (
        <div className="border p-6">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {resumeText}
          </pre>
        </div>
      )}
    </div>
  );
}
