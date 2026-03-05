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
                1. Upload your resume
              </p>
              <p>
                Drop one or more PDF resumes. These are used as the base for
                tailoring.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                2. Paste the job description
              </p>
              <p>
                Copy the full job posting and paste it into the editor. The more
                detail, the better the result.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                3. Tailor your resume
              </p>
              <p>
                Click &quot;Tailor Resume&quot; and AI will rewrite your resume
                to match the job — adjusting keywords, skills, and phrasing.
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">
                4. Edit &amp; download
              </p>
              <p>
                Review the generated resume, make any edits directly in the
                preview, then download as PDF.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
