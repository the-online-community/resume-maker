"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function Footer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <footer className="py-4">
        <div className="text-muted-foreground container mx-auto flex items-center justify-center gap-1.5 px-4 text-sm">
          <a
            href="https://www.linkedin.com/in/khaled-javdan/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary font-medium transition-colors"
          >
            @khaled_javdan
          </a>
          <span>·</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="hover:text-foreground cursor-pointer underline-offset-4 transition-colors hover:underline"
          >
            How it works
          </button>
        </div>
      </footer>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How it works</DialogTitle>
          </DialogHeader>
          <div className="text-muted-foreground space-y-4 text-sm">
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                1. Upload your resume &amp; fill your profile
              </p>
              <p>
                Drop one or more PDF resumes and complete your profile details
                — skills, experience, education, and languages. This gives the
                AI full context to work with.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                2. Paste a job description or LinkedIn URL
              </p>
              <p>
                Copy the full job posting into the editor, or paste a LinkedIn
                job URL and it will be extracted automatically.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                3. AI job fit analysis
              </p>
              <p>
                The AI automatically analyzes the job — extracting key skills,
                writing an overview, and scoring how well your profile matches
                the role.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                4. Tailor, edit &amp; track
              </p>
              <p>
                If the job is a good fit, tailor your resume with one click.
                Edit the result directly in the preview, download as PDF, and
                track every application you submit.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
