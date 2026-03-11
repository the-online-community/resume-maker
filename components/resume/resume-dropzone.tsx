"use client";

import {
  ArrowDown01Icon,
  Cancel01Icon,
  FileIcon,
  NoteIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Dropzone,
  DropZoneArea,
  DropzoneDescription,
  DropzoneFileList,
  DropzoneFileListItem,
  DropzoneFileMessage,
  DropzoneMessage,
  DropzoneRemoveFile,
  DropzoneTrigger,
  InfiniteProgress,
  useDropzone,
  type FileStatus,
} from "@/components/ui/dropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clearAllResumes,
  clearAllSavedResumes,
  deleteResume,
  deleteSavedResume,
  getAllResumes,
  getAllSavedResumes,
  saveResume,
  type ResumeEntry,
  type SavedResumeEntry,
} from "@/lib/resume/resume-store";
import { cn } from "@/lib/utils";

interface ResumeDropzoneProps {
  savedGeneratedResumes: SavedResumeEntry[];
  onSavedResumesChange: (resumes: SavedResumeEntry[]) => void;
  onLoadResume?: (placeholders: Record<string, string>) => void;
}

export default function ResumeDropzone({
  savedGeneratedResumes,
  onSavedResumesChange,
  onLoadResume,
}: ResumeDropzoneProps) {
  const [uploadedResumes, setUploadedResumes] = useState<ResumeEntry[]>([]);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<"uploaded" | "saved">(
    "uploaded",
  );
  const [historyOpen, setHistoryOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("resume-history-open") !== "false";
  });

  // Load persisted uploaded resumes on mount
  useEffect(() => {
    getAllResumes().then(setUploadedResumes);
  }, []);

  const dropzone = useDropzone<string>({
    onDropFile: async (file) => {
      // Save to IndexedDB
      const entry = await saveResume(file);
      setUploadedResumes((prev) => [...prev, entry]);
      return { status: "success", result: entry.id };
    },
    validation: {
      accept: { "application/pdf": [".pdf"] },
      maxFiles: 10,
      maxSize: 10 * 1024 * 1024, // 10MB per file
    },
  });

  const handleRemoveUploaded = useCallback(async (id: string) => {
    await deleteResume(id);
    setUploadedResumes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleRemoveSaved = useCallback(
    async (id: string) => {
      await deleteSavedResume(id);
      onSavedResumesChange(savedGeneratedResumes.filter((r) => r.id !== id));
    },
    [savedGeneratedResumes, onSavedResumesChange],
  );

  const pendingFiles = dropzone.fileStatuses.filter(
    (f) => f.status !== "success",
  );

  const hasUploadedFiles =
    pendingFiles.length > 0 || uploadedResumes.length > 0;
  const hasSavedResumes = savedGeneratedResumes.length > 0;
  const hasAnyFiles = hasUploadedFiles || hasSavedResumes;

  return (
    <Dropzone {...dropzone}>
      <DropZoneArea className="flex-col gap-3 px-8 py-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-12 items-center justify-center">
            <HugeiconsIcon
              icon={FileIcon}
              className="text-muted-foreground size-6"
            />
          </div>
          <div>
            <p className="text-sm font-medium">Drop your resumes here</p>
            <DropzoneDescription>
              PDF only · Max 10 files · Up to 10MB each
            </DropzoneDescription>
          </div>
          <DropzoneTrigger className="text-primary hover:text-primary/80 mt-1 bg-transparent px-4 py-1.5 text-sm font-medium transition-colors">
            Browse files
          </DropzoneTrigger>
        </div>
      </DropZoneArea>

      <DropzoneMessage className="mt-2" />

      {hasAnyFiles && (
        <>
          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              className="flex cursor-pointer items-center gap-2"
              onClick={() => {
                setHistoryOpen((prev) => {
                  const next = !prev;
                  localStorage.setItem("resume-history-open", String(next));
                  return next;
                });
              }}
            >
              <h2 className="font-mono">history</h2>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="text-muted-foreground size-4 transition-transform duration-200"
                style={{
                  transform: historyOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
          </div>

          {historyOpen && (
            <Tabs defaultValue="uploaded" className="mt-4">
              <TabsList variant="line" className="w-full">
                <TabsTrigger value="uploaded">
                  Uploaded
                  {uploadedResumes.length > 0 && (
                    <span className="text-muted-foreground ml-1 text-[10px]">
                      ({uploadedResumes.length})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="saved">
                  Saved
                  {savedGeneratedResumes.length > 0 && (
                    <span className="text-muted-foreground ml-1 text-[10px]">
                      ({savedGeneratedResumes.length})
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Uploaded Resumes Tab */}
              <TabsContent value="uploaded" className="mt-3">
                {hasUploadedFiles ? (
                  <>
                    <div className="mb-2 flex justify-end">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive cursor-pointer text-xs transition-colors"
                        onClick={() => {
                          setClearTarget("uploaded");
                          setClearDialogOpen(true);
                        }}
                      >
                        Clear All
                      </button>
                    </div>

                    {/* Currently uploading files (pending/error only) */}
                    {pendingFiles.length > 0 && (
                      <DropzoneFileList className="gap-2">
                        {pendingFiles.map((file) => (
                          <UploadingFileItem key={file.id} file={file} />
                        ))}
                      </DropzoneFileList>
                    )}

                    {/* Saved uploaded resumes */}
                    {uploadedResumes.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-2">
                        {uploadedResumes.map((resume) => (
                          <UploadedResumeItem
                            key={resume.id}
                            resume={resume}
                            onRemove={handleRemoveUploaded}
                          />
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-xs">
                    No uploaded resumes yet
                  </p>
                )}
              </TabsContent>

              {/* Saved Resumes Tab */}
              <TabsContent value="saved" className="mt-3">
                {hasSavedResumes ? (
                  <>
                    <div className="mb-2 flex justify-end">
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive cursor-pointer text-xs transition-colors"
                        onClick={() => {
                          setClearTarget("saved");
                          setClearDialogOpen(true);
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {savedGeneratedResumes.map((resume) => (
                        <SavedGeneratedResumeItem
                          key={resume.id}
                          resume={resume}
                          onRemove={handleRemoveSaved}
                          onLoad={onLoadResume}
                        />
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-muted-foreground py-8 text-center text-xs">
                    No saved resumes yet — generate a resume and click
                    &quot;Save Resume&quot;
                  </p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </>
      )}

      {/* Clear All Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Clear all {clearTarget === "uploaded" ? "uploaded" : "saved"}{" "}
              resumes?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all{" "}
              {clearTarget === "uploaded" ? "uploaded" : "saved"} resumes. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (clearTarget === "uploaded") {
                  setUploadedResumes([]);
                  clearAllResumes();
                } else {
                  onSavedResumesChange([]);
                  clearAllSavedResumes();
                }
                setClearDialogOpen(false);
              }}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dropzone>
  );
}

function UploadingFileItem({ file }: { file: FileStatus<string, string> }) {
  return (
    <DropzoneFileListItem file={file} className="flex-row items-center gap-3">
      <div className="flex flex-1 items-start gap-3 overflow-hidden">
        <div
          className={cn(
            "mt-1.5 flex size-9 shrink-0 items-start justify-center",
          )}
        >
          <HugeiconsIcon
            icon={FileIcon}
            className={cn(
              "size-4",
              file.status === "error" ? "text-destructive" : "text-primary",
            )}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-medium">{file.fileName}</p>
          {file.status === "pending" && (
            <InfiniteProgress status="pending" className="h-1.5" />
          )}
          {file.status === "success" && (
            <p className="text-muted-foreground text-xs">Saved</p>
          )}
          <DropzoneFileMessage />
        </div>
      </div>

      <DropzoneRemoveFile
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
      </DropzoneRemoveFile>
    </DropzoneFileListItem>
  );
}

function UploadedResumeItem({
  resume,
  onRemove,
}: {
  resume: ResumeEntry;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 border px-2 py-2">
      <div className="flex flex-1 items-start gap-3 overflow-hidden">
        <div className="mt-1.5 flex size-9 shrink-0 items-start justify-center">
          <HugeiconsIcon icon={FileIcon} className="text-primary size-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-medium">{resume.fileName}</p>
          <p className="text-muted-foreground text-xs">Saved</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(resume.id)}
        className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-1 transition-colors"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
      </button>
    </li>
  );
}

function SavedGeneratedResumeItem({
  resume,
  onRemove,
  onLoad,
}: {
  resume: SavedResumeEntry;
  onRemove: (id: string) => void;
  onLoad?: (placeholders: Record<string, string>) => void;
}) {
  const date = new Date(resume.savedAt);
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li
      className="hover:bg-accent flex cursor-pointer items-center gap-3 border px-2 py-2 transition-colors"
      onClick={() => onLoad?.(resume.placeholders)}
      title="Click to load this resume"
    >
      <div className="flex flex-1 items-start gap-3 overflow-hidden">
        <div className="mt-1.5 flex size-9 shrink-0 items-start justify-center">
          <HugeiconsIcon icon={NoteIcon} className="text-primary size-4" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-medium">{resume.name}</p>
          <p className="text-muted-foreground text-xs">{dateStr}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(resume.id);
        }}
        className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer p-1 transition-colors"
      >
        <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
      </button>
    </li>
  );
}
